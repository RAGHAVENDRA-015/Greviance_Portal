import asyncio
from beanie import PydanticObjectId
from app.database.mongodb import init_db, close_db
from app.chatbot.service import ChatbotService
from app.chatbot.memory import MemoryService
from app.models.chat_history import ChatHistory
from app.models.user import User


async def main():
    await init_db()
    try:
        chatbot = ChatbotService()
        memory_service = MemoryService()

        # Mock User A and User B
        user_a = User(
            id=PydanticObjectId("650000000000000000000001"),
            firebase_uid="user_a_uid",
            name="Alice",
            email="alice@example.com",
        )
        user_b = User(
            id=PydanticObjectId("650000000000000000000002"),
            firebase_uid="user_b_uid",
            name="Bob",
            email="bob@example.com",
        )

        user_a_id = str(user_a.id)
        user_b_id = str(user_b.id)

        # Cleanup existing test memory for clean test runs
        await ChatHistory.find(ChatHistory.user_id == user_a_id).delete()
        await ChatHistory.find(ChatHistory.user_id == user_b_id).delete()

        print("================================================================================")
        print("TEST 1: Send initial message for User A")
        print("================================================================================")
        q1 = "My complaint is about garbage collection."
        res1 = await chatbot.chat(question=q1, user=user_a)
        print("User A Q1:", q1)
        print("Assistant A1:", res1["answer"])

        # Check DB for User A
        history_a_db1 = await memory_service.get_history(user_a_id)
        print("User A DB Record Count:", len(history_a_db1))

        print("\n================================================================================")
        print("TEST 2: Follow-up question referencing previous context ('it') for User A")
        print("================================================================================")
        q2 = "Which department handles it?"
        res2 = await chatbot.chat(question=q2, user=user_a)
        print("User A Q2:", q2)
        print("Assistant A2:", res2["answer"])

        print("\n================================================================================")
        print("TEST 3: User B Isolation Test")
        print("================================================================================")
        # User A sends a message about roads
        q_a3 = "My complaint is about roads."
        await chatbot.chat(question=q_a3, user=user_a)

        # User B sends ambiguous follow up
        q_b1 = "What is its status?"
        res_b1 = await chatbot.chat(question=q_b1, user=user_b)
        print("User B Q1:", q_b1)
        print("Assistant B1:", res_b1["answer"])

        # Verify User B history has NO reference to User A's roads message
        history_b = await memory_service.get_history(user_b_id)
        print("User B DB Record Count:", len(history_b))
        has_roads_in_b_history = any("roads" in rec.message.lower() for rec in history_b)
        print("User B sees User A's history?", has_roads_in_b_history)

        print("\n================================================================================")
        print("TEST 4: Inspect chat_history Collection Documents in MongoDB")
        print("================================================================================")
        all_entries_a = await memory_service.get_history(user_a_id)
        print(f"\n--- Chat History for User A ({user_a_id}) ---")
        for entry in all_entries_a:
            print({"user_id": entry.user_id, "role": entry.role, "message": entry.message})

        all_entries_b = await memory_service.get_history(user_b_id)
        print(f"\n--- Chat History for User B ({user_b_id}) ---")
        for entry in all_entries_b:
            print({"user_id": entry.user_id, "role": entry.role, "message": entry.message})

    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
