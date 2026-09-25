#!/usr/bin/env node

/**
 * DeepViews MCP Server
 *
 * Free financial data MCP server for Claude Code.
 * Wraps DeepViews Terminal API routes as MCP tools for company analysis,
 * DCF valuation, industry benchmarks, stock screening, and sentiment.
 *
 * Transport: stdio (for Claude Code integration)
 */

import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const SERVER_NAME = "deepviews-terminal";
// Read from package.json at runtime so the reported version can't drift from
// the published one (npm always ships package.json one level above dist/).
const { version: SERVER_VERSION } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string };

async function main(): Promise<void> {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tool definitions and handlers
  registerTools(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error starting DeepViews MCP server:", error);
  process.exit(1);
});
