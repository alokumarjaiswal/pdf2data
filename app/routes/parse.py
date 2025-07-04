from fastapi import APIRouter, Form, HTTPException
from app.parsers.parser_registry import parser_registry
from app.db.mongo import parsed_collection, DocumentManager, ExtractionManager, LogManager
from app.utils.temp_file import safe_temp_file
from datetime import datetime
import json
import os

router = APIRouter()

@router.post("/parse")
async def parse_text(
    file_id: str = Form(...), 
    parser: str = Form(...),
    prompt: str = Form(None),
    json_schema: str = Form(None),
    page_num: int = Form(0)
):
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
        # Special handling for AIParser to pass custom prompt, schema, and PDF for image analysis
        if parser == "AIParser":
            # Get PDF content for image processing
            pdf_content = await DocumentManager.get_pdf_content(file_id)
            
            if pdf_content and (prompt or json_schema):
                parser_instance = parser_registry[parser](prompt=prompt, schema=json_schema)
            else:
                parser_instance = parser_registry[parser]()
            
            # Use temporary file for PDF image processing
            if pdf_content:
                with safe_temp_file(suffix='.pdf', prefix=f'parse_{file_id}_', content=pdf_content) as temp_pdf_path:
                    parsed_list = parser_instance.parse_content(extracted_text, pdf_path=temp_pdf_path, page_num=page_num)
            else:
                # Fallback to text-only parsing if PDF not available
                parsed_list = parser_instance.parse_content(extracted_text)
        else:
            # Standard parsing for other parsers
            parser_instance = parser_registry[parser]()
            parsed_list = parser_instance.parse_content(extracted_text)
        parsed_output = parsed_list if isinstance(parsed_list, list) else []

        # Additional safeguard: Check if any parsing results indicate failure
        if parsed_output and isinstance(parsed_output, list):
            for item in parsed_output:
                if isinstance(item, dict) and item.get("success") is False:
                    error_msg = item.get("error", "Unknown parsing error")
                    raise Exception(f"Parser returned failed result: {error_msg}")

        # Store parsed data in database (existing parsed_collection)
        parsed_data = {
            "_id": file_id,
            "parser": parser,
            "original_filename": original_filename,
            "tables": parsed_output,
            "uploaded_at": datetime.utcnow().isoformat(),
            "extraction_mode_used": used_mode,
            "num_entries": len(parsed_output),
            "processing_completed": True,
            "saved": False  # Requires manual approval via Save button
        }
        
        await parsed_collection.replace_one(
            {"_id": file_id},
            parsed_data,
            upsert=True
        )

        # Also save parsed output to data directory
        parsed_dir = "data/parsed_output"
        os.makedirs(parsed_dir, exist_ok=True)
        json_file_path = os.path.join(parsed_dir, f"parsed_{file_id}.json")
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(parsed_data, f, indent=2, ensure_ascii=False, default=str)

        # Update document processing stage
        await DocumentManager.update_processing_stage(file_id, "parsed", True)

        # Log the parsing
        log_metadata = {
            "parser": parser,
            "extraction_mode_used": used_mode,
            "num_entries": len(parsed_output),
            "original_filename": original_filename,
            "json_file_path": json_file_path
        }
        
        # Add AIParser-specific metadata
        if parser == "AIParser":
            log_metadata.update({
                "has_custom_prompt": bool(prompt),
                "has_custom_schema": bool(json_schema),
                "image_analysis_page": page_num,
                "image_analysis_enabled": True
            })
        
        await LogManager.store_log(
            file_id=file_id,
            process_type="parsing",
            log_content=f"Parsing completed successfully using {parser} with {'image analysis + ' if parser == 'AIParser' else ''}text processing (saved to {json_file_path})",
            metadata=log_metadata
        )

        return {
            "file_id": file_id,
            "parser_used": parser,
            "extraction_mode_used": used_mode,
            "num_entries": len(parsed_output),
            "message": "Parsing complete and stored in database and file system",
            "saved_as": f"parsed_{file_id}.json",  # Keep for API compatibility
            "file_path": json_file_path
        }

    except Exception as e:
        error_message = str(e)
        
        # Enhanced error messages for AIParser
        if parser == "AIParser":
            if "OpenAI" in error_message or "API key" in error_message:
                error_message = "OpenAI API key error. Please verify your OPENAI_API_KEY environment variable is set correctly."
            elif "JSON" in error_message:
                error_message = "AI response format error. The AI returned invalid JSON. Try simplifying your schema or prompt."
            elif "quota" in error_message.lower() or "rate limit" in error_message.lower():
                error_message = "OpenAI API quota or rate limit exceeded. Please check your OpenAI account usage."
            elif "model" in error_message.lower():
                error_message = "OpenAI model error. The requested model may not be available."
            elif prompt or json_schema:
                error_message = f"AI parsing failed with custom configuration: {error_message}. Try using default settings."
        
        # Log the error
        await LogManager.store_log(
            file_id=file_id,
            process_type="parsing",
            log_content=f"Parsing failed: {error_message}",
            metadata={
                "error": True, 
                "parser": parser,
                "has_custom_prompt": bool(prompt),
                "has_custom_schema": bool(json_schema),
                "original_error": str(e)
            }
        )
        raise HTTPException(status_code=500, detail=f"Parsing failed: {error_message}")
