# Installing DeepViews MCP (instructions for AI assistants)

DeepViews MCP is a stdio MCP server published on npm as `deepviews-mcp`. It needs Node.js 18+ and **no API key or account**.

1. Add this entry to the MCP settings file (`mcpServers` object):

```json
{
  "mcpServers": {
    "deepviews": {
      "command": "npx",
      "args": ["-y", "deepviews-mcp"]
    }
  }
}
```

2. Restart or reload the MCP servers.
3. Verify by calling `analyze_company` with `{ "ticker": "AAPL" }`. It should return Apple's valuation ratios and financial statements.

Optional: set `DEEPVIEWS_API_URL` to use a different API host (default `https://www.deepviews.dev`).
