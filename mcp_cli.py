#!/usr/bin/env python3
"""
Simple CLI tool for querying the PDF2Data MCP Server
Usage: python mcp_cli.py <command> [options]
"""

import argparse
import requests
import json
import sys
from typing import Optional

def make_request(endpoint: str, method: str = "GET", data: Optional[dict] = None) -> dict:
    """Make a request to the MCP server"""
    base_url = "http://localhost:8000/mcp"
    url = f"{base_url}/{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to MCP server. Is the app running on localhost:8000?")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP Error: {e}")
        sys.exit(1)

def cmd_capabilities(args):
    """Show server capabilities"""
    data = make_request("capabilities")
    print(f"🤖 {data['server_info']['name']} v{data['server_info']['version']}")
    print(f"📋 {data['server_info']['description']}")
    print(f"\n🔧 Available endpoints: {len(data['endpoints'])}")
    for endpoint, info in data['endpoints'].items():
        print(f"  {info['method']} {endpoint} - {info['description']}")

def cmd_structure(args):
    """Show project structure"""
    data = make_request(f"project-structure?max_depth={args.depth}")
    print(f"📁 Project: {data['project_name']}")
    print_structure(data['structure'], indent=0)

def print_structure(items, indent=0):
    """Recursively print project structure"""
    for item in items:
        prefix = "  " * indent
        if item['type'] == 'directory':
            print(f"{prefix}📁 {item['name']}/")
            if 'children' in item and item['children']:
                print_structure(item['children'], indent + 1)
        else:
            size_mb = item.get('size', 0) / 1024 / 1024
            print(f"{prefix}📄 {item['name']} ({size_mb:.1f}MB)")

def cmd_search(args):
    """Perform semantic search"""
    data = make_request("semantic-search", "POST", {
        "query": args.query,
        "max_results": args.limit,
        "file_type": args.type
    })
    
    print(f"🔍 Search: '{data['query']}'")
    print(f"📊 Found {data['total_results']} results:")
    
    for i, result in enumerate(data['results'], 1):
        print(f"\n{i}. 📄 {result['file_path']}")
        print(f"   🎯 {result['identifier']} ({result['type']})")
        print(f"   📈 Relevance: {result['relevance_score']:.2f}")
        print(f"   👀 Preview: {result['preview'][:100]}...")

def cmd_changes(args):
    """Show recent changes"""
    data = make_request(f"recent-changes?hours={args.hours}")
    
    print(f"📝 Recent changes (last {args.hours} hours):")
    print(f"📁 Modified files: {len(data['recent_files'])}")
    
    for file in data['recent_files'][:args.limit]:
        print(f"  📄 {file['path']} ({file['modified_at']})")
    
    if 'git_info' in data and 'current_branch' in data['git_info']:
        print(f"\n🌿 Git branch: {data['git_info']['current_branch']}")
        
    if 'git_info' in data and 'recent_commits' in data['git_info']:
        commits = data['git_info']['recent_commits']
        if commits:
            print(f"📝 Recent commits: {len(commits)}")
            for commit in commits[:3]:
                print(f"  • {commit}")

def cmd_deps(args):
    """Show dependencies"""
    data = make_request("dependencies")
    
    print("📦 Project Dependencies:")
    for dep_file, content in data['dependencies'].items():
        print(f"\n📄 {dep_file}:")
        if isinstance(content, dict):
            # Package.json format
            if 'dependencies' in content:
                print("  Dependencies:")
                for pkg, version in list(content['dependencies'].items())[:5]:
                    print(f"    • {pkg}: {version}")
            if 'devDependencies' in content:
                print("  Dev Dependencies:")
                for pkg, version in list(content['devDependencies'].items())[:5]:
                    print(f"    • {pkg}: {version}")
        else:
            # Requirements.txt format
            lines = content.split('\n')[:10]
            for line in lines:
                if line.strip():
                    print(f"    • {line.strip()}")

def cmd_config(args):
    """Show configuration"""
    data = make_request("config")
    config = data['config']
    
    print("⚙️  Application Configuration:")
    print(f"  🐛 Debug mode: {config['debug_mode']}")
    print(f"  📏 Max file size: {config['max_file_size_mb']}MB")
    print(f"  🗄️  Database: {config['mongodb_db_name']}")
    print(f"  🤖 OpenAI configured: {config['openai_configured']}")

def main():
    parser = argparse.ArgumentParser(description="PDF2Data MCP Server CLI")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Capabilities command
    subparsers.add_parser('capabilities', help='Show server capabilities')
    
    # Structure command
    structure_parser = subparsers.add_parser('structure', help='Show project structure')
    structure_parser.add_argument('--depth', type=int, default=3, help='Maximum depth (default: 3)')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Semantic search')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('--limit', type=int, default=5, help='Max results (default: 5)')
    search_parser.add_argument('--type', help='File type filter (e.g., .py, .ts)')
    
    # Changes command
    changes_parser = subparsers.add_parser('changes', help='Show recent changes')
    changes_parser.add_argument('--hours', type=int, default=24, help='Hours to look back (default: 24)')
    changes_parser.add_argument('--limit', type=int, default=10, help='Max files to show (default: 10)')
    
    # Dependencies command
    subparsers.add_parser('deps', help='Show dependencies')
    
    # Config command
    subparsers.add_parser('config', help='Show configuration')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Route to appropriate command
    command_map = {
        'capabilities': cmd_capabilities,
        'structure': cmd_structure,
        'search': cmd_search,
        'changes': cmd_changes,
        'deps': cmd_deps,
        'config': cmd_config
    }
    
    command_map[args.command](args)

if __name__ == "__main__":
    main()
