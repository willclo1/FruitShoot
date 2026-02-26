from pydantic import BaseModel, AnyHttpUrl

class ClipRequest(BaseModel):
    url: AnyHttpUrl
    ml_disable: bool = True
    ml_classify_endpoint: str | None = None

class ClipResponse(BaseModel):
    ok: bool
    recipe: dict