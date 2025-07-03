import faiss
import pickle
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
INDEX_PATH = 'data/code_search.index'
MAPPING_PATH = 'data/code_mapping.pkl'

class CodeSearcher:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        """Initializes the CodeSearcher and loads the index from disk."""
        self.model = None
        self.index = None
        self.code_chunks = []
        self._load_model_and_index(model_name)

    def _load_model_and_index(self, model_name):
        """Loads the model, FAISS index, and code mapping."""
        try:
            logger.info(f"Loading sentence transformer model: {model_name}")
            self.model = SentenceTransformer(model_name)
            
            logger.info(f"Loading FAISS index from {INDEX_PATH}")
            self.index = faiss.read_index(INDEX_PATH)
            
            logger.info(f"Loading code chunk mapping from {MAPPING_PATH}")
            with open(MAPPING_PATH, 'rb') as f:
                self.code_chunks = pickle.load(f)
            
            logger.info("Code searcher initialized successfully.")
        except FileNotFoundError:
            logger.error("Index files not found. Please run the indexing script first.")
            # Allow the application to start, but search will not work.
            self.index = None 
        except Exception as e:
            logger.error(f"Error loading index: {e}")
            self.index = None

    def search(self, query: str, top_k: int = 5, file_type_filter: str = None):
        """Performs a semantic search for a given query with optional filtering."""
        if self.index is None:
            logger.warning("Search attempted but index is not available.")
            return []

        logger.info(f"Performing search for query: '{query}' with top_k={top_k}")
        
        # Encode the query to get its embedding
        query_embedding = self.model.encode([query])
        query_embedding_np = np.array(query_embedding, dtype=np.float32)

        # Search the FAISS index with a larger initial set to allow for filtering
        search_k = min(top_k * 3, len(self.code_chunks)) if file_type_filter else top_k
        distances, indices = self.index.search(query_embedding_np, search_k)

        # Format the results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.code_chunks):
                chunk = self.code_chunks[idx]
                
                # Apply file type filter if specified
                if file_type_filter and not chunk['file_path'].endswith(file_type_filter):
                    continue
                
                results.append({
                    "file_path": chunk['file_path'],
                    "content": chunk['content'],
                    "distance": float(distances[0][i]),
                    "identifier": chunk.get('identifier', 'unknown'),
                    "type": chunk.get('type', 'unknown')
                })
                
                # Stop when we have enough results
                if len(results) >= top_k:
                    break
        
        logger.info(f"Found {len(results)} results.")
        return results

# Create a single, reusable instance of the CodeSearcher
# This is important to avoid reloading the model and index on every request.
try:
    searcher_instance = CodeSearcher()
except Exception as e:
    logger.error(f"Failed to initialize CodeSearcher instance: {e}")
    searcher_instance = None
