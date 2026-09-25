/**
 * DeepViews MCP Tools
 *
 * Tool definitions and handlers that wrap DeepViews Terminal API routes.
 * Each tool calls the production API and formats the response as readable text.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.DEEPVIEWS_API_URL || "https://www.deepviews.dev";
const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = "DeepViews-MCP/1.0";

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function callApi(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method: options?.method ?? "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
    };
    if (options?.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${BASE_URL}${path}`, fetchOptions);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API error ${response.status}: ${text}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !isFinite(value)) return "N/A";
  return value.toFixed(decimals);
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return "N/A";
  return `$${value.toFixed(2)}`;
}

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return isFinite(n) ? n : null;
}

/** "FY2025 ending 2025-09-27" / "TTM ending 2026-06-27" for a financial statement record */
function describePeriod(record: Record<string, any>): string | null {
  const date = typeof record.FiscalDate === "string" && record.FiscalDate ? record.FiscalDate : null;
  const isTTM = record.isTTM === true || String(record.FiscalYear).toUpperCase() === "TTM";
  const period = isTTM
    ? "TTM"
    : record.FiscalYear !== undefined && record.FiscalYear !== null && record.FiscalYear !== "" ? `FY${record.FiscalYear}` : null;
  if (period && date) return `${period} ending ${date}`;
  return period ?? (date ? `period ending ${date}` : null);
}

/** The price the site reports is the prior trading day's close: say so, with its date */
function previousCloseLabel(priceAsOf: unknown): string {
  return typeof priceAsOf === "string" && priceAsOf ? `Previous close (${priceAsOf})` : "Previous close";
}

function line(label: string, value: string): string {
  return `  ${label.padEnd(28)} ${value}`;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: "analyze_company",
    description:
      "Get comprehensive financial analysis for a company: valuation ratios, the latest financial statements, several fiscal years of revenue and margins, and key metrics. Data sourced from SEC EDGAR filings and Polygon.io market data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "calculate_dcf",
    description:
      "Run the DeepViews DCF (same model and default inputs as the deepviews.dev /dcf page): fair value per share versus the previous close, reverse DCF, projected FCFs, and a WACC vs terminal growth sensitivity matrix. Optional arguments override single assumptions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT)",
        },
        growth_rate: {
          type: "number",
          description:
            "Annual FCF growth rate during projection period (decimal, e.g., 0.10 for 10%). Default: the DeepViews /dcf page growth estimate.",
        },
        terminal_growth: {
          type: "number",
          description:
            "Perpetual growth rate after projection period (decimal, e.g., 0.025 for 2.5%). Default: the /dcf page terminal growth.",
        },
        wacc: {
          type: "number",
          description:
            "Weighted Average Cost of Capital (decimal, e.g., 0.10 for 10%). Default: WACC from company data with the live risk-free rate.",
        },
        projection_years: {
          type: "number",
          description:
            "Number of years to project FCF (3-25). Default: the /dcf page projection period.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_industry_benchmarks",
    description:
      "Get industry benchmark data comparing a company against its sector peers. Returns 25th/50th/75th percentile for P/E, P/B, P/S, EV/EBITDA, margins, ROE, current ratio, and debt-to-equity. Data from SEC EDGAR filings with Polygon.io market caps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_market_signals",
    description:
      "Get real-time market signals for a stock including technical indicators (RSI, MACD, SMA 50/200), news sentiment analysis, and short interest data. All data sourced from Polygon.io.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "screen_stocks",
    description:
      "Screen stocks by sector, industry, and financial metrics. Filter by P/E, P/B, EV/EBITDA, ROE, debt-to-equity, market cap, and revenue. Returns matching companies with full financial profiles.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sector: {
          type: "string",
          description:
            'Sector name (e.g., "Technology", "Healthcare", "Financials", "Energy", "Industrials", "Consumer Discretionary", "Consumer Staples", "Communication Services", "Utilities", "Real Estate", "Materials", "Agriculture", "Construction", "Mining")',
        },
        industry: {
          type: "string",
          description: "Industry within the sector (optional)",
        },
        pe_min: {
          type: "number",
          description: "Minimum P/E ratio",
        },
        pe_max: {
          type: "number",
          description: "Maximum P/E ratio",
        },
        pb_min: {
          type: "number",
          description: "Minimum P/B ratio",
        },
        pb_max: {
          type: "number",
          description: "Maximum P/B ratio",
        },
        eveb_min: {
          type: "number",
          description: "Minimum EV/EBITDA",
        },
        eveb_max: {
          type: "number",
          description: "Maximum EV/EBITDA",
        },
        roe_min: {
          type: "number",
          description: "Minimum Return on Equity (decimal, e.g., 0.15 for 15%)",
        },
        roe_max: {
          type: "number",
          description: "Maximum Return on Equity (decimal)",
        },
        de_min: {
          type: "number",
          description: "Minimum Debt-to-Equity ratio",
        },
        de_max: {
          type: "number",
          description: "Maximum Debt-to-Equity ratio",
        },
        mc_min: {
          type: "number",
          description: "Minimum market cap in dollars (e.g., 1000000000 for $1B)",
        },
        mc_max: {
          type: "number",
          description: "Maximum market cap in dollars",
        },
        rev_min: {
          type: "number",
          description: "Minimum revenue in dollars",
        },
        rev_max: {
          type: "number",
          description: "Maximum revenue in dollars",
        },
      },
      required: ["sector"],
    },
  },
  {
    name: "get_news_sentiment",
    description:
      "Get aggregated news sentiment analysis for a company over the last 30 days. Returns sentiment score (-100 to +100), label, trend, and article count breakdown. Powered by Polygon.io news API.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_comparables",
    description:
      "Get comparable company analysis showing a target company vs its closest peers by market cap. Returns per-company metrics (P/E, P/B, P/S, EV/EBITDA, Gross Margin, Net Margin, ROE, D/E) with group statistics. Data from SEC EDGAR filings + Polygon.io market caps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g., AAPL, MSFT)",
        },
      },
      required: ["ticker"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export async function handleAnalyzeCompany(ticker: string): Promise<string> {
  const data = (await callApi(`/api/company/${encodeURIComponent(ticker)}`)) as Record<string, any>;

  const name = data.name || ticker.toUpperCase();
  const m = data.metrics || {};
  const fin = data.financials || {};

  // Latest income statement
  const latestIS = fin.incomeStatement?.[0] || {};
  const latestBS = fin.balanceSheet?.[0] || {};
  const latestCF = fin.cashFlow?.[0] || {};

  const lines: string[] = [
    `=== ${name} (${ticker.toUpperCase()}) ===`,
    `Data Source: SEC EDGAR + Polygon.io`,
    "",
    "--- Valuation Metrics ---",
    line("Market Cap", fmtMoney(safeNum(m.marketCap))),
    line("Enterprise Value", fmtMoney(safeNum(m.enterpriseValue))),
    line("Trailing P/E", fmt(safeNum(m.trailingPE))),
    line("Forward P/E", fmt(safeNum(m.forwardPE))),
    line("Price/Book", fmt(safeNum(m.priceToBook))),
    line("Price/Sales", fmt(safeNum(m.priceToSales))),
    line("EV/EBITDA", fmt(safeNum(m.evToEbitda ?? m.enterpriseToEbitda))),
    line("EV/Sales", fmt(safeNum(m.evToSales ?? m.enterpriseToRevenue))),
    line("Price/FCF", fmt(safeNum(m.priceToFcf))),
    line("Dividend Yield", fmtPct(safeNum(m.dividendYield))),
    line("Beta", fmt(safeNum(m.beta))),
    "",
    "--- Latest Income Statement ---",
    line("Revenue", fmtMoney(safeNum(latestIS.Revenue ?? latestIS.Revenues))),
    line("Gross Profit", fmtMoney(safeNum(latestIS.GrossProfit))),
    line("Operating Income", fmtMoney(safeNum(latestIS.OperatingIncome ?? latestIS.OperatingIncomeLoss))),
    line("Net Income", fmtMoney(safeNum(latestIS.NetIncome ?? latestIS.NetIncomeLoss))),
    line("EPS", fmt(safeNum(latestIS.EarningsPerShare ?? latestIS.EarningsPerShareDiluted ?? m.eps))),
  ];

  // Compute margins if we have revenue
  const rev = safeNum(latestIS.Revenue ?? latestIS.Revenues);
  const gp = safeNum(latestIS.GrossProfit);
  const oi = safeNum(latestIS.OperatingIncome ?? latestIS.OperatingIncomeLoss);
  const ni = safeNum(latestIS.NetIncome ?? latestIS.NetIncomeLoss);
  if (rev && rev > 0) {
    lines.push("");
    lines.push("--- Profitability ---");
    if (gp !== null) lines.push(line("Gross Margin", fmtPct(gp / rev)));
    if (oi !== null) lines.push(line("Operating Margin", fmtPct(oi / rev)));
    if (ni !== null) lines.push(line("Net Margin", fmtPct(ni / rev)));
  }

  lines.push("");
  lines.push("--- Balance Sheet ---");
  lines.push(line("Total Assets", fmtMoney(safeNum(latestBS.TotalAssets ?? latestBS.Assets))));
  lines.push(line("Total Equity", fmtMoney(safeNum(latestBS.TotalEquity ?? latestBS.StockholdersEquity))));
  lines.push(line("Total Debt", fmtMoney(safeNum(latestBS.TotalDebt ?? latestBS.LongTermDebt))));
  lines.push(line("Cash & Equivalents", fmtMoney(safeNum(latestBS.CashAndEquivalents ?? latestBS.Cash))));

  const equity = safeNum(latestBS.TotalEquity ?? latestBS.StockholdersEquity);
  const debt = safeNum(latestBS.TotalDebt ?? latestBS.LongTermDebt);
  if (equity && equity > 0 && debt !== null) {
    lines.push(line("Debt/Equity", fmt(debt / equity)));
  }
  if (equity && equity > 0 && ni !== null) {
    lines.push(line("Return on Equity", fmtPct(ni / equity)));
  }

  lines.push("");
  lines.push("--- Cash Flow ---");
  lines.push(line("Operating Cash Flow", fmtMoney(safeNum(latestCF.OperatingCashFlow ?? latestCF.NetCashFromOperating))));
  lines.push(line("Capital Expenditure", fmtMoney(safeNum(latestCF.CapitalExpenditure ?? latestCF.CapitalExpenditures))));
  lines.push(line("Free Cash Flow", fmtMoney(safeNum(latestCF.FreeCashFlow))));

  // Earlier fiscal years too, so history questions need no web search
  const annualRows = ((fin.incomeStatement || []) as Record<string, any>[])
    .filter((row) => row.isTTM !== true && String(row.FiscalYear).toUpperCase() !== "TTM")
    .slice(0, 5);
  if (annualRows.length > 0) {
    lines.push("");
    lines.push("--- Annual History (SEC EDGAR, fiscal years) ---");
    for (const row of annualRows) {
      const revenue = safeNum(row.Revenue ?? row.Revenues);
      const margin = (value: unknown) => {
        const amount = safeNum(value);
        return revenue && revenue > 0 && amount !== null ? fmtPct(amount / revenue) : "N/A";
      };
      const eps = safeNum(row.EPS ?? row.EarningsPerShare ?? row.EarningsPerShareDiluted);
      lines.push(
        `  ${describePeriod(row) ?? `FY${row.FiscalYear}`}: Revenue ${fmtMoney(revenue)}` +
        ` | Gross margin ${margin(row.GrossProfit)}` +
        ` | Operating margin ${margin(row.OperatingIncome ?? row.OperatingIncomeLoss)}` +
        ` | Net margin ${margin(row.NetIncome ?? row.NetIncomeLoss)}` +
        (eps !== null ? ` | EPS ${fmt(eps)}` : ""),
      );
    }
  }

  if (data.currentPrice) {
    const asOf = typeof data.priceAsOf === "string" && data.priceAsOf ? `${data.priceAsOf}, ` : "";
    lines.push("");
    lines.push(line(`Previous close (${asOf}Polygon)`, fmtPrice(data.currentPrice)));
  }

  if (m.sector) {
    lines.push(line("Sector", m.sector));
  }

  return lines.join("\n");
}

export async function handleCalculateDcf(args: {
  ticker: string;
  growth_rate?: number;
  terminal_growth?: number;
  wacc?: number;
  projection_years?: number;
}): Promise<string> {
  const ticker = args.ticker.toUpperCase();
  const params = new URLSearchParams();
  if (args.growth_rate !== undefined) params.set("growth", String(args.growth_rate));
  if (args.terminal_growth !== undefined) params.set("terminalGrowth", String(args.terminal_growth));
  if (args.wacc !== undefined) params.set("wacc", String(args.wacc));
  if (args.projection_years !== undefined) params.set("years", String(args.projection_years));
  const query = params.toString();

  // The site's DCF (same model and default inputs as the /dcf page)
  const data = (await callApi(
    `/api/dcf/${encodeURIComponent(ticker)}${query ? `?${query}` : ""}`
  )) as Record<string, any>;

  const name = data.companyName || ticker;
  const currentPrice = safeNum(data.currentPrice) ?? 0;
  const header = `=== DCF Valuation: ${name} (${ticker}) ===`;

  if (data.status === "not-applicable") {
    return [
      header,
      "",
      `Standard FCF-based DCF is not recommended for this company type (${data.label ?? data.category}).`,
      String(data.reason ?? ""),
      "",
      `${previousCloseLabel(data.priceAsOf)}: ${fmtPrice(currentPrice)}`,
    ].join("\n");
  }

  if (data.status === "insufficient-data") {
    const reason =
      data.reason === "non-positive-fcf"
        ? `the free cash flow base is ${fmtMoney(safeNum(data.baseFCF))}; a DCF needs a positive cash flow base`
        : data.reason === "no-shares"
          ? "shares outstanding could not be determined"
          : "WACC could not be computed from the available data";
    return [header, "", `Unable to perform DCF analysis: ${reason}.`, "", `${previousCloseLabel(data.priceAsOf)}: ${fmtPrice(currentPrice)}`].join("\n");
  }

  const inputs = data.inputs || {};
  const result = data.result || {};
  const waccDetail = data.waccDetail || null;
  const sensitivity = data.sensitivity || {};
  const reverse = data.reverseDCF || {};
  const fairValue = safeNum(data.fairValue) ?? 0;
  const upsidePct = safeNum(data.upsidePct);
  const rate = (value: unknown) => {
    const n = safeNum(value);
    return n === null ? "N/A" : `${(n * 100).toFixed(2)}%`;
  };

  const overridden = inputs.overridden || {};
  const overriddenNames = [
    overridden.growthRate ? "growth" : null,
    overridden.terminalGrowthRate ? "terminal growth" : null,
    overridden.wacc ? "WACC" : null,
    overridden.projectionYears ? "projection years" : null,
  ].filter((value: string | null): value is string => value !== null);

  const lines: string[] = [
    header,
    `Data Source: ${data.source ?? "DeepViews DCF model"}`,
    "",
    "--- Inputs ---",
    line("Base Free Cash Flow", `${fmtMoney(safeNum(inputs.baseFCF))} (${inputs.baseFCFSource ?? "n/a"})`),
    line("Growth Rate", `${fmtPct(safeNum(inputs.growthRate))} (${inputs.growthRateSource ?? "n/a"})`),
    line("Terminal Growth Rate", fmtPct(safeNum(inputs.terminalGrowthRate))),
    line("WACC (Discount Rate)", fmtPct(safeNum(inputs.wacc))),
    line("Risk-Free Rate", `${rate(inputs.riskFreeRate)}${inputs.riskFreeRateIsFallback ? " (fallback: live 10Y Treasury unavailable)" : ""}`),
    line("Equity Risk Premium", rate(inputs.equityRiskPremium)),
    ...(waccDetail ? [line("Beta", fmt(safeNum(waccDetail.beta)))] : []),
    line("Projection Period", `${inputs.projectionYears ?? "?"} years`),
    line("Net Debt", fmtMoney(safeNum(inputs.netDebt))),
    line("Shares Outstanding", `${((safeNum(inputs.sharesOutstanding) ?? 0) / 1e6).toFixed(1)}M`),
    ...(overriddenNames.length > 0 ? [line("Overridden Inputs", `${overriddenNames.join(", ")} (others are the /dcf page defaults)`)] : []),
    "",
    "--- Results ---",
    line("Fair Value / Share", fmtPrice(fairValue)),
    line(previousCloseLabel(data.priceAsOf), fmtPrice(currentPrice)),
    line("Fair Value vs Price", upsidePct === null ? "N/A" : `${upsidePct >= 0 ? "+" : ""}${upsidePct.toFixed(1)}%`),
    line("Note", "Model output under these assumptions, not a price target."),
    "",
    line("PV of Projected FCFs", fmtMoney(safeNum(result.totalPVofFCFs))),
    line("Terminal Value", fmtMoney(safeNum(result.terminalValue))),
    line("PV of Terminal Value", fmtMoney(safeNum(result.pvTerminalValue))),
    line("Enterprise Value", fmtMoney(safeNum(result.enterpriseValue))),
    line("Equity Value", fmtMoney(safeNum(result.equityValue))),
    "",
    "--- Reverse DCF ---",
    line(
      "Implied Growth Rate",
      reverse.converged ? fmtPct(safeNum(reverse.impliedGrowthRate)) : "Did not converge"
    ),
    "",
    "--- FCF Projections ---",
  ];

  for (const projection of (result.projectedFCFs || []) as Array<Record<string, number>>) {
    lines.push(
      `  Year ${String(projection.year).padStart(2)}: FCF ${fmtMoney(projection.fcf).padStart(10)}  |  PV ${fmtMoney(projection.presentValue).padStart(10)}`
    );
  }

  const waccRange = (sensitivity.waccRange || []) as number[];
  const growthRange = (sensitivity.growthRange || []) as number[];
  const matrix = (sensitivity.matrix || []) as Array<Array<number | null>>;
  if (matrix.length > 0) {
    lines.push("");
    lines.push("--- Sensitivity Analysis (Fair Value / Share) ---");
    const headerRow = "  TG \\ WACC  " + waccRange.map((w) => `${(w * 100).toFixed(1)}%`.padStart(9)).join("");
    lines.push(headerRow);
    lines.push("  " + "-".repeat(headerRow.length - 2));
    matrix.forEach((row, index) => {
      const cells = row.map((value) => (typeof value === "number" ? fmtPrice(value) : "N/A").padStart(9)).join("");
      lines.push(`  ${((growthRange[index] ?? 0) * 100).toFixed(1)}%`.padEnd(13) + cells);
    });
  }

  return lines.join("\n");
}

export async function handleGetIndustryBenchmarks(ticker: string): Promise<string> {
  const data = (await callApi(
    `/api/industry-benchmarks/${encodeURIComponent(ticker)}`
  )) as Record<string, any>;

  // Anything but a real SEC peer group is a generic placeholder, not peer data
  if (data.dataSource !== "edgar_hybrid") {
    return `No peer benchmark data for ${ticker.toUpperCase()}: DeepViews has no usable SEC peer group for this company. Do not substitute generic sector figures.`;
  }

  const sector = data.sector || "Unknown";
  const peerCount = data.peerCount ?? 0;
  const metrics = data.metrics || {};
  const source = data.dataSource || "unknown";

  const lines: string[] = [
    `=== Industry Benchmarks: ${ticker.toUpperCase()} ===`,
    `Sector: ${sector}`,
    `Peer Count: ${peerCount} companies (the company itself excluded)`,
    `Data Source: ${source === "edgar_hybrid" ? "SEC EDGAR + Polygon.io" : source}`,
    "",
    "  Metric                       P25        Median       P75    Peers",
    "  " + "-".repeat(65),
  ];

  const metricLabels: Record<string, string> = {
    peRatio: "P/E Ratio",
    pbRatio: "P/B Ratio",
    psRatio: "P/S Ratio",
    evEbitda: "EV/EBITDA",
    grossMargin: "Gross Margin",
    operatingMargin: "Operating Margin",
    netMargin: "Net Margin",
    roe: "Return on Equity",
    currentRatio: "Current Ratio",
    debtToEquity: "Debt/Equity",
  };

  const isMargin = (key: string) =>
    ["grossMargin", "operatingMargin", "netMargin", "roe"].includes(key);

  for (const [key, label] of Object.entries(metricLabels)) {
    const m = metrics[key];
    if (!m) continue;
    const formatter = isMargin(key) ? fmtPct : (v: number) => fmt(v);
    lines.push(
      `  ${label.padEnd(28)} ${formatter(m.p25).padStart(9)}  ${formatter(m.median).padStart(9)}  ${formatter(m.p75).padStart(9)}` +
        (typeof m.sampleSize === "number" ? `  ${String(m.sampleSize).padStart(5)}` : "")
    );
  }

  return lines.join("\n");
}

async function handleGetMarketSignals(ticker: string): Promise<string> {
  const data = (await callApi(
    `/api/market-signals/${encodeURIComponent(ticker)}`
  )) as Record<string, any>;

  const { technical, sentiment, shortInterest } = data;

  const lines: string[] = [
    `=== Market Signals: ${ticker.toUpperCase()} ===`,
    "",
    "--- Technical Indicators ---",
    line("RSI (14)", technical?.rsi?.value != null ? `${technical.rsi.value.toFixed(1)} (${technical.rsi.signal})` : "N/A"),
    line("MACD Trend", technical?.macd?.trend || "N/A"),
    line("MACD Histogram", technical?.macd?.histogram != null ? technical.macd.histogram.toFixed(4) : "N/A"),
    line("SMA 50", technical?.sma?.sma50 != null ? `$${technical.sma.sma50.toFixed(2)}` : "N/A"),
    line("SMA 200", technical?.sma?.sma200 != null ? `$${technical.sma.sma200.toFixed(2)}` : "N/A"),
    line("SMA Crossover", technical?.sma?.crossover?.replace("_", " ") || "N/A"),
    line("Price vs SMA 50", technical?.sma?.priceVsSma50 || "N/A"),
    "",
    "--- News Sentiment ---",
    line("Sentiment", sentiment?.label || "N/A"),
    line("Sentiment Score", sentiment?.score != null ? sentiment.score.toFixed(2) : "N/A"),
    line("Articles Analyzed", String(sentiment?.articleCount ?? 0)),
    "",
    "--- Short Interest ---",
    line("Short Interest", shortInterest?.shortInterest != null ? shortInterest.shortInterest.toLocaleString() : "N/A"),
    line("Days to Cover", shortInterest?.daysToCover != null ? shortInterest.daysToCover.toFixed(2) : "N/A"),
    line("Avg Daily Volume", shortInterest?.avgDailyVolume != null ? shortInterest.avgDailyVolume.toLocaleString() : "N/A"),
    line("Settlement Date", shortInterest?.settlementDate || "N/A"),
  ];

  return lines.join("\n");
}

async function handleScreenStocks(args: Record<string, unknown>): Promise<string> {
  const params = new URLSearchParams();
  params.set("sector", String(args.sector));
  params.set("screen", "true");
  params.set("get_companies", "true");

  // Map tool params to API query params
  const filterMap: Record<string, string> = {
    industry: "industry",
    pe_min: "pe_min",
    pe_max: "pe_max",
    pb_min: "pb_min",
    pb_max: "pb_max",
    eveb_min: "eveb_min",
    eveb_max: "eveb_max",
    roe_min: "roe_min",
    roe_max: "roe_max",
    de_min: "de_min",
    de_max: "de_max",
    mc_min: "mc_min",
    mc_max: "mc_max",
    rev_min: "rev_min",
    rev_max: "rev_max",
  };

  for (const [toolKey, apiKey] of Object.entries(filterMap)) {
    if (args[toolKey] !== undefined && args[toolKey] !== null) {
      params.set(apiKey, String(args[toolKey]));
    }
  }

  const data = (await callApi(`/api/industry?${params.toString()}`)) as Record<
    string,
    any
  >;

  const companies = data.companies || [];
  const filteredCount = data.filtered_count ?? companies.length;
  const totalCount = data.total_count ?? filteredCount;
  const metrics = data.metrics || {};

  const lines: string[] = [
    `=== Stock Screener Results ===`,
    `Sector: ${args.sector}${args.industry ? ` > ${args.industry}` : ""}`,
    `Matched: ${filteredCount} of ${totalCount} companies`,
    `Data Source: SEC EDGAR + Polygon.io`,
    "",
  ];

  // Show active filters
  const activeFilters: string[] = [];
  if (args.pe_min !== undefined || args.pe_max !== undefined)
    activeFilters.push(
      `P/E: ${args.pe_min ?? "*"}-${args.pe_max ?? "*"}`
    );
  if (args.pb_min !== undefined || args.pb_max !== undefined)
    activeFilters.push(
      `P/B: ${args.pb_min ?? "*"}-${args.pb_max ?? "*"}`
    );
  if (args.eveb_min !== undefined || args.eveb_max !== undefined)
    activeFilters.push(
      `EV/EBITDA: ${args.eveb_min ?? "*"}-${args.eveb_max ?? "*"}`
    );
  if (args.roe_min !== undefined || args.roe_max !== undefined)
    activeFilters.push(
      `ROE: ${args.roe_min ?? "*"}-${args.roe_max ?? "*"}`
    );
  if (args.mc_min !== undefined || args.mc_max !== undefined)
    activeFilters.push(
      `Market Cap: ${fmtMoney(safeNum(args.mc_min as number))}-${fmtMoney(safeNum(args.mc_max as number))}`
    );

  if (activeFilters.length > 0) {
    lines.push(`Filters: ${activeFilters.join(" | ")}`);
    lines.push("");
  }

  if (companies.length === 0) {
    lines.push("No companies matched your screening criteria.");
    return lines.join("\n");
  }

  // Sector-level stats
  if (metrics.pe_ratio || metrics.return_on_equity) {
    lines.push("--- Sector Statistics ---");
    if (metrics.pe_ratio)
      lines.push(
        line(
          "P/E (median)",
          fmt(metrics.pe_ratio.median)
        )
      );
    if (metrics.ev_to_ebitda)
      lines.push(
        line(
          "EV/EBITDA (median)",
          fmt(metrics.ev_to_ebitda.median)
        )
      );
    if (metrics.return_on_equity)
      lines.push(
        line(
          "ROE (median)",
          fmtPct(metrics.return_on_equity.median)
        )
      );
    lines.push("");
  }

  // Company table (top 25)
  const displayCompanies = companies.slice(0, 25);
  lines.push(
    `--- Companies (showing ${displayCompanies.length} of ${filteredCount}) ---`
  );
  lines.push("");
  lines.push(
    `  ${"Ticker".padEnd(8)} ${"Name".padEnd(30)} ${"Mkt Cap".padStart(12)} ${"P/E".padStart(8)} ${"P/B".padStart(8)} ${"ROE".padStart(8)} ${"D/E".padStart(8)}`
  );
  lines.push("  " + "-".repeat(90));

  for (const co of displayCompanies) {
    const mul = co.multiples || {};
    lines.push(
      `  ${(co.ticker || "").padEnd(8)} ${(co.name || "").substring(0, 30).padEnd(30)} ${fmtMoney(safeNum(co.market_cap)).padStart(12)} ${fmt(safeNum(mul.pe_ratio)).padStart(8)} ${fmt(safeNum(mul.price_to_book)).padStart(8)} ${fmtPct(safeNum(mul.return_on_equity)).padStart(8)} ${fmt(safeNum(mul.debt_to_equity)).padStart(8)}`
    );
  }

  if (filteredCount > 25) {
    lines.push("");
    lines.push(
      `  ... and ${filteredCount - 25} more companies. Refine your filters to narrow results.`
    );
  }

  return lines.join("\n");
}

async function handleGetNewsSentiment(ticker: string): Promise<string> {
  const data = (await callApi(
    `/api/news-sentiment/${encodeURIComponent(ticker)}`
  )) as Record<string, any>;

  const score = data.score ?? 0;
  const normalized = data.normalized ?? "5.0";
  const label = data.label ?? "neutral";
  const pct = data.percentage || { positive: 0, neutral: 100, negative: 0 };
  const trend = data.trend ?? "stable";
  const articleCount = data.articleCount ?? 0;
  const timeframe = data.timeframe ?? "Last 30 days";

  // Sentiment bar visualization
  const barWidth = 40;
  const posBar = Math.round((pct.positive / 100) * barWidth);
  const negBar = Math.round((pct.negative / 100) * barWidth);
  const neuBar = barWidth - posBar - negBar;

  const sentimentBar =
    "[" +
    "+".repeat(posBar) +
    "=".repeat(Math.max(0, neuBar)) +
    "-".repeat(negBar) +
    "]";

  const lines: string[] = [
    `=== News Sentiment: ${ticker.toUpperCase()} ===`,
    `Timeframe: ${timeframe}`,
    `Data Source: Polygon.io News API`,
    "",
    line("Sentiment", `${label.toUpperCase()} (${score}/100)`),
    line("Normalized Score", `${normalized}/10`),
    line("Trend", trend),
    line("Articles Analyzed", String(articleCount)),
    "",
    "--- Sentiment Distribution ---",
    line("Positive", `${pct.positive}%`),
    line("Neutral", `${pct.neutral}%`),
    line("Negative", `${pct.negative}%`),
    "",
    `  ${sentimentBar}`,
    `  ${"Positive".padEnd(barWidth / 2)}${"Negative".padStart(barWidth / 2)}`,
  ];

  if (articleCount === 0) {
    lines.push("");
    lines.push("  No recent news articles found for this ticker.");
  }

  return lines.join("\n");
}

async function handleGetComparables(ticker: string): Promise<string> {
  const data = (await callApi(
    `/api/comparables/${encodeURIComponent(ticker)}`
  )) as Record<string, any>;

  const target = data.target || {};
  const peers: Record<string, any>[] = data.peers || [];
  const stats = data.groupStats || {};
  const sector = stats.sector || "Unknown";
  const peerCount = stats.peerCount ?? peers.length;
  const medians = stats.medians || {};

  const tm = target.metrics || {};

  const lines: string[] = [
    `=== Comparable Companies: ${ticker.toUpperCase()} ===`,
    `Sector: ${sector}`,
    `Peer Count: ${peerCount} companies`,
    `Data Source: SEC EDGAR + Polygon.io`,
    "",
    "--- Target ---",
    `  ${target.ticker || ticker.toUpperCase()} (${target.name || ticker.toUpperCase()})`,
    `  Market Cap: ${fmtMoney(safeNum(target.marketCap))}`,
    `  P/E: ${fmt(safeNum(tm.peRatio))}  P/B: ${fmt(safeNum(tm.pbRatio))}  EV/EBITDA: ${fmt(safeNum(tm.evEbitda))}`,
    `  Gross Margin: ${fmtPct(safeNum(tm.grossMargin))}  Net Margin: ${fmtPct(safeNum(tm.netMargin))}  ROE: ${fmtPct(safeNum(tm.roe))}  D/E: ${fmt(safeNum(tm.debtToEquity))}`,
    "",
  ];

  if (peers.length > 0) {
    lines.push("--- Peers (by market cap proximity) ---");
    lines.push(
      `  ${"Ticker".padEnd(9)}${"Name".padEnd(31)}${"Mkt Cap".padStart(12)}  ${"P/E".padStart(7)}  ${"P/B".padStart(7)}  ${"EV/EBITDA".padStart(9)}  ${"Gross%".padStart(7)}  ${"Net%".padStart(7)}  ${"ROE%".padStart(7)}  ${"D/E".padStart(7)}`
    );
    lines.push(
      `  ${"-------".padEnd(9)}${"---".padEnd(31)}${"-------".padStart(12)}  ${"----".padStart(7)}  ${"----".padStart(7)}  ${"---------".padStart(9)}  ${"------".padStart(7)}  ${"------".padStart(7)}  ${"------".padStart(7)}  ${"-----".padStart(7)}`
    );

    for (const peer of peers) {
      const pm = peer.metrics || {};
      lines.push(
        `  ${(peer.ticker || "").padEnd(9)}${(peer.name || "").substring(0, 30).padEnd(31)}${fmtMoney(safeNum(peer.marketCap)).padStart(12)}  ${fmt(safeNum(pm.peRatio)).padStart(7)}  ${fmt(safeNum(pm.pbRatio)).padStart(7)}  ${fmt(safeNum(pm.evEbitda)).padStart(9)}  ${fmtPct(safeNum(pm.grossMargin)).padStart(7)}  ${fmtPct(safeNum(pm.netMargin)).padStart(7)}  ${fmtPct(safeNum(pm.roe)).padStart(7)}  ${fmt(safeNum(pm.debtToEquity)).padStart(7)}`
      );
    }

    lines.push("");
  }

  lines.push("--- Group Statistics (Medians) ---");
  lines.push(
    `  P/E: ${fmt(safeNum(medians.peRatio?.median))}  P/B: ${fmt(safeNum(medians.pbRatio?.median))}  EV/EBITDA: ${fmt(safeNum(medians.evEbitda?.median))}`
  );
  lines.push(
    `  Gross Margin: ${fmtPct(safeNum(medians.grossMargin?.median))}  Net Margin: ${fmtPct(safeNum(medians.netMargin?.median))}  ROE: ${fmtPct(safeNum(medians.roe?.median))}  D/E: ${fmt(safeNum(medians.debtToEquity?.median))}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "analyze_company":
      return handleAnalyzeCompany(String(args.ticker));

    case "calculate_dcf":
      return handleCalculateDcf({
        ticker: String(args.ticker),
        growth_rate: args.growth_rate as number | undefined,
        terminal_growth: args.terminal_growth as number | undefined,
        wacc: args.wacc as number | undefined,
        projection_years: args.projection_years as number | undefined,
      });

    case "get_industry_benchmarks":
      return handleGetIndustryBenchmarks(String(args.ticker));

    case "get_market_signals":
      return handleGetMarketSignals(String(args.ticker));

    case "screen_stocks":
      return handleScreenStocks(args);

    case "get_news_sentiment":
      return handleGetNewsSentiment(String(args.ticker));

    case "get_comparables":
      return handleGetComparables(String(args.ticker));

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerTools(server: Server): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, (args ?? {}) as Record<string, unknown>);
      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });
}
