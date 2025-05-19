#!/usr/bin/env node
import { createMcpServer } from '@modelcontextprotocol/sdk';

// MCP server for mcp server diff editor
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const DEBUG = process.env.DEBUG === 'true';

console.log(`Starting mcp-server-diff-editor on port ${PORT}...`);

const server = createMcpServer({
  displayName: 'mcp server diff editor',
  tools: [
    {
      name: 'example_tool',
      description: 'An example tool',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'First parameter'
          }
        },
        required: ['param1']
      },
      handler: async (params) => {
        const { param1 } = params;
        return `Received parameter: ${param1}`;
      }
    }
  ]
});

server.listen(PORT, () => {
  console.log(`mcp-server-diff-editor server running on http://localhost:${PORT}`);
});
