from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
import json
from app.db.mongo import parsed_collection, documents_collection, extractions_collection, processing_logs_collection, gridfs_bucket
from app.utils.data_lifecycle import DataLifecycleManager

router = APIRouter()

@router.get("/api/list")
async def get_parsed_documents_list():
    """Get list of all parsed documents with enhanced metadata"""
    cursor = parsed_collection.find(
        {}, 
        {
            "_id": 1, 
            "parser": 1, 
            "original_filename": 1, 
            "uploaded_at": 1,
            "extraction_mode_used": 1,
            "num_entries": 1,
            "processing_completed": 1
        }
    )
    docs = await cursor.to_list(length=100)
    
    # Add processing stage information for each document
    for doc in docs:
        file_id = doc["_id"]
        doc_metadata = await documents_collection.find_one({"_id": file_id})
        if doc_metadata:
            doc["processing_stages"] = doc_metadata.get("processing_stages", {})
            doc["file_size"] = doc_metadata.get("file_size")
    
    # Convert datetime objects to strings for JSON serialization
    serializable_docs = json.loads(json.dumps(docs, default=str))
    return {"entries": serializable_docs}

@router.get("/api/data/{file_id}")
async def get_parsed_data(file_id: str, request: Request):
    """Get parsed data for a specific file with enhanced metadata"""
    doc = await parsed_collection.find_one({"_id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Parsed data not found.")
    
    # Keep _id for frontend use, but rename it to file_id for clarity
    doc["file_id"] = doc.pop("_id")
    
    # Add additional metadata from other collections
    doc_metadata = await documents_collection.find_one({"_id": file_id})
    if doc_metadata:
        doc["processing_stages"] = doc_metadata.get("processing_stages", {})
        doc["file_size"] = doc_metadata.get("file_size")
    
    # Add extraction information
    extraction_record = await extractions_collection.find_one({"file_id": file_id})
    if extraction_record:
        doc["extraction_info"] = {
            "mode": extraction_record.get("extraction_mode"),
            "method": extraction_record.get("method_used"),
            "pages": extraction_record.get("num_pages"),
            "chars": extraction_record.get("num_chars"),
            "extracted_at": extraction_record.get("extracted_at")
        }

    pretty = request.query_params.get("pretty") == "1"

    if pretty:
        json_str = json.dumps(doc, indent=2, ensure_ascii=False, default=str)
        return Response(content=json_str, media_type="application/json; charset=utf-8")
    else:
        return JSONResponse(content=json.loads(json.dumps(doc, default=str)))

@router.delete("/api/delete/{file_id}")
async def delete_parsed_document(file_id: str):
    """Delete a parsed document and all its associated data from database with enhanced validation"""
    try:
        # Use enhanced deletion with comprehensive validation and logging
        result = await DataLifecycleManager.enhanced_delete_document(file_id)
        
        if result["errors"]:
            raise HTTPException(status_code=500, detail=f"Deletion failed: {'; '.join(result['errors'])}")
        
        if not result["deleted_items"] and not result["warnings"]:
            raise HTTPException(status_code=404, detail="Document not found in any collection.")

        return {
            "message": "Document deleted successfully with enhanced validation",
            "file_id": file_id,
            "deleted_items": result["deleted_items"],
            "warnings": result["warnings"],
            "validation": result["validation"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@router.get("/api/logs/{file_id}")
async def get_processing_logs(file_id: str, process_type: str = None):
    """Get processing logs for a specific file"""
    query = {"file_id": file_id}
    if process_type:
        query["process_type"] = process_type
    
    cursor = processing_logs_collection.find(query).sort("logged_at", 1)
    logs = await cursor.to_list(length=None)
    
    # Convert datetime objects to strings for JSON serialization
    serializable_logs = json.loads(json.dumps(logs, default=str))
    return {
        "file_id": file_id,
        "process_type": process_type,
        "logs": serializable_logs
    }

@router.get("/api/stats")
async def get_system_stats():
    """Get system statistics from database"""
    stats = {}
    
    # Document counts
    stats["total_documents"] = await documents_collection.count_documents({})
    stats["uploaded_documents"] = await documents_collection.count_documents({"processing_stages.uploaded": True})
    stats["extracted_documents"] = await documents_collection.count_documents({"processing_stages.extracted": True})
    stats["parsed_documents"] = await parsed_collection.count_documents({})
    
    # Extraction statistics
    extraction_stats = await extractions_collection.aggregate([
        {"$group": {
            "_id": "$extraction_mode",
            "count": {"$sum": 1},
            "avg_pages": {"$avg": "$num_pages"},
            "avg_chars": {"$avg": "$num_chars"}
        }}
    ]).to_list(length=None)
    stats["extraction_modes"] = extraction_stats
    
    # Parser statistics  
    parser_stats = await parsed_collection.aggregate([
        {"$group": {
            "_id": "$parser",
            "count": {"$sum": 1},
            "avg_entries": {"$avg": "$num_entries"}
        }}
    ]).to_list(length=None)
    stats["parsers_used"] = parser_stats
    
    # Convert datetime objects to strings for JSON serialization
    return json.loads(json.dumps(stats, default=str))

# New lifecycle management endpoints

@router.get("/api/lifecycle/orphaned")
async def get_orphaned_documents(max_age_hours: int = 24):
    """Get list of orphaned documents (uploaded/extracted but not parsed)"""
    try:
        orphaned_docs = await DataLifecycleManager.find_orphaned_documents(max_age_hours)
        return {
            "found": len(orphaned_docs),
            "max_age_hours": max_age_hours,
            "orphaned_documents": orphaned_docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding orphaned documents: {str(e)}")

@router.post("/api/lifecycle/cleanup")
async def cleanup_orphaned_documents(max_age_hours: int = 24, dry_run: bool = True):
    """Clean up orphaned documents older than specified hours"""
    try:
        if dry_run:
            orphaned_docs = await DataLifecycleManager.find_orphaned_documents(max_age_hours)
            return {
                "dry_run": True,
                "would_delete": len(orphaned_docs),
                "orphaned_documents": orphaned_docs,
                "message": "This was a dry run. Set dry_run=false to actually delete."
            }
        else:
            # Real cleanup - implement cleanup_orphaned_document method
            orphaned_docs = await DataLifecycleManager.find_orphaned_documents(max_age_hours)
            cleanup_results = []
            
            for doc in orphaned_docs:
                result = await DataLifecycleManager.enhanced_delete_document(doc["file_id"])
                cleanup_results.append(result)
            
            successful = sum(1 for r in cleanup_results if not r["errors"])
            failed = len(cleanup_results) - successful
            
            return {
                "dry_run": False,
                "total_found": len(orphaned_docs),
                "successfully_cleaned": successful,
                "failed_cleanups": failed,
                "cleanup_details": cleanup_results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during cleanup: {str(e)}")

@router.get("/api/lifecycle/stats")
async def get_lifecycle_stats():
    """Get comprehensive data lifecycle statistics"""
    try:
        # Basic counts
        stats = {
            "total_documents": await documents_collection.count_documents({}),
            "total_extractions": await extractions_collection.count_documents({}),
            "total_parsed": await parsed_collection.count_documents({}),
            "total_logs": await processing_logs_collection.count_documents({})
        }
        
        # Processing stage analysis
        stats["workflow_stages"] = {
            "uploaded_only": await documents_collection.count_documents({
                "processing_stages.uploaded": True,
                "processing_stages.extracted": False,
                "processing_stages.parsed": False
            }),
            "extracted_not_parsed": await documents_collection.count_documents({
                "processing_stages.uploaded": True,
                "processing_stages.extracted": True,
                "processing_stages.parsed": False
            }),
            "fully_processed": await documents_collection.count_documents({
                "processing_stages.uploaded": True,
                "processing_stages.extracted": True,
                "processing_stages.parsed": True
            })
        }
        
        # Orphaned documents count
        orphaned_docs = await DataLifecycleManager.find_orphaned_documents(24)
        stats["orphaned_documents_24h"] = len(orphaned_docs)
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting lifecycle stats: {str(e)}")
