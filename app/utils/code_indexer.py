import os
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import logging
import ast

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Define which file extensions to index
SUPPORTED_EXTENSIONS = ['.py', '.tsx', '.ts', '.js']
# Define directories to exclude from indexing
EXCLUDED_DIRS = ['__pycache__', 'node_modules', '.venv', 'dist']
# Path to store the generated index and mapping
INDEX_PATH = 'data/code_search.index'
MAPPING_PATH = 'data/code_mapping.pkl'

class CodeIndexer:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """Initializes the CodeIndexer with a sentence transformer model."""
        logger.info(f"Loading sentence transformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.code_chunks = []

    def _find_source_files(self, root_dir):
        """Finds all source code files in the project, respecting exclusions."""
        source_files = []
        for root, dirs, files in os.walk(root_dir):
            # Exclude specified directories
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            
            for file in files:
                if any(file.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                    source_files.append(os.path.join(root, file))
        logger.info(f"Found {len(source_files)} source files to index.")
        return source_files

    def _chunk_file(self, file_path):
        """
        Splits a file into chunks of code.
        Uses AST for Python files to chunk by function/class.
        Uses whole-file chunking for other types.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                return # Skip empty files

            # Use AST for Python files for granular chunking
            if file_path.endswith('.py'):
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                            chunk_content = ast.get_source_segment(content, node)
                            if chunk_content:
                                self.code_chunks.append({
                                    "file_path": file_path,
                                    "identifier": node.name,
                                    "type": type(node).__name__,
                                    "content": chunk_content
                                })
                except SyntaxError as e:
                    logger.warning(f"Could not parse {file_path} with AST due to {e}. Indexing as a whole file.")
                    # Fallback to whole-file chunking for files with syntax errors
                    self.code_chunks.append({
                        "file_path": file_path,
                        "identifier": os.path.basename(file_path),
                        "type": "file",
                        "content": content
                    })
            else:
                # For non-Python files, use whole-file chunking
                self.code_chunks.append({
                    "file_path": file_path,
                    "identifier": os.path.basename(file_path),
                    "type": "file",
                    "content": content
                })

        except Exception as e:
            logger.error(f"Error reading or chunking file {file_path}: {e}")

    def generate_index(self, project_root='.'):
        """Generates the FAISS index for all code in the project."""
        logger.info("Starting code indexing process...")
        source_files = self._find_source_files(project_root)
        
        for file_path in source_files:
            self._chunk_file(file_path)
        
        if not self.code_chunks:
            logger.warning("No code chunks found to index.")
            return

        logger.info(f"Encoding {len(self.code_chunks)} code chunks...")
        # Get the content of each chunk for encoding
        contents = [chunk['content'] for chunk in self.code_chunks]
        embeddings = self.model.encode(contents, show_progress_bar=True)
        
        # Create a FAISS index
        embedding_dim = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(embedding_dim)
        self.index.add(np.array(embeddings, dtype=np.float32))
        
        logger.info("FAISS index created successfully.")

    def save_index(self):
        """Saves the FAISS index and the code chunk mapping to disk."""
        if self.index is None:
            logger.error("Index has not been generated yet. Cannot save.")
            return

        # Ensure the data directory exists
        os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)

        # Save the FAISS index
        faiss.write_index(self.index, INDEX_PATH)
        logger.info(f"Index saved to {INDEX_PATH}")

        # Save the mapping from index ID to code chunk
        with open(MAPPING_PATH, 'wb') as f:
            pickle.dump(self.code_chunks, f)
        logger.info(f"Code chunk mapping saved to {MAPPING_PATH}")

def run_indexing():
    """Main function to run the indexing process."""
    indexer = CodeIndexer()
    # We assume this script is run from the project root
    indexer.generate_index('.')
    indexer.save_index()

if __name__ == '__main__':
    run_indexing()
