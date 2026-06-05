import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PortfolioAsset } from "@/lib/rebalancing";

const TWELVEDATA_BASE_URL = "https://api.twelvedata.com/price";
const NAVER_FINANCE_BASE_URL = "https://finance.naver.com/item/main.naver";

export type PriceSyncResult = {
  total: number;
  updated: number;
  skipped: number;
  errors: Array<{
    ticker: string;
    reason: string;
  }>;
};

type TwelveDataPriceResponse = {
  price?: string;
  message?: string;
  code?: number | string;
  status?: string;
};

type PriceLookup = {
  symbol: string;
  exchange?: string;
};

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function buildPriceCandidates(ticker: string): PriceLookup[] {
  const normalized = normalizeTicker(ticker);
  const candidates: PriceLookup[] = [{ symbol: normalized }];

  if (/[0-9]/.test(normalized)) {
    candidates.push({ symbol: normalized, exchange: "XKRX" });
  }

  return candidates;
}

function parsePrice(data: TwelveDataPriceResponse): number | null {
  if (!data || typeof data.price !== "string") {
    return null;
  }

  const price = Number.parseFloat(data.price);
  return Number.isFinite(price) ? price : null;
}

async function fetchPriceFromTwelveData(
  lookup: PriceLookup,
  apiKey: string
): Promise<number> {
  const url = new URL(TWELVEDATA_BASE_URL);
  url.searchParams.set("symbol", lookup.symbol);
  url.searchParams.set("apikey", apiKey);

  if (lookup.exchange) {
    url.searchParams.set("exchange", lookup.exchange);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as TwelveDataPriceResponse;
    const price = parsePrice(data);

    if (price === null) {
      throw new Error(data.message ?? data.status ?? "Price unavailable");
    }

    return price;
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPriceFromNaverFinance(ticker: string): Promise<number> {
  const url = new URL(NAVER_FINANCE_BASE_URL);
  url.searchParams.set("code", normalizeTicker(ticker));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const text = stripHtmlToText(html);
    const patterns = [
      /현재가\s+([0-9,]+)\s+전일대비/,
      /오늘의시세\s+([0-9,]+)\s+포인트/,
      /현재가\s+([0-9,]+)\s+포인트/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const price = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(price)) {
        return price;
      }
    }

    throw new Error("Naver Finance price unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCurrentPrice(ticker: string, apiKey: string): Promise<number> {
  const candidates = buildPriceCandidates(ticker);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return await fetchPriceFromTwelveData(candidate, apiKey);
    } catch (error) {
      lastError = error;
    }
  }

  try {
    return await fetchPriceFromNaverFinance(ticker);
  } catch (error) {
    lastError = error;
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : String(lastError ?? "Unable to fetch current price");
  throw new Error(message);
}

export async function syncPortfolioAssetPrices(): Promise<PriceSyncResult> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVEDATA_API_KEY is not configured.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portfolio_assets")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load portfolio assets: ${error.message}`);
  }

  const assets = (data ?? []) as PortfolioAsset[];
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const currentPrice = await fetchCurrentPrice(asset.ticker, apiKey);
      return {
        ...asset,
        current_price: currentPrice,
        updated_at: new Date().toISOString()
      };
    })
  );

  const updatedAssets: PortfolioAsset[] = [];
  const errors: Array<{ ticker: string; reason: string }> = [];

  results.forEach((result, index) => {
    const ticker = assets[index]?.ticker ?? "";
    if (result.status === "fulfilled") {
      updatedAssets.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ ticker, reason });
      updatedAssets.push(assets[index]);
    }
  });

  const { error: upsertError } = await supabase
    .from("portfolio_assets")
    .upsert(updatedAssets, { onConflict: "id" });

  if (upsertError) {
    throw new Error(`Failed to upsert portfolio assets: ${upsertError.message}`);
  }

  return {
    total: assets.length,
    updated: updatedAssets.length - errors.length,
    skipped: errors.length,
    errors
  };
}
