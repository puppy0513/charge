# 수수료 정산 대시보드 (No Backend)

위탁 자산 운용자가 **기초 자산 / 월 납입금 / 반기 말 실제 평가액 / 환차익·환차손 / 수익률 기준(연 또는 반기)**을 직접 조정하며, **반기(6개월) 성과보수(수수료)**를 실시간으로 시뮬레이션하는 단일 페이지 대시보드입니다.

- Framework: **Next.js 14 (App Router)**
- Language: **TypeScript (strict)**
- Styling: **Tailwind CSS**
- Icons: **lucide-react**
- Deployment: **Vercel**

---

## 실행 방법 (로컬)

```bash
npm install
npm run dev
```

- 접속: `http://localhost:3000`

---

## 프로덕션 빌드/검증

```bash
npm run lint
npm run build
npm run start
```

---

## Vercel 배포

1. GitHub에 푸시
2. Vercel에서 **Import Project**
3. Framework Preset: **Next.js**
4. Build Command: `next build` (기본값)
5. Output Directory: `.next` (기본값)

이 프로젝트는 서버/DB 없이 동작하는 **클라이언트 입력 기반 시뮬레이터**이며, 정적 출력(SSG) 형태로도 문제 없이 빌드됩니다.

---

## 주요 파일

- `src/app/page.tsx`: 대시보드 단일 페이지 (클라이언트 컴포넌트)
- `src/app/rebalancing/page.tsx`: 포트폴리오 리밸런싱 계산기
- `src/app/layout.tsx`: 루트 레이아웃
- `src/app/globals.css`: Tailwind + 기본 타이포/배경
- `supabase/rebalancing_schema.sql`: 리밸런싱용 Supabase 테이블 DDL/시드
- `vercel.json`: Vercel Cron 설정

---

## 포트폴리오 리밸런싱 계산기

새 페이지는 `/rebalancing` 에서 열 수 있습니다.

포함 기능:

- 현재 보유 종목의 티커, 종목명, 현재가, 보유수량, 목표비중 편집
- 현재 비중과 목표 비중 비교
- 임계치 기반 알람 대상 표시
- 종목별 매수/매도 필요 금액과 주식 수 계산
- 해외 자산은 USD/KRW 환율을 반영해 원화 기준으로 계산
- Supabase `portfolio_assets` 단일 테이블 저장

Supabase에 아래 SQL을 먼저 반영하면 데이터가 바로 저장됩니다.

- [`supabase/rebalancing_schema.sql`](/Users/baejunhyeon/charge/supabase/rebalancing_schema.sql)

이 설계는 테이블 수를 최소화하기 위해 스냅샷 테이블을 두지 않고, 현재 자산 목록만 저장합니다.

---

## 가격 자동 동기화

리밸런싱 페이지는 `/api/rebalancing/sync` 라우트로 현재가를 다시 받아와 `portfolio_assets.current_price` 를 갱신합니다.

- 가격 소스: Twelve Data
- 한국 종목 fallback: Naver Finance 종목 페이지
- 해외 자산 평가용 환율: Twelve Data `USD/KRW`
- Vercel Cron: 하루 1회 `00:00 UTC`
- 보안: `CRON_SECRET` 가 있으면 `Authorization: Bearer <secret>` 헤더가 필요합니다.

필요한 환경 변수:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWELVEDATA_API_KEY`
- `CRON_SECRET` - 선택 사항이지만 Vercel에서는 권장

---

## 계산 로직 (반기 6개월)

- 월 수익률  
  \[
  monthlyRate = \frac{annualHurdleRate}{12 \cdot 100}
  \]

- 기초 자산 목표 수익금 (6개월 단리)  
  \[
  initialTargetProfit = initialBalance \cdot monthlyRate \cdot 6
  \]

- 월 납입금 목표 수익금 합계 (6,5,4,3,2,1개월 단리)  
  \[
  monthlyContributionTargetProfit = monthlyContribution \cdot monthlyRate \cdot (6+5+4+3+2+1)= monthlyContribution \cdot monthlyRate \cdot 21
  \]

- 목표 평가액 (Hurdle)  
  \[
  hurdleValue = initialBalance + (monthlyContribution \cdot 6) + initialTargetProfit + monthlyContributionTargetProfit
  \]

- 최종 성과보수  
  \[
  performanceFee = (actualPortfolioValue - fxGainLoss) - hurdleValue
  \]

단, `performanceFee <= 0` 인 경우 **0원으로 처리**하며 UI에  
“목표 수익에 달성하지 못하여 수수료가 발생하지 않았습니다” 문구를 표시합니다.

- `fxGainLoss`는 환차익이면 양수, 환차손이면 음수로 입력합니다.
- 수익률 기준이 `연 목표 수익률`이면 월 수익률은 `연 목표 수익률 / 12`로 계산하고, `반기 목표수익률`이면 `반기 목표수익률 / 6`으로 계산합니다.

---

## 숫자 입력 UX

- 입력 필드 포커스 시: **콤마 없는 순수 숫자**로 편집
- 입력 필드 블러 시: **천 단위 콤마 포맷**으로 표시
- 음수 입력은 0으로 클램프 처리 (min=0)
