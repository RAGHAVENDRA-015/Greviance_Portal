from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from pathlib import Path


class DocumentChunker:
    """Splits documents into overlapping chunks."""

    def __init__(
        self,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
    ):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n# ",
                "\n## ",
                "\n### ",
                "\n\n",
                "\n",
                " ",
                "",
            ],
        )

    def split(self, documents: list[Document]) -> list[Document]:

        chunks = self.text_splitter.split_documents(documents)

        for chunk in chunks:
            source = Path(chunk.metadata["source"])
            chunk.metadata["document_name"] = source.stem

        return chunks