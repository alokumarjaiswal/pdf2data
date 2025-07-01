from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
import json
from app.db.mongo import parsed_collection

router = APIRouter()

@router.get("/api/data/{file_id}")
async def get_parsed_data(file_id: str, request: Request):
    doc = await parsed_collection.find_one({"_id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Parsed data not found.")
    
    doc.pop("_id", None)  # Remove internal Mongo ID if not needed

    pretty =request.query_params.get("pretty") == "1"

    if pretty:
        json_str = json.dumps(doc, indent=2, ensure_ascii=False)
        return Response(content=json_str, media_type="application/json; charset=utf-8")
    else:
        return JSONResponse(content=doc)
    
    return doc
