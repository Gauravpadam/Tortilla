
# Tortilla

Minimal FastAPI project scaffold for an "Agent" style service.

Overview
- FastAPI app entry: `main.py` (creates `app` and mounts controllers)
- Controllers live under `controller/` and extend `BaseController` which wraps an `APIRouter`.
- Example controllers: `AnalysisController` and `HealthController` (liveness/readiness).
- Service skeletons live under `service/` (e.g. `AgentService` to be implemented).

Run locally

1. Create a virtualenv and install dependencies. Example with pip:

```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
```

2. Start the server:

```bash
uvicorn main:app --reload
```

Endpoints
- GET / -> basic health/status (mounted in `main.py`)
- GET /api/health/live -> liveness
- GET /api/health/ready -> readiness

Next steps
- Implement `service/AgentService.py` with required business logic and wire it into `controller/agent.py`.
- Add dependency injection or startup/shutdown events to initialize DB connections or external clients.
- Add tests (pytest) and a minimal CI workflow.

License
- Add your preferred license if needed.

