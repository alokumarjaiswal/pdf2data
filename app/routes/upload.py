from fastapi import APIRouter, UploadFile, File, HTTPException
from uuid import uuid4
from app.db.mongo import DocumentManager, LogManager
from app.utils.memory_monitor import MemoryMonitor, force_cleanup

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF file and store in database via GridFS"""
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_id = str(uuid4())
    
    try:
        # Monitor memory usage during upload
        with MemoryMonitor(f"upload_{file_id}"):
            # Read file content
            file_content = await file.read()
            
            if len(file_content) == 0:
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            
            # Validate file size (50MB limit)
            max_size_bytes = 50 * 1024 * 1024  # 50MB
            if len(file_content) > max_size_bytes:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Maximum size is 50MB. File size: {len(file_content) / 1024 / 1024:.1f}MB"
                )
            
            # Store in database using DocumentManager
            result = await DocumentManager.create_document(
                file_id=file_id,
                original_filename=file.filename,
                file_content=file_content
            )
            
            # Log the upload
            await LogManager.store_log(
                file_id=file_id,
                process_type="upload",
                log_content=f"PDF uploaded successfully: {file.filename}",
                metadata={
                    "file_size": len(file_content),
                    "content_type": file.content_type
                }
            )
        
        # Force cleanup after upload
        force_cleanup()
        
        return {
            "file_id": file_id,
            "original_filename": file.filename,
            "saved_as": f"original_{file_id}.pdf",  # Keep for API compatibility
            "file_size": len(file_content),
            "status": "uploaded"
        }
        
    except Exception as e:
        # Log the error
        await LogManager.store_log(
            file_id=file_id,
            process_type="upload",
            log_content=f"Upload failed: {str(e)}",
            metadata={"error": True}
        )
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
