from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
import json
import os
from app.db.mongo import parsed_collection

router = APIRouter()

@router.get("/api/list")
async def get_parsed_documents_list():
    """Get list of all parsed documents"""
    cursor = parsed_collection.find(
        {}, 
        {"_id": 1, "parser": 1, "original_filename": 1, "uploaded_at": 1}
    )
    docs = await cursor.to_list(length=100)
    return {"entries": docs}

@router.get("/api/data/{file_id}")
async def get_parsed_data(file_id: str, request: Request):
    """Get parsed data for a specific file"""
    doc = await parsed_collection.find_one({"_id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Parsed data not found.")
    
    # Keep _id for frontend use, but rename it to file_id for clarity
    doc["file_id"] = doc.pop("_id")

    pretty = request.query_params.get("pretty") == "1"

    if pretty:
        json_str = json.dumps(doc, indent=2, ensure_ascii=False)
        return Response(content=json_str, media_type="application/json; charset=utf-8")
    else:
        return JSONResponse(content=doc)

@router.delete("/api/delete/{file_id}")
async def delete_parsed_document(file_id: str):
    """Delete a parsed document and its associated files"""
    # Delete from database
    result = await parsed_collection.delete_one({"_id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found.")

    # Delete associated files (best effort - don't fail if files don't exist)
    files_to_delete = [
        f"data/parsed_output/parsed_{file_id}.json",
        f"data/parsed_output/meta_{file_id}.json", 
        f"data/uploaded_pdfs/meta_{file_id}.json",
        f"data/uploaded_pdfs/original_{file_id}.pdf"
    ]
    
    # Also try to delete extracted files for all modes
    for mode in ["digital", "ocr", "auto"]:
        files_to_delete.append(f"data/extracted_pages/extracted_{mode}_{file_id}.txt")
    
    deleted_files = []
    for file_path in files_to_delete:
        try:
            os.remove(file_path)
            deleted_files.append(file_path)
        except FileNotFoundError:
            pass  # File already deleted or never existed
    
    return {
        "message": "Document deleted successfully",
        "file_id": file_id,
        "deleted_files": deleted_files
    }
