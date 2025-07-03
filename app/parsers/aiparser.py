import json
import base64
import os
from typing import Optional, Dict, Any
from openai import OpenAI
from pdf2image import convert_from_path
from io import BytesIO
from app.config import config

class AIParser:
    def __init__(self, api_key: Optional[str] = None, prompt: Optional[str] = None, schema: Optional[str] = None):
        """
        Initialize AIParser with OpenAI API key and optional parsing configuration.
        
        Args:
            api_key: OpenAI API key. If None, will try to get from configuration
            prompt: Custom prompt for parsing. If None, will use default prompt
            schema: JSON schema for structured output. If None, will use default schema
        """
        # Try to get API key from parameter, then from config
        try:
            self.api_key = api_key or config.get_openai_api_key()
        except ValueError as e:
            raise ValueError(f"OpenAI configuration error: {e}")
        
        self.client = OpenAI(api_key=self.api_key)
        
        # Set default prompt if none provided
        self.prompt = prompt or self._get_default_prompt()
        
        # Set default schema if none provided
        self.schema = schema or self._get_default_schema()

    def _get_default_prompt(self) -> str:
        """Get default prompt for general document parsing."""
        return """
        You are an expert document parser. Please analyze both the provided text and the document image to extract structured information.
        
        Use the visual context from the image to better understand:
        - Table structures and layouts
        - Form fields and their relationships  
        - Visual formatting and emphasis
        - Logos, letterheads, and document types
        - Spatial relationships between data elements
        
        Extract key entities such as:
        - Names and personal information
        - Dates and time references
        - Financial amounts and transactions
        - Company/organization names
        - Addresses and locations
        - Any other important structured data
        
        Be accurate and preserve the original context and meaning from both text and visual elements.
        """

    def _get_default_schema(self) -> str:
        """Get default JSON schema for structured output."""
        return """
        {
            "extracted_data": {
                "entities": [
                    {
                        "type": "string (e.g., 'person', 'organization', 'amount', 'date', 'location')",
                        "value": "string (the actual extracted value)",
                        "context": "string (surrounding context or additional info)"
                    }
                ],
                "summary": "string (brief summary of the document content)",
                "confidence": "number (confidence score between 0 and 1)"
            }
        }
        """

    def parse_content(self, extracted_text: str, pdf_path: Optional[str] = None, page_num: int = 0) -> list:
        """
        Parse extracted text content using AI (required method for parser registry).
        
        This method matches the interface expected by the parser registry system.
        Returns a list to match the expected format (similar to DaybookParser).
        
        Args:
            extracted_text: The text extracted from the PDF
            pdf_path: Optional path to PDF for image analysis
            page_num: Page number to analyze (0-indexed)
            
        Returns:
            List containing a single parsed data dictionary
            
        Raises:
            Exception: If parsing fails (API key issues, network problems, etc.)
        """
        try:
            result = self.parse(
                extracted_text=extracted_text,
                prompt=self.prompt,
                schema=self.schema,
                pdf_path=pdf_path,
                page_num=page_num
            )
            
            # Wrap the result in a format compatible with the existing system
            # Return as a list with one item to match expected format
            return [{
                "parser_type": "AIParser",
                "success": True,
                "data": result,
                "extracted_entities": result.get("extracted_data", {}).get("entities", []),
                "summary": result.get("extracted_data", {}).get("summary", ""),
                "confidence": result.get("extracted_data", {}).get("confidence", 0.0)
            }]
            
        except Exception as e:
            # Re-raise the exception so the main parse route knows parsing failed
            # and doesn't save failed results to the database
            raise Exception(f"AIParser failed: {str(e)}")

    def _encode_page_image(self, pdf_path: str, page_num: int = 0) -> str:
        """Convert PDF page to base64 encoded image."""
        pages = convert_from_path(pdf_path, dpi=200, first_page=page_num + 1, last_page=page_num + 1)
        if not pages:
            raise ValueError("No pages found in PDF.")
        buffer = BytesIO()
        pages[0].save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def parse(
        self,
        extracted_text: str,
        prompt: str,
        schema: str,
        pdf_path: Optional[str] = None,
        page_num: int = 0
    ) -> Dict[str, Any]:
        """
        Parse extracted text using OpenAI's GPT-4 Vision model.
        
        Args:
            extracted_text: Text content extracted from PDF
            prompt: Parsing instructions for the AI
            schema: Expected JSON output schema
            pdf_path: Optional path to PDF for image analysis
            page_num: Page number to analyze (if pdf_path provided)
            
        Returns:
            Parsed data as a dictionary
        """
        full_prompt = (
            prompt.strip() + "\n\n---\n"
            "Here is the extracted text from the PDF:\n" +
            extracted_text.strip() +
            "\n\nReturn your result in this JSON format:\n" +
            schema.strip()
        )

        image_payload = []
        if pdf_path and os.path.exists(pdf_path):
            try:
                image_b64 = self._encode_page_image(pdf_path, page_num)
                image_payload = [{"type": "image_url", "image_url": f"data:image/png;base64,{image_b64}"}]
            except Exception as e:
                # If image processing fails, continue with text-only parsing
                print(f"Warning: Could not process PDF image: {e}")

        response = self.client.chat.completions.create(
            model="gpt-4o",  # Updated to latest model
            messages=[
                {"role": "user", "content": [
                    {"type": "text", "text": full_prompt},
                    *image_payload
                ]}
            ],
            temperature=0
        )

        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            raise ValueError("AI response is not valid JSON:\n" + content)
