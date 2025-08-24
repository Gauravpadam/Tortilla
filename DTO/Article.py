from pydantic import BaseModel

from typing import Union, Any, Dict

class ArticlesBlob(BaseModel):
    json_blob: Union[str, Dict[str, Any]]
