import os
from pathlib import Path
import pdfplumber
from pdf2image import convert_from_path
import pytesseract
import time
import gc
from typing import Callable, Optional

def run_extraction(
    pdf_path: str, 
    file_id: str, 
    mode: str, 
    output_dir: str = "data/extracted_pages", 
    ocr_lang: str = "eng",
    log_callback: Optional[Callable[[str], None]] = None
) -> dict:
    
    def log(message: str):
        if log_callback:
            log_callback(message)
    
    try:
        log("Initializing extraction environment...")
        os.makedirs(output_dir, exist_ok=True)
        time.sleep(0.2)
        
        log(f"Opening PDF file: {os.path.basename(pdf_path)}")
        time.sleep(0.3)
        
        output_text = ""
        method_used = mode
        num_pages = 0

        if mode == "digital":
            log("Using digital extraction method")
            log("Reading PDF structure...")
            
            with pdfplumber.open(pdf_path) as pdf:
                num_pages = len(pdf.pages)
                log(f"Document contains {num_pages} pages")
                time.sleep(0.2)
                
                for i, page in enumerate(pdf.pages):
                    log(f"Processing page {i + 1}/{num_pages}...")
                    text = page.extract_text()
                    if text:
                        output_text += f"\n--- Page {i + 1} ---\n{text}"
                        log(f"✓ Extracted {len(text)} characters from page {i + 1}")
                    else:
                        log(f"⚠ Page {i + 1} contains no extractable text")
                    time.sleep(0.1)
                    
            if not output_text.strip():
                log("✗ Digital extraction failed - no text found")
                raise ValueError("Digital extraction failed (empty)")
            else:
                log("✓ Digital extraction completed successfully")

        elif mode == "ocr":
            log("Using OCR extraction method")
            log("Converting PDF pages to images...")
            
            images = convert_from_path(pdf_path, dpi=300)
            num_pages = len(images)
            log(f"Generated {num_pages} images at 300 DPI")
            time.sleep(0.5)
            
            log(f"Starting OCR processing with language: {ocr_lang}")
            for i, image in enumerate(images):
                log(f"Running OCR on page {i + 1}/{num_pages}...")
                text = pytesseract.image_to_string(image, lang=ocr_lang)
                output_text += f"\n--- Page {i + 1} ---\n{text}"
                log(f"✓ OCR completed for page {i + 1} - {len(text)} characters extracted")
                
                # Force cleanup of image from memory after processing
                del image
                if i % 5 == 0:  # Force garbage collection every 5 pages
                    gc.collect()
                
                time.sleep(0.3)
            
            # Final cleanup
            del images
            gc.collect()
            log("✓ OCR extraction completed successfully")

        elif mode == "auto":
            log("Using auto-detection mode")
            log("Attempting digital extraction first...")
            
            # Try digital first, fallback to OCR
            try:
                return run_extraction(pdf_path, file_id, "digital", output_dir, ocr_lang, log_callback)
            except Exception as e:
                log(f"⚠ Digital extraction failed: {str(e)}")
                log("Falling back to OCR extraction...")
                time.sleep(0.5)
                return run_extraction(pdf_path, file_id, "ocr", output_dir, ocr_lang, log_callback)

        else:
            log(f"✗ Invalid extraction mode: {mode}")
            raise ValueError("Invalid extraction mode")

        # Save extracted text
        log("Preparing output file...")
        filename = f"extracted_{mode}_{file_id}.txt"
        output_path = Path(output_dir) / filename
        
        log(f"Writing extracted content to: {filename}")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(output_text)
        time.sleep(0.2)
        
        log("✓ Text extraction file saved successfully")
        log(f"✓ Total characters extracted: {len(output_text)}")
        log("✓ Extraction process completed")

        return {
            "output_path": str(output_path),
            "num_pages": num_pages,
            "num_chars": len(output_text),
            "method": mode
        }
        
    except Exception as e:
        log(f"✗ ERROR: {str(e)}")
        log("✗ Extraction process failed")
        raise

def run_extraction_from_content(
    pdf_path: str, 
    file_id: str, 
    mode: str, 
    log_callback: Optional[Callable[[str], None]] = None
) -> dict:
    """
    Extract text from PDF and return content instead of saving to file.
    This version is optimized for database storage.
    """
    
    def log(message: str):
        if log_callback:
            log_callback(message)
    
    try:
        log("Initializing extraction environment...")
        time.sleep(0.2)
        
        log(f"Opening PDF file: {os.path.basename(pdf_path)}")
        time.sleep(0.3)
        
        output_text = ""
        method_used = mode
        num_pages = 0

        if mode == "digital":
            log("Using digital extraction method")
            log("Reading PDF structure...")
            
            with pdfplumber.open(pdf_path) as pdf:
                num_pages = len(pdf.pages)
                log(f"Document contains {num_pages} pages")
                time.sleep(0.2)
                
                for i, page in enumerate(pdf.pages):
                    log(f"Processing page {i + 1}/{num_pages}...")
                    text = page.extract_text()
                    if text:
                        output_text += f"\n--- Page {i + 1} ---\n{text}"
                        log(f"✓ Extracted {len(text)} characters from page {i + 1}")
                    else:
                        log(f"⚠ Page {i + 1} contains no extractable text")
                    time.sleep(0.1)
                    
            if not output_text.strip():
                log("✗ Digital extraction failed - no text found")
                raise ValueError("Digital extraction failed (empty)")
            else:
                log("✓ Digital extraction completed successfully")

        elif mode == "ocr":
            log("Using OCR extraction method")
            log("Converting PDF pages to images...")
            
            images = convert_from_path(pdf_path, dpi=300)
            num_pages = len(images)
            log(f"Generated {num_pages} images at 300 DPI")
            time.sleep(0.5)
            
            log(f"Starting OCR processing with language: eng")
            for i, image in enumerate(images):
                log(f"Running OCR on page {i + 1}/{num_pages}...")
                text = pytesseract.image_to_string(image, lang="eng")
                output_text += f"\n--- Page {i + 1} ---\n{text}"
                log(f"✓ OCR completed for page {i + 1} - {len(text)} characters extracted")
                
                # Force cleanup of image from memory after processing
                del image
                if i % 5 == 0:  # Force garbage collection every 5 pages
                    gc.collect()
                
                time.sleep(0.3)
            
            # Final cleanup
            del images
            gc.collect()
            log("✓ OCR extraction completed successfully")

        elif mode == "auto":
            log("Using auto-detection mode")
            log("Attempting digital extraction first...")
            
            # Try digital first, fallback to OCR
            try:
                return run_extraction_from_content(pdf_path, file_id, "digital", log_callback)
            except Exception as e:
                log(f"⚠ Digital extraction failed: {str(e)}")
                log("Falling back to OCR extraction...")
                time.sleep(0.5)
                return run_extraction_from_content(pdf_path, file_id, "ocr", log_callback)

        else:
            log(f"✗ Invalid extraction mode: {mode}")
            raise ValueError("Invalid extraction mode")

        log("✓ Text extraction completed successfully")
        log(f"✓ Total characters extracted: {len(output_text)}")
        log("✓ Extraction process completed")

        return {
            "extracted_text": output_text,
            "num_pages": num_pages,
            "num_chars": len(output_text),
            "method": mode
        }
        
    except Exception as e:
        log(f"✗ ERROR: {str(e)}")
        log("✗ Extraction process failed")
        raise
