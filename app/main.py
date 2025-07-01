from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, extract, parse, api

app = FastAPI(
    title="PDF2Data API",
    description="PDF extraction and parsing system with React frontend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include route modules
app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(parse.router)
app.include_router(api.router)
# Note: preview and list routes removed - functionality moved to React frontend

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)