# Cloudflare R2 CORS Setup

## 반드시 먼저 할 것
실제 업로드 영상 테스트 전에 이 CORS 설정을 먼저 완료해야 한다.
이 설정이 안 된 상태에서 VideoPlayer를 테스트하면 iOS Safari에서 영상이 재생되지 않거나 canvas 캡처가 실패할 수 있다.

## 왜 필요한가
FormFeed AI는 업로드된 운동영상을 video 태그로 재생하고,
특정 시점의 프레임을 canvas로 캡처해 AI 피드백 생성에 사용한다.

R2 영상에 올바른 CORS 설정이 없으면 브라우저가 canvas 캡처를 차단한다.

## 설정 방법
Cloudflare Dashboard에서:
1. R2 이동
2. 해당 bucket 선택
3. Settings 또는 CORS 설정 메뉴로 이동
4. 아래 CORS 정책 추가

예시 CORS JSON:
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]

## 개발 중 주의
- 개발 중에는 AllowedOrigins를 ["*"]로 둔다.
- 실제 운영에서는 Vercel 도메인으로 제한하는 것이 좋다.
- video 태그에는 crossOrigin="anonymous"를 넣어야 한다.
- R2 public URL로 접근 가능한 영상이어야 한다.

## 모바일 재생 (iOS Safari)
- VideoPlayer는 R2 URL을 `/api/video/stream` same-origin 프록시로 재생합니다 (Range 요청 지원).
- **재생**은 프록시만으로도 동작할 수 있습니다.
- **프레임 캡처(canvas)** 는 여전히 R2 CORS가 필요할 수 있습니다 — AllowedMethods에 `GET`, `HEAD` 포함.

## 캡처 실패 시 체크리스트
- R2 CORS 설정 적용 여부
- video 태그 crossOrigin="anonymous"
- videoUrl이 R2_PUBLIC_URL로 시작하는지
- 브라우저 콘솔에 CORS 에러가 있는지
