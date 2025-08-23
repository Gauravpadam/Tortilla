import re

async def extract_fact_check_final(input_string):
    # Define regex patterns to capture the contents within <code> tags
    fact_check = r"<fact_check>(.*?)</fact_check>"

    fact_check_content = re.search(fact_check, input_string, re.DOTALL).group(1)

    return fact_check_content