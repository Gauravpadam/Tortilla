from typing import Annotated
from portia import tool
from transformers import AutoTokenizer, AutoModelForSequenceClassification, BertForSequenceClassification, BertTokenizer
import torch
from transformers import pipeline

@tool
def ml_predict_fake_news(
    claim: Annotated[str, "The news claim or headline to be analyzed for authenticity."]
) -> dict:
    """Uses a machine learning model to predict if a news claim is 'REAL' or 'FAKE' and provides a confidence score."""
    
    model_name = "Pulk17/Fake-News-Detection"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)

    inputs = tokenizer(claim, return_tensors="pt", truncation=True, padding=True)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=1)
        label = torch.argmax(probs, dim=1).item()
        prob = probs[0, label].item()

    classes = ["FAKE", "REAL"]
    return {"verdict": classes[label], "confidence": prob}


@tool
def ml_detect_fraud(
    text: Annotated[str, "The text message or claim to be analyzed for fraudulent content."]
):
    """Uses a machine learning model to predict if a text is 'fraud' or 'normal' and provides a confidence score."""

    model_id = "austinb/fraud_text_detection"
    classifier = pipeline("text-classification", model=model_id)
    
    scam_prediction = classifier(text)
    return scam_prediction[0]


@tool
def ml_is_phishing_url(
    url: Annotated[str, "The URL to check for a phishing attempt."]
) -> bool:
    """Analyzes a URL using a machine learning model to determine if it is a phishing link."""
    
    model_name = "Gauravpadamtoo/bert-phishing-detector"
    tokenizer = BertTokenizer.from_pretrained(model_name)
    model = BertForSequenceClassification.from_pretrained(model_name)
    model.eval()
    
    # Tokenize the input URL
    inputs = tokenizer(url, return_tensors="pt", truncation=True, padding='max_length', max_length=512)
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        # Get the predicted class (0 for phishing, 1 for legitimate)
        prediction = torch.argmax(logits, dim=1).item()
    
    # Return True if the prediction is '0' (phishing), False otherwise
    return prediction == 0

# def fraud_detection(text:str):
#     model_id = "austinb/fraud_text_detection"
#     classifier = pipeline("text-classification", model=model_id)

#     # Example texts to classify
#     # scam_message = "Congratulations! You have won a free iPhone. Click this link to claim your prize." {'label': 'fraud', 'score': 0.977560818195343}
#     # legitimate_message = "Your account has been successfully updated. No action is required from your side." {'label': 'normal', 'score': 0.9629361629486084}

#     # Perform classification
#     scam_prediction = classifier(text)
#     return scam_prediction[0] #{'label': 'fraud', 'score': 0.977560818195343}


# -----------------------
# Example usage
# -----------------------

# if __name__ == "__main__":
#     pass

    # print(ml_pred_fake_news("Covid-19 is caused by 5G"))
    # print(fraud_detection("Your account has been successfully updated. No action is required from your side."))
