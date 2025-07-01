from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.extract.extractor import run_extraction
import os
import json
import asyncio
from queue import Queue
import threading

router = APIRouter()

UPLOAD_DIR = "data/uploaded_pdfs"
EXTRACT_DIR = "data/extracted_pages"
os.makedirs(EXTRACT_DIR, exist_ok=True)

VALID_MODES = ["digital", "ocr", "auto"]

@router.post("/extract")
async def extract_text(file_id: str = Form(...), mode: str = Form(...)):
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="Invalid extraction mode")

    pdf_path = os.path.join(UPLOAD_DIR, f"original_{file_id}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Original PDF not found")

    try:
        result = run_extraction(pdf_path, file_id, mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "file_id": file_id,
        "mode": result["method"],
        "pages": result["num_pages"],
        "chars": result["num_chars"],
        "saved_as": os.path.basename(result["output_path"]),
        "message": "Extraction complete"
    }

@router.post("/extract/stream")
async def extract_text_stream(file_id: str = Form(...), mode: str = Form(...)):
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="Invalid extraction mode")

    pdf_path = os.path.join(UPLOAD_DIR, f"original_{file_id}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Original PDF not found")

    # Create a queue for log messages
    log_queue = Queue()
    result_queue = Queue()
    
    def log_callback(message: str):
        log_queue.put(message)
    
    def run_extraction_thread():
        try:
            result = run_extraction(pdf_path, file_id, mode, log_callback=log_callback)
            result_queue.put(("success", result))
        except Exception as e:
            result_queue.put(("error", str(e)))
        finally:
            log_queue.put("__DONE__")  # Signal completion
    
    # Start extraction in a separate thread
    extraction_thread = threading.Thread(target=run_extraction_thread)
    extraction_thread.start()
    
    async def event_stream():
        while True:
            try:
                # Check for log messages
                if not log_queue.empty():
                    message = log_queue.get_nowait()
                    if message == "__DONE__":
                        # Check for final result
                        if not result_queue.empty():
                            result_type, result_data = result_queue.get_nowait()
                            if result_type == "success":
                                yield f"data: {json.dumps({'type': 'success', 'data': result_data})}\n\n"
                            else:
                                yield f"data: {json.dumps({'type': 'error', 'message': result_data})}\n\n"
                        break
                    else:
                        yield f"data: {json.dumps({'type': 'log', 'message': message})}\n\n"
                
                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
                
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
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