
from controller.base import BaseController
from service.AgentService import AgentService  # Uncomment and implement later
from utils.helper import extract_fact_check_final
from utils.lmStudioHelper import classify_fact_check
from utils.portiaFile import portiaSample
from utils.test import fact_check_service


class AnalysisController(BaseController):

    def __init__(self, prefix="analysis", tags=["analysisapi"]):
        super().__init__(prefix, tags)
        self.agentService = AgentService()

    def initialize_and_get_controller(self):
        # Example route, update as needed when AgentService methods are defined
        self.controller.add_api_route(path='/classify-truth', endpoint=self.classify_truth, methods=['post'])
        return self.controller


    def classify_truth(self):
        article = f'''Directly underneath AI, we have machine learning, which involves creating models by training an algorithm to make predictions or decisions based on data. It encompasses a broad range of techniques that enable computers to learn from and make inferences based on data without being explicitly programmed for specific tasks.

There are many types of machine learning techniques or algorithms, including linear regression, logistic regression, decision trees, random forest, support vector machines (SVMs), k-nearest neighbor (KNN), clustering and more. Each of these approaches is suited to different kinds of problems and data.

But one of the most popular types of machine learning algorithm is called a neural network (or artificial neural network). Neural networks are modeled after the human brain's structure and function. A neural network consists of interconnected layers of nodes (analogous to neurons) that work together to process and analyze complex data. Neural networks are well suited to tasks that involve identifying complex patterns and relationships in large amounts of data.

The simplest form of machine learning is called supervised learning, which involves the use of labeled data sets to train algorithms to classify data or predict outcomes accurately. In supervised learning, humans pair each training example with an output label. The goal is for the model to learn the mapping between inputs and outputs in the training data, so it can predict the labels of new, unseen data.'''
        res = fact_check_service(article=article)
        return res

