from langchain_huggingface import HuggingFaceEmbeddings

from app.chatbot.config import EMBEDDING_MODEL


class EmbeddingModel:
    """Singleton wrapper around the embedding model."""

    _embeddings = None

    @classmethod
    def get_embeddings(cls):

        if cls._embeddings is None:

            cls._embeddings = HuggingFaceEmbeddings(
                model_name=EMBEDDING_MODEL,
                model_kwargs={
                    "device": "cpu"
                },
                encode_kwargs={
                    "normalize_embeddings": True
                }
            )

        return cls._embeddings