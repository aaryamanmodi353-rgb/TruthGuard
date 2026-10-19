from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import router
from app.llm import LLMError

app = FastAPI(
    title="TruthGuard",
    description="Adversarial Verification for Multi-Agent Document Q&A"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": str(exc.detail)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": str(exc)}
    )

@app.exception_handler(LLMError)
async def llm_exception_handler(request: Request, exc: LLMError):
    return JSONResponse(
        status_code=502,
        content={"error": str(exc)}
    )

app.include_router(router, prefix="/api")