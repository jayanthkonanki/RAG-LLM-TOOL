import asyncio
from backend.rag_agent import rag_query

async def main():
    print("Testing general question (should NOT call tool)...")
    res1 = await rag_query("Hello! Who are you?", [])
    print(f"Response 1: {res1}\n")

    print("Testing specific question (SHOULD call tool)...")
    res2 = await rag_query("What endpoints do we have for users?", [])
    print(f"Response 2: {res2}\n")

if __name__ == "__main__":
    asyncio.run(main())
