from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from transformers import pipeline

# -----------------------
# Fake News Detector
# -----------------------
def ml_pred_fake_news(claim: str):
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



def fraud_detection(text:str):
    model_id = "austinb/fraud_text_detection"
    classifier = pipeline("text-classification", model=model_id)

    # Example texts to classify
    # scam_message = "Congratulations! You have won a free iPhone. Click this link to claim your prize."
    # legitimate_message = "Your account has been successfully updated. No action is required from your side."

    # Perform classification
    scam_prediction = classifier(text)
    return scam_prediction[0] #{'label': 'fraud', 'score': 0.977560818195343}


# -----------------------
# Example usage
# -----------------------
if __name__ == "__main__":
    print(ml_pred_fake_news("Covid-19 is caused by 5G"))
    print(fraud_detection("Congratulations! You won a free ticket to Bahamas. Reply YES to claim your prize."))
