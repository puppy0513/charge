import type { Metadata } from "next";
import RebalancingDashboard from "./rebalancing-dashboard";
import { loadPortfolioAssets } from "./actions";
import { fetchUsdKrwRate } from "@/lib/fx";

export const metadata: Metadata = {
  title: "포트폴리오 리밸런싱 계산기",
  description: "Supabase 기반 포트폴리오 리밸런싱 계산 및 임계치 모니터링"
};

export const dynamic = "force-dynamic";

export default async function RebalancingPage() {
  const [portfolio, fxRateResult] = await Promise.all([
    loadPortfolioAssets(),
    (async () => {
      const apiKey = process.env.TWELVEDATA_API_KEY;
      if (!apiKey) {
        return {
          rate: 1,
          symbol: "USD/KRW",
          message: "TWELVEDATA_API_KEY가 없어 환율 1.00으로 표시합니다."
        };
      }

      try {
        const result = await fetchUsdKrwRate(apiKey);
        return {
          ...result,
          message: `USD/KRW 환율 ${result.rate.toLocaleString("ko-KR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}를 반영합니다.`
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "USD/KRW 환율 조회에 실패했습니다.";
        return {
          rate: 1,
          symbol: "USD/KRW",
          message
        };
      }
    })()
  ]);

  return (
    <RebalancingDashboard
      initialAssets={portfolio.assets}
      sourceMessage={portfolio.message}
      fxRate={fxRateResult.rate}
      fxMessage={fxRateResult.message}
    />
  );
}
