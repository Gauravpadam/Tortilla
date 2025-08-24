from controller.base import BaseController
from fastapi import HTTPException, Request
import logging
import json
from collections import deque
from time import time
from typing import Deque, Dict, Any, List
from pathlib import Path
from service.AgentService import AgentService  # Uncomment and implement later
from DTO.Article import ArticlesBlob
from service.ArticleParser import ArticleParser


# ----------------------------
# Controller
# ----------------------------
class AnalysisController(BaseController):

    def __init__(self, prefix="analysis", tags=["analysisapi"]):
        super().__init__(prefix, tags)
        self.agentService = AgentService()
        # Keep last few ingests for debugging/inspection via GET endpoint
        self._last_ingests: Deque[Dict[str, Any]] = deque(maxlen=10)

    def initialize_and_get_controller(self):
        # Example route, update as needed when AgentService methods are defined
        self.controller.add_api_route(path='/classify-truth', endpoint=self.classify_truth, methods=['post'])
        self.controller.add_api_route(path='/ingest-scroll', endpoint=self.ingest_scroll, methods=['post'])
        self.controller.add_api_route(path='/ingest-scroll/last', endpoint=self.get_last_ingests, methods=['get'])
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

    async def classify_truth(self):
        return await self.agentService.classify_input("foo")


    async def ingest_scroll(self, request: Request, payload: ArticlesBlob, debug: bool = False):
        """
        Accepts the JSON blob from the Chrome extension's scroll capture and
        extracts article/text content using ArticleParser.
        """
        logger = logging.getLogger(__name__)
        # Log concise info about the incoming payload
        blob = payload.json_blob
        print(f"[DEBUG] ingest-scroll called with payload type: {type(blob)}", flush=True)
        try:
            if isinstance(blob, str):
                preview = blob[:500].replace('\n', ' ')
                logger.info("/ingest-scroll received string blob (len=%d). preview=%s...", len(blob), preview)
                # Fallback print
                print(f"[ingest-scroll] received string blob len={len(blob)} preview={preview}...", flush=True)
                # Try to parse to inspect top-level keys (best-effort)
                try:
                    parsed = json.loads(blob)
                    if isinstance(parsed, dict):
                        logger.debug("parsed keys: %s", list(parsed.keys())[:10])
                        print(f"[DEBUG] parsed top-level keys: {list(parsed.keys())[:10]}", flush=True)
                except Exception:
                    pass
            elif isinstance(blob, dict):
                keys = list(blob.keys())[:10]
                logger.info("/ingest-scroll received dict blob with keys=%s", keys)
                # Fallback print
                print(f"[ingest-scroll] received dict blob keys={keys}", flush=True)
                print(f"[DEBUG] Full structure preview: {str(blob)[:200]}...", flush=True)
            else:
                logger.info("/ingest-scroll received blob of type=%s", type(blob).__name__)
                # Fallback print
                print(f"[ingest-scroll] received blob type={type(blob).__name__}", flush=True)
        except Exception as log_err:
            logger.warning("Failed to log incoming blob details: %s", log_err)
            print(f"[ingest-scroll] logging error: {log_err}", flush=True)

        try:
            articles = ArticleParser.crawler(payload)
        except ValueError as e:
            # Invalid JSON or unexpected type in json_blob
            raise HTTPException(status_code=400, detail=str(e))
        except KeyError as e:
            # Structure mismatch: required keys missing
            raise HTTPException(status_code=400, detail=f"Invalid timeline structure: missing key {e}")
        # Log concise result details
        try:
            logger.info("/ingest-scroll parsed %d articles", len(articles))
            print(f"[ingest-scroll] parsed count={len(articles)}", flush=True)
            if articles:
                # Show first 3 articles with more text for verification
                sample = articles[:3]
                sample_trimmed = [a[:300] + ("..." if len(a) > 300 else "") for a in sample if isinstance(a, str)]
                logger.info("extracted articles: %s", sample_trimmed)
                print(f"[ingest-scroll] extracted articles:", flush=True)
                for i, article in enumerate(sample_trimmed, 1):
                    print(f"  {i}. {article}", flush=True)
        except Exception as log_err:
            logger.warning("Failed to log parsed articles: %s", log_err)
            print(f"[ingest-scroll] result logging error: {log_err}", flush=True)

        # Build response
        response = {"count": len(articles), "articles": articles}

        # If debug mode is enabled (query ?debug=1), include payload preview to inspect in DevTools
        if debug:
            try:
                preview = None
                if isinstance(blob, str):
                    preview = blob[:1000]
                elif isinstance(blob, dict):
                    preview = str({k: ("<obj>" if isinstance(v, (dict, list)) else v) for k, v in list(blob.items())[:10]})
                response["debug"] = {
                    "payload_type": type(blob).__name__,
                    "payload_preview": preview,
                    "sample_articles": articles[:3],
                }
            except Exception as _:
                pass

        # Optionally persist incoming payload and parsed result for offline debugging
        try:
            should_persist = debug or len(articles) == 0
            if should_persist:
                dbg_dir = Path("debug_ingests")
                dbg_dir.mkdir(parents=True, exist_ok=True)
                ts = int(time())
                # Save compact request payload and parsed response for inspection
                payload_path = dbg_dir / f"payload_{ts}.json"
                result_path = dbg_dir / f"result_{ts}.json"
                # Preserve original blob as dict or string
                to_dump = blob if isinstance(blob, (dict, list)) else {"raw": str(blob)}
                with payload_path.open("w", encoding="utf-8") as f:
                    json.dump(to_dump, f, ensure_ascii=False)
                with result_path.open("w", encoding="utf-8") as f:
                    json.dump(response, f, ensure_ascii=False)
        except Exception:
            pass

        # Store a compact record for later inspection via GET /ingest-scroll/last
        try:
            record = {
                "ts": int(time()),
                "remote": request.client.host if request and request.client else None,
                "payload_type": type(blob).__name__,
                "payload_keys": list(blob.keys())[:10] if isinstance(blob, dict) else None,
                "count": len(articles),
                "sample": articles[:3],
            }
            self._last_ingests.append(record)
        except Exception:
            pass

        return response

    async def get_last_ingests(self) -> List[Dict[str, Any]]:
        """
        Returns the last few ingests (compact metadata + sample) for debugging
        in cases where DevTools cannot show response bodies.
        """
        return list(self._last_ingests)


    # Define async methods to coordinate with AgentService here
    # Example:
    # async def do_something(self, request_data):
    #     return await self.agentService.do_something(request_data)
