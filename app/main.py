from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, extract, parse, api, mcp
from app.db.mongo import init_database
# from app.utils.smart_indexer import start_smart_indexing
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF2Data API",
    description="PDF extraction and parsing system with React frontend - Database-First Architecture",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include route modules
app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(parse.router)
app.include_router(api.router)
app.include_router(mcp.router) # Include the new MCP router
# Note: preview and list routes removed - functionality moved to React frontend

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.on_event("startup")
async def startup_event():
    """Initialize database and smart indexing on application startup"""
    try:
        # Start smart indexing system (non-blocking, runs in background)
        # logger.info("🚀 Starting smart code indexing system...")
        # start_smart_indexing()

        await init_database()
        logger.info("✅ Database initialized successfully - All collections and indexes ready")
        logger.info("🗄️  Database-first architecture is now active - No filesystem dependencies")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        raise

@app.get("/")
async def root():
    return {
        "message": "PDF2Data API - Database-First Architecture",
        "version": "2.0.0",
        "features": [
            "PDF upload to GridFS",
            "Database-stored extractions", 
            "Comprehensive logging",
            "Processing stage tracking",
            "API statistics",
            "No filesystem dependencies"
        ],
        "endpoints": {
            "upload": "/upload",
            "extract": "/extract",
            "extract_stream": "/extract/stream", 
            "parse": "/parse",
            "list": "/api/list",
            "data": "/api/data/{file_id}",
            "delete": "/api/delete/{file_id}",
            "logs": "/api/logs/{file_id}",
            "stats": "/api/stats"
        }
    }