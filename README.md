# DeepViews MCP Server

Free financial data MCP server for Claude Code and any MCP-compatible AI client. Access company analysis, DCF valuation, comparable companies, industry benchmarks, stock screening, and news sentiment -- **no API key required**.

A free alternative to paid financial data MCP integrations like FactSet ($20-80K/year) and S&P Capital IQ ($25-100K/year).

## Quick Start

### Option 1: npx (no install)

Add to your MCP settings:

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

### Option 2: Global install

```bash
npm install -g deepviews-mcp
```

Then add to your MCP settings:

```json
{
  "mcpServers": {
    "deepviews": {
      "command": "deepviews-mcp"
    }
  }
}
```

### Option 3: Claude Code Plugin

If available in the Claude Code plugin directory:

```
/plugin install deepviews@claude-plugins-official
```

## Available Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `analyze_company` | Comprehensive financial analysis: valuation ratios, income statement, balance sheet, cash flow, profitability margins | SEC EDGAR + Polygon.io |
| `calculate_dcf` | The deepviews.dev DCF (same inputs as the /dcf page): fair value vs price, reverse DCF, sensitivity matrix | SEC EDGAR + Polygon.io + DeepViews |
| `get_comparables` | Comparable company analysis: target vs 10 closest peers by market cap, 8 metrics each | SEC EDGAR + Polygon.io |
| `get_industry_benchmarks` | Peer comparison with P25/P50/P75 for P/E, P/B, EV/EBITDA, margins, ROE, D/E across 10 metrics | SEC EDGAR + Polygon.io |
| `screen_stocks` | Filter stocks by sector, industry, P/E, P/B, EV/EBITDA, ROE, D/E, market cap, revenue | SEC EDGAR + Polygon.io |
| `get_news_sentiment` | 30-day news sentiment score, trend, and article breakdown | Polygon.io News API |

## Example Usage

```
> Analyze Apple's financials and tell me how it compares to peers

> Calculate a DCF for MSFT with 12% growth rate and 10% WACC

> Show me NVDA's comparable companies in the semiconductor industry

> Screen for technology stocks with P/E under 25 and ROE above 20%

> What's the news sentiment around TSLA right now?
```

## Data Coverage

- **US-listed equities**: All companies filing with SEC EDGAR (10-K, 10-Q)
- **Market data**: Real-time prices and market caps via Polygon.io
- **Financial statements**: Up to 4 years of annual data
- **Comparable companies**: SIC-based peers sorted by market cap proximity
- **Industry benchmarks**: SIC-code based peer groups with hybrid EDGAR/Polygon metrics
- **News**: 30-day rolling window, up to 50 articles per ticker

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPVIEWS_API_URL` | `https://www.deepviews.dev` | Base URL for API calls. Override for local development. |

## Data Sources & Attribution

- **SEC EDGAR** -- Financial statements, peer groupings, SIC classifications
- **Polygon.io** -- Market caps, stock prices, news articles, company metadata
- **DeepViews** -- DCF calculations, analyst rating estimates, sentiment analysis, comparable company analysis

## Rate Limits

The DeepViews API enforces rate limiting (60 requests/minute). The MCP server respects these limits. If you receive a rate limit error, wait a moment and retry.

## License

Apache-2.0
