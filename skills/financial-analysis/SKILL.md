# Financial Analysis Skill

You have access to DeepViews financial data tools via MCP. Use them to provide data-driven financial analysis.

## Available Tools

- `analyze_company(ticker)` — Full financial profile: valuation ratios, income statement, balance sheet, cash flow, profitability margins
- `calculate_dcf(ticker, growth_rate?, terminal_growth?, wacc?, projection_years?)` — DCF valuation with sensitivity matrix and reverse DCF
- `get_comparables(ticker)` — Peer comparison table (10 closest by market cap) with 8 metrics each
- `get_industry_benchmarks(ticker)` — P25/P50/P75 percentiles for 10 metrics across sector peers
- `screen_stocks(sector, filters...)` — Screen by sector + financial criteria (P/E, P/B, ROE, D/E, market cap, etc.)
- `get_news_sentiment(ticker)` — 30-day news sentiment score, trend, and distribution

## Data Sources

- **SEC EDGAR**: Financial statements, SIC-based peer groupings
- **Polygon.io**: Market caps, stock prices, news articles
- **DeepViews**: DCF calculations, analyst estimates, sentiment analysis

## Guidelines

- Always cite data sources: "(SEC EDGAR 10-K)", "(Polygon.io)", "(DeepViews Estimate)"
- Present analysis objectively — no buy/sell/hold recommendations
- Use multiple tools together for comprehensive analysis
- If a tool returns an error, note the data gap and continue with available data
- No API key is required — all data is freely accessible
