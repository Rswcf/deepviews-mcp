# Contributing to DeepViews MCP

Thanks for helping. Bug reports, data corrections and pull requests are all welcome.

## Run it locally

```bash
git clone https://github.com/Rswcf/deepviews-mcp.git
cd deepviews-mcp
npm install
npm run dev        # starts the stdio server with tsx
npm run build      # compiles to dist/
```

Try the tools interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

The server calls the public DeepViews API. Point it somewhere else with `DEEPVIEWS_API_URL`.

## Where the code lives

- `src/tools.ts`: tool definitions, API calls and the text each tool returns
- `src/index.ts`: MCP server setup (stdio)
- `.claude-plugin/`, `commands/`, `skills/`: the Claude Code plugin

Keep tool output as plain text with labelled lines and tables: models read that more reliably than nested JSON. Every answer should say where the numbers come from and which period they cover.

## Reporting wrong numbers

Open a "Data issue" with the ticker, the tool, the value you got and the value in the filing, plus a link to the 10-K or 10-Q on SEC EDGAR. That makes most fixes quick.

## Pull requests

This repository is mirrored from the main DeepViews repository. Pull requests are reviewed here; accepted changes are applied upstream with a `Co-authored-by` credit and appear here on the next sync.

By contributing you agree that your contribution is licensed under Apache-2.0.
