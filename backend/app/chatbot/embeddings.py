import gc
import logging
import threading
from typing import Any, Optional

from app.chatbot.config import EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class EmbeddingModel:
    """
    Thread-safe lazy singleton wrapper around the embedding model.
    Defers importing heavy PyTorch/HuggingFace libraries until first embedding request.
    """

    _embeddings: Optional[Any] = None
    _lock = threading.Lock()

    @classmethod
    def get_embeddings(cls):
        """
        Lazily import and initialize HuggingFaceEmbeddings on CPU with memory optimizations.
        """
        if cls._embeddings is None:
            with cls._lock:
                if cls._embeddings is None:
                    logger.info("Initializing HuggingFace embedding model: %s", EMBEDDING_MODEL)
                    try:
                        import torch

                        # Limit PyTorch CPU threads to reduce RAM and CPU overhead on low-resource tiers
                        torch.set_num_threads(1)
                        torch.set_grad_enabled(False)
                    except Exception as exc:
                        logger.debug("PyTorch thread config warning: %s", exc)

                    from langchain_huggingface import HuggingFaceEmbeddings

                    cls._embeddings = HuggingFaceEmbeddings(
                        model_name=EMBEDDING_MODEL,
                        model_kwargs={"device": "cpu"},
                        encode_kwargs={"normalize_embeddings": True},
                    )
                    gc.collect()
                    logger.info("HuggingFace embedding model initialized successfully.")

        return cls._embeddings