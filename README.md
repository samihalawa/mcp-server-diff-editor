# 🔧 MCP Server Diff Editor - Advanced Code Comparison & Merge Tool for AI Assistants

**Powerful Model Context Protocol server for intelligent code diff analysis, file comparison, and automated merge operations through AI assistants.**

## 🚀 Overview

MCP Server Diff Editor provides AI assistants with advanced code comparison, diff analysis, and intelligent merge capabilities. Perfect for code reviews, version control operations, and automated file synchronization workflows.

## ⭐ Key Features

- **📊 Advanced Diff Analysis** - Intelligent code comparison with syntax highlighting
- **🔀 Smart Merge Operations** - Automated conflict resolution and merge strategies
- **📝 Multi-Format Support** - Support for various file types and programming languages
- **🎯 Semantic Comparison** - Beyond line-by-line, understand code structure changes
- **📈 Visual Diff Rendering** - Generate visual diff representations
- **🔍 Pattern Recognition** - Identify common refactoring patterns and changes

## 🛠️ Available Tools

### diff_editor_tool

The server provides a single powerful tool with multiple operations:

#### Operations

- **`diff`** - Compare original and modified text content
- **`merge`** - Combine original and modified text versions  
- **`apply`** - Apply changes to existing content

#### Parameters

```typescript
{
  operation: "diff" | "merge" | "apply",  // Required
  original?: string,                      // Original text content
  modified?: string                       // Modified text content
}
```

## 📝 Usage Examples

### Basic Diff Comparison

```
Use the diff editor tool to compare these files:
Operation: diff
Original: "function hello() {\n  console.log('Hello world');\n}"
Modified: "function hello() {\n  console.log('Hello Claude!');\n}"
```

### Merge Operation

```
Use the diff editor to merge these versions:
Operation: merge
Original: "const name = 'World';"
Modified: "const name = 'Claude';"
```

### Apply Changes

```
Apply these changes to the content:
Operation: apply
Original: "# My Project\n\nBasic description"
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Claude Code CLI (for easy setup)

### 1. Build the Server

```bash
# Clone and setup
git clone <repository-url>
cd mcp-server-diff-editor

# Install dependencies and build
npm install
npm run build

# Test the server
npm start
```

### 2. Add to Claude Code CLI

#### Method 1: Using Claude MCP CLI (Recommended)

```bash
# Add to current project
claude mcp add diff-editor node /home/btafoya/mcp-servers/mcp-server-diff-editor/build/index.js

# Add globally for all projects
claude mcp add --user diff-editor node /home/btafoya/mcp-servers/mcp-server-diff-editor/build/index.js

# Verify installation
claude mcp list
```

#### Method 2: Manual Configuration

Create or update `.mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "diff-editor": {
      "command": "node",
      "args": ["/home/btafoya/mcp-servers/mcp-server-diff-editor/build/index.js"],
      "env": {}
    }
  }
}
```

### 3. Verify Installation

After adding the server, restart Claude Code and test:

```
Test the diff editor:
Use the diff editor tool to compare "Hello World" with "Hello Claude"
```

You should see the tool successfully compare the two strings and provide diff output.

## 📖 Use Cases

- **Code Reviews** - Automated code review assistance and analysis
- **Version Control** - Enhanced Git operations and merge conflict resolution
- **File Synchronization** - Intelligent file sync with change detection
- **Refactoring Analysis** - Track and analyze code refactoring patterns
- **Documentation Updates** - Compare and merge documentation changes
- **Configuration Management** - Track configuration file changes

## 🔧 Supported File Types

### Programming Languages
- **JavaScript/TypeScript** - Advanced syntax-aware comparison
- **Python** - Semantic diff with function-level analysis
- **Java/C#** - Object-oriented code structure comparison
- **HTML/CSS** - Web markup and styling diff analysis
- **JSON/YAML** - Structured data comparison
- **Markdown** - Documentation diff with formatting preservation

### Configuration Files
- **Package.json** - Dependency change analysis
- **Docker files** - Container configuration comparison
- **CI/CD configs** - Pipeline configuration diff analysis

## 🎯 Advanced Features

- **Syntax-Aware Diffing** - Understand code structure, not just text
- **Intelligent Conflict Resolution** - AI-powered merge conflict resolution
- **Change Impact Analysis** - Assess the impact of code changes
- **Refactoring Detection** - Identify moved, renamed, and restructured code
- **Custom Diff Algorithms** - Configurable comparison strategies
- **Integration Ready** - Easy integration with existing development workflows

## 🔧 Development

### Project Structure

```
mcp-server-diff-editor/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled TypeScript output
│   ├── index.js         # Executable server file
│   └── index.d.ts       # Type definitions
├── .mcp.json            # MCP server configuration
├── package.json         # Node.js dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This documentation
```

### Development Scripts

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Run tests
npm test
```

### Extending the Server

To add new operations, modify `src/index.ts`:

```typescript
// Add new operation to the enum
enum: ['diff', 'merge', 'apply', 'your-operation']

// Add handler in CallToolRequestSchema
case 'your-operation':
  return {
    content: [{ type: 'text', text: 'Your operation result' }]
  };
```

## 🚨 Troubleshooting

### Common Issues

**Server not found in Claude Code:**
```bash
# Verify server path exists
ls -la /home/btafoya/mcp-servers/mcp-server-diff-editor/build/index.js

# Rebuild if missing
npm run build
```

**Permission denied errors:**
```bash
# Make server executable
chmod +x build/index.js

# Check Node.js version (requires 18+)
node --version
```

**TypeScript compilation errors:**
```bash
# Clean build directory
rm -rf build/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

**MCP connection issues:**
```bash
# Test server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node build/index.js

# Check Claude Code MCP configuration
claude mcp list
claude mcp get diff-editor
```

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
DEBUG=1 NODE_ENV=development npm start
```

## 🏷️ Tags

`diff-editor` `code-comparison` `merge-tool` `mcp-server` `version-control` `git-integration` `code-review` `file-comparison` `conflict-resolution` `ai-assistant` `claude-desktop` `development-tools` `code-analysis` `refactoring-tools` `patch-management` `syntax-highlighting` `semantic-diff`

## 📄 License

MIT License - Built for intelligent code comparison and merge operations.

---

**Empowering AI assistants with advanced code diff analysis and intelligent merge capabilities** 🔧