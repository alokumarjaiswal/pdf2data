from fastapi import APIRouter, Form, HTTPException
from app.parsers.parser_registry import parser_registry
from app.db.mongo import parsed_collection, DocumentManager, ExtractionManager, LogManager
from datetime import datetime

router = APIRouter()

@router.post("/parse")
async def parse_text(file_id: str = Form(...), parser: str = Form(...)):
    """Parse extracted text from database and store results in database"""
    if parser not in parser_registry:
        raise HTTPException(status_code=400, detail="Invalid parser selected.")

    # Get extracted text from database
    extraction_record = await ExtractionManager.get_extraction(file_id)
    if not extraction_record:
        raise HTTPException(status_code=404, detail="No extracted text found for this document.")

    extracted_text = extraction_record["extracted_text"]
    used_mode = extraction_record["extraction_mode"]

    # Get original filename from document metadata
    doc_metadata = await DocumentManager.get_document_metadata(file_id)
    original_filename = doc_metadata.get("original_filename", "Unknown.pdf") if doc_metadata else "Unknown.pdf"

    try:
        # Parse the extracted text
        parser_instance = parser_registry[parser]()
        parsed_list = parser_instance.parse_content(extracted_text)
        parsed_output = parsed_list if isinstance(parsed_list, list) else []

        # Store parsed data in database (existing parsed_collection)
        await parsed_collection.replace_one(
            {"_id": file_id},
            {
                "_id": file_id,
                "parser": parser,
                "original_filename": original_filename,
                "tables": parsed_output,
                "uploaded_at": datetime.utcnow().isoformat(),
                "extraction_mode_used": used_mode,
                "num_entries": len(parsed_output),
                "processing_completed": True
            },
            upsert=True
        )

        # Update document processing stage
        await DocumentManager.update_processing_stage(file_id, "parsed", True)

        # Log the parsing
        await LogManager.store_log(
            file_id=file_id,
            process_type="parsing",
            log_content=f"Parsing completed successfully using {parser}",
            metadata={
                "parser": parser,
                "extraction_mode_used": used_mode,
                "num_entries": len(parsed_output),
                "original_filename": original_filename
            }
        )

        return {
            "file_id": file_id,
            "parser_used": parser,
            "extraction_mode_used": used_mode,
            "num_entries": len(parsed_output),
            "message": "Parsing complete and stored in database",
            "saved_as": f"parsed_{file_id}.json"  # Keep for API compatibility
        }

    except Exception as e:
        # Log the error
        await LogManager.store_log(
            file_id=file_id,
            process_type="parsing",
            log_content=f"Parsing failed: {str(e)}",
            metadata={"error": True, "parser": parser}
        )
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
