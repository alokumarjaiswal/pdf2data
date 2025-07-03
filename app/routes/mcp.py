from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError
from typing import Optional
import os
import json
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from app.parsers.parser_registry import parser_registry
from app.utils.code_searcher import searcher_instance
from app.config import config

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol"])

@router.get("/api-routes")
async def list_api_routes():
    """
    Dynamically lists all registered API endpoints in the application.
    This provides a real-time overview of the available API surface.
    """
    from app.main import app  # Import here to avoid circular dependency

    routes = []
    for route in app.routes:
        # Ensure the route is a standard API route with path and methods
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "name": getattr(route, "name", "N/A"),
                "methods": sorted(list(route.methods)),
            })
    return {"routes": routes}


@router.get("/parsers")
async def list_parsers():
    """
    Lists all registered parsers available in the system.
    This provides insight into the current parsing capabilities.
    """
    parser_list = [
        {
            "name": name,
            "class_name": parser_class.__name__,
            "module": parser_class.__module__
        }
        for name, parser_class in parser_registry.items()
    ]
    return {"parsers": parser_list}


@router.get("/db-schema")
async def get_database_schema(collection_name: str = None):
    """
    Provides the defined schema for MongoDB collections.
    If a collection_name is provided, it returns the schema for that specific collection.
    Otherwise, it returns all known schemas.
    """
    schemas = {
        "documents": {
            "description": "Stores metadata about uploaded PDF files and their processing state.",
            "fields": {
                "_id": "string (UUID, serves as file_id)",
                "original_filename": "string",
                "gridfs_file_id": "ObjectId (link to file in GridFS)",
                "status": "string (e.g., 'uploaded', 'processing', 'completed')",
                "uploaded_at": "datetime",
                "file_size": "integer (bytes)",
                "page_count": "integer",
                "processing_stages": "dict (e.g., {'uploaded': true, 'extracted': false})",
                "last_updated": "datetime"
            }
        },
        "extractions": {
            "description": "Stores the extracted text content from PDFs.",
            "fields": {
                "_id": "string (composite: f'{file_id}_{mode}')",
                "file_id": "string (references documents collection)",
                "extraction_mode": "string (e.g., 'digital', 'ocr')",
                "method_used": "string",
                "extracted_text": "string",
                "num_pages": "integer",
                "num_chars": "integer",
                "extracted_at": "datetime",
                "status": "string (e.g., 'completed', 'failed')"
            }
        },
        "parsed_documents": {
            "description": "Stores the final structured data after parsing.",
            "fields": {
                "_id": "string (file_id, references documents collection)",
                "parser": "string",
                "original_filename": "string",
                "tables": "list (of parsed data objects)",
                "uploaded_at": "datetime",
                "extraction_mode_used": "string",
                "num_entries": "integer",
                "processing_completed": "boolean"
            }
        },
        "processing_logs": {
            "description": "Provides an audit trail for all processing steps.",
            "fields": {
                "_id": "ObjectId",
                "file_id": "string (references documents collection)",
                "process_type": "string (e.g., 'upload', 'extraction', 'parsing')",
                "log_content": "string",
                "metadata": "dict",
                "logged_at": "datetime"
            }
        }
    }

    if collection_name:
        if collection_name in schemas:
            return {
                "collection": collection_name,
                "schema": schemas[collection_name],
                "generated_at": datetime.now().isoformat()
            }
        else:
            return {
                "error": f"Schema for collection '{collection_name}' not found",
                "available_collections": list(schemas.keys()),
                "generated_at": datetime.now().isoformat()
            }
    
    return {
        "schemas": schemas,
        "collection_count": len(schemas),
        "generated_at": datetime.now().isoformat()
    }


class SearchQuery(BaseModel):
    query: str
    file_type: Optional[str] = None
    max_results: int = 5

@router.post("/semantic-search")
async def semantic_search(search_query: SearchQuery):
    """
    Performs a semantic search across the codebase using a vector index.
    Enhanced with filtering capabilities and better result formatting.
    """
    # Validate query
    if not search_query.query or not search_query.query.strip():
        return {
            "error": "Empty query provided",
            "message": "Please provide a non-empty search query",
            "generated_at": datetime.now().isoformat()
        }
    
    if searcher_instance is None:
        return {
            "error": "Semantic search unavailable",
            "message": "The search index may not be built yet. Please wait for indexing to complete.",
            "generated_at": datetime.now().isoformat()
        }
    
    try:
        results = searcher_instance.search(search_query.query, top_k=search_query.max_results)
        
        # Apply file type filtering if specified
        if search_query.file_type:
            results = [r for r in results if r['file_path'].endswith(search_query.file_type)]
        
        # Enhance results with additional metadata
        enhanced_results = []
        for result in results:
            try:
                file_path = result['file_path']
                enhanced_result = {
                    **result,
                    "file_size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                    "last_modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat() if os.path.exists(file_path) else None,
                    "relevance_score": 1.0 - (result['distance'] / 2.0),  # Convert distance to relevance score
                    "preview": result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
                }
                enhanced_results.append(enhanced_result)
            except Exception:
                enhanced_results.append(result)
        
        return {
            "query": search_query.query,
            "results": enhanced_results,
            "total_results": len(enhanced_results),
            "search_params": {
                "max_results": search_query.max_results,
                "file_type_filter": search_query.file_type
            },
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "error": "Search failed",
            "message": f"An error occurred during search: {str(e)}",
            "query": search_query.query,
            "generated_at": datetime.now().isoformat()
        }


@router.get("/project-structure")
async def get_project_structure(max_depth: int = 3):
    """
    Returns a tree view of the project structure.
    Helps AI agents understand the overall organization of the codebase.
    """
    def build_tree(path: Path, current_depth: int = 0, max_depth: int = 3):
        if current_depth > max_depth:
            return None
            
        items = []
        try:
            # Skip common unimportant directories
            skip_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'dist', 'build', '.next'}
            
            for item in sorted(path.iterdir()):
                if item.name.startswith('.') and item.name not in {'.env', '.gitignore'}:
                    continue
                if item.name in skip_dirs:
                    continue
                    
                if item.is_dir():
                    subtree = build_tree(item, current_depth + 1, max_depth)
                    items.append({
                        "name": item.name,
                        "type": "directory",
                        "children": subtree if subtree else []
                    })
                else:
                    # Only include relevant file types
                    if item.suffix in {'.py', '.js', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml'}:
                        items.append({
                            "name": item.name,
                            "type": "file",
                            "size": item.stat().st_size if item.exists() else 0
                        })
        except PermissionError:
            pass
            
        return items
    
    project_root = Path('.')
    structure = build_tree(project_root, max_depth=max_depth)
    
    return {
        "project_name": project_root.absolute().name,
        "structure": structure,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/recent-changes")
async def get_recent_changes(hours: int = 24):
    """
    Returns recently modified files and git changes.
    Helps AI agents understand what's been worked on recently.
    """
    cutoff_time = datetime.now() - timedelta(hours=hours)
    recent_files = []
    
    # Find recently modified files
    for root, dirs, files in os.walk('.'):
        # Skip unimportant directories
        dirs[:] = [d for d in dirs if d not in {'.git', '__pycache__', 'node_modules', '.venv', 'dist'}]
        
        for file in files:
            if file.endswith(('.py', '.js', '.ts', '.tsx', '.json', '.md')):
                file_path = os.path.join(root, file)
                try:
                    modified_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if modified_time > cutoff_time:
                        recent_files.append({
                            "path": file_path.replace('\\', '/'),
                            "modified_at": modified_time.isoformat(),
                            "size": os.path.getsize(file_path)
                        })
                except (OSError, ValueError):
                    continue
    
    # Try to get git information
    git_info = {}
    try:
        # Get recent git commits
        result = subprocess.run(
            ['git', 'log', '--oneline', '-10', '--since=24.hours.ago'],
            capture_output=True, text=True, cwd='.'
        )
        if result.returncode == 0:
            git_info['recent_commits'] = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        # Get current branch
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True, text=True, cwd='.'
        )
        if result.returncode == 0:
            git_info['current_branch'] = result.stdout.strip()
            
        # Get git status
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True, text=True, cwd='.'
        )
        if result.returncode == 0:
            git_info['status'] = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
    except FileNotFoundError:
        git_info['error'] = 'Git not available'
    
    return {
        "recent_files": sorted(recent_files, key=lambda x: x['modified_at'], reverse=True),
        "git_info": git_info,
        "timeframe_hours": hours,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/dependencies")
async def get_dependencies():
    """
    Returns package.json and requirements.txt contents.
    Helps AI agents understand project dependencies and setup requirements.
    """
    dependencies = {}
    
    # Python dependencies
    requirements_files = ['requirements.txt', 'requirements-dev.txt', 'pyproject.toml']
    for req_file in requirements_files:
        if os.path.exists(req_file):
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    dependencies[req_file] = f.read()
            except Exception as e:
                dependencies[req_file] = f"Error reading file: {str(e)}"
    
    # Node.js dependencies
    if os.path.exists('package.json'):
        try:
            with open('package.json', 'r', encoding='utf-8') as f:
                dependencies['package.json'] = json.loads(f.read())
        except Exception as e:
            dependencies['package.json'] = f"Error reading package.json: {str(e)}"
    
    # Frontend dependencies
    frontend_package = Path('frontend/package.json')
    if frontend_package.exists():
        try:
            with open(frontend_package, 'r', encoding='utf-8') as f:
                dependencies['frontend/package.json'] = json.loads(f.read())
        except Exception as e:
            dependencies['frontend/package.json'] = f"Error reading frontend package.json: {str(e)}"
    
    return {
        "dependencies": dependencies,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/config")
async def get_app_config():
    """
    Returns sanitized application configuration.
    Helps AI agents understand how the application is configured without exposing secrets.
    """
    safe_config = {
        "mongodb_uri": "***REDACTED***" if config.MONGODB_URI != 'mongodb://localhost:27017' else config.MONGODB_URI,
        "mongodb_db_name": config.MONGODB_DB_NAME,
        "debug_mode": config.DEBUG,
        "max_file_size_mb": config.MAX_FILE_SIZE_MB,
        "openai_configured": config.validate_openai_config(),
        "environment_vars": {
            "OPENAI_API_KEY": "***SET***" if config.OPENAI_API_KEY else "***NOT_SET***",
            "MONGODB_URI": "***CUSTOM***" if config.MONGODB_URI != 'mongodb://localhost:27017' else "***DEFAULT***",
        }
    }
    
    return {
        "config": safe_config,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/capabilities")
async def get_mcp_capabilities():
    """
    Returns information about this MCP server's capabilities.
    Helps AI agents understand what context they can request.
    """
    capabilities = {
        "server_info": {
            "name": "PDF2Data MCP Server",
            "version": "1.0.0",
            "description": "Provides contextual information about the PDF2Data project",
            "protocol_version": "custom-rest-api"
        },
        "endpoints": {
            "/mcp/capabilities": {
                "description": "Get server capabilities and available endpoints",
                "method": "GET"
            },
            "/mcp/api-routes": {
                "description": "List all registered API endpoints in the application",
                "method": "GET"
            },
            "/mcp/parsers": {
                "description": "List all registered parsers available in the system",
                "method": "GET"
            },
            "/mcp/db-schema": {
                "description": "Get MongoDB collection schemas",
                "method": "GET",
                "parameters": ["collection_name (optional)"]
            },
            "/mcp/project-structure": {
                "description": "Get tree view of project structure",
                "method": "GET",
                "parameters": ["max_depth (optional, default: 3)"]
            },
            "/mcp/recent-changes": {
                "description": "Get recently modified files and git changes",
                "method": "GET",
                "parameters": ["hours (optional, default: 24)"]
            },
            "/mcp/dependencies": {
                "description": "Get project dependencies from package.json and requirements.txt",
                "method": "GET"
            },
            "/mcp/config": {
                "description": "Get sanitized application configuration",
                "method": "GET"
            },
            "/mcp/semantic-search": {
                "description": "Perform semantic search across the codebase",
                "method": "POST",
                "parameters": ["query (required)", "file_type (optional)", "max_results (optional, default: 5)"]
            }
        },
        "features": {
            "semantic_search": {
                "available": searcher_instance is not None,
                "model": "all-MiniLM-L6-v2",
                "index_type": "FAISS",
                "supported_languages": ["Python", "TypeScript", "JavaScript", "JSON", "Markdown"]
            },
            "file_monitoring": {
                "available": True,
                "description": "Real-time file change detection and smart re-indexing"
            },
            "git_integration": {
                "available": True,
                "description": "Git status and recent commit information"
            }
        },
        "data_sources": {
            "codebase": "Complete project source code with AST-based chunking",
            "database_schema": "MongoDB collection schemas and relationships",
            "configuration": "Application settings and environment variables",
            "dependencies": "Python and Node.js package dependencies",
            "git_history": "Recent commits and current repository status"
        }
    }
    
    return capabilities
