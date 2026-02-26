import asyncio
import socket
import ipaddress
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# ---------------------------
# Security: block unsafe targets
# ---------------------------

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}

def is_private_ip(hostname: str) -> bool:
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(hostname))
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        )
    except Exception:
        return True

def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http/https URLs allowed.")
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("Invalid URL host.")
    if host in BLOCKED_HOSTS:
        raise ValueError("Blocked host.")
    if is_private_ip(host):
        raise ValueError("Private/internal addresses are not allowed.")
    return url


# ---------------------------
# Config
# ---------------------------

NAV_TIMEOUT_MS = 25_000
DEFAULT_TIMEOUT_MS = 25_000

CONCURRENCY_LIMIT = 3
_sem = asyncio.Semaphore(CONCURRENCY_LIMIT)

RECIPE_CLIPPER_JS = Path("static/recipe-clipper.umd.js").read_text(encoding="utf-8")

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

class ClipTimeout(Exception):
    pass


# ---------------------------
# Global Playwright + Browser (reused)
# ---------------------------

_pw = None
_browser = None

async def init_browser():
    """Call once on app startup."""
    global _pw, _browser
    if _browser is not None:
        return
    _pw = await async_playwright().start()
    _browser = await _pw.chromium.launch(headless=True)

async def shutdown_browser():
    """Call once on app shutdown."""
    global _pw, _browser

    # If already shut down, do nothing
    if _browser is None and _pw is None:
        return

    # Close browser safely (it may already be dead)
    if _browser is not None:
        try:
            await _browser.close()
        except Exception:
            # Browser/driver connection may already be closed; ignore
            pass
        finally:
            _browser = None

    # Stop Playwright safely
    if _pw is not None:
        try:
            await _pw.stop()
        except Exception:
            pass
        finally:
            _pw = None


async def clip_recipe(
    url: str,
    *,
    ml_disable: bool = True,
    ml_classify_endpoint: str | None = None,
) -> dict:
    """
    Fast path: reuse one browser, create a fresh context/page per request.
    """
    if _browser is None:
        raise RuntimeError("Browser not initialized. Call init_browser() on startup.")

    url = validate_url(url)

    async with _sem:
        context = await _browser.new_context(user_agent=USER_AGENT)
        page = await context.new_page()

        page.set_default_navigation_timeout(NAV_TIMEOUT_MS)
        page.set_default_timeout(DEFAULT_TIMEOUT_MS)

        # Speed: block heavy resources + common trackers (DO NOT block stylesheet)
        async def route_filter(route):
            req = route.request
            rtype = req.resource_type

            if rtype in ("image", "font", "media"):
                await route.abort()
                return

            u = req.url.lower()
            if any(x in u for x in (
                "doubleclick", "googletagmanager", "google-analytics",
                "facebook", "segment", "optimizely", "hotjar"
            )):
                await route.abort()
                return

            await route.continue_()

        await page.route("**/*", route_filter)

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            await page.wait_for_timeout(900)

            await page.add_script_tag(content=RECIPE_CLIPPER_JS)

            # Try RecipeClipper first
            recipe = await page.evaluate(
                """
                async (opts) => {
                    if (!window.RecipeClipper) return null;
                    try {
                        return await window.RecipeClipper.clipRecipe(opts);
                    } catch (e) {
                        return { __error: String(e) };
                    }
                }
                """,
                {"mlDisable": ml_disable, "mlClassifyEndpoint": ml_classify_endpoint},
            )

            # JSON-LD fallback if needed
            needs_fallback = (
                not recipe
                or (isinstance(recipe, dict) and recipe.get("__error"))
                or not (isinstance(recipe, dict) and recipe.get("ingredients"))
                or not (isinstance(recipe, dict) and recipe.get("instructions"))
            )

            if needs_fallback:
                jsonld = await page.evaluate(
                    """
                    () => {
                        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

                        const normalizeInstructions = (val) => {
                            if (!val) return [];
                            if (Array.isArray(val)) {
                                return val.map(x => {
                                    if (typeof x === "string") return x;
                                    if (x && typeof x === "object" && typeof x.text === "string") return x.text;
                                    return null;
                                }).filter(Boolean);
                            }
                            if (typeof val === "string") return [val];
                            return [];
                        };

                        const normalizeIngredients = (val) => {
                            if (!val) return [];
                            if (Array.isArray(val)) return val.map(String).filter(Boolean);
                            if (typeof val === "string") return [val];
                            return [];
                        };

                        const findRecipe = (obj) => {
                            if (!obj || typeof obj !== "object") return null;

                            if (Array.isArray(obj["@graph"])) {
                                for (const item of obj["@graph"]) {
                                    const r = findRecipe(item);
                                    if (r) return r;
                                }
                            }

                            const t = obj["@type"];
                            const types = Array.isArray(t) ? t : [t];
                            if (types.includes("Recipe")) {
                                return {
                                    title: obj.name || obj.headline || "Untitled Recipe",
                                    ingredients: normalizeIngredients(obj.recipeIngredient),
                                    instructions: normalizeInstructions(obj.recipeInstructions),
                                };
                            }
                            return null;
                        };

                        for (const s of scripts) {
                            try {
                                const data = JSON.parse(s.textContent);
                                if (Array.isArray(data)) {
                                    for (const item of data) {
                                        const r = findRecipe(item);
                                        if (r) return r;
                                    }
                                } else {
                                    const r = findRecipe(data);
                                    if (r) return r;
                                }
                            } catch {}
                        }
                        return null;
                    }
                    """
                )

                if jsonld:
                    recipe = {
                        "title": jsonld.get("title"),
                        "ingredients": jsonld.get("ingredients", []),
                        "instructions": jsonld.get("instructions", []),
                        "source": "jsonld",
                    }

            return recipe or {}

        except PlaywrightTimeoutError as e:
            raise ClipTimeout(str(e))

        finally:
            await context.close()