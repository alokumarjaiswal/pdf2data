"""
Configuration module for PDF2Data application.
Handles environment variables and application settings.
"""
import os
from typing import Optional
from pathlib import Path

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded environment variables from {env_path}")
except ImportError:
    # python-dotenv not installed, skip
    pass

class Config:
    """Application configuration class."""
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv('OPENAI_API_KEY')
    
    # MongoDB Configuration
    MONGODB_URI: str = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    MONGODB_DB_NAME: str = os.getenv('MONGODB_DB_NAME', 'pdf2data')
    
    # Application Settings
    DEBUG: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    MAX_FILE_SIZE_MB: int = int(os.getenv('MAX_FILE_SIZE_MB', '50'))
    
    @classmethod
    def validate_openai_config(cls) -> bool:
        """Check if OpenAI configuration is valid."""
        return cls.OPENAI_API_KEY is not None and len(cls.OPENAI_API_KEY.strip()) > 0
    
    @classmethod
    def get_openai_api_key(cls) -> str:
        """Get OpenAI API key with validation."""
        if not cls.validate_openai_config():
            raise ValueError(
                "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable or add it to a .env file."
            )
        return cls.OPENAI_API_KEY

# Create a global config instance
config = Config() 