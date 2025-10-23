# Claude MCP Integration for V0 Clone

This configuration enables Claude Desktop to interact with your Cloudflare-deployed V0 Clone app using Model Context Protocol (MCP).

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI assistants like Claude to interact with external services through a standardized interface. Think of it like USB-C for AI applications.

## Features Enabled

When you connect Claude to Cloudflare MCP servers, Claude can:

✅ **Deploy directly from chat**: "Deploy my v0-clone to production"
✅ **Manage Workers**: Create, update, and delete Workers
✅ **Query documentation**: Get real-time Cloudflare docs
✅ **Manage resources**: Create/manage KV, D1, R2 storage
✅ **View logs**: Debug issues by reading Worker logs
✅ **Manage secrets**: Set environment variables securely
✅ **Monitor analytics**: Check performance metrics

## Setup Instructions

### 1. Install MCP Remote Package

```bash
npm install -g mcp-remote
```

### 2. Configure Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://docs.mcp.cloudflare.com/mcp"
      ]
    },
    "cloudflare-developer": {
      "command": "npx",
      "args": [
        "mcp-remote", 
        "https://developer.mcp.cloudflare.com/mcp"
      ]
    },
    "cloudflare-workers": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://workers.mcp.cloudflare.com/mcp"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP servers.

### 4. Verify Connection

In Claude Desktop, you should see MCP servers listed in the sidebar. Try asking:

> "What Cloudflare resources do I have deployed?"

> "Show me the logs for my v0-clone-backend Worker"

> "Deploy the latest version of my app to Cloudflare"

## Example Workflows

### Deploy Your App

**You:** "Deploy my v0-clone app to Cloudflare"

**Claude will:**
1. Check your current code
2. Build the backend
3. Deploy to Cloudflare Workers
4. Build the frontend
5. Deploy to Cloudflare Pages
6. Give you the live URLs

### Debug Production Issues

**You:** "Why is my v0-clone backend returning 500 errors?"

**Claude will:**
1. Read recent Worker logs
2. Identify the error
3. Suggest fixes
4. Optionally deploy the fix

### Manage Resources

**You:** "Create a KV namespace for storing user sessions"

**Claude will:**
1. Create the KV namespace
2. Update wrangler.toml with binding
3. Generate example code for using it

## Available MCP Servers

### 1. Cloudflare Documentation Server
**URL**: `https://docs.mcp.cloudflare.com/mcp`

Provides real-time access to Cloudflare documentation.

**Example queries:**
- "How do I use D1 databases?"
- "What are the Workers pricing limits?"
- "Show me examples of using KV storage"

### 2. Cloudflare Developer Platform Server
**URL**: `https://developer.mcp.cloudflare.com/mcp`

Manages your Cloudflare account resources.

**Available tools:**
- List/create/delete Workers
- Manage KV namespaces
- Manage D1 databases
- Manage R2 buckets
- View analytics

### 3. Cloudflare Workers Server
**URL**: `https://workers.mcp.cloudflare.com/mcp`

Deploy and manage Workers applications.

**Available tools:**
- Deploy Workers
- Update Worker code
- Manage environment variables
- View/tail logs
- Manage routes and triggers

## Security & Authentication

MCP servers use OAuth for authentication. When Claude first tries to access your Cloudflare account, you'll be prompted to:

1. Sign in to Cloudflare
2. Authorize Claude to access your account
3. Grant specific permissions

Permissions are scoped per MCP server, following the principle of least privilege.

## Troubleshooting

### "Command not found: npx"

Install Node.js from https://nodejs.org

### "Connection failed"

1. Check your internet connection
2. Verify the MCP server URLs are correct
3. Try restarting Claude Desktop

### "Authorization failed"

1. Go to Cloudflare Dashboard
2. Workers & Pages > API Tokens
3. Regenerate your API token
4. Reconnect in Claude Desktop

## Advanced: Custom MCP Server

Want to create your own MCP server for your V0 Clone app?

Check out the guide: https://blog.cloudflare.com/model-context-protocol/

Example use cases:
- Custom deployment workflows
- Integration with your CI/CD
- Custom analytics and monitoring
- Team collaboration features

## Resources

- [Cloudflare MCP Documentation](https://developers.cloudflare.com/agents/model-context-protocol/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Cloudflare MCP Servers GitHub](https://github.com/cloudflare/mcp-server-cloudflare)
- [Building MCP Servers](https://blog.cloudflare.com/model-context-protocol/)

## Next Steps

1. ✅ Configure Claude Desktop with MCP
2. ✅ Deploy your app via Claude
3. ✅ Monitor and debug with Claude
4. ✅ Build custom MCP tools for your workflow

---

**Questions?** Ask Claude! It can now help you with Cloudflare deployment directly.
