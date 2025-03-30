const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const cors = require('cors');
const { execSync } = require('child_process');
const util = require('util');

// Constants
const app = express();
const PORT = process.env.PORT || 3009;

// Directory where our files are located
// This is now dynamic based on environment
let WORKING_DIR = process.env.MCP_FILE_DIR || process.cwd();
// Make sure the path is absolute
if (!path.isAbsolute(WORKING_DIR)) {
  WORKING_DIR = path.resolve(process.cwd(), WORKING_DIR);
}
console.log(`Working directory set to: ${WORKING_DIR}`);

// Backups directory - will be created if it doesn't exist
const BACKUPS_DIR = path.join(WORKING_DIR, 'backups');

// Maximum number of recent modifications to keep in memory
const MAX_MODIFICATIONS = 10;

// Store recent modifications for reference
const recentModifications = [];

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure the backups directory exists
async function setupBackupsDir() {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    console.log(`Backups directory ensured at: ${BACKUPS_DIR}`);
  } catch (error) {
    console.warn(`Warning: Could not create backups directory: ${error.message}`);
  }
}

// Validate file paths to prevent directory traversal attacks
function isValidFilePath(filePath) {
  // Normalize and resolve the path
  const normalizedPath = path.normalize(filePath);
  const absolutePath = path.isAbsolute(normalizedPath) 
    ? normalizedPath 
    : path.join(WORKING_DIR, normalizedPath);
  
  // Ensure the file path doesn't try to access parent directories
  if (!absolutePath.startsWith(WORKING_DIR) && !process.env.MCP_ALLOW_ANY_PATH) {
    console.warn(`Security warning: Attempted access to file outside working directory: ${absolutePath}`);
    return false;
  }
  
  return true;
}

// Get the absolute path for a file
function getAbsolutePath(filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(WORKING_DIR, filePath);
}

// Function to check if content is a diff
function isDiff(content) {
  // Common diff format markers
  const diffMarkers = [
    /^diff --git/m,       // git diff header
    /^@@ -\d+,\d+ \+\d+,\d+ @@/m, // unified diff hunk header
    /^---/m,              // unified diff old file header
    /^\+\+\+/m            // unified diff new file header
  ];
  
  // Check if the content contains any of the diff markers
  return diffMarkers.some(marker => marker.test(content));
}

// Apply a diff to the existing content
function applyDiff(originalContent, diffContent) {
  // Split content into lines for processing
  const originalLines = originalContent.split('\n');
  const diffLines = diffContent.split('\n');
  
  // Result will accumulate the modified content
  let result = [...originalLines];
  let lineOffset = 0; // Tracks how line numbers shift as we apply the diff
  
  // Track current position in the diff
  let i = 0;
  
  // Skip past any headers (diff --git, index, etc.)
  while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
    i++;
  }
  
  // Process each hunk in the diff
  while (i < diffLines.length) {
    const line = diffLines[i];
    
    // Parse hunk header: @@ -X,Y +P,Q @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (!match) {
        i++;
        continue; // Skip invalid hunk headers
      }
      
      const originalStart = parseInt(match[1]) - 1; // 0-based index
      const originalLength = parseInt(match[2]);
      const newStart = parseInt(match[3]) - 1; // 0-based index
      
      // Apply line offset from previous hunks
      const adjustedStart = originalStart + lineOffset;
      
      // Move to the first line of the hunk
      i++;
      
      // Track changes for this hunk
      let linesAdded = 0;
      let linesRemoved = 0;
      const additions = [];
      
      // Process lines in the hunk
      while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
        const hunkLine = diffLines[i];
        
        if (hunkLine.startsWith('+')) {
          // Line added
          additions.push(hunkLine.substring(1)); // Store without the '+' marker
          linesAdded++;
        } else if (hunkLine.startsWith('-')) {
          // Line removed
          linesRemoved++;
        } else {
          // Context line - just move past it
          // (If we needed more verification, we could check that this line matches original content)
        }
        
        i++;
      }
      
      // Apply changes to the result array
      result.splice(
        adjustedStart, // Starting position
        linesRemoved,  // Number of lines to remove
        ...additions   // Lines to add
      );
      
      // Update line offset for subsequent hunks
      lineOffset += (linesAdded - linesRemoved);
    } else {
      // Skip non-hunk lines
      i++;
    }
  }
  
  return result.join('\n');
}

// Create a backup of a file with timestamp
async function createBackup(filePath) {
  try {
    // Make sure backups directory exists
    await setupBackupsDir();
    
    // Get file content
    const content = await fs.readFile(getAbsolutePath(filePath), 'utf8');
    
    // Create a timestamped backup
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}.${timestamp}.backup`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    
    // Write the backup
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`Created backup: ${backupPath}`);
    
    return {
      path: backupPath,
      filename: backupFileName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    throw error;
  }
}

// Get list of backups for a file
async function getBackups(filePath) {
  try {
    // Make sure backups directory exists
    await setupBackupsDir();
    
    // Get base filename
    const fileName = path.basename(filePath);
    
    // List all files in the backups directory
    const files = await fs.readdir(BACKUPS_DIR);
    
    // Filter for backups of the specific file and sort by timestamp (newest first)
    const backups = files
      .filter(file => file.startsWith(`${fileName}.`) && file.endsWith('.backup'))
      .map(file => {
        // Extract timestamp from filename
        const timestampMatch = file.match(/\.(.+?)\.backup$/);
        const timestamp = timestampMatch ? timestampMatch[1].replace(/-/g, ':') : '';
        
        return {
          path: path.join(BACKUPS_DIR, file),
          filename: file,
          timestamp
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return backups;
  } catch (error) {
    console.error(`Error getting backups: ${error.message}`);
    return [];
  }
}

// Provide a few example diffs for users to learn from
function getDiffExamples() {
  return [
    {
      name: "Add a New Element",
      description: "Add a new paragraph element after an existing <div>",
      diff: 
`@@ -10,6 +10,7 @@
   <div class="container">
     <h1>Hello World</h1>
+    <p>This is a new paragraph that will be added</p>
     <button id="submit">Click Me</button>
   </div>
 `
    },
    {
      name: "Replace Text",
      description: "Change the text within an existing element",
      diff:
`@@ -5,7 +5,7 @@
   <title>Sample Page</title>
 </head>
 <body>
-  <h1>Welcome to our website</h1>
+  <h1>Welcome to our awesome website!</h1>
   <p>Thanks for visiting us.</p>
 </body>
 </html>`
    },
    {
      name: "Add CSS Style",
      description: "Add a new CSS rule to the stylesheet",
      diff:
`@@ -12,6 +12,12 @@
     .container {
       max-width: 1200px;
       margin: 0 auto;
+    }
+    
+    .highlight {
+      background-color: #ffff99;
+      padding: 10px;
+      border-radius: 5px;
     }
     
     .button {`
    }
  ];
}

// Set up API routes
app.get('/', (req, res) => {
  // Serve the editor page
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    status: 'OK',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    workingDir: WORKING_DIR,
    backupsDir: BACKUPS_DIR
  });
});

app.get('/read-file/:filename(*)', async (req, res) => {
  try {
    const filePath = req.params.filename;
    
    // Security check
    if (!isValidFilePath(filePath)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    // Read the file
    const content = await fs.readFile(getAbsolutePath(filePath), 'utf8');
    res.send(content);
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/update-file', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }
    
    // Security check
    if (!isValidFilePath(filename)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    const absolutePath = getAbsolutePath(filename);
    
    // Create backup before modifying
    const backup = await createBackup(filename);
    
    // Check if content is a diff
    const contentIsDiff = isDiff(content);
    let finalContent;
    
    if (contentIsDiff) {
      // If it's a diff, apply it to the current content
      const originalContent = await fs.readFile(absolutePath, 'utf8');
      finalContent = applyDiff(originalContent, content);
    } else {
      // Otherwise, use the provided content as is
      finalContent = content;
    }
    
    // Write the file
    await fs.writeFile(absolutePath, finalContent, 'utf8');
    
    // Add to recent modifications
    recentModifications.unshift({
      filename,
      timestamp: new Date().toISOString(),
      isDiff: contentIsDiff,
      backupFile: backup.path
    });
    
    // Keep only the most recent modifications
    if (recentModifications.length > MAX_MODIFICATIONS) {
      recentModifications.pop();
    }
    
    console.log(`File updated: ${absolutePath}${contentIsDiff ? ' (using diff)' : ''}`);
    res.json({ 
      success: true, 
      isDiff: contentIsDiff,
      backupCreated: true,
      backupFile: backup.path
    });
  } catch (error) {
    console.error(`Error updating file: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/preview-changes', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }
    
    // Security check
    if (!isValidFilePath(filename)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    // Check if content is a diff
    const contentIsDiff = isDiff(content);
    let diff = null;
    
    if (contentIsDiff) {
      // If it's already a diff, just return it
      diff = content;
    } else {
      // If it's not a diff, generate one
      try {
        const absolutePath = getAbsolutePath(filename);
        const originalContent = await fs.readFile(absolutePath, 'utf8');
        
        // Create temp files for diff generation
        const tempFile1 = path.join(BACKUPS_DIR, 'temp_original');
        const tempFile2 = path.join(BACKUPS_DIR, 'temp_modified');
        
        await fs.writeFile(tempFile1, originalContent, 'utf8');
        await fs.writeFile(tempFile2, content, 'utf8');
        
        // Generate a unified diff
        try {
          diff = execSync(`diff -u ${tempFile1} ${tempFile2}`, { encoding: 'utf8' });
        } catch (diffError) {
          // diff returns a non-zero exit code if files are different
          diff = diffError.stdout;
        }
        
        // Clean up temp files
        try {
          await fs.unlink(tempFile1);
          await fs.unlink(tempFile2);
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temp files', cleanupError);
        }
      } catch (diffGenError) {
        console.warn('Warning: Failed to generate diff', diffGenError);
      }
    }
    
    res.json({ 
      success: true, 
      isDiff: contentIsDiff,
      diff
    });
  } catch (error) {
    console.error(`Error previewing changes: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup-file', async (req, res) => {
  try {
    const { source } = req.body;
    
    if (!source) {
      return res.status(400).json({ error: 'Source file is required' });
    }
    
    // Security check
    if (!isValidFilePath(source)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    // Create backup
    const backup = await createBackup(source);
    
    res.json({ 
      success: true, 
      backupFile: backup.path,
      timestamp: backup.timestamp
    });
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post('/restore-file', async (req, res) => {
  try {
    const { source, destination } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination files are required' });
    }
    
    // Security check for both files
    if (!isValidFilePath(source) || !isValidFilePath(destination)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    // Get absolute paths
    const srcPath = getAbsolutePath(source);
    const destPath = getAbsolutePath(destination);
    
    // Check if source exists
    try {
      await fs.access(srcPath);
    } catch (error) {
      return res.status(404).json({ error: 'Source file does not exist' });
    }
    
    // Read source and write to destination
    const content = await fs.readFile(srcPath, 'utf8');
    await fs.writeFile(destPath, content, 'utf8');
    
    console.log(`File restored: ${destPath} (from ${srcPath})`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error restoring file: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/backups/:filename(*)', async (req, res) => {
  try {
    const filePath = req.params.filename;
    
    // Security check
    if (!isValidFilePath(filePath)) {
      return res.status(403).json({ error: 'Access to this file is not allowed' });
    }
    
    // Get backups for the file
    const backups = await getBackups(filePath);
    res.json(backups);
  } catch (error) {
    console.error(`Error getting backups: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/recent-modifications', (req, res) => {
  res.json(recentModifications);
});

app.get('/examples', (req, res) => {
  res.json(getDiffExamples());
});

// Initialize the server
async function startServer() {
  // Set up backups directory
  await setupBackupsDir();
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Diff editor server running on port ${PORT}`);
    console.log(`Working directory: ${WORKING_DIR}`);
    console.log(`Backups directory: ${BACKUPS_DIR}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 