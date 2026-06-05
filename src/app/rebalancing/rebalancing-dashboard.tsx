"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { savePortfolioAssets, type SaveRebalanceState } from "./actions";
import {
  AssetClass,
  PortfolioAsset,
  computeRebalanceSummary,
  createEmptyAsset,
  formatCurrency,
  formatPercent
} from "@/lib/rebalancing";

type RebalancingDashboardProps = {
  initialAssets: PortfolioAsset[];
  sourceMessage: string;
  fxRate: number;
  fxMessage: string;
};

const assetClassLabels: Record<AssetClass, string> = {
  bond: "채권",
  equity: "주식",
  other: "기타"
};

const chartColors = [
  "#34d399",
  "#38bdf8",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
  "#60a5fa",
  "#22c55e"
];

type DonutChartItem = {
  label: string;
  value: number;
  ratio: number;
  color: string;
  helperText: string;
};

function DonutChart({
  items,
  total,
  centerLabel,
  centerValue,
  ratioLabel,
  layout = "side"
}: {
  items: DonutChartItem[];
  total: number;
  centerLabel: string;
  centerValue: string;
  ratioLabel: string;
  layout?: "side" | "bottom";
}) {
  const radius = 68;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let accumulatedLength = 0;

    return items
      .filter((item) => item.value > 0)
      .map((item) => {
        const ratio = total > 0 ? item.value / total : 0;
        const dashLength = circumference * ratio;
        const segment = {
          ...item,
          dashLength,
          offset: accumulatedLength
        };
        accumulatedLength += dashLength;
        return segment;
      });
  }, [circumference, items, total]);

  const legend = (
    <div className={layout === "bottom" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-3">
          <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate font-medium text-white">{item.label}</p>
              <p className="text-sm font-semibold text-white">
                {layout === "bottom" ? `${ratioLabel} ${formatPercent(item.ratio)}` : `${formatCurrency(item.value)}원`}
              </p>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {layout === "bottom"
                ? `${formatCurrency(item.value)}원 평가금액`
                : item.helperText}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={
        layout === "bottom"
          ? "grid gap-4"
          : "grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-center"
      }
    >
      <div className="relative mx-auto h-56 w-56">
        <svg viewBox="0 0 180 180" className="h-full w-full" aria-label={centerLabel} role="img">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
          />
          {segments.map((item) => (
            <g key={item.label}>
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${item.dashLength} ${circumference - item.dashLength}`}
                strokeDashoffset={-item.offset}
                transform="rotate(-90 90 90)"
                className="pointer-events-none"
              />
            </g>
          ))}
        </svg>
        <div className="absolute inset-[22%] rounded-full border border-white/10 bg-slate-950/95 backdrop-blur">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{centerLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{centerValue}</p>
          </div>
        </div>
      </div>

      {layout === "side" ? <div className="grid gap-3">{legend}</div> : <div>{legend}</div>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">{label}</span>
      <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            onChange(Number.isNaN(nextValue) ? 0 : nextValue);
          }}
          className="w-full bg-transparent text-right text-sm text-white outline-none"
        />
        {suffix ? <span className="ml-2 text-xs text-white/50">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">{label}</span>
      <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: AssetClass;
  onChange: (value: AssetClass) => void;
  options: Array<{ value: AssetClass; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">{label}</span>
      <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as AssetClass)}
          className="w-full bg-transparent text-sm text-white outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export default function RebalancingDashboard({
  initialAssets,
  sourceMessage,
  fxRate,
  fxMessage
}: RebalancingDashboardProps) {
  const [assets, setAssets] = useState<PortfolioAsset[]>(initialAssets);
  const [saveState, setSaveState] = useState<SaveRebalanceState | null>(null);
  const [isPending, startTransition] = useTransition();
  const alertThresholdPercent = 10;

  const summary = useMemo(
    () => computeRebalanceSummary(assets, alertThresholdPercent, fxRate),
    [assets, fxRate]
  );

  const bondRatio = summary.total_value > 0 ? (summary.by_class.bond / summary.total_value) * 100 : 0;
  const equityRatio = summary.total_value > 0 ? (summary.by_class.equity / summary.total_value) * 100 : 0;
  const buyPrincipal = 400_000_000;
  const currentProfit = summary.total_value - buyPrincipal;
  const currentProfitRate = buyPrincipal > 0 ? (currentProfit / buyPrincipal) * 100 : 0;

  const currentBreakdown = summary.rows.map((row, index) => ({
    label: row.stock_name || row.ticker || `종목 ${index + 1}`,
    value: row.current_value,
    ratio: row.current_weight,
    color: chartColors[index % chartColors.length],
    helperText: row.is_foreign
      ? `현재가 ${formatCurrency(row.display_current_price)}원 × ${row.amount.toLocaleString("ko-KR")}주`
      : `현재가 ${formatCurrency(row.current_price)}원 × ${row.amount.toLocaleString("ko-KR")}주`
  }));

  const targetBreakdown = summary.rows.map((row, index) => ({
    label: row.stock_name || row.ticker || `종목 ${index + 1}`,
    value: row.target_value,
    ratio: row.target_weight,
    color: chartColors[index % chartColors.length],
    helperText:
      row.action === "buy"
        ? `${row.ticker} ${formatCurrency(Math.abs(row.trade_value))}원 추가매수 필요`
        : row.action === "sell"
        ? `${row.ticker} ${formatCurrency(Math.abs(row.trade_value))}원 매도 필요`
        : `${row.ticker} 변동 없음`
  }));

  const updateAsset = (index: number, patch: Partial<PortfolioAsset>) => {
    setAssets((current) =>
      current.map((asset, currentIndex) =>
        currentIndex === index ? { ...asset, ...patch } : asset
      )
    );
  };

  const addAsset = () => {
    setAssets((current) => [...current, { ...createEmptyAsset(), display_order: current.length + 1 }]);
  };

  const removeAsset = (index: number) => {
    setAssets((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await savePortfolioAssets(assets);
      setSaveState(result);
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(180deg,#07111f_0%,#0b1320_40%,#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-none flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Portfolio Rebalancing Calculator</p>
          <div className="mt-3 flex w-full flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">포트폴리오 리밸런싱 계산기</h1>
              <p className="max-w-3xl text-sm leading-6 text-white/70">
                채권 50% / 주식 50% 포트폴리오를 기준으로 현재 비중을 계산하고, 임계치 이상 이탈한 자산의 매도/매수 수량을 바로 확인합니다.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 xl:max-w-md">
              {sourceMessage}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              FX 기준: {fxRate.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원/USD
            </span>
            <span>{fxMessage}</span>
          </div>
        </header>

        <section className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">총 평가금액</p>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(summary.total_value)}원</p>
            <p className="mt-2 text-sm text-white/60">현재 보유 자산 기준 전체 포트폴리오 가치</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">매수 원금</p>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(buyPrincipal)}원</p>
            <p className="mt-2 text-sm text-white/60">포트폴리오의 기준 매입 원금</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">현재수익금(현재수익률)</p>
            <p className={`mt-3 text-3xl font-semibold ${currentProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {currentProfit >= 0 ? "+" : ""}
              {formatCurrency(currentProfit)}원
            </p>
            <p className="mt-2 text-sm text-white/60">
              {currentProfitRate >= 0 ? "+" : ""}
              {formatPercent(currentProfitRate)} 기준 현재 수익률
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">알람 대상</p>
            <p className="mt-3 text-3xl font-semibold">{summary.alert_count}건</p>
            <p className="mt-2 text-sm text-white/60">채권과 주식 비중 차이 {formatPercent(alertThresholdPercent)} 이상 시 알람</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">현재 포트폴리오</p>
                <h2 className="mt-1 text-lg font-semibold">현재 자산 비율</h2>
                <p className="mt-1 text-sm text-white/60">
                  환율 반영 후의 현재 평가금액을 기준으로 종목별 비율을 표시합니다.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                총 평가금액 {formatCurrency(summary.total_value)}원
              </span>
            </div>
            <div className="mt-5">
              {summary.rows.length > 0 ? (
                <div className="space-y-4">
                  <DonutChart
                    items={currentBreakdown}
                    total={summary.total_value}
                    centerLabel="현재 비율"
                    centerValue={`${summary.rows.length}개 종목`}
                    ratioLabel="현재비율"
                    layout="bottom"
                  />
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">채권:주식 비율</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatPercent(bondRatio)} : {formatPercent(equityRatio)}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      현재 자산 평가금액 기준 채권과 주식의 비중입니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                  Supabase에 저장된 자산이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">리밸런싱 후</p>
                <h2 className="mt-1 text-lg font-semibold">목표 자산 비율</h2>
                <p className="mt-1 text-sm text-white/60">
                  매수/매도 완료 후 목표 비율과 종목별 거래 금액을 함께 보여줍니다.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                알람 대상 {summary.alert_count}건
              </span>
            </div>
            <div className="mt-5">
              {summary.rows.length > 0 ? (
                <DonutChart
                  items={targetBreakdown}
                  total={summary.total_value}
                  centerLabel="목표 비율"
                  centerValue={`${formatPercent(100)}`}
                  ratioLabel="목표비율"
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                  Supabase에 저장된 자산이 없습니다.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">현재 자산</h3>
            <div className="mt-4 space-y-3">
              {summary.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                  현재 자산이 없습니다.
                </div>
              ) : (
                summary.rows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{row.stock_name || "종목명 미입력"}</p>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-white/60">
                            {row.ticker || "TICKER"}
                          </span>
                          {row.is_foreign ? (
                            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] tracking-[0.14em] text-cyan-100">
                              FX
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-white/50">{assetClassLabels[row.asset_class]}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatPercent(row.current_weight)}</p>
                    </div>
                    <p className="mt-3 text-sm text-white/70">
                      현재 자산 {formatCurrency(row.current_value)}원
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {row.is_foreign
                        ? `현재가 ${formatCurrency(row.display_current_price)}원 × ${row.amount.toLocaleString("ko-KR")}주`
                        : `현재가 ${formatCurrency(row.current_price)}원 × ${row.amount.toLocaleString("ko-KR")}주`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">리밸런싱 필요 금액</h3>
            <div className="mt-4 space-y-3">
              {summary.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                  리밸런싱 필요 금액이 없습니다.
                </div>
              ) : (
                summary.rows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{row.stock_name || "종목명 미입력"}</p>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-white/60">
                            {row.ticker || "TICKER"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/50">{assetClassLabels[row.asset_class]}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70">
                        {row.action === "buy" ? "추가매수" : row.action === "sell" ? "매도" : "유지"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      {row.action === "buy" ? "+" : row.action === "sell" ? "-" : ""}
                      {formatCurrency(Math.abs(row.trade_value))}원{" "}
                      {row.action === "buy"
                        ? "추가매수 필요"
                        : row.action === "sell"
                        ? "매도 필요"
                        : "변동 없음"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {row.is_foreign
                        ? `환율 적용가 ${formatCurrency(row.display_current_price)}원 기준 ${Math.abs(row.trade_shares).toFixed(2)}주`
                        : `${Math.abs(row.trade_shares).toFixed(2)}주 기준`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">자산군 요약</h3>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>채권</span>
                  <span>{formatCurrency(summary.by_class.bond)}원</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-emerald-400"
                    style={{
                      width: `${summary.total_value > 0 ? (summary.by_class.bond / summary.total_value) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>주식</span>
                  <span>{formatCurrency(summary.by_class.equity)}원</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-cyan-400"
                    style={{
                      width: `${summary.total_value > 0 ? (summary.by_class.equity / summary.total_value) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">운영 메모</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-white/70">
              <li>• 채권과 주식 비중 차이가 {formatPercent(alertThresholdPercent)} 이상이면 알람을 표시합니다.</li>
              <li>• 현재 페이지는 일일 계산과 수동 저장을 지원하고, 이후 알람 자동화를 붙이기 좋게 설계했습니다.</li>
              <li>• 수량/가격을 바꾸면 즉시 매수·매도 추천치가 다시 계산됩니다.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">자산 편집</h2>
              <p className="mt-1 text-sm text-white/60">티커, 이름, 현재가, 수량, 목표 비중을 수정하고 Supabase에 저장합니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                알람 기준: 채권-주식 비중 차이 {formatPercent(alertThresholdPercent)}
              </div>
              <button
                type="button"
                onClick={addAsset}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Plus className="h-4 w-4" />
                종목 추가
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-white/40">
                  <th className="px-3 py-2">티커</th>
                  <th className="px-3 py-2">종목명</th>
                  <th className="px-3 py-2">자산군</th>
                  <th className="px-3 py-2 text-right">현재가</th>
                  <th className="px-3 py-2 text-right">보유수량</th>
                  <th className="px-3 py-2 text-right">목표비중</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, index) => (
                  <tr key={asset.id} className="rounded-2xl bg-white/5 align-top">
                    <td className="px-3 py-2">
                      <TextField
                        label="티커"
                        value={asset.ticker}
                        onChange={(value) => updateAsset(index, { ticker: value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <TextField
                        label="종목명"
                        value={asset.stock_name}
                        onChange={(value) => updateAsset(index, { stock_name: value })}
                        placeholder="예: ICSH ETF"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectField
                        label="자산군"
                        value={asset.asset_class}
                        onChange={(value) => updateAsset(index, { asset_class: value })}
                        options={[
                          { value: "bond", label: "채권" },
                          { value: "equity", label: "주식" },
                          { value: "other", label: "기타" }
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberField
                        label="현재가"
                        value={asset.current_price}
                        onChange={(value) => updateAsset(index, { current_price: value })}
                        suffix="원"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberField
                        label="보유수량"
                        value={asset.amount}
                        onChange={(value) => updateAsset(index, { amount: value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberField
                        label="목표비중"
                        value={asset.target_weight}
                        onChange={(value) => updateAsset(index, { target_weight: value })}
                        suffix="%"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeAsset(index)}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-rose-500/20 hover:text-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isPending ? "저장 중..." : "Supabase 저장"}
            </button>
            {saveState ? (
              <p className={saveState.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
                {saveState.message}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
