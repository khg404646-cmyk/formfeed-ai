# Vercel 배포 체크리스트

## `404: NOT_FOUND` (흰 Vercel 에러 페이지)

앱 코드 404가 아니라 **배포/프로젝트 설정** 문제인 경우가 많습니다.

### Build & Development Settings

| 항목 | 올바른 값 |
|------|-----------|
| Framework Preset | **Next.js** |
| Root Directory | **비움** (저장소 루트에 `package.json`이 있음) |
| Build Command | `npm run build` (기본값) |
| Output Directory | **비움** — `public`, `.next`, `out` 넣으면 `/`가 404 됩니다 |
| Install Command | `npm install` (기본값) |

### Environment Variables

- `NEXT_PUBLIC_SITE_URL` = `https://formfeed-ai.vercel.app` (프로토콜 포함)
- 나머지는 `.env.local`과 동일하게 Production에 등록

`VERCEL_URL`은 Vercel이 자동 주입합니다. `NEXT_PUBLIC_SITE_URL`이 비어 있어도 메타데이터는 동작합니다.

### 영상 AI 분석 (`/api/ai/generate-feedback`)

- 라우트 `maxDuration`: **300초** (`vercel.json` + `route.ts`)
- **Fluid Compute** 활성화 권장 — Hobby 기본 10~60초 제한이면 AI 분석이 길게 돌다 504로 실패합니다.
- Hobby 플랜은 Vercel 상한(기본 10초)이 적용될 수 있음 → **Settings → Functions → Fluid Compute** 켜고 Redeploy
- Pro 이상이면 300초까지 영상 분석에 유리

필수 환경 변수: `GEMINI_API_KEY`, `R2_PUBLIC_URL`, `R2_*`, Supabase 키

### 배포 확인

1. Deployments → 최신 Production → **Visit** 클릭
2. `https://formfeed-ai.vercel.app/api/health` → `{"ok":true,...}` 이면 Next.js 라우팅 정상
3. Visit는 되는데 커스텀 도메인만 404면 **Settings → Domains**에서 Production 연결 확인 후 **Redeploy**
