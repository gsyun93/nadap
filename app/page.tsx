// 1단계 확인용 임시 시작 화면 (2단계에서 상담 흐름 전체로 교체)
import { AppIcon, Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col px-4 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo size={64} />
        <h1 className="mt-8 text-[28px] font-bold text-balance">나를 찾는 답</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-sub text-balance">
          고민 하나를 고르면, 나에게 맞춘 질문이 이어져요. 성향과 사주까지 함께 봐요.
        </p>
      </div>
      <button
        type="button"
        className="h-14 w-full rounded-[14px] bg-blue text-[17px] font-bold text-white transition active:scale-[0.98] active:brightness-95"
      >
        시작하기
      </button>
      <div className="mt-6 flex items-center justify-center gap-3 text-sub">
        <AppIcon size={28} />
        <span className="text-xs">1단계 확인용: 컬러·폰트·로고</span>
      </div>
    </main>
  );
}
