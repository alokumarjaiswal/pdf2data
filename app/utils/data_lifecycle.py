import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.db.mongo import (
    documents_collection, 
    extractions_collection, 
    parsed_collection, 
    processing_logs_collection, 
    gridfs_bucket
)

logger = logging.getLogger(__name__)

class DataLifecycleManager:
    """
    Manages the complete lifecycle of document data including:
    - Orphaned data cleanup
    - Incomplete workflow detection
    - Comprehensive deletion with validation
    - Data integrity verification
    """
    
    @staticmethod
    async def find_orphaned_documents(max_age_hours: int = 168) -> List[Dict[str, Any]]:
        """
        Find documents that have been uploaded and possibly extracted but never parsed.
        
        Args:
            max_age_hours: Maximum age in hours for a document to be considered orphaned (default 7 days)
            
        Returns:
            List of orphaned document metadata
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        # Find documents that are uploaded, possibly extracted, but not parsed
        orphaned_docs = []
        
        async for doc in documents_collection.find({
            "uploaded_at": {"$lt": cutoff_time},
            "processing_stages.uploaded": True,
            "processing_stages.parsed": False
        }):
            # Check if this document exists in parsed_collection
            parsed_doc = await parsed_collection.find_one({"_id": doc["_id"]})
            if not parsed_doc:
                orphaned_docs.append({
                    "file_id": doc["_id"],
                    "original_filename": doc.get("original_filename"),
                    "uploaded_at": doc.get("uploaded_at"),
                    "processing_stages": doc.get("processing_stages"),
                    "file_size": doc.get("file_size"),
                    "age_hours": (datetime.utcnow() - doc["uploaded_at"]).total_seconds() / 3600
                })
        
        logger.info(f"Found {len(orphaned_docs)} orphaned documents older than {max_age_hours} hours")
        return orphaned_docs
    
    @staticmethod
    async def cleanup_orphaned_document(file_id: str) -> Dict[str, Any]:
        """
        Clean up all data associated with an orphaned document.
        
        Args:
            file_id: ID of the document to clean up
            
        Returns:
            Dictionary with cleanup results
        """
        cleanup_results = {
            "file_id": file_id,
            "deleted_items": [],
            "errors": [],
            "warnings": []
        }
        
        try:
            # 1. Check if document is actually orphaned (safety check)
            parsed_doc = await parsed_collection.find_one({"_id": file_id})
            if parsed_doc:
                cleanup_results["warnings"].append("Document is not orphaned - has parsed data")
                return cleanup_results
            
            # 2. Get document metadata first
            doc_metadata = await documents_collection.find_one({"_id": file_id})
            if not doc_metadata:
                cleanup_results["warnings"].append("Document metadata not found")
                return cleanup_results
            
            # 3. Delete extractions
            extraction_result = await extractions_collection.delete_many({"file_id": file_id})
            if extraction_result.deleted_count > 0:
                cleanup_results["deleted_items"].append(f"extractions ({extraction_result.deleted_count})")
            
            # 4. Delete processing logs
            logs_result = await processing_logs_collection.delete_many({"file_id": file_id})
            if logs_result.deleted_count > 0:
                cleanup_results["deleted_items"].append(f"logs ({logs_result.deleted_count})")
            
            # 5. Delete PDF from GridFS
            if "gridfs_file_id" in doc_metadata:
                try:
                    await gridfs_bucket.delete(doc_metadata["gridfs_file_id"])
                    cleanup_results["deleted_items"].append("pdf_file")
                except Exception as e:
                    cleanup_results["errors"].append(f"Failed to delete GridFS file: {str(e)}")
            
            # 6. Delete document metadata (last step)
            doc_result = await documents_collection.delete_one({"_id": file_id})
            if doc_result.deleted_count > 0:
                cleanup_results["deleted_items"].append("document_metadata")
            
            # 7. Log the cleanup
            logger.info(f"Cleaned up orphaned document {file_id}: {cleanup_results['deleted_items']}")
            
        except Exception as e:
            cleanup_results["errors"].append(f"Cleanup failed: {str(e)}")
            logger.error(f"Failed to cleanup orphaned document {file_id}: {str(e)}")
        
        return cleanup_results
    
    @staticmethod
    async def cleanup_all_orphaned_documents(max_age_hours: int = 168, dry_run: bool = False) -> Dict[str, Any]:
        """
        Clean up all orphaned documents older than specified age.
        
        Args:
            max_age_hours: Maximum age in hours for cleanup (default 7 days)
            dry_run: If True, only find orphaned docs without deleting
            
        Returns:
            Summary of cleanup operation
        """
        orphaned_docs = await DataLifecycleManager.find_orphaned_documents(max_age_hours)
        
        if dry_run:
            return {
                "dry_run": True,
                "found_orphaned": len(orphaned_docs),
                "orphaned_documents": orphaned_docs
            }
        
        cleanup_summary = {
            "total_found": len(orphaned_docs),
            "successfully_cleaned": 0,
            "failed_cleanups": 0,
            "cleanup_details": []
        }
        
        for doc in orphaned_docs:
            result = await DataLifecycleManager.cleanup_orphaned_document(doc["file_id"])
            cleanup_summary["cleanup_details"].append(result)
            
            if result["errors"]:
                cleanup_summary["failed_cleanups"] += 1
            else:
                cleanup_summary["successfully_cleaned"] += 1
        
        logger.info(f"Orphaned cleanup summary: {cleanup_summary['successfully_cleaned']} cleaned, "
                   f"{cleanup_summary['failed_cleanups']} failed")
        
        return cleanup_summary
    
    @staticmethod
    async def enhanced_delete_document(file_id: str) -> Dict[str, Any]:
        """
        Enhanced deletion with comprehensive validation and logging.
        Replaces the basic delete functionality.
        
        Args:
            file_id: ID of the document to delete
            
        Returns:
            Detailed deletion results
        """
        deletion_results = {
            "file_id": file_id,
            "deleted_items": [],
            "errors": [],
            "warnings": [],
            "validation": {}
        }
        
        try:
            # 1. Pre-deletion validation
            doc_metadata = await documents_collection.find_one({"_id": file_id})
            parsed_doc = await parsed_collection.find_one({"_id": file_id})
            
            deletion_results["validation"] = {
                "has_metadata": doc_metadata is not None,
                "has_parsed_data": parsed_doc is not None,
                "has_gridfs_file": doc_metadata and "gridfs_file_id" in doc_metadata if doc_metadata else False
            }
            
            if not doc_metadata and not parsed_doc:
                deletion_results["warnings"].append("Document not found in any collection")
                return deletion_results
            
            # 2. Delete from parsed_documents collection
            result = await parsed_collection.delete_one({"_id": file_id})
            if result.deleted_count > 0:
                deletion_results["deleted_items"].append("parsed_document")
            
            # 3. Delete from extractions collection (all modes)
            extraction_result = await extractions_collection.delete_many({"file_id": file_id})
            if extraction_result.deleted_count > 0:
                deletion_results["deleted_items"].append(f"extractions ({extraction_result.deleted_count})")
            
            # 4. Delete processing logs
            logs_result = await processing_logs_collection.delete_many({"file_id": file_id})
            if logs_result.deleted_count > 0:
                deletion_results["deleted_items"].append(f"logs ({logs_result.deleted_count})")
            
            # 5. Delete PDF from GridFS
            if doc_metadata and "gridfs_file_id" in doc_metadata:
                try:
                    await gridfs_bucket.delete(doc_metadata["gridfs_file_id"])
                    deletion_results["deleted_items"].append("pdf_file")
                except Exception as e:
                    deletion_results["errors"].append(f"Failed to delete GridFS file: {str(e)}")
            
            # 6. Delete document metadata (last step)
            if doc_metadata:
                doc_result = await documents_collection.delete_one({"_id": file_id})
                if doc_result.deleted_count > 0:
                    deletion_results["deleted_items"].append("document_metadata")
            
            # 7. Post-deletion verification
            remaining_data = await DataLifecycleManager.verify_complete_deletion(file_id)
            if remaining_data["has_remaining_data"]:
                deletion_results["warnings"].append(f"Some data may remain: {remaining_data}")
            
            # 8. Log the deletion
            logger.info(f"Enhanced deletion of {file_id}: {deletion_results['deleted_items']}")
            
        except Exception as e:
            deletion_results["errors"].append(f"Deletion failed: {str(e)}")
            logger.error(f"Failed to delete document {file_id}: {str(e)}")
        
        return deletion_results
    
    @staticmethod
    async def verify_complete_deletion(file_id: str) -> Dict[str, Any]:
        """
        Verify that all data for a file_id has been completely deleted.
        
        Args:
            file_id: ID to check for remaining data
            
        Returns:
            Dictionary with verification results
        """
        verification = {
            "file_id": file_id,
            "has_remaining_data": False,
            "remaining_items": []
        }
        
        # Check each collection
        checks = [
            ("documents", await documents_collection.find_one({"_id": file_id})),
            ("parsed", await parsed_collection.find_one({"_id": file_id})),
            ("extractions", await extractions_collection.find_one({"file_id": file_id})),
            ("logs", await processing_logs_collection.find_one({"file_id": file_id}))
        ]
        
        for collection_name, data in checks:
            if data:
                verification["remaining_items"].append(collection_name)
                verification["has_remaining_data"] = True
        
        return verification
    
    @staticmethod
    async def get_data_lifecycle_stats() -> Dict[str, Any]:
        """
        Get comprehensive statistics about document lifecycle and data health.
        
        Returns:
            Dictionary with lifecycle statistics
        """
        stats = {}
        
        # Basic counts
        stats["total_documents"] = await documents_collection.count_documents({})
        stats["total_extractions"] = await extractions_collection.count_documents({})
        stats["total_parsed"] = await parsed_collection.count_documents({})
        stats["total_logs"] = await processing_logs_collection.count_documents({})
        
        # Processing stage analysis
        stats["uploaded_only"] = await documents_collection.count_documents({
            "processing_stages.uploaded": True,
            "processing_stages.extracted": False,
            "processing_stages.parsed": False
        })
        
        stats["extracted_not_parsed"] = await documents_collection.count_documents({
            "processing_stages.uploaded": True,
            "processing_stages.extracted": True,
            "processing_stages.parsed": False
        })
        
        stats["fully_processed"] = await documents_collection.count_documents({
            "processing_stages.uploaded": True,
            "processing_stages.extracted": True,
            "processing_stages.parsed": True
        })
        
        # Orphaned data (older than 7 days instead of 24 hours)
        orphaned_docs = await DataLifecycleManager.find_orphaned_documents(168)  # Changed from 24 to 168 hours
        stats["orphaned_documents"] = len(orphaned_docs)
        
        # Age analysis
        cutoff_1h = datetime.utcnow() - timedelta(hours=1)
        cutoff_24h = datetime.utcnow() - timedelta(hours=24)
        cutoff_7d = datetime.utcnow() - timedelta(days=7)
        
        stats["recent_uploads"] = {
            "last_hour": await documents_collection.count_documents({"uploaded_at": {"$gte": cutoff_1h}}),
            "last_24_hours": await documents_collection.count_documents({"uploaded_at": {"$gte": cutoff_24h}}),
            "last_7_days": await documents_collection.count_documents({"uploaded_at": {"$gte": cutoff_7d}})
        }
        
        return stats 