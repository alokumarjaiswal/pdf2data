import os
import tempfile
import logging
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger(__name__)

@contextmanager
def safe_temp_file(suffix: str = '', prefix: str = 'pdf2data_', content: bytes = None) -> Generator[str, None, None]:
    """
    Context manager for safe temporary file handling.
    
    Automatically creates and cleans up temporary files, even if an exception occurs.
    
    Args:
        suffix: File extension (e.g., '.pdf')
        prefix: File name prefix for easier identification
        content: Optional content to write to the file
        
    Yields:
        str: Path to the temporary file
        
    Example:
        with safe_temp_file(suffix='.pdf', content=pdf_bytes) as temp_path:
            # Use temp_path here
            result = process_file(temp_path)
        # File is automatically cleaned up
    """
    temp_fd = None
    temp_path = None
    
    try:
        # Create temporary file
        temp_fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix=prefix)
        logger.debug(f"Created temporary file: {temp_path}")
        
        # Write content if provided
        if content is not None:
            with os.fdopen(temp_fd, 'wb') as temp_file:
                temp_file.write(content)
            temp_fd = None  # File descriptor is now closed
        else:
            # Close the file descriptor if no content was written
            os.close(temp_fd)
            temp_fd = None
            
        yield temp_path
        
    except Exception as e:
        logger.error(f"Error in safe_temp_file: {e}")
        raise
        
    finally:
        # Clean up file descriptor if still open
        if temp_fd is not None:
            try:
                os.close(temp_fd)
            except OSError:
                pass
        
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.debug(f"Cleaned up temporary file: {temp_path}")
            except OSError as e:
                logger.warning(f"Failed to clean up temporary file {temp_path}: {e}")


class TempFileManager:
    """
    Manager for tracking and cleaning up multiple temporary files.
    Useful for operations that create multiple temp files.
    """
    
    def __init__(self):
        self.temp_files = []
    
    def create_temp_file(self, suffix: str = '', prefix: str = 'pdf2data_', content: bytes = None) -> str:
        """
        Create a temporary file and track it for cleanup.
        
        Returns:
            str: Path to the temporary file
        """
        temp_fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix=prefix)
        self.temp_files.append(temp_path)
        
        try:
            if content is not None:
                with os.fdopen(temp_fd, 'wb') as temp_file:
                    temp_file.write(content)
            else:
                os.close(temp_fd)
                
            logger.debug(f"Created tracked temporary file: {temp_path}")
            return temp_path
            
        except Exception:
            # If writing fails, clean up immediately
            try:
                os.close(temp_fd)
            except OSError:
                pass
            self.cleanup_file(temp_path)
            raise
    
    def cleanup_file(self, temp_path: str):
        """Clean up a specific temporary file."""
        if temp_path in self.temp_files:
            self.temp_files.remove(temp_path)
        
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.debug(f"Cleaned up temporary file: {temp_path}")
            except OSError as e:
                logger.warning(f"Failed to clean up temporary file {temp_path}: {e}")
    
    def cleanup_all(self):
        """Clean up all tracked temporary files."""
        for temp_path in self.temp_files[:]:  # Copy list to avoid modification during iteration
            self.cleanup_file(temp_path)
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup_all() 