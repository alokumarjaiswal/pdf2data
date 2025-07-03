# PDF2Data MCP Server Documentation

## Overview

The PDF2Data MCP (Model Context Protocol) Server provides AI agents with comprehensive contextual information about the project. This enables more intelligent assistance by giving agents deep insight into the codebase structure, capabilities, and current state.

## Available Endpoints

### Core Information Endpoints

#### `/mcp/capabilities`
- **Method**: GET
- **Description**: Returns server capabilities and available endpoints
- **Use Case**: Helps AI agents understand what information they can request

#### `/mcp/api-routes`
- **Method**: GET  
- **Description**: Lists all registered API endpoints in the application
- **Use Case**: Provides an overview of the application's API surface

#### `/mcp/parsers`
- **Method**: GET
- **Description**: Lists all registered parsers available in the system
- **Use Case**: Shows what parsing capabilities are available

#### `/mcp/db-schema`
- **Method**: GET
- **Parameters**: `collection_name` (optional)
- **Description**: Returns MongoDB collection schemas
- **Use Case**: Helps understand the database structure and relationships

### Project Context Endpoints

#### `/mcp/project-structure`
- **Method**: GET
- **Parameters**: `max_depth` (optional, default: 3)
- **Description**: Returns a tree view of the project structure
- **Use Case**: Provides hierarchical understanding of codebase organization

#### `/mcp/recent-changes` 
- **Method**: GET
- **Parameters**: `hours` (optional, default: 24)
- **Description**: Returns recently modified files and git changes
- **Use Case**: Shows what's been worked on recently, including git commits and file modifications

#### `/mcp/dependencies`
- **Method**: GET
- **Description**: Returns project dependencies from package.json and requirements.txt
- **Use Case**: Helps understand project dependencies and setup requirements

#### `/mcp/config`
- **Method**: GET
- **Description**: Returns sanitized application configuration
- **Use Case**: Shows application settings without exposing sensitive information

### Advanced Search

#### `/mcp/semantic-search`
- **Method**: POST
- **Parameters**: 
  - `query` (required): Search query in natural language
  - `file_type` (optional): Filter by file extension (e.g., ".py", ".ts")
  - `max_results` (optional, default: 5): Maximum number of results
- **Description**: Performs semantic search across the codebase using vector embeddings
- **Use Case**: Find relevant code snippets based on natural language descriptions

## Features

### Semantic Search Capabilities
- **Model**: `all-MiniLM-L6-v2` sentence transformer
- **Index**: FAISS vector database for efficient similarity search
- **Chunking**: AST-based for Python (function/class level), whole-file for others
- **Languages**: Python, TypeScript, JavaScript, JSON, Markdown
- **Real-time**: Smart indexing with file change detection

### Smart Indexing
- **Hash-based Detection**: Only re-indexes when files actually change
- **Background Processing**: Non-blocking startup and updates
- **Incremental Updates**: Efficient handling of file modifications
- **File Watching**: Real-time monitoring with `watchdog`

### Git Integration
- Recent commits and branch information
- Git status and working directory changes
- Repository state awareness

## Example Usage

### Basic Information Gathering
```bash
# Get server capabilities
curl http://localhost:8000/mcp/capabilities

# Get project structure
curl http://localhost:8000/mcp/project-structure?max_depth=2

# Get recent changes
curl http://localhost:8000/mcp/recent-changes?hours=48
```

### Semantic Search
```bash
# Search for PDF extraction code
curl -X POST http://localhost:8000/mcp/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"query": "PDF extraction", "max_results": 5}'

# Search only in Python files
curl -X POST http://localhost:8000/mcp/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"query": "database connection", "file_type": ".py", "max_results": 3}'
```

### Configuration and Dependencies
```bash
# Get application configuration
curl http://localhost:8000/mcp/config

# Get project dependencies
curl http://localhost:8000/mcp/dependencies

# Get database schema
curl http://localhost:8000/mcp/db-schema?collection_name=documents
```

## Integration with AI Agents

This MCP server is designed to work with AI coding assistants like GitHub Copilot, allowing them to:

1. **Understand Project Structure**: Get a complete view of how the codebase is organized
2. **Find Relevant Code**: Use semantic search to locate functions, classes, or patterns
3. **Access Current State**: See recent changes and what's currently being worked on
4. **Understand Dependencies**: Know what libraries and frameworks are in use
5. **Access Database Schema**: Understand data models and relationships

## Technical Architecture

### Vector Search Pipeline
1. **Indexing**: Code is chunked and embedded using sentence transformers
2. **Storage**: Embeddings stored in FAISS index with metadata mapping
3. **Search**: Query embeddings compared against index for similarity
4. **Results**: Ranked results with relevance scores and metadata

### Smart Re-indexing
1. **Hash Tracking**: File content hashes stored to detect changes
2. **Incremental Updates**: Only modified files are re-processed
3. **Background Processing**: Non-blocking updates during operation
4. **File Watching**: Real-time detection of file system changes

## Performance Notes

- **Cold Start**: Initial indexing may take 30-60 seconds for large codebases
- **Memory Usage**: ~100-200MB for embeddings and index (varies by codebase size)
- **Search Speed**: Sub-second response times for most queries
- **Scalability**: Handles codebases up to ~10,000 files efficiently

## Future Enhancements

- True MCP protocol compliance (JSON-RPC over stdio/SSE)
- Advanced filtering (date ranges, specific directories)
- Code complexity metrics and analysis
- Integration with linting and testing results
- Custom embedding models for domain-specific code
