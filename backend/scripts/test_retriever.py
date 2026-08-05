from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.chatbot.retriever import KnowledgeRetriever

retriever = KnowledgeRetriever()

results = retriever.retrieve_with_scores(
    "How do I register?"
)

print("=" * 80)

for index, (doc, score) in enumerate(results, start=1):

    print(f"\nResult {index}")
    print("-" * 60)

    print("Document :", doc.metadata["document_name"])
    print("Score    :", score)

    print()

    print(doc.page_content[:300])