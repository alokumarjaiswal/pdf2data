# PDF2Data - PDF Extraction and Parsing System

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green.svg)](https://mongodb.com)

A comprehensive PDF extraction and parsing system with a modern web interface. Upload PDFs, extract text using multiple methods, and parse structured data with custom parsers.

## 🚀 Features

### Core Functionality
- **📄 PDF Upload & Storage** - Secure upload with GridFS storage in MongoDB
- **🔍 Multi-Mode Text Extraction** - Digital, OCR, and auto-detection methods
- **📊 Structured Data Parsing** - Extensible parser system for custom data formats
- **⚡ Real-Time Processing** - Streaming extraction with live progress updates
- **🗃️ Hybrid Storage Strategy** - MongoDB as the source of truth, with filesystem caching for performance and debuggability.
- **🧠 Memory Management** - Comprehensive memory monitoring and cleanup
- **🔄 Data Lifecycle Management** - Automatic orphan detection and cleanup
- **📈 Processing Analytics** - Detailed statistics and workflow tracking
- **🛡️ Enhanced Security** - Validation, error handling, and audit trails
- **🎨 Modern UI** - React-based interface with real-time updates
- **🤖 AI Agent Integration** - MCP (Model Context Protocol) server for AI assistant context

## 🤖 MCP Server for AI Agents

PDF2Data includes a comprehensive **Model Context Protocol (MCP) server** that provides AI agents like GitHub Copilot with deep contextual information about the project:

### Available Context Endpoints
- **Project Structure** - Hierarchical view of codebase organization
- **Semantic Search** - Vector-based code search using natural language
- **Recent Changes** - Git history and recently modified files  
- **Dependencies** - Project requirements and package information
- **Database Schema** - MongoDB collection structures and relationships
- **Configuration** - Application settings (sanitized for security)
- **API Routes** - Complete overview of available endpoints
- **Parser Registry** - Available parsing capabilities

### Key Features
- **🔍 Semantic Code Search** - Find relevant code using natural language queries
- **🏗️ Smart Indexing** - AST-based chunking with real-time updates
- **📊 Vector Database** - FAISS-powered similarity search
- **🔄 Live Monitoring** - Real-time file change detection
- **🔒 Security-First** - Sensitive information automatically redacted

Access the MCP endpoints at `/mcp/*` when the server is running. See [MCP_SERVER_DOCS.md](./MCP_SERVER_DOCS.md) for complete documentation.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [MCP Server for AI Agents](#mcp-server-for-ai-agents)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Frontend Guide](#frontend-guide)
- [Database Schema](#database-schema)
- [Parser Development](#parser-development)
- [Memory Management](#memory-management)
- [Data Lifecycle](#data-lifecycle)
- [Deployment](#deployment)
- [Development](#development)

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI API    │    │   MongoDB       │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   + GridFS      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│                       │                       │
├── Upload Page         ├── Upload Routes       ├── documents
├── Extract Page        ├── Extract Routes      ├── extractions  
├── Parse Page          ├── Parse Routes        ├── parsed_documents
├── Preview Page        ├── API Routes          ├── processing_logs
└── List Page           └── Lifecycle Routes    └── GridFS (PDFs)
```

### Technology Stack

**Backend:**
- **FastAPI** - Modern, fast web framework for Python
- **MongoDB** - Document database with GridFS for file storage
- **Motor** - Async MongoDB driver
- **PDFPlumber** - Digital PDF text extraction
- **PDF2Image + Tesseract** - OCR text extraction
- **PSUtil** - Memory monitoring

**Frontend:**
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **MongoDB 4.4+**
- **Tesseract OCR** (for OCR functionality)

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone "https://github.com/alokumarjaiswal/pdf2data.git"
   cd pdf2data
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration:**
   ```bash
   # Optional: Set MongoDB URI
   export MONGO_URI="mongodb://localhost:27017"
   
   # Required for AIParser: Set OpenAI API key
   export OPENAI_API_KEY="your_openai_api_key_here"
   ```

5. **Install Tesseract OCR:**
   - **Windows:** Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - **macOS:** `brew install tesseract`
   - **Ubuntu:** `sudo apt install tesseract-ocr`

6. **Start the API server:**
   ```bash
   python run.py
   ```
   Server runs at: `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment configuration:**
   ```bash
   # Development (uses proxy)
   cp .env.development .env.local

   # Production
   cp .env.production .env.local
   # Edit .env.local with your production API URL
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173`

## 📚 API Documentation

### Core Endpoints

#### Upload
```http
POST /upload
Content-Type: multipart/form-data

Upload a PDF file to the system.
```

#### Extraction
```http
POST /extract
Content-Type: application/x-www-form-urlencoded

Extract text from uploaded PDF.
Parameters:
- file_id: string (required)
- mode: "digital" | "ocr" | "auto" (required)
```

```http
POST /extract/stream
Content-Type: application/x-www-form-urlencoded

Real-time streaming extraction with progress updates.
```

#### Parsing
```http
POST /parse
Content-Type: application/x-www-form-urlencoded

Parse extracted text into structured data.
Parameters:
- file_id: string (required)
- parser: "DaybookParser" | "AIParser" | string (required)
```

### Data Management

#### List Documents
```http
GET /api/list

Get list of all processed documents with metadata.
```

#### Get Document Data
```http
GET /api/data/{file_id}?pretty=1

Retrieve parsed data for a specific document.
```

#### Delete Document
```http
DELETE /api/delete/{file_id}

Enhanced deletion with comprehensive cleanup and validation.
```

### Lifecycle Management

#### Find Orphaned Documents
```http
GET /api/lifecycle/orphaned?max_age_hours=24

Find incomplete workflows older than specified hours.
```

#### Cleanup Orphaned Data
```http
POST /api/lifecycle/cleanup?max_age_hours=24&dry_run=true

Clean up orphaned documents (use dry_run=true for preview).
```

#### Lifecycle Statistics
```http
GET /api/lifecycle/stats

Get comprehensive workflow and data health statistics.
```

### Interactive API Documentation

When running the server, visit:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

## 🎨 Frontend Guide

### Page Structure

```
src/
├── pages/
│   ├── UploadPage.tsx      # PDF upload interface
│   ├── ExtractPage.tsx     # Text extraction with mode selection
│   ├── ParserPage.tsx      # Parser selection
│   ├── ParseExecutionPage.tsx # Real-time parsing execution
│   ├── PreviewPage.tsx     # Parsed data preview
│   └── ListPage.tsx        # Document management
├── components/
│   ├── Layout.tsx          # Common layout wrapper
│   ├── ErrorBoundary.tsx   # Error handling
│   └── preview/            # Preview components
└── config/
    └── api.ts              # API configuration
```

### Key Features

**Upload Page:**
- Drag & drop interface
- File size validation (50MB limit)
- Real-time PDF preview
- Memory-safe blob URL handling

**Extract Page:**
- Three extraction modes:
  - **Digital:** Fast, high-quality text extraction
  - **OCR:** Works with scanned documents
  - **Auto:** Smart mode selection with fallback
- Real-time progress streaming
- Terminal-style interface

**Preview Page:**
- Structured data visualization
- Custom preview components for different parsers
- Raw JSON export with formatting

**List Page:**
- Document overview with metadata
- Processing stage indicators
- Enhanced deletion with confirmation

### Configuration

The frontend uses environment-based configuration:

```typescript
// Development: Uses Vite proxy (relative URLs)
// Production: Uses VITE_API_BASE_URL environment variable

const API_BASE_URL = isDevelopment 
  ? '' // Proxied by Vite
  : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
```

## 🗄️ Database Schema

### Collections Overview

```javascript
// Documents Collection - Upload metadata and processing stages
{
  _id: "file_id",
  original_filename: "document.pdf",
  gridfs_file_id: ObjectId("..."),
  status: "uploaded",
  uploaded_at: ISODate("..."),
  file_size: 1024000,
  processing_stages: {
    uploaded: true,
    extracted: false,
    parsed: false
  },
  last_updated: ISODate("...")
}

// Extractions Collection - Extracted text and metadata
{
  _id: "file_id_mode",
  file_id: "file_id",
  extraction_mode: "digital",
  method_used: "digital",
  extracted_text: "...",
  num_pages: 10,
  num_chars: 5000,
  extracted_at: ISODate("..."),
  status: "completed"
}

// Parsed Documents Collection - Final structured data
{
  _id: "file_id",
  parser: "DaybookParser",
  original_filename: "document.pdf",
  tables: [...], // Parsed data
  uploaded_at: "2024-01-01T00:00:00",
  extraction_mode_used: "digital",
  num_entries: 25,
  processing_completed: true
}

// Processing Logs Collection - Audit trail
{
  file_id: "file_id",
  process_type: "extraction", // "upload", "extraction", "parsing"
  log_content: "Extraction completed successfully",
  metadata: {...},
  logged_at: ISODate("...")
}

// GridFS - PDF file storage
{
  filename: "original_file_id.pdf",
  metadata: {
    file_id: "file_id",
    original_filename: "document.pdf",
    content_type: "application/pdf",
    uploaded_at: ISODate("...")
  }
}
```

### Indexes

```javascript
// Performance optimization indexes
documents: ["uploaded_at", "status"]
extractions: ["file_id", "extraction_mode", "extracted_at"]
parsed_documents: ["uploaded_at", "parser"]
processing_logs: [["file_id", "process_type"], "logged_at"]
```

## 🔧 Parser Development

### Creating Custom Parsers

1. **Create parser class:**
   ```python
   # app/parsers/my_parser.py
   class MyCustomParser:
       def parse_content(self, extracted_text: str) -> list:
           # Your parsing logic here
           return parsed_data
   ```

2. **Register parser:**
   ```python
   # app/parsers/parser_registry.py
   from app.parsers.my_parser import MyCustomParser

   parser_registry = {
       "DaybookParser": DaybookParser,
       "MyCustomParser": MyCustomParser,
   }
   ```

### Existing Parsers

**DaybookParser:**
- Extracts structured financial data from daybook PDFs
- Handles multiple entry types and formats
- Comprehensive logging and error handling
- Supports person names, business accounts, and transactions

**AIParser:**
- Uses OpenAI's GPT-4 Vision model for intelligent document parsing
- **Dual-Mode Analysis:** Can process either raw text for speed or full PDF pages (including images) for higher accuracy on complex layouts.
- Automatically extracts structured data from any document type
- Supports both text and image analysis for complex layouts
- Configurable prompts and output schemas
- Requires OpenAI API key (set via OPENAI_API_KEY environment variable)

## 🧠 Memory Management

### Features

- **Automatic cleanup** of temporary files and blob URLs
- **Memory monitoring** during PDF processing operations
- **Garbage collection** optimization for large files
- **Memory usage alerts** for operations exceeding thresholds

### Implementation

```python
# Memory monitoring during operations
with MemoryMonitor(f"extraction_{mode}_{file_id}"):
    with safe_temp_file(suffix='.pdf', content=pdf_content) as temp_path:
        result = process_pdf(temp_path)
# Automatic cleanup and memory reporting

# Safe temporary file handling
with safe_temp_file(suffix='.pdf', content=data) as temp_path:
    # File automatically cleaned up even if exception occurs
    process_file(temp_path)
```

### Frontend Memory Management

```typescript
// Automatic blob URL cleanup
useEffect(() => {
  return () => {
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl); // Prevent memory leaks
    }
  };
}, [uploadedFileUrl]);
```

## 🔄 Data Lifecycle

### Workflow Stages

1. **Uploaded** - PDF stored in GridFS
2. **Extracted** - Text extracted from PDF
3. **Parsed** - Data structured by parser

### Orphan Detection

Documents are considered "orphaned" if:
- Uploaded but not extracted for > 24 hours
- Extracted but not parsed for > 24 hours
- Processing abandoned midway

**Note:** Lifecycle management operates on the MongoDB records, which are considered the single source of truth for system state.

### Cleanup Operations

```bash
# Find orphaned documents
curl "http://127.0.0.1:8000/api/lifecycle/orphaned?max_age_hours=48"

# Preview cleanup (safe)
curl -X POST "http://127.0.0.1:8000/api/lifecycle/cleanup?dry_run=true"

# Execute cleanup
curl -X POST "http://127.0.0.1:8000/api/lifecycle/cleanup?dry_run=false&max_age_hours=72"
```

### What Gets Cleaned Up

✅ **PDF files** from GridFS  
✅ **Extracted text** data  
✅ **Processing logs**  
✅ **Document metadata**  
✅ **Temporary files**  

## 🚀 Deployment

### Production Considerations

1. **Environment Variables:**
   ```bash
   MONGO_URI=mongodb://production-server:27017/pdf2data
   ```

2. **Frontend Build:**
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder to web server
   ```

3. **API Server:**
   ```bash
   # Use production ASGI server
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

4. **Security:**
   - Configure CORS for specific domains
   - Enable authentication if needed
   - Set up HTTPS
   - Configure MongoDB authentication

### Docker Deployment

```dockerfile
# Example Dockerfile for API
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Tesseract
RUN apt-get update && apt-get install -y tesseract-ocr

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 👨‍💻 Development

### Project Structure

```
pdf2data/
├── app/                    # Backend API
│   ├── db/                 # Database managers
│   ├── extract/            # Text extraction
│   ├── parsers/            # Data parsers
│   ├── routes/             # API routes
│   ├── utils/              # Utilities
│   └── main.py             # FastAPI app
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── config/
│   └── package.json
├── requirements.txt        # Python dependencies
└── run.py                 # Development server
```

### Development Workflow

1. **Start MongoDB:**
   ```bash
   mongod --dbpath ./data
   ```

2. **Start Backend:**
   ```bash
   python run.py
   ```

3. **Start Frontend:**
   ```bash
   cd frontend && npm run dev
   ```

4. **Access Application:**
   - Frontend: `http://localhost:5173`
   - API: `http://127.0.0.1:8000`
   - API Docs: `http://127.0.0.1:8000/docs`

### Testing

```bash
# Backend tests
python -m pytest

# Frontend tests
cd frontend && npm test

# Memory management tests
python test_memory_management.py
```

## 📊 Monitoring & Analytics

### Available Metrics

- **Document counts** by processing stage
- **Extraction statistics** by mode
- **Parser usage** analytics
- **Memory usage** patterns
- **Orphaned data** detection
- **Processing times** and success rates

### Endpoints

```http
GET /api/stats                    # Basic statistics
GET /api/lifecycle/stats          # Lifecycle analytics
GET /api/logs/{file_id}          # Processing logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Adding New Features

- **Parsers:** Add to `app/parsers/` and register in `parser_registry.py`
- **API Routes:** Add to `app/routes/` and include in `main.py`
- **Frontend Pages:** Add to `frontend/src/pages/` and update routing
- **Utilities:** Add to `app/utils/` for backend or `frontend/src/` for frontend

## 📝 License

[Add your license information here]

## 🙏 Acknowledgments

- **FastAPI** for the excellent async web framework
- **React** for the powerful UI library
- **MongoDB** for flexible document storage
- **Tesseract** for OCR capabilities
- **PDFPlumber** for digital text extraction

---

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the code comments and docstrings

**System Status:** ✅ All systems operational with enhanced memory management and data lifecycle features!
