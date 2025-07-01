from fastapi import FastAPI
from app.routes import upload, extract, parse, preview, api

app = FastAPI(title="PDF Parser System")

# Include route modules
app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(parse.router)
app.include_router(preview.router)
app.include_router(api.router)