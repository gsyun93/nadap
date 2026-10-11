"use client";
// 화면 조각들: 헤더, 보기 목록, 로딩 뼈대 등
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CUSTOM_MAX } from "@/lib/data";
import type { Answer } from "@/lib/types";
import { AppIcon } from "./Logo";

/** 보기를 누른 뒤 다음 화면으로 넘어가기까지의 시간 */
export const PRESS_DELAY = 160;

export function Header({ percent, onBack, showBack }: { percent: number; onBack: () => void; showBack: boolean }) {
  return (
    <header className="sticky top-0 z-10 bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="w-[64px] shrink-0">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 flex h-12 items-center rounded-lg px-2 text-[15px] font-medium text-sub active:bg-surface"
            >
              ‹ 이전
            </button>
          )}
        </div>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-blue transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-10 text-right text-[13px] font-medium tabular-nums text-sub">{percent}%</span>
        <AppIcon size={24} className="shrink-0" />
      </div>
    </header>
  );
}

export function QuestionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-2 text-[14px] font-medium text-blue">{eyebrow}</p>}
      <h1 className="text-[24px] leading-[1.4] font-bold text-balance">{title}</h1>
      {sub && <p className="mt-2 text-[15px] text-sub">{sub}</p>}
    </div>
  );
}

const optionBase =
  "flex min-h-12 w-full items-center rounded-[14px] border-[1.5px] px-[18px] py-4 text-left text-[16px] leading-snug transition-colors duration-100";
const optionIdle = "border-line bg-bg text-text active:bg-surface";
const optionOn = "border-blue bg-blue text-white";

/** 보기 목록 + (선택) 직접 쓰기. 누르면 블루로 채워지고 0.16초 뒤 onSelect */
export function ChoiceList({
  options,
  subLabels,
  selected,
  onSelect,
  allowCustom = false,
}: {
  options: readonly string[];
  subLabels?: readonly string[];
  selected: Answer | null;
  onSelect: (a: Answer) => void;
  allowCustom?: boolean;
}) {
  const [pressed, setPressed] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(selected?.kind === "custom");
  const [text, setText] = useState(selected?.kind === "custom" ? selected.text : "");
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);

  const pick = (i: number) => {
    if (busy.current) return;
    busy.current = true;
    setPressed(i);
    setTimeout(() => onSelect({ kind: "option", index: i }), PRESS_DELAY);
  };

  const openCustom = () => {
    setCustomOpen(true);
    setTimeout(() => {
      boxRef.current?.focus({ preventScroll: true });
      boxRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  };

  const submitCustom = () => {
    const t = text.trim();
    if (!t || busy.current) return;
    busy.current = true;
    onSelect({ kind: "custom", text: t.slice(0, CUSTOM_MAX) });
  };

  const isOn = (i: number) => (pressed !== null ? pressed === i : selected?.kind === "option" && selected.index === i);

  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          onClick={() => pick(i)}
          className={`${optionBase} ${isOn(i) ? optionOn : optionIdle}`}
        >
          <span>
            {o}
            {subLabels?.[i] && (
              <span className={`mt-0.5 block text-[13px] ${isOn(i) ? "text-white/80" : "text-sub"}`}>
                {subLabels[i]}
              </span>
            )}
          </span>
        </button>
      ))}
      {allowCustom &&
        (customOpen ? (
          <div className="flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-line p-3">
            <textarea
              ref={boxRef}
              value={text}
              maxLength={CUSTOM_MAX}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="편하게 적어주세요"
              className="w-full resize-none rounded-[10px] bg-surface px-3 py-3 text-[16px] leading-relaxed text-text placeholder:text-sub/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-blue"
            />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-sub tabular-nums">
                {text.length}/{CUSTOM_MAX}
              </span>
              <button
                type="button"
                onClick={submitCustom}
                disabled={!text.trim()}
                className="h-12 rounded-[12px] bg-blue px-6 text-[16px] font-bold text-white transition active:brightness-90 disabled:opacity-35"
              >
                다음
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openCustom}
            className={`${optionBase} border-dashed border-line text-sub active:bg-surface`}
          >
            ✏️ 직접 쓸게요
          </button>
        ))}
    </div>
  );
}

/** 질문 준비 중 뼈대. 120ms 안에 준비되면 아예 안 보인다 */
export function QuestionSkeleton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 120);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div aria-busy="true">
      <div className="mb-7 space-y-2.5">
        <div className="h-7 w-4/5 animate-pulse rounded-lg bg-surface" />
        <div className="h-7 w-1/2 animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[56px] animate-pulse rounded-[14px] bg-surface" />
        ))}
      </div>
      <p className="mt-6 text-center text-[14px] text-sub">당신에게 맞는 질문을 고르는 중이에요…</p>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-[14px] bg-blue text-[17px] font-bold text-white transition active:scale-[0.98] active:brightness-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
