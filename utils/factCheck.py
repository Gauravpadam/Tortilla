#!/usr/bin/env python3
import os
import sys
import json
import requests
from dotenv import load_dotenv
from typing import Annotated
from portia import tool
load_dotenv()

BASE_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

def parse_factcheck_response(response):
    results = []
    if not response or "claims" not in response:
     return results
    
    for claim in response.get("claims", []):
        text = claim.get("text")

        for review in claim.get("claimReview", []):
            results.append({
                "text": text,
                "publisher_name": review.get("publisher", {}).get("name"),
                "publisher_site": review.get("publisher", {}).get("site"),
                "url": review.get("url"),
                # "title": review.get("title"),
                # "reviewDate": review.get("reviewDate"),
                "textualRating": review.get("textualRating"),
                # "languageCode": review.get("languageCode"),
            })

    return results
    

def fact_check_api(claim_text: str, language: str = "en"):
    api_key = "AIzaSyCal2Sr6BGCzOisV9WBSqK1jYWih2ZMoJA"
    if not api_key:
        raise RuntimeError(
            "Missing API key. Set env var GOOGLE_FACTCHECK_API_KEY to your Google API key."
        )

    params = {
        "query": claim_text,
        "languageCode": language,
        "key": api_key,
    }

    resp = requests.get(BASE_URL, params=params, timeout=20,verify=False)
    if resp.status_code != 200:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text}
        raise RuntimeError(f"API error {resp.status_code}: {err}")

    return resp.json()

def fact_check(claim_text: str, language: str = "en"):
    data = fact_check_api(claim, language)
    parsed = parse_factcheck_response(data)
    return parsed

@tool
def fact_check_tool(
    claim_text: Annotated[str, "The factual claim text to check."],
    language: Annotated[str, "Language code (e.g., 'en') for the search."] = "en"
) -> list[dict]:
    """
    Perform fact-checking on the provided claim using Google's Fact Check Tools API.
    Returns a list of matching claim-review entries with publisher and rating info.
    """
    print("Entered fact check tool", claim_text)
    data = fact_check_api(claim_text, language)
    print("Completed",data)
    return parse_factcheck_response(data)


if __name__ == "__main__":
    # accept claim from CLI args, or prompt if none provided
    claim = " ".join(sys.argv[1:]).strip()
    if not claim:
        claim = input("Enter claim: ").strip()

    if not claim:
        print("No claim provided. Exiting.")
        sys.exit(1)

    try:
        parsed = fact_check(claim)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
