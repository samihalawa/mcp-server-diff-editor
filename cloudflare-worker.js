// Cloudflare Worker for MCP Diff Editor
// Simplified version for Cloudflare Workers environment

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// HTML content for the editor
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Diff Editor (Cloudflare Worker)</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .instructions {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .editor-container {
      display: flex;
      gap: 20px;
    }
    textarea {
      height: 400px;
      font-family: monospace;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      font-size: 14px;
      resize: vertical;
      width: 100%;
    }
    button {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #1d4ed8;
    }
    button.secondary {
      background-color: #f3f4f6;
      color: #333;
      border: 1px solid #d1d5db;
    }
    button.success {
      background-color: #10b981;
    }
    button.warning {
      background-color: #f59e0b;
    }
    .status {
      margin-top: 20px;
      padding: 10px;
      border-radius: 5px;
    }
    .success {
      background-color: #dcfce7;
      color: #166534;
    }
    .error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .button-container {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .diff-line {
      font-family: monospace;
      white-space: pre;
      line-height: 1.5;
      padding: 2px 4px;
      border-radius: 2px;
      margin: 0;
    }
    .diff-add {
      background-color: #dcfce7;
      color: #166534;
    }
    .diff-remove {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .diff-info {
      background-color: #f3f4f6;
      color: #6b7280;
    }
    .diff-container {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 10px;
      overflow: auto;
      max-height: 400px;
      font-size: 14px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cf-badge {
      background-color: #f38020;
      color: white;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <h1>MCP Diff Editor</h1>
      <span class="cf-badge">Cloudflare Worker</span>
    </div>
    
    <div class="instructions">
      <h2>Instructions</h2>
      <p>This is a simplified version of the MCP Diff Editor running on Cloudflare Workers.</p>
      <p>Use the text area below to write your diff or full file content. Then use the API to apply changes to your files.</p>
    </div>
    
    <div>
      <label for="diff-content"><strong>Diff Content:</strong></label>
      <textarea id="diff-content" placeholder="Paste your diff or file content here..."></textarea>
      <div class="button-container">
        <button id="preview-btn" class="secondary">Format & Preview</button>
        <button id="copy-btn">Copy to Clipboard</button>
      </div>
    </div>
    
    <div id="preview-container" style="display: none;">
      <h3>Preview:</h3>
      <div class="diff-container" id="diff-preview"></div>
    </div>
    
    <div>
      <h3>API Usage</h3>
      <pre style="background: #f3f4f6; padding: 10px; border-radius: 5px; overflow: auto;">
// Apply diff to a file
fetch('https://your-worker.your-subdomain.workers.dev/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_path: '/path/to/file.txt',
    content: diffContent,
    api_key: 'your-api-key'
  })
});</pre>
    </div>
    
    <div id="status" class="status" style="display: none;"></div>
  </div>
  
  <script>
    const diffTextarea = document.getElementById('diff-content');
    const previewBtn = document.getElementById('preview-btn');
    const copyBtn = document.getElementById('copy-btn');
    const previewContainer = document.getElementById('preview-container');
    const diffPreview = document.getElementById('diff-preview');
    const statusDiv = document.getElementById('status');
    
    // Show status message
    function showStatus(message, type = 'success') {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
      
      // Remove all status classes
      statusDiv.classList.remove('success', 'error');
      statusDiv.classList.add(type);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
    
    // Format and preview diff
    previewBtn.addEventListener('click', () => {
      const content = diffTextarea.value.trim();
      
      if (!content) {
        showStatus('Please enter some content first', 'error');
        return;
      }
      
      // Format the diff for display
      let formattedDiff = '';
      const lines = content.split('\\n');
      
      lines.forEach(line => {
        let className = 'diff-line';
        if (line.startsWith('+')) {
          className += ' diff-add';
        } else if (line.startsWith('-')) {
          className += ' diff-remove';
        } else if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) {
          className += ' diff-info';
        }
        
        // Escape HTML
        const escapedLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
          
        formattedDiff += '<div class="' + className + '">' + escapedLine + '</div>';
      });
      
      diffPreview.innerHTML = formattedDiff;
      previewContainer.style.display = 'block';
      showStatus('Preview generated', 'success');
    });
    
    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
      const content = diffTextarea.value;
      
      if (!content) {
        showStatus('Nothing to copy', 'error');
        return;
      }
      
      navigator.clipboard.writeText(content)
        .then(() => {
          showStatus('Content copied to clipboard!', 'success');
        })
        .catch(err => {
          showStatus('Failed to copy: ' + err, 'error');
          console.error('Copy failed:', err);
        });
    });
  </script>
</body>
</html>`;

// Function to apply diff to content
function applyDiff(originalContent, diffContent) {
  // Simple unified diff parser
  const originalLines = originalContent.split('\n');
  const diffLines = diffContent.split('\n');
  let result = [...originalLines];
  let lineOffset = 0;
  
  // Process each hunk in the diff
  let i = 0;
  while (i < diffLines.length) {
    const line = diffLines[i];
    
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (!match) {
        i++;
        continue;
      }
      
      const originalStart = parseInt(match[1]) - 1;
      const originalLength = parseInt(match[2]);
      const adjustedStart = originalStart + lineOffset;
      
      i++;
      
      let linesAdded = 0;
      let linesRemoved = 0;
      const additions = [];
      
      while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
        const hunkLine = diffLines[i];
        
        if (hunkLine.startsWith('+')) {
          additions.push(hunkLine.substring(1));
          linesAdded++;
        } else if (hunkLine.startsWith('-')) {
          linesRemoved++;
        }
        
        i++;
      }
      
      result.splice(adjustedStart, linesRemoved, ...additions);
      lineOffset += (linesAdded - linesRemoved);
    } else {
      i++;
    }
  }
  
  return result.join('\n');
}

// Helper function to determine if content is a diff
function isDiff(content) {
  const diffMarkers = [
    /^diff --git/m,
    /^@@ -\d+,\d+ \+\d+,\d+ @@/m,
    /^---/m,
    /^\+\+\+/m
  ];
  
  return diffMarkers.some(marker => marker.test(content));
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Serve HTML page for root path
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(HTML_CONTENT, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  }
  
  // Handle API requests for applying diffs
  if (url.pathname === '/apply' && request.method === 'POST') {
    try {
      // In a real implementation, you would:
      // 1. Parse the JSON body
      // 2. Validate the API key
      // 3. Use KV storage to load the current file content
      // 4. Apply the diff
      // 5. Store the updated content back to KV
      
      return new Response(JSON.stringify({
        success: true,
        message: 'This is a demo endpoint. In a real implementation, this would apply your diff to the specified file.'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  // Return 404 for any other routes
  return new Response('Not found', { status: 404 });
} 