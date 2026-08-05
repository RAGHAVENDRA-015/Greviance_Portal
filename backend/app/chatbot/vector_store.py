# app/chatbot/vector_store.py

from pathlib import Path
from langchain_community.vectorstores import FAISS

from app.chatbot.config import VECTOR_DB_PATH
from app.chatbot.embeddings import EmbeddingModel


class FAISSVectorStore:

    
    def __init__(self):
        self.embedding = EmbeddingModel.get_embeddings()
        self.index_path = Path(VECTOR_DB_PATH)
        self.db = None

    def create(self, documents):
        return FAISS.from_documents(
            documents,
            self.embedding,
        )

    def save(self, vector_store):
        self.index_path.mkdir(parents=True, exist_ok=True)
        vector_store.save_local(str(self.index_path))

    def load(self):
        if self.db is None:
            self.db = FAISS.load_local(
                str(self.index_path),
                self.embedding,
                allow_dangerous_deserialization=True,
            )
        return self.db

    def similarity_search(self, query: str, k: int = 5):
        return self.load().similarity_search(query=query, k=k)

    def similarity_search_with_score(self, query: str, k: int = 5):
        db = self.load()
        return db.similarity_search_with_score(query=query, k=k)