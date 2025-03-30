const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { request } = require('http');

// Configuration
const CONFIG = {
  name: 'diff_editor',
  description: 'File diff editor with preview capabilities',
  port: 3009,
  methods: {
    start: {
      description: 'Start the diff editor server',
      parameters: {}
    },
    stop: {
      description: 'Stop the diff editor server',
      parameters: {}
    },
    status: {
      description: 'Check server status',
      parameters: {}
    },
    edit_file: {
      description: 'Open the diff editor for a specific file',
      parameters: {
        file_path: {
          type: 'string',
          description: 'Path to the file to edit'
        }
      }
    },
    apply_diff: {
      description: 'Apply a diff to a file',
      parameters: {
        file_path: {
          type: 'string',
          description: 'Path to the file to modify'
        },
        diff_content: {
          type: 'string',
          description: 'Diff content to apply'
        }
      }
    },
    preview_diff: {
      description: 'Preview a diff without applying it',
      parameters: {
        file_path: {
          type: 'string',
          description: 'Path to the file to preview changes for'
        },
        diff_content: {
          type: 'string',
          description: 'Diff content to preview'
        }
      }
    }
  }
};

// Server process reference
let serverProcess = null;
const SERVER_PATH = path.join(__dirname, 'server.js');
const BACKUPS_DIR = path.join(__dirname, 'backups');

// Ensure backups directory exists
async function ensureBackupsDir() {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
  } catch (err) {
    console.error(`Error creating backups directory: ${err.message}`);
  }
}

// Helper function to make HTTP requests to the server
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: CONFIG.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve(parsedData);
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Check if server is running
async function isServerRunning() {
  try {
    await makeRequest('GET', '/health');
    return true;
  } catch (error) {
    return false;
  }
}

// MCP Methods
async function startServer() {
  if (await isServerRunning()) {
    return { success: true, message: 'Server is already running' };
  }

  try {
    await ensureBackupsDir();
    
    serverProcess = spawn('node', [SERVER_PATH], {
      detached: true,
      stdio: 'ignore'
    });
    
    serverProcess.unref();
    
    // Wait for server to start
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await isServerRunning()) {
        return { 
          success: true, 
          message: `Server started successfully on port ${CONFIG.port}`,
          url: `http://localhost:${CONFIG.port}/`
        };
      }
      attempts++;
    }
    
    throw new Error('Server failed to start in the expected time');
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function stopServer() {
  if (!(await isServerRunning())) {
    return { success: true, message: 'Server is not running' };
  }
  
  try {
    // Try a graceful approach first with a system command
    const { exec } = require('child_process');
    exec(`lsof -ti:${CONFIG.port} | xargs kill -9`, (error) => {
      if (error) {
        console.error(`Error stopping server: ${error.message}`);
      }
    });
    
    // If we have a process reference, also try to kill it
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    
    return { success: true, message: 'Server stopped successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getStatus() {
  const running = await isServerRunning();
  
  if (running) {
    try {
      const healthResponse = await makeRequest('GET', '/health');
      return { 
        success: true,
        status: 'running',
        uptime: healthResponse.uptime,
        url: `http://localhost:${CONFIG.port}/`
      };
    } catch (error) {
      return { success: true, status: 'running', error: error.message };
    }
  } else {
    return { success: true, status: 'stopped' };
  }
}

async function editFile(params) {
  const { file_path } = params;
  
  if (!file_path) {
    return { success: false, error: 'File path is required' };
  }
  
  // Ensure server is running
  if (!(await isServerRunning())) {
    const startResult = await startServer();
    if (!startResult.success) {
      return startResult;
    }
  }
  
  // Create a symbolic link to the file in the server directory
  const targetFilename = path.basename(file_path);
  const linkPath = path.join(__dirname, targetFilename);
  
  try {
    try {
      // Remove existing link if it exists
      await fs.unlink(linkPath).catch(() => {});
    } catch (error) {
      // Ignore errors if the file doesn't exist
    }
    
    // Create symbolic link
    await fs.symlink(file_path, linkPath);
    
    return { 
      success: true, 
      message: `File ready for editing`,
      url: `http://localhost:${CONFIG.port}/?file=${encodeURIComponent(targetFilename)}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function applyDiff(params) {
  const { file_path, diff_content } = params;
  
  if (!file_path || !diff_content) {
    return { success: false, error: 'File path and diff content are required' };
  }
  
  // Ensure server is running
  if (!(await isServerRunning())) {
    const startResult = await startServer();
    if (!startResult.success) {
      return startResult;
    }
  }
  
  // Create a symbolic link to the file in the server directory
  const targetFilename = path.basename(file_path);
  const linkPath = path.join(__dirname, targetFilename);
  
  try {
    try {
      // Remove existing link if it exists
      await fs.unlink(linkPath).catch(() => {});
    } catch (error) {
      // Ignore errors if the file doesn't exist
    }
    
    // Create symbolic link
    await fs.symlink(file_path, linkPath);
    
    // Apply the diff
    const result = await makeRequest('POST', '/update-file', {
      filename: targetFilename,
      content: diff_content
    });
    
    return { 
      success: true, 
      message: `Changes applied successfully`,
      backup_created: result.backupCreated,
      is_diff: result.isDiff
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function previewDiff(params) {
  const { file_path, diff_content } = params;
  
  if (!file_path || !diff_content) {
    return { success: false, error: 'File path and diff content are required' };
  }
  
  // Ensure server is running
  if (!(await isServerRunning())) {
    const startResult = await startServer();
    if (!startResult.success) {
      return startResult;
    }
  }
  
  // Create a symbolic link to the file in the server directory
  const targetFilename = path.basename(file_path);
  const linkPath = path.join(__dirname, targetFilename);
  
  try {
    try {
      // Remove existing link if it exists
      await fs.unlink(linkPath).catch(() => {});
    } catch (error) {
      // Ignore errors if the file doesn't exist
    }
    
    // Create symbolic link
    await fs.symlink(file_path, linkPath);
    
    // Preview the diff
    const result = await makeRequest('POST', '/preview-changes', {
      filename: targetFilename,
      content: diff_content
    });
    
    return { 
      success: true, 
      message: `Preview generated`,
      is_diff: result.isDiff,
      diff: result.diff,
      preview: result.preview
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export MCP interface
module.exports = {
  config: CONFIG,
  methods: {
    start: startServer,
    stop: stopServer,
    status: getStatus,
    edit_file: editFile,
    apply_diff: applyDiff,
    preview_diff: previewDiff
  }
}; 