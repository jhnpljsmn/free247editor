#!/usr/bin/env node
/**
 * free247editor MCP Server
 * 
 * Exposes tools for Claude Desktop to:
 * - Create and manage video projects
 * - Parse script.md files into structured scenes
 * - Transcribe Filipino/Taglish voiceovers via Groq
 * - Render scenes with auto-animations
 * - Assemble final MP4 with burned subtitles and mixed audio
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { createProjectTool } from './tools/create-project.mjs';
import { parseScriptTool } from './tools/parse-script.mjs';
import { transcribeTool } from './tools/transcribe.mjs';
import { renderSceneTool } from './tools/render-scene.mjs';
import { assembleTool } from './tools/assemble.mjs';
import { statusTool } from './tools/status.mjs';

// Collect all tools
const tools = [
  createProjectTool,
  parseScriptTool,
  transcribeTool,
  renderSceneTool,
  assembleTool,
  statusTool,
];

// Create MCP Server
const server = new Server(
  {
    name: 'free247editor-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(t => t.definition),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.definition.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    const result = await tool.execute(request.params.arguments);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: err.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('free247editor MCP server running on stdio');
