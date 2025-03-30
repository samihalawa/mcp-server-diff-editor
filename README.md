# MCP Diff Editor

A powerful MCP-integrated diff editor for modifying files with preview capabilities.

## Features

- Edit files through a web interface with real-time diff preview
- Apply changes using unified diff format or complete file replacement
- Create backups automatically before making changes
- Restore from previous backups
- View examples of common diff operations
- Security controls to prevent unauthorized file access

## Usage as MCP

The MCP diff editor provides the following methods:

### `start`
Start the diff editor server

### `stop`
Stop the diff editor server

### `status`
Check server status

### `edit_file`
Open the diff editor for a specific file
- Parameters:
  - `file_path`: Path to the file to edit

### `apply_diff`
Apply a diff to a file
- Parameters:
  - `file_path`: Path to the file to modify
  - `diff_content`: Diff content to apply

### `preview_diff`
Preview a diff without applying it
- Parameters:
  - `file_path`: Path to the file to preview changes for
  - `diff_content`: Diff content to preview

## Example Usage

```javascript
const mcp = require('mcp');
const diffEditor = mcp.get('diff_editor');

// Start the server
await diffEditor.start();

// Open the editor for a specific file
const result = await diffEditor.edit_file({
  file_path: '/path/to/your/file.txt'
});

// Get the URL to access the editor
console.log(result.url);

// Apply a diff to a file
await diffEditor.apply_diff({
  file_path: '/path/to/your/file.txt',
  diff_content: `@@ -5,7 +5,7 @@
   <title>Sample Page</title>
 </head>
 <body>
-  <h1>Welcome to our website</h1>
+  <h1>Welcome to our awesome website!</h1>
   <p>Thanks for visiting us.</p>
 </body>
 </html>`
});
```

## Environment Variables

- `PORT`: HTTP port (default: 3009)
- `MCP_FILE_DIR`: Directory to use as base for file operations (default: current directory)
- `MCP_ALLOW_ANY_PATH`: Set to 'true' to allow accessing files outside the working directory

## Installation

This module is intended to be used as an MCP in the `/Users/samihalawa/Documents/MCP` directory and should be automatically available in the MCP interface after installation. 