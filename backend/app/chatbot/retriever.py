# app/chatbot/retriever.py

from langchain_core.documents import Document

from app.chatbot.vector_store import FAISSVectorStore


class KnowledgeRetriever:

    def __init__(self):
        self.vector_store = FAISSVectorStore()

    def retrieve(
        self,
        query: str,
        k: int = 8,
    ) -> list[Document]:

        return self.vector_store.similarity_search(
            query=query,
            k=k,
        )

    def retrieve_with_scores(
        self,
        query: str,
        k: int = 8,
    ):


        return self.vector_store.similarity_search_with_score(
            query=query,
            k=k,
        )