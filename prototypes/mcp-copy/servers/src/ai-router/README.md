# AI Router MCP Server

This Model Context Protocol (MCP) server allows routing queries to multiple AI providers:

- OpenAI (e.g., GPT-4, GPT-3.5)
- Google Gemini (e.g., Gemini 1.5 Pro)
- Ollama (local models like Llama 3)

The server provides functionality to query a single provider or compare responses from multiple providers for the same prompt.

## Features

- Send queries to OpenAI, Gemini, or Ollama with a single interface
- Compare responses from different providers side-by-side
- Specify different models for each provider
- Configure generation parameters (max tokens, temperature)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
OLLAMA_URL=http://localhost:11434  # Default Ollama URL

# Optional: Set default models for each provider
OPENAI_DEFAULT_MODEL=gpt-4
GEMINI_DEFAULT_MODEL=gemini-1.5-pro
OLLAMA_DEFAULT_MODEL=llama3
```

## Usage

The server exposes two main tools:

### 1. `ai_router` Tool

Routes a query to a single provider or all providers:

```json
{
  "name": "ai_router",
  "arguments": {
    "query": "Write a brief introduction to photosynthesis for a textbook.",
    "provider": "openai",
    "model": "gpt-4-turbo",
    "max_tokens": 1000,
    "temperature": 0.7
  }
}
```

Parameters:
- `query` (required): The text prompt to send to the AI
- `provider` (required): The AI provider to use (`openai`, `gemini`, `ollama`, or `all`)
- `model` (optional): Specific model to use (defaults to values in .env)
- `max_tokens` (optional): Maximum tokens to generate (default: 1000)
- `temperature` (optional): Generation temperature (default: 0.7)

### 2. `ai_compare` Tool

Compares responses from multiple providers:

```json
{
  "name": "ai_compare",
  "arguments": {
    "query": "Write a brief introduction to photosynthesis for a textbook.",
    "providers": ["openai", "gemini"],
    "models": {
      "openai": "gpt-4",
      "gemini": "gemini-1.5-pro"
    },
    "max_tokens": 1000,
    "temperature": 0.7
  }
}
```

Parameters:
- `query` (required): The text prompt to send to all providers
- `providers` (required): Array of providers to query
- `models` (optional): Specific models to use for each provider
- `max_tokens` (optional): Maximum tokens to generate (default: 1000)
- `temperature` (optional): Generation temperature (default: 0.7)

## Running the Server

Start the server with:

```bash
npm start
```

## Example: Using for Textbook Generation

This server can be used to automate AI reviews of textbook content by sending the same prompt to multiple providers:

```json
{
  "name": "ai_compare",
  "arguments": {
    "query": "Review the following textbook chapter on Force and Motion and provide specific suggestions for improvement:\n\n[CHAPTER_CONTENT]",
    "providers": ["openai", "gemini", "ollama"],
    "models": {
      "openai": "gpt-4",
      "gemini": "gemini-1.5-pro",
      "ollama": "llama3"
    }
  }
}
```

This will return a side-by-side comparison of reviews from each AI provider, which can be used to create a consensus review.

## Docker Support

A Dockerfile is provided for containerized deployment. Build with:

```bash
docker build -t ai-router-mcp .
```

And run with:

```bash
docker run -it --env-file .env ai-router-mcp
```