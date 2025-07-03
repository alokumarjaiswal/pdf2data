import os
import hashlib
import json
import time
import threading
from pathlib import Path
from typing import Dict, Set
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from .code_indexer import CodeIndexer

logger = logging.getLogger(__name__)

class SmartCodeIndexer:
    """
    An intelligent code indexer that:
    1. Only rebuilds when files actually change
    2. Supports incremental updates
    3. Watches for file changes in real-time
    4. Runs indexing in background threads
    """
    
    def __init__(self):
        self.indexer = CodeIndexer()
        self.file_hashes_path = 'data/file_hashes.json'
        self.last_hashes = self._load_file_hashes()
        self.observer = None
        self.is_watching = False
        
    def _load_file_hashes(self) -> Dict[str, str]:
        """Load previously computed file hashes."""
        try:
            if os.path.exists(self.file_hashes_path):
                with open(self.file_hashes_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load file hashes: {e}")
        return {}
    
    def _save_file_hashes(self, hashes: Dict[str, str]):
        """Save file hashes to disk."""
        try:
            os.makedirs(os.path.dirname(self.file_hashes_path), exist_ok=True)
            with open(self.file_hashes_path, 'w') as f:
                json.dump(hashes, f, indent=2)
        except Exception as e:
            logger.error(f"Could not save file hashes: {e}")
    
    def _compute_file_hash(self, file_path: str) -> str:
        """Compute MD5 hash of a file."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""
    
    def _get_current_file_hashes(self) -> Dict[str, str]:
        """Compute hashes for all source files."""
        current_hashes = {}
        source_files = self.indexer._find_source_files('.')
        
        for file_path in source_files:
            current_hashes[file_path] = self._compute_file_hash(file_path)
        
        return current_hashes
    
    def needs_reindex(self) -> bool:
        """Check if any files have changed since last index."""
        if not os.path.exists('data/code_search.index'):
            logger.info("No existing index found, full reindex needed")
            return True
        
        current_hashes = self._get_current_file_hashes()
        
        # Check for new, modified, or deleted files
        if set(current_hashes.keys()) != set(self.last_hashes.keys()):
            logger.info("File list changed, reindex needed")
            return True
        
        for file_path, current_hash in current_hashes.items():
            if current_hash != self.last_hashes.get(file_path):
                logger.info(f"File changed: {file_path}, reindex needed")
                return True
        
        logger.info("No file changes detected, skipping reindex")
        return False
    
    def run_smart_indexing(self):
        """Run indexing only if needed."""
        if self.needs_reindex():
            logger.info("🔄 Running code indexing...")
            start_time = time.time()
            
            self.indexer.generate_index('.')
            self.indexer.save_index()
            
            # Update our hash cache
            current_hashes = self._get_current_file_hashes()
            self.last_hashes = current_hashes
            self._save_file_hashes(current_hashes)
            
            elapsed = time.time() - start_time
            logger.info(f"✅ Code indexing complete in {elapsed:.2f}s")
        else:
            logger.info("⏩ Code index is up-to-date, skipping")

class CodeFileWatcher(FileSystemEventHandler):
    """Watches for file changes and triggers reindexing."""
    
    def __init__(self, smart_indexer: SmartCodeIndexer):
        self.smart_indexer = smart_indexer
        self.last_reindex = 0
        self.reindex_cooldown = 5  # seconds
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        # Only reindex for supported file types
        if any(event.src_path.endswith(ext) for ext in ['.py', '.tsx', '.ts', '.js']):
            current_time = time.time()
            if current_time - self.last_reindex > self.reindex_cooldown:
                logger.info(f"📝 File changed: {event.src_path}")
                # Run reindexing in background thread
                threading.Thread(
                    target=self.smart_indexer.run_smart_indexing,
                    daemon=True
                ).start()
                self.last_reindex = current_time

def start_smart_indexing():
    """Start the smart indexing system."""
    smart_indexer = SmartCodeIndexer()
    
    # Initial indexing (only if needed)
    smart_indexer.run_smart_indexing()
    
    # Start file watching in background
    def start_watching():
        try:
            event_handler = CodeFileWatcher(smart_indexer)
            observer = Observer()
            observer.schedule(event_handler, '.', recursive=True)
            observer.start()
            smart_indexer.observer = observer
            smart_indexer.is_watching = True
            logger.info("👁️  File watching started - index will auto-update on changes")
        except Exception as e:
            logger.warning(f"Could not start file watching: {e}")
    
    # Start watching in background thread
    watch_thread = threading.Thread(target=start_watching, daemon=True)
    watch_thread.start()
    
    return smart_indexer
