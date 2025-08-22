from controller.base import BaseController


class HealthController(BaseController):

    def __init__(self, prefix="health", tags=["health"]):
        super().__init__(prefix, tags)

    def initialize_and_get_controller(self):
        @self.controller.get("/live")
        async def liveness():
            return {"status": "alive"}

        @self.controller.get("/ready")
        async def readiness():
            # Here you could check DB connections, dependent services, etc.
            return {"status": "ready"}

        return self.controller
