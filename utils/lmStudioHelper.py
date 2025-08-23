import requests
import json
import os

from utils.helper import extract_fact_check_final

async def classify_fact_check(feedback: str) -> str:
    """
    Calls the LM Studio API to classify Google Fact Check API feedback.

    Args:
        feedback (str): The <feedback> string from Google Fact Check API response.

    Returns:
        str: The model's response (XML format with <fact_check> and <reason>).
    """
    url = "http://127.0.0.1:1234/v1/chat/completions"
    headers = {"Content-Type": "application/json"}

    payload = {
        "model": "qwen/qwen3-4b-2507",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert classifier who understands google fact check api response"
            },
            {
                "role": "user",
                "content": (
                    "You will be provided with a google feedback in <feedback> xml tag "
                    "which is the response of googe fact check API. Your task is to classify "
                    "the feedback into the following and return the respone in <fact_check>. "
                    "1. Return <fact_check>True</fact_check> if the statement given by user resolves to true. "
                    "2. Return <fact_check>False</fact_check> if the statement given by user resolves to false. "
                    "3. Return <fact_check>Unknown</fact_check> if the statement given by user resolves to unknown. "
                    "Only respond with the XML Tags and answer with the reason in <reason> xml tag. "
                    f"Below is the Google Fact Check Feedback <feedback>{feedback}</feedback>"
                )
            }
        ],
        "temperature": 0.5,
        "max_tokens": -1,
        "stream": False
    }

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    final_response = extract_fact_check_final(response)
    
    return final_response
