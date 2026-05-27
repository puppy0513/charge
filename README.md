# 수수료 정산 대시보드 (No Backend)

위탁 자산 운용자가 **기초 자산 / 월 납입금 / 연 목표 수익률(Hurdle) / 반기 말 실제 평가액**을 직접 조정하며, **반기(6개월) 성과보수(수수료)**를 실시간으로 시뮬레이션하는 단일 페이지 대시보드입니다.

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
- `src/app/layout.tsx`: 루트 레이아웃
- `src/app/globals.css`: Tailwind + 기본 타이포/배경

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
  performanceFee = actualPortfolioValue - hurdleValue
  \]

단, `performanceFee <= 0` 인 경우 **0원으로 처리**하며 UI에  
“목표 수익에 달성하지 못하여 수수료가 발생하지 않았습니다” 문구를 표시합니다.

---

## 숫자 입력 UX

- 입력 필드 포커스 시: **콤마 없는 순수 숫자**로 편집
- 입력 필드 블러 시: **천 단위 콤마 포맷**으로 표시
- 음수 입력은 0으로 클램프 처리 (min=0)

