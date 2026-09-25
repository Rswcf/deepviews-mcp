<div align="center">

<img src="https://raw.githubusercontent.com/Rswcf/deepviews-mcp/main/assets/logo.png" width="72" height="72" alt="DeepViews" />

# DeepViews MCP

**Free SEC-EDGAR fundamentals, DCF valuation and WACC for Claude, Cursor, VS Code and any MCP client. No API key.**

[![npm](https://img.shields.io/npm/v/deepviews-mcp?color=f5a824&label=npm)](https://www.npmjs.com/package/deepviews-mcp)
[![npm downloads](https://img.shields.io/npm/dm/deepviews-mcp?color=f5a824)](https://www.npmjs.com/package/deepviews-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.Rswcf%2Fdeepviews-0b0e13)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Rswcf/deepviews)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/Rswcf/deepviews-mcp/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Rswcf/deepviews-mcp?style=social)](https://github.com/Rswcf/deepviews-mcp)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=deepviews&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImRlZXB2aWV3cy1tY3AiXX0%3D)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=deepviews&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22deepviews-mcp%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=deepviews&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22deepviews-mcp%22%5D%7D&quality=insiders)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/Rswcf/deepviews-mcp/main/assets/demo.png" alt="calculate_dcf for MSFT: inputs, fair value vs previous close, reverse DCF and sensitivity table" width="860" />
</p>

Ask your assistant things like:

```text
> Run a DCF on MSFT and show me which assumptions drive the result
> Compare NVDA with its closest peers on margins, ROE and EV/EBITDA
> Screen for technology companies with ROE above 20% and P/E under 25
> How does Costco's gross margin compare with its industry?
```

## Why DeepViews MCP

- **No API key, no signup, no bill.** `npx -y deepviews-mcp` and you are done.
- **Fundamentals straight from SEC filings.** About 13,700 US-listed companies from a self-built SEC EDGAR (XBRL) pipeline, normalised to one schema.
- **Valuation you can inspect.** The same DCF model as [deepviews.dev/dcf](https://www.deepviews.dev/en/dcf): every input is shown, any input can be overridden, and you get a reverse DCF and a sensitivity matrix, not a single number.
- **Built for agents.** Plain-text, table-shaped results that language models read reliably, with the data source and period on every answer.

## Install

**Claude Code**

```bash
claude mcp add --transport stdio --scope user deepviews -- npx -y deepviews-mcp
```

Or install it as a Claude Code plugin (adds the `/deepviews:analyze` and `/deepviews:screen` commands and a financial-analysis skill):

```text
/plugin marketplace add Rswcf/deepviews-mcp
/plugin install deepviews@deepviews
```

**Claude Desktop, Cursor, Windsurf, Cline and most other clients** use the same `mcpServers` block:

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

**VS Code** (`.vscode/mcp.json`), or use the install button above:

```json
{
  "servers": {
    "deepviews": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "deepviews-mcp"]
    }
  }
}
```

**Gemini CLI**

```bash
gemini mcp add -s user deepviews -- npx -y deepviews-mcp
```

Requires Node.js 18 or newer.

## Tools

| Tool | What it returns | Try asking |
|---|---|---|
| `analyze_company` | Valuation ratios, the latest income statement, balance sheet and cash flow, several years of revenue and margins | "Give me an overview of Apple's financials" |
| `calculate_dcf` | Fair value per share vs the previous close, reverse DCF (implied growth), projected FCFs, WACC x terminal-growth sensitivity matrix; override growth, terminal growth, WACC or years | "Run a DCF on MSFT with 9% WACC" |
| `get_comparables` | The company vs its closest peers by market cap: P/E, P/B, P/S, EV/EBITDA, gross and net margin, ROE, D/E, with group medians | "Who are NVDA's closest peers and how does it compare?" |
| `get_industry_benchmarks` | 25th / 50th / 75th percentiles for valuation multiples, margins, ROE, current ratio and D/E in the company's industry | "Is Tesla's margin high for its industry?" |
| `screen_stocks` | Companies filtered by sector, industry, P/E, P/B, EV/EBITDA, ROE, D/E, market cap and revenue | "Healthcare stocks with P/E under 20 and D/E below 1" |
| `get_market_signals` | RSI, MACD, SMA 50/200, news sentiment and short interest (delayed market data) | "What do the technicals and short interest say about AMD?" |
| `get_news_sentiment` | 30-day news sentiment score, trend and article breakdown | "What's the news sentiment on TSLA this month?" |

All tools are read-only.

## Data and limits

- **Financial statements:** SEC EDGAR XBRL filings (10-K, 10-Q, 20-F, 40-F). Annual statements from fiscal 2021, recent quarters, and trailing twelve months. Foreign filers are converted to USD.
- **Prices and market caps:** the previous trading day's close from Polygon.io (Massive). Not real-time quotes.
- **Rates:** 10-year Treasury from FRED; equity risk premium from Damodaran.
- **Rate limit:** 60 requests per minute per client.
- **Not investment advice.** Model outputs depend on the assumptions shown with them.

## Privacy

The server runs on your machine and calls the public DeepViews API (`https://www.deepviews.dev/api`) with the tool arguments only: tickers and screening filters. It sends no personal data and has no telemetry.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DEEPVIEWS_API_URL` | `https://www.deepviews.dev` | Base URL for API calls, e.g. for local development |

## How it works

```text
MCP client (Claude, Cursor, VS Code, …)
   │  stdio
   ▼
deepviews-mcp (this repo, runs locally)
   │  HTTPS
   ▼
DeepViews API ── SEC EDGAR pipeline (Cloudflare D1) · FRED · delayed market data
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](https://github.com/Rswcf/deepviews-mcp/blob/main/CONTRIBUTING.md) and the [good first issues](https://github.com/Rswcf/deepviews-mcp/labels/good%20first%20issue).

If DeepViews saves you an API bill, a ⭐ helps other people find it.

## 中文说明

DeepViews MCP 让 Claude、Cursor、VS Code 等 AI 工具直接调用美股基本面数据：公司财务、DCF 估值、WACC、可比公司、行业基准和股票筛选，数据来自 SEC EDGAR，覆盖约 13,700 家美股上市公司。**无需 API key，免费。**

```bash
claude mcp add --transport stdio --scope user deepviews -- npx -y deepviews-mcp
```

网页版（中英双语）：[deepviews.dev/zh](https://www.deepviews.dev/zh)。结果仅为模型计算，不构成投资建议。

## License

[Apache-2.0](https://github.com/Rswcf/deepviews-mcp/blob/main/LICENSE)
