from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader
from langchain_community.document_loaders import TextLoader


class KnowledgeLoader:
    """Loads all knowledge documents."""

    def __init__(self, knowledge_path: str):
        self.knowledge_path = Path(knowledge_path)

    def load_documents(self):
        loader = DirectoryLoader(
            str(self.knowledge_path),
            glob="**/*.md",
            loader_cls=TextLoader,
            show_progress=True,
        )

        documents = loader.load()

        return documents