#!/usr/bin/env node
import 'dotenv/config';

/**
 * This is a deep search MCP server using LinkUp API.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LinkupClient } from "linkup-sdk";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Initialize LinkUp client with API key from environment
if (!process.env.LINKUP_API_KEY) {
  throw new Error('LINKUP_API_KEY environment variable is required');
}
const linkupClient = new LinkupClient({
  apiKey: process.env.LINKUP_API_KEY
});

/**
 * Create an MCP server with deep search capabilities
 */
const server = new Server(
  {
    name: "deep-search-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // We'll only expose tools for now
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes the deep_search tool for web content retrieval.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deep_search",
        description: "Perform a deep web search using LinkUp API",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            },
            max_results: {
              type: "number",
              default: 5,
              description: "Maximum number of results to return"
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

/**
 * Handler for the deep_search tool.
 * Performs a web search and returns structured results.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "deep_search": {
      const query = String(request.params.arguments?.query);
      const maxResults = Number(request.params.arguments?.max_results) || 5;

      if (!query) {
        throw new Error("Search query is required");
      }

      const results = await linkupClient.search({
        query,
        depth: 'deep',
        outputType: 'sourcedAnswer',
        includeImages: false
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
