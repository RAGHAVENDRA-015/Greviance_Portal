from sentence_transformers import SentenceTransformer

from app.chatbot.config import EMBEDDING_MODEL


class EmbeddingModel:

    _model = None

    @classmethod
    def get_model(cls):

        if cls._model is None:
            cls._model = SentenceTransformer(EMBEDDING_MODEL)

        return cls._model