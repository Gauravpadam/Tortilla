#!/usr/bin/env python3
from __future__ import annotations
from typing import List, Optional
import portia
from pydantic import BaseModel, Field
from fastapi import FastAPI

from portia import Config, Portia, PlanBuilderV2, StepOutput, Input, ToolRegistry

from utils.factCheck import fact_check_tool

# ----------------------------
# Models
# ----------------------------

class FactCheckFinding(BaseModel):
    url: Optional[str] = None
    publisher_name: Optional[str] = None
    textualRating: Optional[str] = None
    language: Optional[str] = None

class FactCheckResults(BaseModel):
    query: str
    language: str = "en"
    findings: List[FactCheckFinding] = Field(default_factory=list)
    overall_verdict: Optional[str] = None

class TextClassificationSchema(BaseModel):
    fact: str = Field(..., description="True, False or Unknown")

class ClassificationList(BaseModel):
    items: List[TextClassificationSchema]

class SentenceSelection(BaseModel):
    sentences: List[str] = Field(..., description="List of up to 10 fact-check-worthy sentences")


# ----------------------------
# Core logic
# ----------------------------

def package_with_verdict(findings, classifications, user_query, language):
    items = classifications.items
    tally = {"True": 0, "False": 0, "Unknown": 0}
    annotated = []

    for idx, item in enumerate(items):
        fact = item.get("fact", "Unknown") if isinstance(item, dict) else getattr(item, "fact", "Unknown")
        tally[fact] = tally.get(fact, 0) + 1

        if idx < len(findings):
            f = findings[idx]
            if isinstance(f, dict):
                annotated.append(
                    FactCheckFinding(
                        textualRating=f.get("textualRating"),
                        publisher_name=f.get("publisher_name"),
                        url=f.get("url"),
                        language=language,
                    )
                )
            else:
                annotated.append(
                    FactCheckFinding(
                        textualRating=getattr(f, "textualRating", None),
                        publisher_name=getattr(f, "publisher_name", None),
                        url=getattr(f, "url", None),
                        language=language,
                    )
                )

    overall = max(tally, key=lambda k: (tally[k], k)) if any(tally.values()) else "Unknown"

    print("User_query 889988", user_query)

    return FactCheckResults(
        query=user_query,
        language=language,
        findings=annotated,
        overall_verdict=overall,
    )

def build_article_plan():
    builder = (
        PlanBuilderV2("Select 10 fact-check-worthy sentences from an article")

        # ----------------------------
        # Inputs
        # ----------------------------
        .input(name="article_text", description="Full text of the article to fact-check")
        .input(name="language", description="Language code (e.g., 'en')", default_value="en")

        # ----------------------------
        # Step 1: Split into sentences
        # ----------------------------
        .function_step(
            step_name="Split into sentences",
            function=lambda article_text: article_text.split(". "),  # naive split
            args={"article_text": Input("article_text")},
        )

        # ----------------------------
        # Step 2: LLM selects 10 sentences
        # ----------------------------
        .llm_step(
            step_name="Select top 10 sentences",
            task=(
                "You are an assistant that selects the most fact-check-worthy claims from text.\n\n"
                "You will receive a list of sentences. Pick up to 10 sentences that contain factual claims "
                "which are suitable for fact-checking.\n\n"
                "⚠️ IMPORTANT:\n"
                "- Return ONLY a JSON object with the following format:\n"
                "{ \"sentences\": [\"sentence1\", \"sentence2\", ...] }\n"
                "- Ensure no explanations or additional text is included.\n"
            ),
            inputs=[StepOutput("Split into sentences")],
            output_schema=SentenceSelection, 
        )

        # ----------------------------
        # Final Output
        # ----------------------------
        .final_output(
            output_schema=SentenceSelection
        )

        .build()
    )
    return builder

def build_plan():
    builder = (
        PlanBuilderV2("Fact-check user claim and classify results via LLM")

        .input(name="user_query", description="The claim to fact-check")
        .input(name="language", description="Language code (e.g., 'en')", default_value="en")

        .invoke_tool_step(
            step_name="Fact check claim",
            tool="fact_check_tool",
            args={
                "claim_text": Input("user_query"),
                "language": Input("language"),
            },
        )

        .function_step(
            step_name="Serialize feedbacks",
            function=lambda findings: "\n".join(
                f"<feedback>{f.get('textualRating')}</feedback>"
                for f in findings or []
            ),
            args={"findings": StepOutput("Fact check claim")},
        )

        .llm_step(
            step_name="Classify findings",
            task=(
                "You are an expert classifier interpreting Google Fact Check API responses.\n\n"
                "You will receive multiple <feedback> entries. For each entry, return a JSON object "
                "with the following structure:\n\n"
                "{ \"fact\": \"True | False | Unknown\" }\n\n"
                "⚠️ IMPORTANT:\n"
                "- Use the key EXACTLY as 'fact'.\n"
                "- Do not invent other keys.\n"
                "- Do not return XML, text, or explanations.\n"
                "- Return only valid JSON objects wrapped in an 'items' list.\n\n"
                "Example final output:\n"
                "{ \"items\": [ {\"fact\": \"True\"}, {\"fact\": \"False\"} ] }"
            ),
            inputs=[StepOutput("Serialize feedbacks")],
            output_schema=ClassificationList,
        )

        .function_step(
            function=package_with_verdict,
            args={
                "findings": StepOutput("Fact check claim"),
                "classifications": StepOutput("Classify findings"),
                "user_query": Input("user_query"),
                "language": Input("language"),
            },
        )

        .final_output(output_schema=FactCheckResults)
        .build()
    )
    return builder

# Setup Portia runtime once
tool_registry = ToolRegistry([fact_check_tool()])
config = Config.from_default(
    default_log_level="DEBUG",
    default_model="ollama/qwen3:4b",
)
portia = Portia(config=config, tools=tool_registry)
article_plan = build_article_plan()
plan = build_plan()

def fact_check_service(article: str) -> List[FactCheckResults]:
    results = portia.run_plan(article_plan, plan_run_inputs={"article_text": article, "language": "en"})
    sentences = results.outputs.final_output.value.sentences  # already a SentenceSelection model

    combined_outputs: List[FactCheckResults] = []

    for user_query in sentences:
        run = portia.run_plan(
            plan,
            plan_run_inputs={"user_query": user_query, "language": "en"}
        )
        fact_result: FactCheckResults = run.outputs.final_output.value
        combined_outputs.append(fact_result)


    return combined_outputs
