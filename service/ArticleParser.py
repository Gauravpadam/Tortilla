from DTO.Article import ArticlesBlob
from typing import List, Dict, Any
import json

class ArticleParser:

    @staticmethod
    def crawler(json_blob: ArticlesBlob):

        json_body:Dict[Dict[Any, Any]]  = ArticleParser._parse_blob(json_blob.json_blob)
        entries = ArticleParser._peel_metadata(json_body)

        stack: List[Dict] = entries[:]
        articles: List[str] = []

        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                if "full_text" in item:
                    articles.append(item["full_text"])
                else:
                    for value in item.values():
                        stack.append(value)

        
        return articles
    
    def _peel_metadata(json_body: Dict[Any, Any]):
        return json_body["data"]["home"]["home_timeline_urt"]["instructions"][0]["entries"]

    
    def _parse_blob(json_blob: str):
        return json.loads(json_blob)

# with open('timeline.json', 'r') as blob:
#    timeline = json.load(blob)
#    results =  ArticleParser.crawler(timeline)

#    print(results)