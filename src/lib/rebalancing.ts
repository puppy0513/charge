export type AssetClass = "bond" | "equity" | "other";

export type PortfolioAsset = {
  id: string;
  ticker: string;
  stock_name: string;
  asset_class: AssetClass;
  current_price: number;
  amount: number;
  target_weight: number;
  display_order: number;
  updated_at?: string | null;
};

export type RebalanceRow = PortfolioAsset & {
  is_foreign: boolean;
  fx_rate: number;
  display_current_price: number;
  current_value: number;
  target_value: number;
  current_weight: number;
  drift: number;
  trade_value: number;
  trade_shares: number;
  action: "buy" | "sell" | "hold";
  alert: boolean;
};

export type RebalanceSummary = {
  total_value: number;
  target_total_weight: number;
  buy_value: number;
  sell_value: number;
  alert_count: number;
  max_drift: number;
  rows: RebalanceRow[];
  by_class: Record<AssetClass, number>;
};

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function isForeignTicker(ticker: string): boolean {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  return /^[A-Z.]{1,10}$/.test(normalized) && !/^\d+$/.test(normalized);
}

export const DEFAULT_REBALANCING_ASSETS: PortfolioAsset[] = [
  {
    id: "icsh",
    ticker: "ICSH",
    stock_name: "ICSH ETF",
    asset_class: "bond",
    current_price: 54000,
    amount: 925,
    target_weight: 50,
    display_order: 1
  },
  {
    id: "spym",
    ticker: "SPYM",
    stock_name: "SPYM ETF",
    asset_class: "equity",
    current_price: 52000,
    amount: 481,
    target_weight: 25,
    display_order: 2
  },
  {
    id: "rise200",
    ticker: "148020",
    stock_name: "RISE 200 ETF",
    asset_class: "equity",
    current_price: 31500,
    amount: 714,
    target_weight: 22.5,
    display_order: 3
  },
  {
    id: "kodex_kdefense_top10",
    ticker: "0080G0",
    stock_name: "KODEX K방산 TOP10",
    asset_class: "equity",
    current_price: 42800,
    amount: 175,
    target_weight: 7.5,
    display_order: 4
  }
];

export function createEmptyAsset(): PortfolioAsset {
  return {
    id: crypto.randomUUID(),
    ticker: "",
    stock_name: "",
    asset_class: "equity",
    current_price: 0,
    amount: 0,
    target_weight: 0,
    display_order: 999
  };
}

export function computeRebalanceSummary(
  assets: PortfolioAsset[],
  thresholdPercent: number,
  fxRateUsdKrw = 1
): RebalanceSummary {
  const normalizedAssets = [...assets].sort((a, b) => a.display_order - b.display_order);
  const totalValue = normalizedAssets.reduce((sum, asset) => {
    const priceMultiplier = isForeignTicker(asset.ticker) ? fxRateUsdKrw : 1;
    return sum + asset.current_price * priceMultiplier * asset.amount;
  }, 0);

  const rows = normalizedAssets.map((asset) => {
    const isForeign = isForeignTicker(asset.ticker);
    const fx_rate = isForeign ? fxRateUsdKrw : 1;
    const display_current_price = asset.current_price * fx_rate;
    const current_value = display_current_price * asset.amount;
    const target_value = totalValue * (asset.target_weight / 100);
    const current_weight = totalValue > 0 ? (current_value / totalValue) * 100 : 0;
    const drift = current_weight - asset.target_weight;
    const trade_value = target_value - current_value;
    const trade_shares = display_current_price > 0 ? trade_value / display_current_price : 0;
    const action: RebalanceRow["action"] =
      trade_value > 0 ? "buy" : trade_value < 0 ? "sell" : "hold";
    const alert = Math.abs(drift) >= thresholdPercent;

    return {
      ...asset,
      is_foreign: isForeign,
      fx_rate,
      display_current_price,
      current_value,
      target_value,
      current_weight: round(current_weight, 2),
      drift: round(drift, 2),
      trade_value,
      trade_shares,
      action,
      alert
    };
  });

  const buy_value = rows
    .filter((row) => row.trade_value > 0)
    .reduce((sum, row) => sum + row.trade_value, 0);
  const sell_value = rows
    .filter((row) => row.trade_value < 0)
    .reduce((sum, row) => sum + Math.abs(row.trade_value), 0);
  const byClass: Record<AssetClass, number> = {
    bond: 0,
    equity: 0,
    other: 0
  };

  rows.forEach((row) => {
    byClass[row.asset_class] += row.current_value;
  });

  const bondWeight = totalValue > 0 ? (byClass.bond / totalValue) * 100 : 0;
  const equityWeight = totalValue > 0 ? (byClass.equity / totalValue) * 100 : 0;
  const classGap = Math.abs(bondWeight - equityWeight);
  const classAlert = classGap >= thresholdPercent;
  const alert_count = classAlert ? 1 : 0;
  const max_drift = round(classGap, 2);

  return {
    total_value: totalValue,
    target_total_weight: 100,
    buy_value,
    sell_value,
    alert_count,
    max_drift,
    rows,
    by_class: byClass
  };
}

export function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

export function formatPercent(value: number): string {
  return `${round(value, 2).toFixed(2)}%`;
}
