from fastapi import APIRouter
from abc import ABC, abstractmethod

class BaseController(ABC):

    def __init__(self, prefix: str, tags) -> None:
        self.prefix = f"/api/{prefix}"
        self.tags = tags
        self.controller = APIRouter(prefix=self.prefix, tags=self.tags)
    
    @abstractmethod
    def initialize_and_get_controller(self) -> APIRouter:
        pass
