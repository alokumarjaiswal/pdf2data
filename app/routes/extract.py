from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.extract.extractor import run_extraction_from_content
from app.db.mongo import DocumentManager, ExtractionManager, LogManager
from app.utils.temp_file import safe_temp_file
from app.utils.memory_monitor import MemoryMonitor, force_cleanup
import json
import asyncio
import os
from queue import Queue
import threading

router = APIRouter()

VALID_MODES = ["digital", "ocr", "auto"]
MAX_SSE_MESSAGE_SIZE = 32768  # 32KB limit for individual SSE messages

def safe_sse_message(message_type, data=None, message=None):
    """Safely create SSE message, ensuring it doesn't exceed size limits"""
    if message_type == 'log':
        response_data = {'type': 'log', 'message': message}
    elif message_type == 'error':
        response_data = {'type': 'error', 'message': message}
    elif message_type == 'success':
        # For success, only send essential data without large text content
        response_data = {'type': 'success', 'data': data}
    else:
        response_data = {'type': message_type, 'data': data}
    
    json_str = json.dumps(response_data)
    
    # Check size and truncate if necessary
    if len(json_str) > MAX_SSE_MESSAGE_SIZE:
        if message_type == 'log' and message:
            # Truncate log messages
            truncated_message = message[:MAX_SSE_MESSAGE_SIZE // 2] + "... [message truncated]"
            response_data = {'type': 'log', 'message': truncated_message}
            json_str = json.dumps(response_data)
        else:
            # For other types, send error about size
            response_data = {'type': 'error', 'message': f'Message too large ({len(json_str)} bytes), check server logs'}
            json_str = json.dumps(response_data)
    
    return f"data: {json_str}\n\n"

@router.post("/extract")
async def extract_text(file_id: str = Form(...), mode: str = Form(...)):
    """Extract text from PDF stored in database"""
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="Invalid extraction mode")

    # Get PDF content from database
    pdf_content = await DocumentManager.get_pdf_content(file_id)
    if not pdf_content:
        raise HTTPException(status_code=404, detail="Original PDF not found in database")

    try:
        # Monitor memory usage during extraction
        with MemoryMonitor(f"extraction_{mode}_{file_id}"):
            # Use safe temporary file handling with automatic cleanup
            with safe_temp_file(suffix='.pdf', prefix=f'extract_{file_id}_', content=pdf_content) as temp_pdf_path:
                # Run extraction
                result = run_extraction_from_content(temp_pdf_path, file_id, mode)
                
                # Store extracted text in database
                extraction_record = await ExtractionManager.store_extraction(
                    file_id=file_id,
                    mode=mode,
                    extracted_text=result["extracted_text"],
                    num_pages=result["num_pages"],
                    num_chars=result["num_chars"],
                    method=result["method"]
                )
                
                # Also save extracted text to data directory
                extracted_dir = "data/extracted_pages"
                os.makedirs(extracted_dir, exist_ok=True)
                text_file_path = os.path.join(extracted_dir, f"extracted_{mode}_{file_id}.txt")
                with open(text_file_path, "w", encoding="utf-8") as f:
                    f.write(result["extracted_text"])
                
                # Log the extraction
                await LogManager.store_log(
                    file_id=file_id,
                    process_type="extraction",
                    log_content=f"Extraction completed successfully using {mode} mode (saved to {text_file_path})",
                    metadata={
                        "mode": mode,
                        "method": result["method"],
                        "pages": result["num_pages"],
                        "chars": result["num_chars"],
                        "text_file_path": text_file_path
                    }
                )
            # Temporary file is automatically cleaned up when exiting the context
        
        # Force cleanup after extraction
        force_cleanup()

    except Exception as e:
        # Log the error
        await LogManager.store_log(
            file_id=file_id,
            process_type="extraction",
            log_content=f"Extraction failed: {str(e)}",
            metadata={"error": True, "mode": mode}
        )
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "file_id": file_id,
        "mode": result["method"],
        "pages": result["num_pages"],
        "chars": result["num_chars"],
        "saved_as": f"extracted_{mode}_{file_id}.txt",  # Keep for API compatibility
        "file_path": text_file_path,
        "message": "Extraction complete and stored in database and file system"
    }

@router.post("/extract/stream")
async def extract_text_stream(file_id: str = Form(...), mode: str = Form(...)):
    """Extract text with real-time streaming progress"""
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="Invalid extraction mode")

    # Get PDF content from database
    pdf_content = await DocumentManager.get_pdf_content(file_id)
    if not pdf_content:
        raise HTTPException(status_code=404, detail="Original PDF not found in database")

    # Create queues for log messages and results
    log_queue = Queue()
    result_queue = Queue()
    
    def log_callback(message: str):
        log_queue.put(message)
    
    def run_extraction_thread():
        try:
            # Monitor memory usage during streaming extraction
            with MemoryMonitor(f"extraction_stream_{mode}_{file_id}"):
                # Use safe temporary file handling with automatic cleanup
                with safe_temp_file(suffix='.pdf', prefix=f'extract_stream_{file_id}_', content=pdf_content) as temp_pdf_path:
                    result = run_extraction_from_content(temp_pdf_path, file_id, mode, log_callback=log_callback)
                    result_queue.put(("success", result))
                # Temporary file is automatically cleaned up when exiting the context
            
            # Force cleanup after extraction
            force_cleanup()
                
        except Exception as e:
            result_queue.put(("error", str(e)))
        finally:
            log_queue.put("__DONE__")
    
    # Start extraction in a separate thread
    extraction_thread = threading.Thread(target=run_extraction_thread)
    extraction_thread.start()
    
    async def event_stream():
        log_messages = []  # Collect logs for database storage
        
        while True:
            try:
                if not log_queue.empty():
                    message = log_queue.get_nowait()
                    if message == "__DONE__":
                        # Check for final result
                        if not result_queue.empty():
                            result_type, result_data = result_queue.get_nowait()
                            if result_type == "success":
                                # Store extracted text in database
                                await ExtractionManager.store_extraction(
                                    file_id=file_id,
                                    mode=mode,
                                    extracted_text=result_data["extracted_text"],
                                    num_pages=result_data["num_pages"],
                                    num_chars=result_data["num_chars"],
                                    method=result_data["method"]
                                )
                                
                                # Also save extracted text to data directory
                                extracted_dir = "data/extracted_pages"
                                os.makedirs(extracted_dir, exist_ok=True)
                                text_file_path = os.path.join(extracted_dir, f"extracted_{mode}_{file_id}.txt")
                                with open(text_file_path, "w", encoding="utf-8") as f:
                                    f.write(result_data["extracted_text"])
                                
                                # Store all logs in database
                                await LogManager.store_log(
                                    file_id=file_id,
                                    process_type="extraction",
                                    log_content="\n".join(log_messages),
                                    metadata={
                                        "mode": mode,
                                        "method": result_data["method"],
                                        "pages": result_data["num_pages"],
                                        "chars": result_data["num_chars"],
                                        "streaming": True,
                                        "text_file_path": text_file_path
                                    }
                                )
                                
                                # Send success message without the large text content to avoid JSON parsing issues
                                success_data = {
                                    "method": result_data["method"],
                                    "num_pages": result_data["num_pages"],
                                    "num_chars": result_data["num_chars"],
                                    "file_path": text_file_path
                                }
                                yield safe_sse_message('success', success_data)
                            else:
                                # Store error logs
                                await LogManager.store_log(
                                    file_id=file_id,
                                    process_type="extraction",
                                    log_content=f"Extraction failed: {result_data}",
                                    metadata={"error": True, "mode": mode, "streaming": True}
                                )
                                yield safe_sse_message('error', message=result_data)
                        break
                    else:
                        log_messages.append(message)
                        yield safe_sse_message('log', message=message)
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                yield safe_sse_message('error', message=str(e))
                break
    
    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )