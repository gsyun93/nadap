"use client";
// 고정 화면 중 모양이 특별한 것들: MBTI 그리드, 생년월일 입력, 결과
import { useRef, useState } from "react";
import { HOURS, MBTI_GROUPS } from "@/lib/data";
import { BIRTH_ERROR_TEXT, BirthError, calcSaju, type BirthInput, type Gender } from "@/lib/saju";
import { PRESS_DELAY, PrimaryButton, Toggle } from "./ui";

// ── [3] MBTI 4×4 ──
export function MbtiGrid({
  selected,
  onSelect,
  onUnknown,
}: {
  selected: string | null;
  onSelect: (code: string) => void;
  onUnknown: () => void;
}) {
  const [pressed, setPressed] = useState<string | null>(null);
  const busy = useRef(false);
  const pick = (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setPressed(code);
    setTimeout(() => onSelect(code), PRESS_DELAY);
  };
  const on = (code: string) => (pressed ? pressed === code : selected === code);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {MBTI_GROUPS.map((g, gi) => (
          <div
            key={g.label}
            className="rounded-[14px] px-1.5 pt-1.5 pb-1.5"
            // 그룹마다 옅은 블루 배경 (번갈아 톤을 달리해 네 묶음이 한눈에 구분되게)
            style={{ background: `color-mix(in srgb, var(--c-blue) ${gi % 2 ? 9 : 5}%, var(--c-bg))` }}
          >
            <p className="mb-1 pl-1 text-[11px] leading-[14px] font-bold text-blue">{g.label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {g.types.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => pick(t.code)}
                  aria-pressed={on(t.code)}
                  className={`flex min-h-[58px] flex-col items-center justify-center rounded-[10px] border px-0.5 py-1 text-center transition-colors duration-100 ${
                    on(t.code) ? "border-blue bg-blue" : "border-line bg-bg active:bg-surface"
                  }`}
                >
                  <span className={`text-[17px] leading-tight font-bold ${on(t.code) ? "text-white" : "text-deep"}`}>
                    {t.code}
                  </span>
                  <span
                    className={`mt-0.5 line-clamp-2 text-[12px] leading-[1.15] ${on(t.code) ? "text-white/85" : "text-sub"}`}
                  >
                    {t.nick}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onUnknown}
        className="mt-2 flex min-h-12 w-full items-center justify-center px-4 text-[15px] text-sub underline underline-offset-4 active:text-text"
      >
        잘 모르겠어요 · 간단한 질문 4개로 찾기
      </button>
    </div>
  );
}

// ── [4] 성별·생년월일·태어난 시간 ──
export type BirthForm = {
  gender: Gender | null;
  calendar: "solar" | "lunar";
  year: number | null;
  month: number | null;
  day: number | null;
  leap: boolean;
  hourIndex: number | null;
  unknownHour: boolean;
};

export const EMPTY_BIRTH_FORM: BirthForm = {
  gender: null,
  calendar: "solar",
  year: null,
  month: null,
  day: null,
  leap: false,
  hourIndex: null,
  unknownHour: false,
};

const YEARS = Array.from({ length: 2012 - 1940 + 1 }, (_, i) => 2012 - i);
const selectCls =
  "h-12 w-full appearance-none rounded-[12px] border-[1.5px] border-line bg-bg px-3 text-[16px] text-text disabled:opacity-40";

export function BirthFormScreen({
  form,
  onChange,
  onSubmit,
  onSkip,
}: {
  form: BirthForm;
  onChange: (f: BirthForm) => void;
  onSubmit: (b: BirthInput) => void;
  onSkip: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<BirthForm>) => {
    setError(null);
    onChange({ ...form, ...patch });
  };

  const submit = () => {
    if (!form.gender || !form.year || !form.month || !form.day) {
      setError("성별과 생년월일을 모두 골라주세요.");
      return;
    }
    if (form.hourIndex === null && !form.unknownHour) {
      setError("태어난 시간을 고르거나 ‘몰라요’에 체크해주세요.");
      return;
    }
    const b: BirthInput = {
      gender: form.gender,
      calendar: form.calendar,
      year: form.year,
      month: form.month,
      day: form.day,
      leap: form.calendar === "lunar" && form.leap,
      hourIndex: form.unknownHour ? null : form.hourIndex,
    };
    try {
      calcSaju(b);
    } catch (e) {
      setError(e instanceof BirthError ? BIRTH_ERROR_TEXT[e.kind] : BIRTH_ERROR_TEXT.solar);
      return;
    }
    onSubmit(b);
  };

  const num = (v: string) => (v === "" ? null : Number(v));

  const legendCls = "mb-1.5 text-[13px] font-medium text-sub";

  return (
    <div>
      <div className="flex flex-col gap-4">
        {/* 성별 + 양력·음력 한 줄 */}
        <div className="grid grid-cols-2 gap-3">
          <fieldset>
            <legend className={legendCls}>성별</legend>
            <Toggle
              label="성별"
              value={form.gender}
              onChange={(gender) => set({ gender })}
              options={[
                { value: "남자", label: "남자" },
                { value: "여자", label: "여자" },
              ]}
            />
          </fieldset>
          <fieldset>
            <legend className={legendCls}>생년월일</legend>
            <Toggle
              label="양력 음력"
              value={form.calendar}
              onChange={(calendar) => set({ calendar, leap: calendar === "lunar" ? form.leap : false })}
              options={[
                { value: "solar", label: "양력" },
                { value: "lunar", label: "음력" },
              ]}
            />
          </fieldset>
        </div>

        <div>
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            <select aria-label="년" className={selectCls} value={form.year ?? ""} onChange={(e) => set({ year: num(e.target.value) })}>
              <option value="">년</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select aria-label="월" className={selectCls} value={form.month ?? ""} onChange={(e) => set({ month: num(e.target.value) })}>
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <select aria-label="일" className={selectCls} value={form.day ?? ""} onChange={(e) => set({ day: num(e.target.value) })}>
              <option value="">일</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </div>
          {form.calendar === "lunar" && (
            <label className="mt-1 flex min-h-12 items-center gap-2.5 text-[16px]">
              <input type="checkbox" className="size-5 accent-[var(--c-blue)]" checked={form.leap} onChange={(e) => set({ leap: e.target.checked })} />
              윤달이에요
            </label>
          )}
        </div>

        {/* 태어난 시간 + 몰라요 버튼 */}
        <fieldset>
          <legend className={legendCls}>태어난 시간</legend>
          <div className="flex gap-2">
            <select
              aria-label="태어난 시간"
              className={`${selectCls} min-w-0 flex-1`}
              disabled={form.unknownHour}
              value={form.hourIndex ?? ""}
              onChange={(e) => set({ hourIndex: num(e.target.value) })}
            >
              <option value="">시간 선택</option>
              {HOURS.map((h, i) => (
                <option key={h.name} value={i}>
                  {h.name} ({h.range})
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={form.unknownHour}
              aria-label="태어난 시간을 몰라요"
              onClick={() => set({ unknownHour: !form.unknownHour })}
              className={`h-12 shrink-0 rounded-[12px] border-[1.5px] px-4 text-[16px] font-medium transition-colors ${
                form.unknownHour ? "border-blue bg-blue text-white" : "border-line text-text active:bg-surface"
              }`}
            >
              몰라요
            </button>
          </div>
        </fieldset>
      </div>

      {/* 하단 고정 영역 높이만큼 비워두기 */}
      <div aria-hidden className="h-[190px]" />

      {/* [다음] 하단 고정 */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg from-85% to-transparent pt-5">
        <div className="mx-auto max-w-[440px] px-4 pb-[max(env(safe-area-inset-bottom),8px)]">
          {error && (
            <p role="alert" className="mb-2 text-[14px] font-medium text-[#E5484D]">
              {error}
            </p>
          )}
          <PrimaryButton onClick={submit}>다음</PrimaryButton>
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 flex min-h-12 w-full items-center justify-center text-[15px] text-sub underline underline-offset-4"
          >
            건너뛰기 · 성향만으로 볼게요
          </button>
          <p className="text-center text-[12px] text-sub">입력한 정보는 이번 분석에만 쓰여요</p>
        </div>
      </div>
    </div>
  );
}

// ── [7] 결과 카드 ──
type Card = { title: string; lines: string[] };

/** 스트리밍 중인 텍스트를 "## 제목" 단위로 나눈다 */
export function parseCards(text: string): Card[] {
  const cards: Card[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      cards.push({ title: h[1].trim(), lines: [] });
    } else if (cards.length && line.trim()) {
      cards[cards.length - 1].lines.push(line.trim());
    }
  }
  return cards;
}

export function ResultCards({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3">
      {parseCards(text).map((c, i) => {
        const answer = c.title === "나답의 답";
        const items = c.lines.filter((l) => /^[-•]\s+/.test(l));
        const paras = c.lines.filter((l) => !/^[-•]\s+/.test(l));
        return (
          <section key={i} className={`rounded-[16px] px-5 py-5 ${answer ? "bg-blue text-white" : "bg-surface"}`}>
            <h2 className={`mb-2 text-[14px] font-bold ${answer ? "text-white/80" : "text-blue"}`}>{c.title}</h2>
            {paras.map((p, j) => (
              <p key={j} className={answer ? "text-[19px] leading-[1.5] font-bold" : "text-[16px] leading-[1.7]"}>
                {p}
              </p>
            ))}
            {items.length > 0 && (
              <ul className="mt-1 flex flex-col gap-2">
                {items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-[16px] leading-[1.6]">
                    <span aria-hidden className={answer ? "text-white" : "text-blue"}>
                      •
                    </span>
                    <span>{it.replace(/^[-•]\s+/, "")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
