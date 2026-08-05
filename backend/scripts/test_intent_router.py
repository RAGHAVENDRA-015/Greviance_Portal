from app.chatbot.intent_router import IntentRouter

router = IntentRouter()

tests = [
    "Hi",
    "Where is my complaint?",
    "Show my complaints",
    "How do I file a grievance?",
]

for text in tests:
    print(f"{text} -> {router.detect(text)}")