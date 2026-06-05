"use client";

import { ChangeEvent, FocusEvent, useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  decimals?: number;
};

type RateBasis = "annual" | "semiannual";

const parseNumber = (raw: string): number => {
  const normalized = raw.replace(/,/g, "").trim();
  if (normalized.length === 0) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (value: number, decimals = 0): string =>
  value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  min,
  decimals = 0
}: NumberInputProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const [raw, setRaw] = useState<string>(formatNumber(value, decimals));

  const displayValue = focused ? raw : formatNumber(value, decimals);

  const handleFocus = () => {
    setFocused(true);
    setRaw(value.toString());
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(event.currentTarget.value);
    const clamped = min !== undefined ? Math.max(min, numericValue) : numericValue;
    onChange(clamped);
    setFocused(false);
    setRaw(clamped.toString());
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setRaw(rawValue);
    const numericValue = parseNumber(rawValue);
    const clamped = min !== undefined ? Math.max(min, numericValue) : numericValue;
    onChange(clamped);
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
        <input
          type="text"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className="w-full bg-transparent text-right text-sm text-neutral-900 outline-none"
        />
        {suffix ? <span className="ml-2 text-xs text-neutral-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

type PercentInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function PercentInput({ label, value, onChange }: PercentInputProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const [raw, setRaw] = useState<string>(value.toString());

  const handleFocus = () => {
    setFocused(true);
    setRaw(value.toString());
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const numeric = Number(event.currentTarget.value.trim().replace(/,/g, ""));
    const safe = Number.isNaN(numeric) || numeric < 0 ? 0 : numeric;
    onChange(safe);
    setFocused(false);
    setRaw(safe.toString());
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setRaw(next);
    const numeric = Number(next.trim().replace(/,/g, ""));
    if (!Number.isNaN(numeric) && numeric >= 0) {
      onChange(numeric);
    }
  };

  const displayValue = focused ? raw : value.toString();

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className="w-full bg-transparent text-right text-sm text-neutral-900 outline-none"
        />
        <span className="ml-2 text-xs text-neutral-500">%</span>
      </div>
    </label>
  );
}

type SelectInputProps = {
  label: string;
  value: RateBasis;
  onChange: (value: RateBasis) => void;
  options: Array<{
    value: RateBasis;
    label: string;
  }>;
};

function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as RateBasis)}
          className="w-full bg-transparent text-right text-sm text-neutral-900 outline-none"
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

export default function Page() {
  const [initialBalance, setInitialBalance] = useState<number>(400_000_000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(2_000_000);
  const [hurdleRateBasis, setHurdleRateBasis] = useState<RateBasis>("annual");
  const [hurdleRate, setHurdleRate] = useState<number>(5.04);
  const [actualPortfolioValue, setActualPortfolioValue] = useState<number>(430_000_000);
  const [fxGainLoss, setFxGainLoss] = useState<number>(0);

  const {
    monthlyRate,
    initialTargetProfit,
    monthlyContributionTargetProfit,
    hurdleValue,
    adjustedActualPortfolioValue,
    rawPerformanceFee,
    performanceFee,
    feeBlocked,
    rows
  } = useMemo(() => {
    const periodsPerYear = hurdleRateBasis === "annual" ? 12 : 6;
    const monthlyRateValue = hurdleRate / periodsPerYear / 100;
    const initialTargetProfitValue = initialBalance * monthlyRateValue * 6;
    const monthlyContributionTargetProfitValue =
      monthlyContribution * monthlyRateValue * 21;

    const hurdleValueValue =
      initialBalance +
      monthlyContribution * 6 +
      initialTargetProfitValue +
      monthlyContributionTargetProfitValue;

    const adjustedActualPortfolioValueValue = actualPortfolioValue - fxGainLoss;
    const rawFee = adjustedActualPortfolioValueValue - hurdleValueValue;
    const finalFee = rawFee > 0 ? rawFee : 0;

    const monthlyRows = Array.from({ length: 6 }, (_, index) => {
      const month = index + 1;
      const activeMonths = 7 - month;
      const targetProfit = monthlyContribution * monthlyRateValue * activeMonths;

      return {
        month,
        activeMonths,
        targetProfit
      };
    });

    return {
      monthlyRate: monthlyRateValue,
      initialTargetProfit: initialTargetProfitValue,
      monthlyContributionTargetProfit: monthlyContributionTargetProfitValue,
      hurdleValue: hurdleValueValue,
      adjustedActualPortfolioValue: adjustedActualPortfolioValueValue,
      rawPerformanceFee: rawFee,
      performanceFee: finalFee,
      feeBlocked: finalFee <= 0,
      rows: monthlyRows
    };
  }, [actualPortfolioValue, fxGainLoss, hurdleRate, hurdleRateBasis, initialBalance, monthlyContribution]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            Fee Settlement Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            수수료 정산 대시보드
          </h1>
          <p className="text-sm text-neutral-600">
            입력값을 변경하면 반기 성과보수가 즉시 재계산됩니다.
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Performance Fee
                </p>
                <p className="text-sm text-neutral-600">운용자 수취 수수료 (6개월 기준)</p>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight sm:text-4xl">
              {formatNumber(Math.round(performanceFee))}원
            </p>
          </div>

          {feeBlocked ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              목표 수익에 달성하지 못하여 수수료가 발생하지 않았습니다
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">New Page</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">포트폴리오 리밸런싱 계산기</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Supabase 자산 테이블을 편집하고, 5% 임계치 기반의 매수/매도 추천을 계산합니다.
              </p>
            </div>
            <Link
              href="/rebalancing"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              새 페이지 열기
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">입력 변수</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberInput
              label="기초 자산 (initialBalance)"
              value={initialBalance}
              onChange={setInitialBalance}
              suffix="원"
              min={0}
            />
            <NumberInput
              label="월 납입금 (monthlyContribution)"
              value={monthlyContribution}
              onChange={setMonthlyContribution}
              suffix="원"
              min={0}
            />
            <SelectInput
              label="수익률 기준"
              value={hurdleRateBasis}
              onChange={setHurdleRateBasis}
              options={[
                { value: "semiannual", label: "반기 목표수익률" },
                { value: "annual", label: "연 목표 수익률" }
              ]}
            />
            <PercentInput
              label={
                hurdleRateBasis === "annual"
                  ? "연 목표 수익률 (annualHurdleRate)"
                  : "반기 목표 수익률 (semiannualHurdleRate)"
              }
              value={hurdleRate}
              onChange={setHurdleRate}
            />
            <NumberInput
              label="반기 말 실제 평가액 (actualPortfolioValue)"
              value={actualPortfolioValue}
              onChange={setActualPortfolioValue}
              suffix="원"
              min={0}
            />
            <NumberInput
              label="환차익 / 환차손 (fxGainLoss)"
              value={fxGainLoss}
              onChange={setFxGainLoss}
              suffix="원"
            />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            환차익은 양수, 환차손은 음수로 입력하세요. 수수료는 반기 말 실제 평가액에서
            환차익/환차손을 제외하고, 선택한 수익률 기준에 맞춰 산정합니다.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">운용 기간별 허들 수익금 산출 내역</h2>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">월 수익률</p>
              <p className="mt-1 text-sm font-semibold">{formatNumber(monthlyRate * 100, 3)}%</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">기초 자산 목표 수익금</p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(Math.round(initialTargetProfit))}원
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">월 납입금 목표 수익금 합계</p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(Math.round(monthlyContributionTargetProfit))}원
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">환차익/환차손 제외 평가액</p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(Math.round(adjustedActualPortfolioValue))}원
              </p>
            </div>
            <div className="rounded-lg border border-neutral-900 bg-neutral-900 p-3 text-white">
              <p className="text-xs text-neutral-300">목표 평가액 (Hurdle)</p>
              <p className="mt-1 text-sm font-semibold">{formatNumber(Math.round(hurdleValue))}원</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">월차</th>
                  <th className="px-3 py-2 text-right font-medium">월 납입금</th>
                  <th className="px-3 py-2 text-right font-medium">운용 개월 수</th>
                  <th className="px-3 py-2 text-right font-medium">목표 수익금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2">{row.month}개월차</td>
                    <td className="px-3 py-2 text-right">{formatNumber(monthlyContribution)}원</td>
                    <td className="px-3 py-2 text-right">{row.activeMonths}개월</td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(Math.round(row.targetProfit))}원
                    </td>
                  </tr>
                ))}
                <tr className="bg-neutral-50 font-medium">
                  <td className="px-3 py-2">합계</td>
                  <td className="px-3 py-2 text-right">{formatNumber(monthlyContribution * 6)}원</td>
                  <td className="px-3 py-2 text-right">21개월</td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(Math.round(monthlyContributionTargetProfit))}원
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            허들 대비 초과/미달 금액(환차익/환차손 제외):{" "}
            <span className={rawPerformanceFee >= 0 ? "text-emerald-700" : "text-amber-700"}>
              {rawPerformanceFee >= 0 ? "+" : ""}
              {formatNumber(Math.round(rawPerformanceFee))}원
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
