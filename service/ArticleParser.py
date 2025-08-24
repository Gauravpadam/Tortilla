from DTO.Article import ArticlesBlob
from typing import List, Dict, Any
import json

class ArticleParser:

    @staticmethod
    def crawler(json_blob: ArticlesBlob):

        json_body: Dict[str, Any] = ArticleParser._parse_blob(json_blob.json_blob)
        entries = ArticleParser._peel_metadata(json_body)

        # Start DFS stack with all entry objects
        stack: List[Any] = entries[:]
        articles: List[str] = []

        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                if "full_text" in item:
                    articles.append(item["full_text"])
                else:
                    # Dive into all nested values
                    for value in item.values():
                        stack.append(value)
            elif isinstance(item, list):
                # Explore list elements
                for el in item:
                    stack.append(el)

        
        return articles
    
    def _peel_metadata(json_body: Dict[Any, Any]):
        """
        Twitter/X timeline GraphQL can return multiple instruction objects.
        Aggregate all 'entries' lists across instructions.
        Be tolerant: if none found, return an empty list instead of raising.
        """
        try:
            instructions = (
                json_body.get("data", {})
                .get("home", {})
                .get("home_timeline_urt", {})
                .get("instructions", [])
            )
            aggregated: List[Any] = []
            # Common case: list of dicts, each may have 'entries'
            if isinstance(instructions, list):
                for instr in instructions:
                    if isinstance(instr, dict) and isinstance(instr.get("entries"), list):
                        aggregated.extend(instr["entries"])
            elif isinstance(instructions, dict) and isinstance(instructions.get("entries"), list):
                aggregated.extend(instructions["entries"])

            if aggregated:
                return aggregated
        except Exception:
            # If structure is unexpected, fall through to return []
            pass
        # No entries found
        return []

    
    def _parse_blob(json_blob: str):
        # Accept either a JSON string or a dict already
        if isinstance(json_blob, dict):
            return json_blob
        if not isinstance(json_blob, str):
            raise ValueError("json_blob must be a JSON string or dict")
        try:
            return json.loads(json_blob)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON for json_blob: {e}")

# with open('timeline.json', 'r') as blob:
#    timeline = json.load(blob)
#    results =  ArticleParser.crawler(timeline)

#    print(results)