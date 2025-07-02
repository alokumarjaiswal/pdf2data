import psutil
import gc
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MemoryMonitor:
    """
    Monitor memory usage during PDF processing operations.
    Helps identify memory leaks and resource usage patterns.
    """
    
    def __init__(self, operation_name: str = "operation"):
        self.operation_name = operation_name
        self.start_memory = None
        self.peak_memory = None
        
    def __enter__(self):
        """Start monitoring memory usage."""
        # Force garbage collection before measuring
        gc.collect()
        
        # Get current memory usage
        process = psutil.Process()
        self.start_memory = process.memory_info().rss / 1024 / 1024  # MB
        self.peak_memory = self.start_memory
        
        logger.debug(f"Memory monitor started for '{self.operation_name}': {self.start_memory:.2f} MB")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop monitoring and log memory usage summary."""
        # Force garbage collection
        gc.collect()
        
        # Get final memory usage
        process = psutil.Process()
        end_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        memory_delta = end_memory - self.start_memory
        peak_delta = self.peak_memory - self.start_memory
        
        log_level = logging.WARNING if memory_delta > 50 else logging.DEBUG
        logger.log(log_level, 
                  f"Memory usage for '{self.operation_name}': "
                  f"Start: {self.start_memory:.2f} MB, "
                  f"End: {end_memory:.2f} MB, "
                  f"Delta: {memory_delta:+.2f} MB, "
                  f"Peak: {self.peak_memory:.2f} MB (+{peak_delta:.2f} MB)")
        
        if memory_delta > 50:
            logger.warning(f"High memory usage detected in '{self.operation_name}': {memory_delta:.2f} MB increase")
    
    def check_memory(self):
        """Check current memory usage and update peak."""
        process = psutil.Process()
        current_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        if current_memory > self.peak_memory:
            self.peak_memory = current_memory
            
        return current_memory

def get_system_memory_info() -> Dict[str, Any]:
    """Get comprehensive system memory information."""
    memory = psutil.virtual_memory()
    process = psutil.Process()
    
    return {
        "system_total_mb": memory.total / 1024 / 1024,
        "system_available_mb": memory.available / 1024 / 1024,
        "system_used_percent": memory.percent,
        "process_memory_mb": process.memory_info().rss / 1024 / 1024,
        "process_memory_percent": process.memory_percent()
    }

def log_memory_usage(operation: str = "operation"):
    """Simple decorator/context manager for logging memory usage."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            with MemoryMonitor(f"{operation}:{func.__name__}"):
                return func(*args, **kwargs)
        return wrapper
    return decorator

def force_cleanup():
    """Force garbage collection and cleanup."""
    collected = gc.collect()
    logger.debug(f"Garbage collection freed {collected} objects")
    return collected 