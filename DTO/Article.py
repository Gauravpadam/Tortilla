from pydantic import BaseModel

class ArticlesBlob(BaseModel):
    json_blob: str