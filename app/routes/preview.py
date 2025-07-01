from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import os
import json

router = APIRouter()

templates = Jinja2Templates(directory="app/templates")
PARSED_DIR = "data/parsed_output"

@router.get("/preview/{file_id}", response_class=HTMLResponse)
async def preview_parsed_output(request: Request, file_id: str):
    parsed_path = os.path.join(PARSED_DIR, f"parsed_{file_id}.json")
    meta_path = os.path.join(PARSED_DIR, f"meta_{file_id}.json")

    if not os.path.exists(parsed_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Parsed or metadata file not found.")

    with open(parsed_path, "r", encoding="utf-8") as f:
        parsed_data = json.load(f)

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    parser_name = meta.get("parser", "generic").lower()
    template_name = f"preview/{parser_name}.html"
    template_path = os.path.join("app/templates", template_name)

    if not os.path.exists(template_path):
        template_name = "preview/generic.html"
        
    upload_meta_path = os.path.join("data/uploaded_pdfs", f"meta_{file_id}.json")
    original_filename = "Unknown.pdf"

    if os.path.exists(upload_meta_path):
        with open(upload_meta_path, "r", encoding="utf-8") as f:
            upload_meta = json.load(f)
            original_filename = upload_meta.get("original_filename", original_filename)


    return templates.TemplateResponse(template_name, {
        "request": request,
        "data": parsed_data,
        "file_id": file_id,
        "original_filename": original_filename,
    })
