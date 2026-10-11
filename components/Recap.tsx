"use client";
// 다음 질문을 만드는 동안 보여주는 회고 화면 (AI 호출 없음, 비용 0원)
//  - note:   상담가 노트에 지금까지의 답이 적히고, 방금 고른 답이 한 글자씩 써진다
//  - breath: 무거운 답 다음에 숨 고르기
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type RecapMode = "note" | "breath";

/** 이 시간 안에 질문이 오면 회고 화면을 아예 보여주지 않는다 */
export const RECAP_DELAY = 300;
/** 한번 보였으면 최소 이만큼은 보여준다 (회고할 시간) */
export const RECAP_MIN_SHOW = 2500;
/** 회고 화면이 사라지는 시간 (부드럽게 흐려지며 다음 질문으로) */
export const RECAP_FADE_OUT = 350;
/** 노트를 스크롤하다 손을 뗀 뒤 이만큼 더 기다렸다 넘어간다 (관성 스크롤까지 끝나게) */
export const RECAP_SCROLL_GRACE = 700;

/** 사용자가 노트를 보고 있는지: 누르고 있거나(down) 최근에 스크롤했으면(until까지) 다음 질문으로 넘기지 않는다 */
export type RecapActivity = { down: boolean; until: number };
export function recapBusy(a: RecapActivity) {
  return a.down || Date.now() < a.until;
}
/** 노트에서 일어난 일: 누름(down) / 뗌(up) / 스크롤(scroll) */
export type RecapActivityEvent = "down" | "up" | "scroll";
/** 받은 이벤트로 RecapActivity를 갱신 (Nadap이 자기 ref에 적용) */
export function applyRecapActivity(a: RecapActivity, e: RecapActivityEvent) {
  if (e === "down") a.down = true;
  else {
    if (e === "up") a.down = false;
    a.until = Date.now() + RECAP_SCROLL_GRACE;
  }
}

const WAIT_TEXT = "당신에게 맞는 질문을 고르는 중이에요…";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const m = window.matchMedia(REDUCE_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/** 방금 고른 답을 한 글자씩 적는다 */
function Typewriter({ text, instant }: { text: string; instant: boolean }) {
  const [n, setN] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) return;
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 45);
    return () => clearInterval(t);
  }, [text, instant]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-blue" />}
    </>
  );
}

export type RecapItem = { question: string; answer: string };

function Note({
  answers,
  reduce,
  onActivity,
}: {
  answers: RecapItem[];
  reduce: boolean;
  onActivity: (e: RecapActivityEvent) => void;
}) {
  // 지금까지의 질문과 답 전부. 칸 안에서 스크롤되고, 처음엔 맨 아래(방금 답)가 보이게
  const boxRef = useRef<HTMLOListElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const autoScroll = useRef(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    autoScroll.current = true; // 코드로 맨 아래로 내린 건 "사용자가 보는 중"으로 치지 않는다
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => (autoScroll.current = false));
    setScrollable(el.scrollHeight > el.clientHeight + 4);
  }, [answers.length]);


  return (
    <div className="rounded-[16px] border border-line bg-surface px-3 pt-4 pb-3">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <p className="text-[13px] font-bold text-blue">상담가 노트</p>
        {scrollable && <p className="text-[12px] text-sub">위로 올리면 지난 이야기가 보여요</p>}
      </div>
      <ol
        ref={boxRef}
        tabIndex={0}
        aria-label="지금까지의 질문과 답"
        onPointerDown={() => onActivity("down")}
        onPointerUp={() => onActivity("up")}
        onPointerCancel={() => onActivity("up")}
        onTouchStart={() => onActivity("down")}
        onTouchEnd={() => onActivity("up")}
        onWheel={() => onActivity("scroll")}
        onScroll={() => {
          if (!autoScroll.current) onActivity("scroll");
        }}
        className="flex max-h-[46dvh] flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-[12px]"
        style={{
          // 위쪽이 잘린 게 보이도록 살짝 흐리게
          maskImage: scrollable ? "linear-gradient(to bottom, transparent 0, black 28px)" : undefined,
          WebkitMaskImage: scrollable ? "linear-gradient(to bottom, transparent 0, black 28px)" : undefined,
        }}
      >
        {answers.map((item, i) => {
          const latest = i === answers.length - 1;
          return (
            <li
              key={i}
              className={`shrink-0 rounded-[12px] px-3.5 py-3 ${latest ? "border-[1.5px] border-blue bg-bg" : "bg-bg/60"}`}
            >
              <p className={`text-[13px] leading-[1.45] ${latest ? "text-blue" : "text-sub"}`}>
                <span aria-hidden className="mr-1 font-bold">
                  Q
                </span>
                {item.question}
              </p>
              <p className={`mt-1 text-[16px] leading-[1.45] ${latest ? "font-bold text-text" : "text-text/80"}`}>
                {latest ? <Typewriter text={item.answer} instant={reduce} /> : item.answer}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Breath({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex flex-col items-center py-10">
      <div
        aria-hidden
        className="size-28 rounded-full"
        style={{
          background: "color-mix(in srgb, var(--c-blue) 18%, var(--c-bg))",
          animation: reduce ? undefined : "nadap-breath 4s ease-in-out infinite",
        }}
      />
      <p className="mt-8 text-[20px] font-bold">숨 한 번 크게 쉬어요</p>
      <p className="mt-2 text-[15px] text-sub">천천히 들이쉬고, 천천히 내쉬어요</p>
    </div>
  );
}

export function RecapLoading({
  mode,
  answers,
  onVisible,
  leaving,
  onActivity,
}: {
  mode: RecapMode;
  answers: RecapItem[]; // 지금까지의 질문과 답 (오래된 것 → 방금 고른 것)
  onVisible: () => void;
  leaving: boolean; // 다음 질문이 준비돼 사라지는 중
  onActivity: (e: RecapActivityEvent) => void;
}) {
  const [show, setShow] = useState(false);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(true);
      onVisible();
    }, RECAP_DELAY);
    return () => clearTimeout(t);
    // 처음 한 번만 (보이기 시작한 시각을 알린다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="animate-[nadap-in_450ms_ease-out] transition-[opacity,transform] ease-in"
      style={{
        transitionDuration: `${RECAP_FADE_OUT}ms`,
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateY(-8px)" : undefined,
      }}
    >
      {mode === "breath" ? (
        <Breath reduce={reduce} />
      ) : (
        <>
          <p className="mb-2 text-[14px] font-medium text-blue">지금까지 들은 이야기</p>
          <Note answers={answers} reduce={reduce} onActivity={onActivity} />
        </>
      )}
      <p className="mt-6 flex items-center justify-center gap-2 text-[14px] text-sub">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-blue"
              style={{ animation: reduce ? undefined : `nadap-dot 1.2s ${i * 0.2}s ease-in-out infinite` }}
            />
          ))}
        </span>
        {WAIT_TEXT}
      </p>
    </div>
  );
}

/** 무거운 답인지 (숨 고르기를 보여줄지) */
export function isHeavyAnswer(text: string): boolean {
  return /지쳐|지친|힘들|무서|불안|우울|막막|외로|눈물|버거|포기|괴로|무기력|숨이 막|잠이 안/.test(text);
}
