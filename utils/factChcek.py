#!/usr/bin/env python3
import os
import sys
import json
import requests
from dotenv import load_dotenv
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


def fact_check(claim_text: str, language: str = "en") -> dict:
    api_key = os.getenv("GOOGLE_FACTCHECK_API_KEY")
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

if __name__ == "__main__":
    # accept claim from CLI args, or prompt if none provided
    claim = " ".join(sys.argv[1:]).strip()
    if not claim:
        claim = input("Enter claim: ").strip()

    if not claim:
        print("No claim provided. Exiting.")
        sys.exit(1)

    try:
        data = fact_check(claim)
        parsed = parse_factcheck_response(data)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
