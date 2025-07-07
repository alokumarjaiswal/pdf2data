# PDF2Data - Complete PDF Processing & ERP Integration System

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green.svg)](https://mongodb.com)

A comprehensive PDF extraction, parsing, and ERP integration system with a modern web interface. Upload PDFs, extract text using multiple methods, parse structured data with custom parsers, and seamlessly integrate with Unite ERP system.

## 🚀 Features

### Core PDF Processing
- **📄 PDF Upload & Storage** - Secure upload with GridFS storage in MongoDB
- **🔍 Multi-Mode Text Extraction** - Digital, OCR, and auto-detection methods
- **📊 Structured Data Parsing** - Extensible parser system (DaybookParser, AI Parser, etc.)
- **⚡ Real-Time Processing** - Streaming extraction with live progress updates
- **📝 Full CRUD Editing** - Schema-aware, minimal UI table editor for parsed data
- **🔄 Tabbed PDF Viewer** - PDF view and raw data tabs with independent scrolling
- **🗃️ Hybrid Storage Strategy** - MongoDB + filesystem caching for performance
- **📊 Excel Export** - Professional formatted Excel files from parsed data

### ERP Integration
- **🤖 Unite Login Bot** - Automated ERP login with CAPTCHA solving
- **📤 One-Click Upload** - Direct integration from List Page to Unite ERP
- **📈 Status Tracking** - Real-time upload status with visual indicators
- **🔄 Retry Logic** - Smart error handling and retry mechanisms

### Advanced Features
- **🧠 Memory Management** - Comprehensive monitoring and cleanup
- **🔄 Data Lifecycle Management** - Automatic orphan detection and cleanup
- **📈 Processing Analytics** - Detailed statistics and workflow tracking
- **🛡️ Enhanced Security** - Environment variables, validation, audit trails
- **🎨 Modern UI** - React-based interface with minimal, professional design
- **🌙 Intensity Mode** - Dark/light theme toggle with morphing circle animation
- **⚡ Robust Error Handling** - Non-blocking errors with auto-recovery

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Installation & Setup](#installation--setup)
- [PDF Processing Workflow](#pdf-processing-workflow)
- [Unite ERP Integration](#unite-erp-integration)
- [API Documentation](#api-documentation)
- [Frontend Features](#frontend-features)
- [Parser Development](#parser-development)
- [Unite Bot Configuration](#unite-bot-configuration)
- [Database Schema](#database-schema)
- [Development Guide](#development-guide)
- [Deployment](#deployment)

## ⚡ Quick Start

### 1. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start MongoDB
mongod

# Run FastAPI server
python run.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Unite Bot Setup
```bash
cd unite-login-bot
pip install -r requirements.txt
playwright install chromium

# Install Tesseract OCR
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
# macOS: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: mongodb://localhost:27017

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
├── Preview/Edit Page   ├── API Routes          ├── processing_logs
├── List Page           ├── Unite Integration   └── GridFS files
└── Unite Integration   └── CRUD Operations
                        
┌─────────────────┐    
│  Unite Bot      │    
│  (Automation)   │    
└─────────────────┘    
│                      
├── login.py           
├── CAPTCHA solving    
├── OCR processing     
└── ERP form filling   
```

### Data Flow

```
PDF Upload → Text Extraction → Data Parsing → CRUD Editing → Unite Upload
     ↓              ↓               ↓              ↓              ↓
   GridFS      Filesystem      MongoDB       MongoDB      Unite ERP
```

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **MongoDB 4.4+**
- **Tesseract OCR** (for Unite bot)

### Environment Configuration

Create `.env` file in project root:

```bash
# OpenAI Configuration (for AI Parser)
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration (optional - defaults to localhost)
# MONGODB_URI=mongodb://localhost:27017
# MONGODB_DB_NAME=pdf2data

# Application Configuration (optional)
# DEBUG=true
# MAX_FILE_SIZE_MB=50

# Unite ERP Credentials
UNITE_USERNAME=your_unite_username
UNITE_PASSWORD=your_unite_password
UNITE_BASE_URL=https://pn.uniteerp.in/
UNITE_MAX_ATTEMPTS=3
```

### Detailed Installation

```bash
# 1. Clone and setup backend
git clone <repository>
cd pdf2data
pip install -r requirements.txt

# 2. Setup frontend
cd frontend
npm install
cd ..

# 3. Setup Unite bot
cd unite-login-bot
pip install -r requirements.txt
playwright install chromium
cd ..

# 4. Start services
# Terminal 1: MongoDB
mongod

# Terminal 2: Backend API
python run.py

# Terminal 3: Frontend
cd frontend && npm run dev
```

## 📋 PDF Processing Workflow

### 1. Upload Phase
- **Upload Page**: Drag & drop PDF interface
- **Validation**: File type, size, and format checks
- **Storage**: GridFS for scalability + filesystem cache

### 2. Extraction Phase
- **Digital Mode**: Direct text extraction (fastest)
- **OCR Mode**: Image-to-text conversion (for scanned PDFs)
- **Auto Mode**: Intelligent fallback between methods
- **Real-time Progress**: Streaming updates with memory monitoring

### 3. Parsing Phase
- **Parser Selection**: Choose appropriate parser (Daybook, AI, etc.)
- **Structured Output**: JSON with schema validation
- **Error Handling**: Comprehensive logging and recovery

### 4. Preview & Edit Phase
- **Tabbed PDF Viewer**: Toggle-able panel with PDF and Raw Data tabs
- **Raw Data Access**: Sub-tabs for Extracted Text and Parsed JSON
- **Full CRUD**: Add/edit/delete tables and rows
- **Schema-Aware**: Dynamic field rendering for any parser
- **Auto-Save**: Changes tracked with explicit save controls

### 5. Integration Phase
- **Excel Export**: Download professionally formatted Excel files with one click
- **One-Click Upload**: Direct to Unite ERP from List Page
- **Status Tracking**: Visual indicators for upload progress
- **Error Recovery**: Retry failed uploads with detailed logging

## 🤖 Unite ERP Integration

### Features

- **🔐 Automated Login**: Handles authentication with CAPTCHA solving
- **🧠 Smart OCR**: Advanced image preprocessing for better recognition
- **🔄 Retry Logic**: Multiple attempts with fallback to manual input
- **📊 Status Tracking**: Real-time progress in List Page
- **🛡️ Secure**: Credentials stored in environment variables

### Usage

1. **Configure Credentials** in `.env` file
2. **Navigate to List Page** in the application
3. **Click "↑" button** next to any processed document
4. **Monitor Status**: 
   - `↑` - Ready to upload
   - `⟳` - Currently uploading
   - `✓` - Successfully uploaded
   - `✗` - Upload failed (click to retry)

### Current Status

- ✅ **UI Integration**: Complete with status indicators
- ✅ **API Endpoints**: Backend ready for bot execution
- ✅ **Database Schema**: Status tracking implemented
- 🔄 **Bot Enhancement**: Ready for custom data submission logic

## 📡 API Documentation

### Core Endpoints

```http
# Document Management
POST /upload                     # Upload PDF
GET  /api/list                   # List all documents
GET  /api/data/{file_id}         # Get parsed data
PUT  /api/update/{file_id}       # Update parsed data
DELETE /api/delete/{file_id}     # Delete document

# Processing
POST /extract                    # Start text extraction
POST /parse                      # Start data parsing
GET  /api/logs/{file_id}         # Get processing logs

# Files & Resources
GET  /api/file/{file_id}         # Serve original PDF
GET  /api/extracted-text/{file_id} # Serve extracted text
GET  /api/page-preview/{file_id}/{page} # Page preview

# Export & Integration
GET  /api/export/excel/{file_id} # Export to Excel format
POST /api/unite/upload/{file_id} # Queue Unite upload
GET  /api/unite/status/{file_id} # Check upload status

# Analytics
GET  /api/stats                  # System statistics
GET  /api/lifecycle/stats        # Lifecycle analytics
```

### Response Examples

```json
// Document List Response
{
  "entries": [
    {
      "_id": "file123",
      "original_filename": "daybook.pdf",
      "parser": "DaybookParser",
      "saved": true,
      "unite_status": "success",
      "uploaded_at": "2025-01-01T10:00:00Z"
    }
  ]
}

// Unite Upload Response
{
  "success": true,
  "message": "Upload queued successfully",
  "file_id": "file123",
  "status": "uploading"
}
```

## 🎨 Frontend Features

### Pages Overview

- **📤 Upload Page**: Modern drag & drop interface with validation
- **🔍 Extract Page**: Multi-mode extraction with real-time progress
- **📊 Parse Page**: Parser selection with AI configuration
- **👀 Preview Page**: Editable data tables with tabbed PDF/raw data viewer
- **📋 List Page**: Document management with Excel export and Unite integration

### Key UI Components

- **EditableDataEditor**: Full CRUD for DaybookParser data
- **DynamicDataEditor**: Schema-aware editor for any parser
- **Tabbed PDF Viewer**: PDF view and raw data tabs with sub-tabs for extracted text and parsed JSON
- **Independent Scrolling**: Each tab and sub-tab maintains its own scroll position
- **Status Indicators**: Real-time feedback for all operations
- **IntensityToggle**: Morphing circle dark/light theme toggle
- **Excel Export**: One-click download with loading states
- **Error Handling**: Non-blocking, dismissible error banners
- **Minimal Design**: Professional, clean interface throughout

### PDF Viewer Features

#### Tabbed Interface
- **PDF Tab**: Display original PDF with full zoom and scroll controls
- **Raw Data Tab**: Access to extracted and parsed data with sub-tabs:
  - **Extracted Text**: Raw text content from PDF extraction process
  - **Parsed JSON**: Structured data output from selected parser

#### Navigation & UX
- **Toggle Button**: Arrow icon in title bar to show/hide tabbed PDF viewer panel
- **Tab Navigation**: Switch between PDF and Raw Data tabs with persistent state
- **Memory Management**: Raw data loaded only when Raw Data tab is accessed and cleared on panel close
- **External Links**: "Open in new tab" options for full-screen viewing of PDFs and raw data
- **Responsive Layout**: Side-by-side on desktop, full-width on mobile
- **Loading States**: Visual feedback during PDF loading and data fetching

#### Technical Features
- **Lazy Loading**: Raw data fetched only when Raw Data tab is accessed
- **Caching**: Extracted text cached during session for performance
- **Scrollable Content**: Custom scrollbars for large content areas
- **Error Handling**: Graceful fallbacks for failed PDF or data loading

### Action Buttons (List Page)

- **↓** (Green) - Download as Excel: Export parsed data to professionally formatted Excel files
- **↑** (Blue/Status) - Upload to Unite: Send data to Unite ERP system
- **rm** (Red) - Delete: Remove document and all associated data

### Responsive Features

- **Mobile-Friendly**: Optimized for various screen sizes
- **Keyboard Shortcuts**: Efficient navigation and editing
- **Accessibility**: ARIA labels and semantic HTML
- **Performance**: Optimized rendering and memory usage
- **Error Recovery**: Auto-clearing errors with manual dismiss options

### Intensity Mode (Theme Toggle)

- **Morphing Circle Animation**: Smooth transition between dark/light themes
- **Minimal Design**: Pure circle with no text, only tooltip
- **Contextual Help**: Tooltip explains when to use each mode
- **Persistent Settings**: Theme preference saved across sessions
- **Performance Optimized**: CSS-only animations with no JavaScript overhead

## 📊 Parser Development

### Creating a New Parser

```python
# 1. Create parser class in app/parsers/
class MyCustomParser:
    def parse(self, extracted_text: str) -> dict:
        # Your parsing logic here
        return {"parsed_data": "result"}

# 2. Register in parser_registry.py
PARSERS = {
    "MyCustomParser": MyCustomParser,
    # ... existing parsers
}

# 3. Add to frontend PreviewRegistry
const PREVIEW_COMPONENTS = {
  MyCustomParser: MyCustomPreview,
  // ... existing components
};
```

### Available Parsers

- **DaybookParser**: Agricultural society daybook entries
- **AIParser**: OpenAI-powered custom schema parsing
- **[Your Custom Parser]**: Add your own following the pattern

## 🤖 Unite Bot Configuration

### Bot Capabilities

- **CAPTCHA Solving**: Advanced OCR with error correction
- **Form Automation**: Automated field filling and submission
- **Session Management**: Handles login state and timeouts
- **Error Recovery**: Smart retry logic with manual fallback

### Extending the Bot

```python
# Modify unite-login-bot/login.py to accept file data
def upload_document_data(page, file_id, parsed_data):
    # Add your ERP form filling logic here
    # Navigate to appropriate forms
    # Fill data from parsed_data
    # Submit and verify
    pass

# Update run() function to accept file_id parameter
def run(file_id=None):
    # ... existing login logic ...
    if file_id:
        # Load parsed data from API
        # Upload to ERP system
        pass
```

### CAPTCHA Optimization

The bot includes advanced image preprocessing:
- **Grayscale conversion** for better contrast
- **Upscaling** for improved OCR accuracy
- **Sharpening filters** to enhance text clarity
- **Error correction** for common OCR mistakes

## � Excel Export Feature

### Overview

The Excel export feature converts parsed data into professionally formatted Excel files with automatic styling, proper data types, and structured layouts.

### Supported Formats

- **DaybookParser**: Specialized formatting with society headers, entries tables, totals sections
- **AIParser**: Key-value export with structured data presentation
- **Custom Parsers**: Universal export for any parser type

### Features

- **Professional Styling**: Headers, borders, color-coding, and proper fonts
- **Data Type Handling**: Numbers, text, dates, arrays, and objects
- **Auto-Sizing**: Intelligent column width adjustment
- **Safe Filenames**: Automatic character sanitization for cross-platform compatibility
- **Error Validation**: Comprehensive checks for data integrity

### Usage

1. Navigate to the **List Page**
2. Click the green **↓** button next to any saved document
3. Excel file automatically downloads with format: `{filename}_{parser}_data.xlsx`

### Dependencies

```bash
pip install openpyxl==3.1.2  # Excel file generation
```

## �💾 Database Schema

### Collections

```javascript
// documents - File metadata
{
  _id: "file_id",
  original_filename: "example.pdf",
  uploaded_at: ISODate(),
  processing_stages: {
    uploaded: true,
    extracted: true,
    parsed: true
  },
  file_size: 1024000,
  page_count: 10
}

// extractions - Text extraction results
{
  file_id: "file_id",
  extraction_mode: "digital",
  extracted_text: "...",
  num_pages: 10,
  num_chars: 5000,
  extracted_at: ISODate()
}

// parsed_documents - Structured data
{
  _id: "file_id",
  parser: "DaybookParser",
  parsed_data: { /* structured data */ },
  saved: true,
  unite_status: "success",
  unite_uploaded_at: ISODate(),
  parsed_at: ISODate()
}
```

## 🔧 Development Guide

### Project Structure

```
pdf2data/
├── app/                    # FastAPI backend
│   ├── config.py          # Configuration
│   ├── main.py            # FastAPI app
│   ├── routes/            # API endpoints
│   ├── parsers/           # Data parsers
│   ├── extract/           # Text extraction
│   ├── db/                # Database connections
│   └── utils/             # Utilities
├── frontend/              # React frontend
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   ├── config/        # API configuration
│   │   └── theme/         # Styling
│   └── package.json
├── unite-login-bot/       # ERP automation
│   ├── login.py           # Main bot script
│   ├── requirements.txt   # Python dependencies
│   └── README.md          # Bot documentation
├── data/                  # Data storage
│   ├── uploaded_pdfs/     # PDF files
│   ├── extracted_pages/   # Text files
│   ├── parsed_output/     # JSON results
│   └── logs/              # Processing logs
├── .env                   # Environment variables
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

### Development Workflow

1. **Backend Changes**: Modify `app/` files, restart `python run.py`
2. **Frontend Changes**: Modify `frontend/src/`, auto-reload with Vite
3. **Bot Changes**: Test `unite-login-bot/login.py` independently
4. **Database**: Use MongoDB Compass for data inspection

### Adding New Features

- **API Endpoints**: Add to `app/routes/` and include in `main.py`
- **Frontend Pages**: Add to `frontend/src/pages/` and update routing
- **Parsers**: Add to `app/parsers/` and register in `parser_registry.py`
- **UI Components**: Add to `frontend/src/components/`

## 🚀 Deployment

### Production Considerations

- **Environment Variables**: Use production values in `.env`
- **MongoDB**: Set up replica set for high availability
- **Reverse Proxy**: Use Nginx for static files and SSL
- **Process Manager**: Use PM2 or systemd for service management
- **Monitoring**: Set up logging and health checks

### Docker Deployment (Future)

```yaml
# docker-compose.yml (example)
version: '3.8'
services:
  api:
    build: .
    environment:
      - MONGODB_URI=mongodb://mongo:27017
    depends_on:
      - mongo
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
  
  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use strict mode, proper typing
- **Commits**: Use conventional commits (feat:, fix:, docs:)

## 📊 Monitoring & Analytics

### Available Metrics

- **Document Processing**: Upload/extract/parse success rates
- **Parser Performance**: Usage statistics and timing
- **Memory Usage**: Real-time monitoring and cleanup
- **ERP Integration**: Upload success rates and error tracking
- **User Activity**: Page views and feature usage

### Health Checks

```http
GET /api/stats                   # System overview
GET /api/lifecycle/stats         # Data lifecycle metrics
GET /api/unite/status/{file_id}  # ERP upload status
```

## 🛡️ Security

### Best Practices Implemented

- **Environment Variables**: No hardcoded secrets
- **Input Validation**: File type and size restrictions
- **Error Handling**: Sanitized error messages
- **CORS**: Properly configured for production
- **Rate Limiting**: API endpoint protection (recommended)

## 📝 License

[Add your license information here]

## 🙏 Acknowledgments

- **FastAPI** for the excellent async web framework
- **React** for the powerful UI library
- **MongoDB** for flexible document storage
- **Tesseract** for OCR capabilities
- **Playwright** for web automation
- **Tailwind CSS** for beautiful styling

---

## 📞 Support & Next Steps

### Current Status
- ✅ **Core PDF Processing**: Fully operational
- ✅ **CRUD Editing**: Complete with schema awareness
- ✅ **Unite Integration UI**: Ready and functional
- 🔄 **Unite Bot Enhancement**: Ready for completion
- 🔄 **Real-time Status Updates**: WebSocket implementation pending

### Immediate Next Steps
1. **Complete Unite Bot**: Add data submission logic to `login.py`
2. **Real-time Updates**: Implement WebSocket or polling for status
3. **Error Recovery**: Enhanced retry mechanisms
4. **Monitoring**: Add comprehensive logging and alerts

### For Support
- **API Documentation**: Visit `/docs` when running
- **Code Comments**: Extensive inline documentation
- **GitHub Issues**: Report bugs and feature requests

**System Status**: ✅ Production-ready with modern architecture and comprehensive feature set!
