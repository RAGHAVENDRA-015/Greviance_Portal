from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.chatbot.loaders import KnowledgeLoader
from app.chatbot.utils.chunker import DocumentChunker
from app.chatbot.vector_store import FAISSVectorStore


def main():

    loader = KnowledgeLoader(ROOT / "knowledge")

    documents = loader.load_documents()

    chunker = DocumentChunker()

    chunks = chunker.split(documents)

    vector_db = FAISSVectorStore()

    db = vector_db.create(chunks)

    vector_db.save(db)

    print()

    print("=" * 60)

    print(f"Documents : {len(documents)}")
    print(f"Chunks     : {len(chunks)}")

    print("FAISS Index Created Successfully")

    print("=" * 60)


if __name__ == "__main__":
    main()