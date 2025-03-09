# MCP Servers Development Guide

## Build Commands
- TypeScript: `npm run build` - Compile TypeScript to JavaScript
- TypeScript: `npm run watch` - Run TypeScript compiler in watch mode
- Python: Use standard Python packaging (projects use hatchling)
- Run server: `node dist/index.js` or via package.json `npm run start`

## Test Commands
- Python: `pytest` or `pytest tests/` - Run all tests
- Python: `pytest tests/test_file.py::test_function` - Run specific test

## Lint Commands
- TypeScript: `npm run lint` - Run ESLint (when available)
- Python: Projects use ruff and pyright

## Code Style Guidelines
- **TypeScript**: 
  - 2-space indentation, ES modules with .js extension in imports
  - Zod for schema validation, explicit return types
  - Error handling with custom error classes and try/catch blocks
- **Python**:
  - 4-space indentation, type annotations (Python 3.10+)
  - Pydantic for validation, snake_case for functions/variables
  - Group imports by standard library, third-party, local

## Project Structure
- Each server is self-contained with its own Docker configuration
- TypeScript servers use package.json, Python servers use pyproject.toml
- Common dependency: @modelcontextprotocol/sdk for MCP implementation

## Claude Desktop Configuration
- Config file location: `~/.config/Claude Desktop/claude_desktop_config.json`
- MCP servers can be run with NPX: `npx -y @modelcontextprotocol/server-NAME`
- Individual server notes:
  - **filesystem**: Requires paths to allowed directories
  - **memory**: Set `MEMORY_FILE_PATH` environment variable
  - **github**: Requires GitHub Personal Access Token with repo scope
  - **brave-search**: Requires Brave API key
  - **puppeteer**: No special configuration needed

## Docker Builds (if needed)
- Build from server directory: `docker build -t mcp/NAME -f src/NAME/Dockerfile .`
- Run with Docker: `docker run -i --rm mcp/NAME`
- Filesystem requires volume mounts: `--mount type=bind,src=/host/path,dst=/projects/path`
- Memory requires persistent volume: `-v claude-memory:/app/data`