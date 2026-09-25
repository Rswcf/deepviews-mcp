# /deepviews:analyze

Analyze a company's financials, valuation, and peer positioning using DeepViews data.

## Usage

```
/deepviews:analyze AAPL
/deepviews:analyze MSFT
```

## What this command does

1. Fetches comprehensive financial data (income statement, balance sheet, cash flow)
2. Runs a DCF valuation with sensitivity analysis and reverse DCF
3. Compares the company against its closest peers by market cap
4. Retrieves industry benchmarks (P/E, P/B, EV/EBITDA, margins, ROE, D/E)
5. Checks recent news sentiment (30-day rolling window)

## Instructions

Use the following MCP tools in sequence to build a complete analysis:

1. Call `analyze_company` with the ticker to get financial statements and valuation ratios
2. Call `calculate_dcf` with the ticker to get fair value estimate and sensitivity matrix
3. Call `get_comparables` with the ticker to see peer comparison table
4. Call `get_industry_benchmarks` with the ticker for percentile positioning
5. Call `get_news_sentiment` with the ticker for recent sentiment

Then synthesize the results into a concise analysis covering:
- **Valuation**: Is the company trading at a premium or discount to peers? What does the DCF model suggest?
- **Profitability**: How do margins compare to industry medians?
- **Financial health**: Leverage, liquidity, and cash flow quality
- **Momentum**: What is the news sentiment telling us?

Present data objectively. Do NOT make buy/sell/hold recommendations.
