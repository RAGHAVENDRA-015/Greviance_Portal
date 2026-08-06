import gc
import logging
import os
import threading
from typing import Any, Optional

from app.chatbot.config import EMBEDDING_MODEL
from app.core.config import settings

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
                    # Enforce 1 thread limit BEFORE importing C++ libraries (OpenMP/MKL) to prevent RAM explosion on multi-core hosts
                    os.environ.setdefault("OMP_NUM_THREADS", "1")
                    os.environ.setdefault("MKL_NUM_THREADS", "1")
                    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
                    os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
                    os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
                    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

                    if settings.HF_TOKEN:
                        os.environ["HF_TOKEN"] = settings.HF_TOKEN

                    logger.info("Initializing HuggingFace embedding model: %s", EMBEDDING_MODEL)
                    try:
                        import torch

                        torch.set_num_threads(1)
                        torch.set_grad_enabled(False)
                    except Exception as exc:
                        logger.debug("PyTorch thread config warning: %s", exc)

                    from langchain_huggingface import HuggingFaceEmbeddings

                    model_kwargs = {"device": "cpu"}
                    if settings.HF_TOKEN:
                        model_kwargs["token"] = settings.HF_TOKEN

                    # Try loading from local cache first to save network traffic & RAM
                    try:
                        cls._embeddings = HuggingFaceEmbeddings(
                            model_name=EMBEDDING_MODEL,
                            model_kwargs={**model_kwargs, "local_files_only": True},
                            encode_kwargs={"normalize_embeddings": True},
                        )
                    except Exception:
                        cls._embeddings = HuggingFaceEmbeddings(
                            model_name=EMBEDDING_MODEL,
                            model_kwargs=model_kwargs,
                            encode_kwargs={"normalize_embeddings": True},
                        )

                    gc.collect()
                    logger.info("HuggingFace embedding model initialized successfully.")

        return cls._embeddings