from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
from datetime import datetime
from typing import Optional, Dict, Any
import logging

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client["pdf_parser_db"]

# Collections for different data types
documents_collection = db["documents"]           # Upload metadata & tracking
extractions_collection = db["extractions"]       # Extracted text & metadata  
parsed_collection = db["parsed_documents"]       # Final parsed data (existing)
processing_logs_collection = db["processing_logs"] # All processing logs

# GridFS bucket for large file storage (PDFs)
gridfs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="pdf_files")

# Setup logging
logger = logging.getLogger(__name__)

class DocumentManager:
    """Handles all document-related database operations"""
    
    @staticmethod
    async def create_document(file_id: str, original_filename: str, file_content: bytes) -> Dict[str, Any]:
        """Create a new document record and store PDF in GridFS"""
        try:
            # Store PDF in GridFS
            grid_in = gridfs_bucket.open_upload_stream(
                filename=f"original_{file_id}.pdf",
                metadata={
                    "file_id": file_id,
                    "original_filename": original_filename,
                    "content_type": "application/pdf",
                    "uploaded_at": datetime.utcnow()
                }
            )
            await grid_in.write(file_content)
            await grid_in.close()
            
            # Create document metadata record
            document_record = {
                "_id": file_id,
                "original_filename": original_filename,
                "gridfs_file_id": grid_in._id,
                "status": "uploaded",
                "uploaded_at": datetime.utcnow(),
                "file_size": len(file_content),
                "processing_stages": {
                    "uploaded": True,
                    "extracted": False,
                    "parsed": False
                }
            }
            
            await documents_collection.insert_one(document_record)
            logger.info(f"Document {file_id} stored successfully in database")
            
            return {
                "file_id": file_id,
                "original_filename": original_filename,
                "gridfs_file_id": str(grid_in._id),
                "file_size": len(file_content)
            }
            
        except Exception as e:
            logger.error(f"Error storing document {file_id}: {str(e)}")
            raise
    
    @staticmethod
    async def get_document_metadata(file_id: str) -> Optional[Dict[str, Any]]:
        """Get document metadata"""
        return await documents_collection.find_one({"_id": file_id})
    
    @staticmethod
    async def get_pdf_content(file_id: str) -> Optional[bytes]:
        """Retrieve PDF content from GridFS"""
        try:
            # Find the document metadata first
            doc = await documents_collection.find_one({"_id": file_id})
            if not doc:
                return None
            
            # Get the PDF from GridFS
            grid_out = await gridfs_bucket.open_download_stream(doc["gridfs_file_id"])
            content = await grid_out.read()
            return content
            
        except Exception as e:
            logger.error(f"Error retrieving PDF for {file_id}: {str(e)}")
            return None
    
    @staticmethod
    async def update_processing_stage(file_id: str, stage: str, status: bool = True):
        """Update processing stage status"""
        await documents_collection.update_one(
            {"_id": file_id},
            {
                "$set": {
                    f"processing_stages.{stage}": status,
                    f"last_updated": datetime.utcnow()
                }
            }
        )

class ExtractionManager:
    """Handles all extraction-related database operations"""
    
    @staticmethod
    async def store_extraction(file_id: str, mode: str, extracted_text: str, 
                             num_pages: int, num_chars: int, method: str) -> Dict[str, Any]:
        """Store extracted text and metadata"""
        extraction_record = {
            "_id": f"{file_id}_{mode}",
            "file_id": file_id,
            "extraction_mode": mode,
            "method_used": method,
            "extracted_text": extracted_text,
            "num_pages": num_pages,
            "num_chars": num_chars,
            "extracted_at": datetime.utcnow(),
            "status": "completed"
        }
        
        await extractions_collection.replace_one(
            {"_id": f"{file_id}_{mode}"},
            extraction_record,
            upsert=True
        )
        
        # Update document processing stage
        await DocumentManager.update_processing_stage(file_id, "extracted", True)
        
        logger.info(f"Extraction {file_id}_{mode} stored successfully")
        return extraction_record
    
    @staticmethod
    async def get_extraction(file_id: str, preferred_mode: str = None) -> Optional[Dict[str, Any]]:
        """Get extracted text, trying preferred mode first, then any available"""
        if preferred_mode:
            extraction = await extractions_collection.find_one({"_id": f"{file_id}_{preferred_mode}"})
            if extraction:
                return extraction
        
        # Try all modes in order of preference
        for mode in ["digital", "ocr", "auto"]:
            extraction = await extractions_collection.find_one({"_id": f"{file_id}_{mode}"})
            if extraction:
                return extraction
        
        return None

class LogManager:
    """Handles all processing logs"""
    
    @staticmethod
    async def store_log(file_id: str, process_type: str, log_content: str, metadata: Dict = None):
        """Store processing logs"""
        log_record = {
            "file_id": file_id,
            "process_type": process_type,  # "extraction", "parsing", "upload"
            "log_content": log_content,
            "metadata": metadata or {},
            "logged_at": datetime.utcnow()
        }
        
        await processing_logs_collection.insert_one(log_record)
    
    @staticmethod
    async def get_logs(file_id: str, process_type: str = None):
        """Retrieve logs for a file"""
        query = {"file_id": file_id}
        if process_type:
            query["process_type"] = process_type
            
        cursor = processing_logs_collection.find(query).sort("logged_at", 1)
        return await cursor.to_list(length=None)

# Initialize database indexes for better performance
async def init_database():
    """Initialize database indexes and constraints"""
    # Documents collection indexes
    await documents_collection.create_index("uploaded_at")
    await documents_collection.create_index("status")
    
    # Extractions collection indexes  
    await extractions_collection.create_index("file_id")
    await extractions_collection.create_index("extraction_mode")
    await extractions_collection.create_index("extracted_at")
    
    # Parsed documents indexes (existing)
    await parsed_collection.create_index("uploaded_at")
    await parsed_collection.create_index("parser")
    
    # Processing logs indexes
    await processing_logs_collection.create_index([("file_id", 1), ("process_type", 1)])
    await processing_logs_collection.create_index("logged_at")
    
    logger.info("Database indexes initialized successfully")
