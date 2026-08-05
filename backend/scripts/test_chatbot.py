import asyncio
from app.database.mongodb import init_db, close_db
from app.chatbot.service import ChatbotService
from app.models.user import User

async def main():
    await init_db()
    try:
        chatbot = ChatbotService()

        # Test 1: Knowledge / RAG query
        print("\n--- Test 1: Knowledge Intent (RAG) ---")
        res1 = await chatbot.chat(question="How do I submit a complaint?", user=None)
        print("Answer:", res1["answer"])
        print("Intent:", res1["intent"])
        print("Sources:", res1.get("sources"))

        # Test 2: Greeting Intent
        print("\n--- Test 2: Greeting Intent ---")
        res2 = await chatbot.chat(question="Hello!", user=None)
        print("Answer:", res2["answer"])
        print("Intent:", res2["intent"])

        # Test 3: Complaint Status Intent (Authenticated User)
        print("\n--- Test 3: Complaint Status Intent (Authenticated User) ---")
        mock_user = User(
            firebase_uid="test_uid_123",
            name="John Doe",
            email="john@example.com",
        )
        res3 = await chatbot.chat(question="Where is my complaint?", user=mock_user)
        print("Answer:", res3["answer"])
        print("Intent:", res3["intent"])
        print("Sources:", res3.get("sources"))

        # Test 4: My Complaints Intent (Authenticated User)
        print("\n--- Test 4: My Complaints Intent (Authenticated User) ---")
        res4 = await chatbot.chat(question="Show my complaints", user=mock_user)
        print("Answer:", res4["answer"])
        print("Intent:", res4["intent"])
        print("Sources:", res4.get("sources"))

    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())