from fastapi import APIRouter, Form, HTTPException
import os
import json
from app.parsers.parser_registry import parser_registry
from app.db.mongo import parsed_collection

router = APIRouter()

EXTRACT_DIR = "data/extracted_pages"
PARSED_DIR = "data/parsed_output"
os.makedirs(PARSED_DIR, exist_ok=True)

@router.post("/parse")
async def parse_text(file_id: str = Form(...), mode: str = Form(...), parser: str = Form(...)):
    if parser not in parser_registry:
        raise HTTPException(status_code=400, detail="Invalid parser selected.")

    extract_path = os.path.join(EXTRACT_DIR, f"extracted_{mode}_{file_id}.txt")
    if not os.path.exists(extract_path):
        raise HTTPException(status_code=404, detail="Extracted file not found.")

    with open(extract_path, "r", encoding="utf-8") as f:
        extracted_text = f.read()

    parser_instance = parser_registry[parser]()
    parsed_list = parser_instance.parse_content(extracted_text)
    parsed_output = parsed_list if isinstance(parsed_list, list) else []

    upload_meta_path = os.path.join("data/uploaded_pdfs", f"meta_{file_id}.json")
    original_filename = "Unknown.pdf"

    if os.path.exists(upload_meta_path):
        with open(upload_meta_path, "r", encoding="utf-8") as f:
            upload_meta = json.load(f)
            original_filename = upload_meta.get("original_filename", original_filename)


    parsed_path = os.path.join(PARSED_DIR, f"parsed_{file_id}.json")
    with open(parsed_path, "w", encoding="utf-8") as out:
        json.dump(parsed_output, out, indent=2)

    meta_path = os.path.join(PARSED_DIR, f"meta_{file_id}.json")
    with open(meta_path, "w", encoding="utf-8") as meta:
        json.dump({"parser": parser}, meta)

    await parsed_collection.replace_one(
    {"_id": file_id},
    {
        "_id": file_id,
        "parser": parser,
        "original_filename": original_filename,
        "tables": parsed_output
    },
    upsert=True
    )

    return {
        "file_id": file_id,
        "parser_used": parser,
        "message": "Parsing complete and stored in DB",
        "saved_as": os.path.basename(parsed_path)
    }
