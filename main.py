from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controller.AnalysisController import AnalysisController
from controller.Healthz import HealthController
import logging


def create_app() -> FastAPI:
    # Ensure INFO-level logs are emitted (force overrides prior configs)
    logging.basicConfig(level=logging.INFO, force=True)
    app = FastAPI(title="Tortilla API")

    # Allow browser clients (e.g., Chrome extension) to call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # consider restricting to your extension origin later
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware to log ingest-scroll hits before validation
    @app.middleware("http")
    async def log_ingest_scroll(request, call_next):
        path = str(request.url.path)
        if path == "/api/analysis/ingest-scroll":
            cl = request.headers.get("content-length", "-")
            print(f"[middleware] {request.method} {path} content-length={cl}")
        response = await call_next(request)
        return response

    app.include_router(AnalysisController().initialize_and_get_controller())
    app.include_router(HealthController().initialize_and_get_controller())

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
