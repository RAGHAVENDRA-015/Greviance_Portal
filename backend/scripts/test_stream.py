import asyncio
from app.database.mongodb import init_db, close_db
from app.chatbot.service import ChatbotService

async def main():
    await init_db()
    try:
        service = ChatbotService()
        print("--- Test 1: 'hii' ---")
        async for chunk in service.stream_chat("hii"):
            print(chunk, end="", flush=True)
        print("\n\n--- Test 2: 'How to file a complaint?' ---")
        async for chunk in service.stream_chat("How to file a complaint?"):
            print(chunk, end="", flush=True)
        print("\n")
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())
