from portia import plan, plan_run, default_config, Portia, DefaultToolRegistry, ToolRegistry
from portia import Config, LLMProvider, LLMModel
from utils.factCheck import fact_check_tool


async def portiaSample():

    # Combine with any existing tools (optional)
    from portia import example_tool_registry
    my_tool_registry = ToolRegistry([
    fact_check_tool(),
    ])
    config = Config.from_default(
        default_log_level="DEBUG",
        default_model="ollama/qwen3:4b",
    )
    complete_registry = example_tool_registry + my_tool_registry
    portia = Portia(config=config, tools=complete_registry)
    plan1 = portia.plan("perform fact checking for: China caused covid")

    plan_run = portia.run_plan(plan1)
    return plan_run.outputs.final_output