#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Load environment variables
dotenv.config();

// Define the AI provider tools
const AI_ROUTER_TOOL: Tool = {
  name: "ai_router",
  description:
    "Routes a query to a specified AI provider (OpenAI, Gemini, Ollama) or a combination of providers. " +
    "Returns the generated text response from the selected provider(s). " +
    "Optionally accepts a model parameter to specify which model to use for each provider.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The text prompt to send to the AI provider"
      },
      provider: {
        type: "string",
        description: "The AI provider to use (openai, gemini, ollama, or all)",
        enum: ["openai", "gemini", "ollama", "all"]
      },
      model: {
        type: "string",
        description: "Optional: Specific model to use with the selected provider",
      },
      max_tokens: {
        type: "number",
        description: "Optional: Maximum number of tokens to generate (default: 1000)",
        default: 1000
      },
      temperature: {
        type: "number",
        description: "Optional: Temperature parameter for generation (default: 0.7)",
        default: 0.7
      }
    },
    required: ["query", "provider"],
  },
};

const AI_COMPARE_TOOL: Tool = {
  name: "ai_compare",
  description:
    "Sends the same query to multiple AI providers and returns their responses for comparison. " +
    "Useful for comparing how different AI models respond to the same prompt.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The text prompt to send to the AI providers"
      },
      providers: {
        type: "array",
        items: {
          type: "string",
          enum: ["openai", "gemini"]
        },
        description: "List of AI providers to query (e.g., ['openai', 'gemini'])"
      },
      models: {
        type: "object",
        properties: {
          openai: { type: "string" },
          gemini: { type: "string" }
        },
        description: "Optional: Specific models to use for each provider"
      },
      max_tokens: {
        type: "number",
        description: "Optional: Maximum number of tokens to generate (default: 1000)",
        default: 1000
      },
      temperature: {
        type: "number",
        description: "Optional: Temperature parameter for generation (default: 0.7)",
        default: 0.7
      }
    },
    required: ["query", "providers"],
  },
};

// Server implementation
const server = new Server(
  {
    name: "ai-router-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Function to read API keys from environment
function getApiKey(provider: string): string {
  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is required");
      }
      return process.env.OPENAI_API_KEY;
    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      return process.env.GEMINI_API_KEY;
    case 'ollama':
      // Ollama is typically run locally without an API key
      return '';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Function to get default model for a provider
function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    case 'gemini':
      return process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-pro';
    case 'ollama':
      return process.env.OLLAMA_DEFAULT_MODEL || 'llama3';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// OpenAI API implementation
async function callOpenAI(
  query: string,
  model: string = getDefaultModel('openai'),
  maxTokens: number = 15000,
  temperature: number = 0.7
): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: getApiKey('openai'),
    });

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant specialized in educational content creation."
        },
        {
          role: "user",
          content: query
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    return response.choices[0]?.message?.content || "No response from OpenAI";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return `Error calling OpenAI API: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Google Gemini API implementation
async function callGemini(
  query: string,
  model: string = getDefaultModel('gemini'),
  maxTokens: number = 10000,
  temperature: number = 0.7
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(getApiKey('gemini'));

    // Configure the model
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ]
    });

    // Generate the content
    const response = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "You are a helpful assistant specialized in educational content creation." },
            { text: query }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      },
    });

    return response.response.text() || "No response from Gemini";
  } catch (error) {
    console.error("Gemini API error:", error);
    return `Error calling Gemini API: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Ollama API implementation
async function callOllama(
  query: string,
  model: string = getDefaultModel('ollama'),
  maxTokens: number = 1000,
  temperature: number = 0.7
): Promise<string> {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: query,
        system: "You are a helpful assistant specialized in educational content creation.",
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "No response from Ollama";
  } catch (error) {
    console.error("Ollama API error:", error);
    return `Error calling Ollama API: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Input validation functions
function isAiRouterArgs(args: unknown): args is {
  query: string;
  provider: 'openai' | 'gemini' | 'ollama' | 'all';
  model?: string;
  max_tokens?: number;
  temperature?: number;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as any).query === "string" &&
    "provider" in args &&
    typeof (args as any).provider === "string"
  );
}

function isAiCompareArgs(args: unknown): args is {
  query: string;
  providers: Array<'openai' | 'gemini' | 'ollama'>;
  models?: {
    openai?: string;
    gemini?: string;
    ollama?: string;
  };
  max_tokens?: number;
  temperature?: number;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as any).query === "string" &&
    "providers" in args &&
    Array.isArray((args as any).providers)
  );
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [AI_ROUTER_TOOL, AI_COMPARE_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "ai_router": {
        if (!isAiRouterArgs(args)) {
          throw new Error("Invalid arguments for ai_router");
        }

        const { query, provider, model, max_tokens = 1000, temperature = 0.7 } = args;
        let result = "";

        if (provider === 'all') {
          // Call all providers and combine results
          const [openaiResult, geminiResult, ollamaResult] = await Promise.all([
            callOpenAI(query, model || getDefaultModel('openai'), max_tokens, temperature),
            callGemini(query, model || getDefaultModel('gemini'), max_tokens, temperature),
            callOllama(query, model || getDefaultModel('ollama'), max_tokens, temperature)
          ]);

          result = `
=== OpenAI Response ===
${openaiResult}

=== Gemini Response ===
${geminiResult}

=== Ollama Response ===
${ollamaResult}
`;
        } else {
          // Call the specified provider
          switch (provider) {
            case 'openai':
              result = await callOpenAI(query, model || getDefaultModel('openai'), max_tokens, temperature);
              break;
            case 'gemini':
              result = await callGemini(query, model || getDefaultModel('gemini'), max_tokens, temperature);
              break;
            case 'ollama':
              result = await callOllama(query, model || getDefaultModel('ollama'), max_tokens, temperature);
              break;
            default:
              throw new Error(`Unknown provider: ${provider}`);
          }
        }

        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      }

      case "ai_compare": {
        if (!isAiCompareArgs(args)) {
          throw new Error("Invalid arguments for ai_compare");
        }

        const { query, providers, models = {}, max_tokens = 1000, temperature = 0.7 } = args;
        const results: Record<string, string> = {};

        // Call each provider in parallel
        await Promise.all(
          providers.map(async (provider) => {
            switch (provider) {
              case 'openai':
                results[provider] = await callOpenAI(
                  query,
                  models.openai || getDefaultModel('openai'),
                  max_tokens,
                  temperature
                );
                break;
              case 'gemini':
                results[provider] = await callGemini(
                  query,
                  models.gemini || getDefaultModel('gemini'),
                  max_tokens,
                  temperature
                );
                break;
              case 'ollama':
                results[provider] = await callOllama(
                  query,
                  models.ollama || getDefaultModel('ollama'),
                  max_tokens,
                  temperature
                );
                break;
            }
          })
        );

        // Format the results
        const formattedResults = Object.entries(results)
          .map(([provider, response]) => `=== ${provider.toUpperCase()} ===\n${response}`)
          .join('\n\n');

        return {
          content: [{ type: "text", text: formattedResults }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AI Router MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
