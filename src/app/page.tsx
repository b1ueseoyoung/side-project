export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-24">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          투고 전 원고 진단
        </h1>
        <p className="text-lg leading-8 text-muted">
          기획서와 1~3화 원고를 올리면 캐릭터, 상업성, 작법 세 가지 기준으로
          진단하고 가장 먼저 고칠 점을 알려드려요.
        </p>
      </div>
      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        올린 원고는 AI 학습에 쓰지 않습니다.
      </p>
    </main>
  );
}
