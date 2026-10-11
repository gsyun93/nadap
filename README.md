# 나답 (NADAP) — 나를 찾는 답

고민 하나를 고르면, 성별·나이·MBTI·사주를 반영한 맞춤 질문이 이어지고 마지막에 그 사람만을 위한 답을 주는 상담형 웹 서비스.

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- 사주 계산: `lunar-javascript` 1.7.7 (버전 고정)
- DB 없음. 상담 내용·생년월일을 서버에 저장하지 않는다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 윈도우: copy .env.example .env.local
npm run dev                  # http://localhost:3000
npm test                     # 사주·나이 계산 단위 테스트
```

맞춤 질문 1~4번째는 질문 트리에서 꺼내고(AI 호출 없음), 5번째부터는 사용자가 보기를 고른 뒤 AI가 그 답에 맞는 다음 질문 1개를 만든다(미리 만들기 없음). 기다리는 동안에는 회고 화면(상담가 노트 / 성향 한 조각 / 숨 고르기, AI 호출 없음)을 보여준다. 고민·마음을 직접 썼거나 트리 질문에 직접 쓴 답을 하면 그다음부터 AI로 넘어간다.

API 키가 비어 있어도 화면은 끝까지 돌아간다. 이때는 예비 질문(FALLBACK)과 예시 결과를 쓴다.

## 환경변수 (`.env.local`, Vercel 환경변수)

| 이름 | 설명 | 예 |
|---|---|---|
| `QUESTION_PROVIDER` | 질문 생성용 회사: `anthropic` / `google` / `openai` | `google` |
| `QUESTION_MODEL` | 질문 생성용 모델 ID (빠르고 싼 모델) | `gemini-3.1-flash-lite` |
| `QUESTION_API_KEY` | 질문 생성용 API 키 | |
| `RESULT_PROVIDER` | 결과 생성용 회사 | `anthropic` |
| `RESULT_MODEL` | 결과 생성용 모델 ID (똑똑한 모델, 스트리밍) | `claude-sonnet-5-5` |
| `RESULT_API_KEY` | 결과 생성용 API 키 | |
| `RESULT_WORKSPACE_ID` | (선택) Anthropic 키가 워크스페이스에 묶여 있지 않을 때만 | `wrkspc_...` |

키는 서버(`lib/ai.ts`)에서만 쓰고 브라우저로 보내지 않는다. 회사를 바꿀 때는 환경변수만 바꾸면 된다.

## API 키 받는 법

**Google Gemini (질문용)**
1. https://aistudio.google.com 에 구글 계정으로 로그인
2. **Get API key → Create API key** (2026-05-28 이후 발급 키는 `AQ.`로 시작하는 게 정상)
3. 무료 티어 한도는 AI Studio의 **Usage / Rate limits**에서 확인 (2026-10 확인: 모델별 분당 15회)

**Anthropic Claude (결과용)**
1. https://console.anthropic.com 가입 → **Settings → Billing**에서 크레딧 충전
2. **Settings → Workspaces → (워크스페이스) → API Keys → Create Key**
   (워크스페이스에 묶이지 않은 키는 `RESULT_WORKSPACE_ID`가 필요)

## 데이터 정책 주의 (꼭 읽기)

| 모델 | 요금제 | 입력이 학습·제품 개선에 쓰이나 |
|---|---|---|
| Gemini (질문용) | **무료 티어 (현재)** | **쓰인다** |
| Gemini | 유료 (AI Studio에서 결제 계정 연결 → Tier 1) | 쓰이지 않는다 |
| Claude (결과용) | 유료 API | 기본적으로 쓰이지 않는다 |

- 지금 질문용 Gemini는 **무료 티어**라서, 사용자가 입력한 고민·생년월일이 구글의 제품 개선에 쓰일 수 있다.
- **개발·지인 테스트까지만 무료로 쓰고, 공개 출시 전에는 반드시 유료 요금제로 바꾼다.** AI Studio → Billing에서 결제 계정을 연결하면 된다. 또는 질문용 모델을 `anthropic` / `claude-haiku-5-5`로 바꿔도 된다.
- 무료 티어는 모델별 **분당 15회** 한도가 있다. 한도에 걸리면 잠시 기다렸다 다시 시도하고(최대 3번), 그래도 안 되면 예비 질문으로 이어간다.
- AI 생성물 고지는 이용약관·개인정보처리방침 페이지(시작 화면 푸터)에 있다.

## Vercel 배포

1. GitHub에 이 저장소를 올린다 (`.env.local`은 `.gitignore`에 있어서 올라가지 않는다).
2. Vercel → **Add New → Project** → 저장소 Import.
3. **Environment Variables**에 위 표의 값을 그대로 넣는다.
4. **Deploy**. 이후 `main`에 push할 때마다 자동 배포된다.

## 구조

```
app/page.tsx                 시작 화면 + 상담 흐름 (components/Nadap.tsx)
app/api/question/route.ts    질문 1개 생성 (POST, JSON)
app/api/result/route.ts      결과 생성 (POST, 텍스트 스트리밍)
app/terms, app/privacy       이용약관·개인정보처리방침 (AI 생성 고지)
lib/data.ts                  고정 문구 전부
lib/saju.ts                  사주·나이 계산 (+ saju.test.ts)
lib/prompts.ts               프롬프트 템플릿
lib/flow.ts                  질문 개수·진행률 계산
lib/tree.ts, lib/tree/*.json 맞춤 질문 1~4번째 질문 트리 (고민 12갈래, 고른 갈래만 불러옴)
scripts/build-tree.mjs       트리 원본 JSON → lib/tree/ 갈래별 파일 (node scripts/build-tree.mjs <원본 경로>)
lib/ai.ts                    AI 호출 래퍼 (질문용·결과용 분리)
lib/server-utils.ts          입력 검증, IP 기준 호출 제한 (질문 분당 60회 / 결과 분당 3회)
components/Logo.tsx          로고 SVG (글자 로고, 앱 아이콘)
```
