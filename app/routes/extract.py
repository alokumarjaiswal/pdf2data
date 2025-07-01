from fastapi import APIRouter, Form, HTTPException
from app.extract.extractor import run_extraction
import os

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