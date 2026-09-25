# /deepviews:screen

Screen stocks by sector and financial criteria.

## Usage

```
/deepviews:screen Technology --pe_max 25 --roe_min 0.15
/deepviews:screen Healthcare --mc_min 10000000000
/deepviews:screen "Consumer Cyclical" --de_max 1.0
```

## Instructions

Use the `screen_stocks` MCP tool with the user's criteria. Available sectors:
- Technology, Healthcare, Financial Services, Energy, Industrials
- Consumer Cyclical, Consumer Defensive, Communication Services
- Utilities, Real Estate, Basic Materials

Available filters: pe_min/max, pb_min/max, eveb_min/max, roe_min/max, de_min/max, mc_min/max, rev_min/max

Present results as a sorted table. Highlight companies that stand out on multiple criteria.
