import requests
import json
from portia import tool, Agent

URL = "http://127.0.0.1:1234/v1/chat/completions"
HEADERS = {"Content-Type": "application/json"}

@tool
def classify_fact_check(feedback: str) -> str:
    """
    Classifies Google Fact Check API feedback into True, False, or Unknown.
    Returns XML string with <fact_check> and <reason>.
    """
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
                    "which is the response of google fact check API. Your task is to classify "
                    "the feedback into the following and return the response in <fact_check>. "
                    "1. Return <fact_check>True</fact_check> if the statement resolves to true. "
                    "2. Return <fact_check>False</fact_check> if the statement resolves to false. "
                    "3. Return <fact_check>Unknown</fact_check> if the statement resolves to unknown. "
                    "Only respond with the XML Tags and answer with the reason in <reason> xml tag. "
                    f"Below is the Google Fact Check Feedback <feedback>{feedback}</feedback>"
                )
            }
        ],
        "temperature": 0.5,
        "max_tokens": -1,
        "stream": False
    }

    response = requests.post(URL, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        raise Exception(f"Request failed: {response.status_code} {response.text}")
