#!/bin/bash

# Make sure Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Wrangler is not installed. Installing..."
    npm install -g wrangler
fi

# Log in to Cloudflare if needed
echo "Logging in to Cloudflare (if needed)"
wrangler login

# Deploy the worker
echo "Deploying worker..."
wrangler deploy

echo "Deployment complete!"
echo "Your worker should now be available at https://mcp-diff-editor.<your-subdomain>.workers.dev" 