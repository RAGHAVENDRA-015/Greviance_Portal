import asyncio
from app.database.mongodb import init_db, close_db
from app.chatbot.tools.complaint_tool import ComplaintTool

async def main():
    await init_db()
    try:
        tool = ComplaintTool()
        fake_citizen_id = "650000000000000000000000"
        
        print("--- Testing get_my_complaints ---")
        complaints = await tool.get_my_complaints(fake_citizen_id)
        print("Complaints:", complaints)

        print("\n--- Testing get_complaint_status ---")
        status_result = await tool.get_complaint_status(fake_citizen_id)
        print("Status result:", status_result)

        print("\n--- Testing summarize_complaints ---")
        summary = await tool.summarize_complaints(fake_citizen_id)
        print("Summary:", summary)
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())