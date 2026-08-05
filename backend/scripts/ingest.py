from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.chatbot.loaders import KnowledgeLoader
from app.chatbot.utils.chunker import DocumentChunker
from app.chatbot.embeddings import EmbeddingModel


def main():

    loader = KnowledgeLoader(ROOT / "knowledge")
    documents = loader.load_documents()

    chunker = DocumentChunker()

    chunks = chunker.split(documents)

    model = EmbeddingModel.get_model()

    embeddings = model.encode(
        [chunk.page_content for chunk in chunks],
        show_progress_bar=True,
    )

    print("=" * 60)
    print(f"Loaded Documents : {len(documents)}")
    print(f"Generated Chunks : {len(chunks)}")
    print(f"Generated Embeddings : {len(embeddings)}")
    print("=" * 60)

    print()

    print("Embedding Dimension:", len(embeddings[0]))

    for i, chunk in enumerate(chunks[:5]):

        print(f"\nChunk {i+1}")
        print("-" * 50)
        print(chunk.metadata["source"])
        print(chunk.page_content[:250])


if __name__ == "__main__":
    main()