# 투고 전 원고 진단

웹툰 지망생이 투고 전에 기획서와 1~3화 원고를 올리면 캐릭터, 상업성, 작법 세 기준으로 진단하고 가장 먼저 고칠 점을 알려주는 서비스.

- 기능 설계: https://claude.ai/code/artifact/fa81e68b-c6be-48c7-aa96-fff9fc7335de
- UI/UX 설계: https://claude.ai/code/artifact/476f5ce7-376b-4869-94cf-bb38d418c8a5

## 스택

- Next.js (App Router, TypeScript, Tailwind CSS)
- OpenAI API (`openai` SDK, 서버에서만 호출: `src/lib/openai.ts`)

## 시작하기

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY 입력
npm run dev
```

http://localhost:3000 에서 확인.
