from fastapi import APIRouter, UploadFile, File, HTTPException
from uuid import uuid4
import os
import tempfile
import pdfplumber
from app.db.mongo import DocumentManager, LogManager
from app.utils.memory_monitor import MemoryMonitor, force_cleanup

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF file and store in database via GridFS with immediate page counting"""
    print(f"🔵 Upload started for file: {file.filename}")
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        error_detail = {
            "error_code": "INVALID_FILE_TYPE",
            "message": f"Invalid file type: '{file.filename}'. Only PDF files are allowed."
        }
        print(f"❌ {error_detail['message']}")
        raise HTTPException(status_code=400, detail=error_detail)
    
    file_id = str(uuid4())
    print(f"🔵 Generated file_id: {file_id}")
    
    try:
        # Monitor memory usage during upload
        with MemoryMonitor(f"upload_{file_id}"):
            print(f"🔵 Reading file content...")
            # Read file content
            file_content = await file.read()
            print(f"🔵 File content read successfully, size: {len(file_content)} bytes")
            
            if len(file_content) == 0:
                error_detail = {
                    "error_code": "EMPTY_FILE_UPLOADED",
                    "message": "The uploaded file is empty."
                }
                print(f"❌ {error_detail['message']}")
                raise HTTPException(status_code=400, detail=error_detail)
            
            # Validate file size (50MB limit)
            max_size_bytes = 50 * 1024 * 1024  # 50MB
            if len(file_content) > max_size_bytes:
                error_detail = {
                    "error_code": "FILE_TOO_LARGE",
                    "message": f"File too large. Maximum size is 50MB. File size: {len(file_content) / 1024 / 1024:.1f}MB"
                }
                print(f"❌ {error_detail['message']}")
                raise HTTPException(status_code=413, detail=error_detail)
            
            # Count pages immediately upon upload
            print(f"🔵 Counting PDF pages...")
            page_count = 0
            try:
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
                    temp_file.write(file_content)
                    temp_pdf_path = temp_file.name
                
                try:
                    with pdfplumber.open(temp_pdf_path) as pdf:
                        page_count = len(pdf.pages)
                        print(f"✅ PDF contains {page_count} pages")
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_pdf_path)
                    except:
                        pass
                        
            except Exception as e:
                print(f"⚠️ Could not count pages immediately: {e}")
                page_count = 1  # Fallback to 1 page
            
            print(f"🔵 Starting database storage...")
            # Store in database using DocumentManager with page count
            result = await DocumentManager.create_document(
                file_id=file_id,
                original_filename=file.filename,
                file_content=file_content,
                additional_metadata={"page_count": page_count}
            )
            print(f"✅ Database storage completed successfully")
            
            print(f"🔵 Saving to local directory...")
            # Also save to data directory
            uploaded_dir = "data/uploaded_pdfs"
            os.makedirs(uploaded_dir, exist_ok=True)
            file_path = os.path.join(uploaded_dir, f"original_{file_id}.pdf")
            with open(file_path, "wb") as f:
                f.write(file_content)
            print(f"✅ Local file saved: {file_path}")
            
            print(f"🔵 Storing upload log...")
            # Log the upload
            await LogManager.store_log(
                file_id=file_id,
                process_type="upload",
                log_content=f"PDF uploaded successfully: {file.filename} (saved to {file_path}) - {page_count} pages detected",
                metadata={
                    "file_size": len(file_content),
                    "content_type": file.content_type,
                    "file_path": file_path,
                    "page_count": page_count
                }
            )
            print(f"✅ Upload log stored successfully")
        
        print(f"🔵 Running memory cleanup...")
        # Force cleanup after upload
        force_cleanup()
        print(f"✅ Memory cleanup completed")
        
        print(f"🎉 Upload completed successfully for file_id: {file_id}")
        return {
            "file_id": file_id,
            "original_filename": file.filename,
            "saved_as": f"original_{file_id}.pdf",  # Keep for API compatibility
            "file_path": file_path,
            "file_size": len(file_content),
            "page_count": page_count,
            "status": "uploaded"
        }
        
    except Exception as e:
        print(f"❌ Upload failed for file_id {file_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Log the error
        try:
            await LogManager.store_log(
                file_id=file_id,
                process_type="upload",
                log_content=f"Upload failed: {str(e)}",
                metadata={"error": True}
            )
        except Exception as log_error:
            print(f"❌ Failed to log error: {log_error}")
            
        error_detail = {
            "error_code": "UPLOAD_FAILED",
            "message": f"An unexpected error occurred during upload: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=error_detail)
