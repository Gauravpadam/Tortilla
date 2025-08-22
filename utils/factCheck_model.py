from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load the tokenizer and model
model_name = "Pulk17/Fake-News-Detection"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Your news/article text
text = "Covid vaccination causes infertility in man."

# Tokenize the input text
inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)

# Get predictions
with torch.no_grad():
    outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=1)
    label = torch.argmax(probs, dim=1).item()
    prob = probs[0, label].item()

# Map label to class
classes = ["FAKE", "REAL"]
print(f"Prediction: {classes[label]} (confidence: {prob:.2f})")
