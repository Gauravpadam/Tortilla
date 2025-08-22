from fastapi import FastAPI
from controller.AnalysisController import AnalysisController
from controller.Healthz import HealthController


def create_app() -> FastAPI:
    app = FastAPI(title="Tortilla API")
    app.include_router(AnalysisController().initialize_and_get_controller())
    app.include_router(HealthController().initialize_and_get_controller())

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
