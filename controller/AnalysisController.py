
from controller.base import BaseController
from service.AgentService import AgentService  # Uncomment and implement later
from utils.helper import extract_fact_check_final
from utils.lmStudioHelper import classify_fact_check
from utils.portiaFile import portiaSample


class AnalysisController(BaseController):

    def __init__(self, prefix="analysis", tags=["analysisapi"]):
        super().__init__(prefix, tags)
        self.agentService = AgentService()

    def initialize_and_get_controller(self):
        # Example route, update as needed when AgentService methods are defined
        self.controller.add_api_route(path='/classify-truth', endpoint=self.classify_truth, methods=['post'])
        return self.controller


    async def classify_truth(self):
        res = await portiaSample()
        # feedback="Mostly false"
        # classification = await classify_fact_check(feedback=feedback)
        # response = await extract_fact_check_final(classification)
        return res


    # Define async methods to coordinate with AgentService here
    # Example:
    # async def do_something(self, request_data):
    #     return await self.agentService.do_something(request_data)
