from fastapi import APIRouter, UploadFile, File
from uuid import uuid4
import os
import shutil
import json

router = APIRouter()

UPLOAD_DIR = "data/uploaded_pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_id = str(uuid4())
    filename = f"original_{file_id}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as out_file:
        shutil.copyfileobj(file.file, out_file)

    meta_path = os.path.join(UPLOAD_DIR, f"meta_{file_id}.json")
    with open(meta_path, "w", encoding="utf-8") as meta_file:
        json.dump({"original_filename": file.filename}, meta_file)

    return {
        "file_id": file_id,
        "original_filename": file.filename,
        "saved_as": filename
    }
