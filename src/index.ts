#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Create MCP server for diff editor
const server = new Server(
  {
    name: 'mcp-server-diff-editor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'diff_editor_tool',
        description: 'A diff editor tool for comparing and editing text',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'Operation to perform (diff, merge, etc.)',
              enum: ['diff', 'merge', 'apply']
            },
            original: {
              type: 'string',
              description: 'Original text content'
            },
            modified: {
              type: 'string', 
              description: 'Modified text content'
            }
          },
          required: ['operation']
        }
      }
    ]
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name !== 'diff_editor_tool') {
    throw new Error(`Unknown tool: ${name}`);
  }

  const { operation, original, modified } = args as {
    operation: string;
    original?: string;
    modified?: string;
  };

  switch (operation) {
    case 'diff':
      return {
        content: [
          {
            type: 'text',
            text: `Diff operation performed between:\nOriginal: ${original || 'N/A'}\nModified: ${modified || 'N/A'}`
          }
        ]
      };
    
    case 'merge':
      return {
        content: [
          {
            type: 'text', 
            text: `Merge operation result: ${original || ''} + ${modified || ''}`
          }
        ]
      };
      
    case 'apply':
      return {
        content: [
          {
            type: 'text',
            text: `Applied changes to: ${original || 'content'}`
          }
        ]
      };
      
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
});

// Start the server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP diff editor server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});