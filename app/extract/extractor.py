import os
from pathlib import Path
import pdfplumber
from pdf2image import convert_from_path
import pytesseract

def run_extraction(pdf_path: str, file_id: str, mode: str, output_dir: str = "data/extracted_pages", ocr_lang: str = "eng") -> dict:
    os.makedirs(output_dir, exist_ok=True)
    output_text = ""
    method_used = mode
    num_pages = 0

    if mode == "digital":
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    output_text += f"\n--- Page {i + 1} ---\n{text}"
        if not output_text.strip():
            raise ValueError("Digital extraction failed (empty)")

    elif mode == "ocr":
        images = convert_from_path(pdf_path, dpi=300)
        num_pages = len(images)
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image, lang=ocr_lang)
            output_text += f"\n--- Page {i + 1} ---\n{text}"

    elif mode == "auto":
        # Try digital first, fallback to OCR
        try:
            return run_extraction(pdf_path, file_id, "digital", output_dir)
        except Exception:
            return run_extraction(pdf_path, file_id, "ocr", output_dir)

    else:
        raise ValueError("Invalid extraction mode")

    # Save extracted text
    filename = f"extracted_{mode}_{file_id}.txt"
    output_path = Path(output_dir) / filename
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(output_text)

    return {
        "output_path": str(output_path),
        "num_pages": num_pages,
        "num_chars": len(output_text),
        "method": mode
    }
