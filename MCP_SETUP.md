# MCP Diff Editor Server Setup for Claude Code

## Quick Setup

### 1. Using Claude Code CLI (Recommended)

If you have Claude Code CLI installed, you can add this server directly:

```bash
# Add the server (run from project directory)
claude mcp add diff-editor node {mcp-server-diff-editor-path}/build/index.js

# List configured servers
claude mcp list

# Get server details
claude mcp get diff-editor
```

### 2. Manual Configuration

The `.mcp.json` file has already been created in this directory with the following configuration:

```json
{
  "mcpServers": {
    "diff-editor": {
      "command": "node",
      "args": ["{mcp-server-diff-editor-path}/build/index.js"],
      "env": {}
    }
  }
}
```

### 3. Configuration Scopes

- **Local scope**: Configuration applies only to current Claude Code session
- **Project scope**: Use `.mcp.json` file (already created) - shareable with team
- **User scope**: Available across all projects (use `--user` flag with CLI)

## Available Tools

Once configured, Claude Code will have access to:

- **diff_editor_tool**: Compare and edit text with operations:
  - `diff`: Compare original and modified text
  - `merge`: Merge two text versions
  - `apply`: Apply changes to content

## Usage Example

After setup, you can use the diff editor in Claude Code:

```
Use the diff editor tool to compare these two texts:
Original: "Hello world"
Modified: "Hello Claude world"
```

## Troubleshooting

1. **Server not found**: Ensure the build directory exists and `npm run build` was successful
2. **Permission errors**: Verify the index.js file is executable (`chmod +x build/index.js`)
3. **Node.js errors**: Ensure Node.js 18+ is installed and accessible

## Development

To modify the server:
1. Edit `src/index.ts`
2. Run `npm run build`
3. Restart Claude Code session to reload the server