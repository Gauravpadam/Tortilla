from controller.base import BaseController
from service.AgentService import AgentService  # Uncomment and implement later
from utils.portiaFile import article_analysis_service, sentence_analysis_service
from pydantic import BaseModel


# ----------------------------
# Request Models
# ----------------------------
class ArticleRequest(BaseModel):
    article: str


class SentenceRequest(BaseModel):
    sentence: str


# ----------------------------
# Controller
# ----------------------------
class AnalysisController(BaseController):

    def __init__(self, prefix="fact", tags=["factsapi"]):
        super().__init__(prefix, tags)
        self.agentService = AgentService()

    def initialize_and_get_controller(self):
        self.controller.add_api_route(
            path='/article',
            endpoint=self.article_analysis,
            methods=['post']
        )
        self.controller.add_api_route(
            path='/sentence',
            endpoint=self.sentence_analysis,
            methods=['post']
        )
        return self.controller

    # ----------------------------
    # Endpoints
    # ----------------------------
    def article_analysis(self, req: ArticleRequest):
        """
        Analyze full article text passed in request body
        """
        res = article_analysis_service(article=req.article)
        return res

    def sentence_analysis(self, req: SentenceRequest):
        """
        Analyze single sentence text passed in request body
        """
        res = sentence_analysis_service(user_query=req.sentence)
        return res
