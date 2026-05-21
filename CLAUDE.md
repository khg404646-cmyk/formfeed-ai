# FormFeed AI Development Rules

## Product Definition
FormFeed AI is not a full trainer management SaaS yet.
The MVP is a workout video feedback link generator.

Core flow:
1. Trainer uploads workout video
2. Trainer selects exercise type
3. Trainer pauses at a feedback point
4. Trainer selects body area and arrow position
5. AI generates member-friendly feedback draft
6. Trainer edits the draft
7. Feedback is shown as arrow + popup overlay on video
8. Trainer shares a member link with the member

## MVP Priority
Build the result page first.
The member-facing share page is the strongest sales proof.

## Must Build
- Video upload
- Exercise selection
- Video playback
- Timestamp selection
- Current frame capture
- Body area selection
- AI feedback draft generation
- Editable AI text
- Arrow position and direction
- Overlay on video
- Member share link
- Trainer edit link
- Member-facing share page
- localStorage recent links

## Must Not Build Yet
- Login
- Member management
- Payment
- Free drawing canvas
- Audio recording
- Video export
- Full video AI analysis
- AI posture score
- App store release
- Automatic expired video deletion

## Architecture Rules
- Use one VideoPlayer component for real video playback.
- VideoPlayer mode only supports "edit" and "share".
- Demo pages do not use VideoPlayer.
- Demo pages use static mockup shapes.
- Do not create VideoPlayer demo mode.
- Do not create a separate ShareVideoView component.
- Use OverlayPreview inside VideoPlayer for real video pages.
- Use OverlayPreview directly in demo mockup pages.
- Default video layout is 9:16 vertical mobile video.
- Keep components small.
- Do not over-refactor.

## Token Rules
- share_token is for member-facing public share page.
- edit_token is for trainer edit permission.
- For MVP speed, edit_token is intentionally included in the editor URL query string.
- Editor URL format: /editor/[sessionId]?edit_token=[editToken]
- Trainers can bookmark this URL to edit from another device.
- Do not expose edit link copy UI on the editor; only member share link is copyable.
- share_token must never be used as edit permission.
- share page must never expose edit_token.

## Database Access Rules
- Browser must never access Supabase directly.
- Do not use NEXT_PUBLIC_SUPABASE_ANON_KEY in this MVP.
- Do not create /lib/supabase.ts for browser access.
- All database access must go through Next.js API routes.
- API routes use /lib/supabase-server.ts with SUPABASE_SERVICE_ROLE_KEY.
- Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.

## Supabase RLS Decision
- Enable RLS on feedback_sessions and feedback_markers.
- Do not create public anon policies for MVP.
- Because all DB access is via API routes with service role, the browser cannot query tables directly.
- V1.5 can revisit RLS policies when login/auth is introduced.

## Video / CORS Rules
- R2 CORS must be configured before testing real uploaded videos.
- VideoPlayer uses crossOrigin="anonymous" for canvas frame capture.
- If video playback fails, check R2 CORS before changing VideoPlayer logic.
- Do not remove crossOrigin permanently just to make playback work.

## Expiration Policy
- feedback_sessions.expires_at exists for future use.
- MVP does not implement automatic expiration or deletion.
- Do not add cron jobs, scheduled deletion, or R2 cleanup logic in MVP.
- V1.5 will handle Supabase cron + R2 cleanup.

## OG Image Rules
- OG image is generated at /api/og.
- It must return PNG through ImageResponse.
- It should use Korean text.
- Load Noto Sans KR through fetch.
- If font fetch fails, fallback to English text but still return an image.

## UX Rules
- Trainer edits AI draft, not writes from blank.
- Never present AI as the final judge.
- Use “AI가 피드백 초안을 작성했습니다. 트레이너가 확인 후 전달합니다.”
- Overlay popup must be short.
- Avoid medical diagnosis or fear-based expressions.
- Mobile-first layout.

## Code Rules
- Use TypeScript types from /types/formfeed.ts.
- Use Tailwind only for styling.
- Add loading and error states for async operations.
- Prefer simple working code over complex architecture.
