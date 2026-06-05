const TWELVEDATA_CURRENCY_CONVERSION_URL = "https://api.twelvedata.com/currency_conversion";

export type FxRateResult = {
  rate: number;
  symbol: string;
};

type TwelveDataCurrencyConversionResponse = {
  symbol?: string;
  rate?: number | string;
  amount?: number | string;
};

export async function fetchUsdKrwRate(apiKey: string): Promise<FxRateResult> {
  const url = new URL(TWELVEDATA_CURRENCY_CONVERSION_URL);
  url.searchParams.set("symbol", "USD/KRW");
  url.searchParams.set("amount", "1");
  url.searchParams.set("apikey", apiKey);

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

    const data = (await response.json()) as TwelveDataCurrencyConversionResponse;
    const rateValue = Number(data.rate ?? data.amount);

    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      throw new Error("USD/KRW 환율을 가져오지 못했습니다.");
    }

    return {
      rate: rateValue,
      symbol: data.symbol ?? "USD/KRW"
    };
  } finally {
    clearTimeout(timeout);
  }
}
