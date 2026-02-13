const API_URL = "http://127.0.0.1:8000";

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // assuming backend returns 200 ok or 401/400 on fail
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Invalid email or password");
  }

  return res.json();
}