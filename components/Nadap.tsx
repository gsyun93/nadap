"use client";
// 시작 화면 + 상담 흐름 전체
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AGES,
  FALLBACK,
  FIRST,
  FIRST_CUSTOM,
  MINI,
  Q1,
  Q2,
  REL,
  TONES,
  type FixedQuestion,
} from "@/lib/data";
import { fixedCount, limitsFromFixed, needsRel, progressPercent, shouldFinish } from "@/lib/flow";
import { answerText, buildQuestionPrompt, concernText, mindText } from "@/lib/prompts";
import { calcAge, calcSaju, type BirthInput } from "@/lib/saju";
import { branchKey, loadBranch, TREE_DEPTH, treeFocus } from "@/lib/tree";
import type { Answer, GeneratedQuestion, Profile, QA } from "@/lib/types";
import { Logo } from "./Logo";
import { BirthFormScreen, EMPTY_BIRTH_FORM, MbtiGrid, ResultCards, type BirthForm } from "./screens";
import { ChoiceList, Header, PrimaryButton, QuestionSkeleton, QuestionTitle } from "./ui";

type Screen =
  | { t: "start" }
  | { t: "q1" }
  | { t: "q2" }
  | { t: "rel" }
  | { t: "mbti" }
  | { t: "mini"; i: number }
  | { t: "birth" }
  | { t: "age" }
  | { t: "custom"; i: number }
  | { t: "tone" }
  | { t: "result" };

/** node: 질문 트리에서 꺼낸 질문이면 그 노드 id */
type CustomItem = { q: GeneratedQuestion; fallback: boolean; ans: Answer | null; node?: string };

type State = {
  q1: Answer | null;
  q2: Answer | null;
  rel: number | null;
  mbti: { code: string; estimated: boolean } | null;
  mini: (0 | 1 | null)[];
  birthForm: BirthForm;
  birth: BirthInput | null;
  skipped: boolean;
  ageBand: number | null;
  custom: CustomItem[];
  tone: number | null;
};

const INITIAL: State = {
  q1: null,
  q2: null,
  rel: null,
  mbti: null,
  mini: [null, null, null, null],
  birthForm: EMPTY_BIRTH_FORM,
  birth: null,
  skipped: false,
  ageBand: null,
  custom: [],
  tone: null,
};

class RateLimitError extends Error {}
/** 한 번에 4개 만들기가 실패했거나 그 보기 자리가 비어 있음 → 1개씩 다시 요청 */
class PrefetchMiss extends Error {}

const sameAnswer = (a: Answer | null, b: Answer | null) => JSON.stringify(a) === JSON.stringify(b);
const asFixed = (f: FixedQuestion, last = false): GeneratedQuestion => ({ ...f, options: [...f.options], last });

function toProfile(s: State): Profile | null {
  if (!s.q1) return null;
  return { q1: s.q1, q2: s.q1.kind === "option" ? s.q2 : null, rel: s.rel, mbti: s.mbti, birth: s.birth, ageBand: s.ageBand };
}

/** 맞춤 질문 0..upto(포함)까지의 Q/A */
function historyOf(custom: CustomItem[], upto: number): QA[] {
  return custom.slice(0, upto + 1).map((c) => ({
    question: c.q.question,
    answer: c.ans ? answerText(c.ans, c.q.options) : "",
    focus: c.q.focus,
  }));
}

/** 진행률 계산용 고정 질문 수 (아직 안 정해진 부분은 기본 흐름으로 가정) */
function estimateFixed(s: State, screen: Screen): number {
  const q1 = s.q1 ?? { kind: "option" as const, index: 0 };
  const inMini = screen.t === "mini" || !!s.mbti?.estimated;
  return fixedCount({
    q1,
    q2: s.q2,
    rel: needsRel({ q1, q2: s.q2 }) ? 0 : null,
    mbti: inMini ? { code: "", estimated: true } : null,
    birth: s.skipped ? null : ({} as BirthInput),
    ageBand: null,
  });
}

export default function Nadap() {
  const [stack, setStack] = useState<Screen[]>([{ t: "start" }]);
  const [s, setS] = useState<State>(INITIAL);
  const screen = stack[stack.length - 1];

  // 요청 토큰: 화면이 바뀐 뒤 늦게 도착한 응답이 현재 화면을 덮어쓰지 않게
  const navToken = useRef(0);
  // 질문 캐시 (키 = 프롬프트 전체 문자열)
  const cache = useRef(new Map<string, Promise<GeneratedQuestion>>());
  // 호출 한도(429)에 걸리면 미리 만들기를 끈다
  const prefetchOff = useRef(false);

  const push = useCallback((sc: Screen) => {
    navToken.current++;
    setStack((st) => [...st, sc]);
  }, []);
  const back = useCallback(() => {
    navToken.current++;
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  }, []);

  // 화면 전환 시 맨 위로
  const screenKey = JSON.stringify(screen) + stack.length;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screenKey]);

  // ── 질문 요청 ──
  const requestQuestion = useCallback(
    (profile: Profile, history: QA[], prefetch: boolean): Promise<GeneratedQuestion> | null => {
      const key = buildQuestionPrompt(profile, history);
      const hit = cache.current.get(key);
      if (hit) return hit;
      if (prefetch && prefetchOff.current) return null;
      const p = fetch("/api/question", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, history }),
      }).then(async (r) => {
        if (r.status === 429) {
          prefetchOff.current = true;
          throw new RateLimitError();
        }
        if (!r.ok) throw new Error(`question ${r.status}`);
        return (await r.json()) as GeneratedQuestion;
      });
      cache.current.set(key, p);
      // 실패한 요청은 캐시에서 지워 다음에 다시 시도할 수 있게
      p.catch(() => {
        if (cache.current.get(key) === p) cache.current.delete(key);
      });
      return p;
    },
    [],
  );

  const profile = useMemo(() => toProfile(s), [s]);
  const limits = useMemo(() => (profile ? limitsFromFixed(fixedCount(profile)) : { min: 8, max: 12 }), [profile]);

  /**
   * 보기 4개 각각을 골랐을 때의 다음 질문을 AI 호출 1번으로 한꺼번에 미리 만든다.
   * 결과는 보기별로 나눠 캐시에 넣어서(키 = 그 보기를 골랐을 때의 프롬프트 전체 문자열), 고르는 순간 바로 꺼내 쓴다.
   */
  const prefetchBatch = useCallback((profile: Profile, base: QA[], cur: GeneratedQuestion) => {
    if (prefetchOff.current) return;
    const missing = cur.options
      .map((opt, i) => ({
        i,
        key: buildQuestionPrompt(profile, [...base, { question: cur.question, answer: opt, focus: cur.focus }]),
      }))
      .filter(({ key }) => !cache.current.has(key));
    if (missing.length === 0) return;

    const batch = fetch("/api/question", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile,
        history: base,
        current: { question: cur.question, options: cur.options, focus: cur.focus },
      }),
    }).then(async (r) => {
      if (r.status === 429) prefetchOff.current = true;
      if (!r.ok) throw new PrefetchMiss();
      return ((await r.json()) as { questions: (GeneratedQuestion | null)[] }).questions;
    });

    for (const { i, key } of missing) {
      const p = batch.then(
        (list) => {
          const q = list?.[i];
          if (!q) throw new PrefetchMiss();
          return q;
        },
        () => {
          throw new PrefetchMiss();
        },
      );
      cache.current.set(key, p);
      // 실패하면 캐시에서 지워, 그 보기를 고를 때 1개씩 다시 요청하게
      p.catch(() => {
        if (cache.current.get(key) === p) cache.current.delete(key);
      });
    }
  }, []);

  // 질문이 화면에 뜨는 순간, 보기 4개 각각을 골랐을 때의 다음 질문을 미리 요청 (호출 1번)
  useEffect(() => {
    if (screen.t !== "custom" || !profile) return;
    const item = s.custom[screen.i];
    if (!item) return;
    if (shouldFinish(screen.i, item.q.last, limits, item.fallback)) return;
    if (item.node && screen.i + 1 < TREE_DEPTH) return; // 다음 질문은 트리에서 꺼낸다
    prefetchBatch(profile, historyOf(s.custom, screen.i - 1), item.q);
  }, [screen, s.custom, profile, limits, prefetchBatch]);

  /** 맞춤 질문 i번째 다음 질문을 AI로 만든다 (실패하면 예비 질문) */
  const fillNextFromAI = useCallback(
    (state: State, i: number, token: number) => {
      const p = toProfile(state);
      if (!p) return;
      const history = historyOf(state.custom, i);
      const usedTexts = new Set(state.custom.map((c) => c.q.question));

      const applyFallback = () => {
        if (navToken.current !== token) return;
        // 첫 예비 질문("언제부터")은 고정 첫 질문과 겹치므로 건너뛴다
        const fb = FALLBACK.slice(1).find((f) => !usedTexts.has(f.question));
        if (!fb) {
          // 예비 질문도 다 썼으면 마지막 질문으로
          navToken.current++;
          setStack((st) => [...st.slice(0, -1), { t: "tone" }]);
          return;
        }
        setS((cur) => ({ ...cur, custom: [...cur.custom.slice(0, i + 1), { q: asFixed(fb), fallback: true, ans: null }] }));
      };

      // 호출 한도(429)면 잠깐 기다렸다가 최대 3번 다시 시도, 그래도 안 되면 예비 질문
      const attempt = (n: number) => {
        const req = requestQuestion(p, history, false);
        if (!req) return applyFallback();
        req.then(
          (q) => {
            if (navToken.current !== token) return;
            setS((cur) => ({ ...cur, custom: [...cur.custom.slice(0, i + 1), { q, fallback: false, ans: null }] }));
          },
          (err) => {
            if (navToken.current !== token) return;
            // 미리 만들기가 비었으면 이 보기 하나만 바로 다시 요청
            if (err instanceof PrefetchMiss) return attempt(n);
            if (err instanceof RateLimitError && n < 3) {
              setTimeout(() => navToken.current === token && attempt(n + 1), 2500 * (n + 1));
            } else applyFallback();
          },
        );
      };
      attempt(0);
    },
    [requestQuestion],
  );

  /** 맞춤 질문 i번째 다음 질문을 준비해서 i+1 화면으로 */
  const goNextCustom = useCallback(
    (state: State, i: number) => {
      push({ t: "custom", i: i + 1 });
      if (state.custom[i + 1]) return; // 이미 만들어져 있음 (뒤로 갔다가 같은 답)
      const token = navToken.current;
      const item = state.custom[i];

      // 1~4번째는 질문 트리에서 꺼낸다 (보기로 답했을 때만, 직접 쓰면 그다음부터 AI)
      const key = branchKey(state.q1, state.q2);
      const nodeId = item?.node;
      if (key && nodeId && item.ans?.kind === "option" && i + 1 < TREE_DEPTH) {
        const ansIndex = item.ans.index;
        loadBranch(key).then(
          (branch) => {
            if (navToken.current !== token) return;
            const childId = branch.nodes[nodeId]?.n?.[ansIndex];
            const child = childId ? branch.nodes[childId] : undefined;
            if (!childId || !child) return fillNextFromAI(state, i, token);
            const q: GeneratedQuestion = { question: child.q, options: child.o, focus: treeFocus(i + 1), last: false };
            setS((cur) => ({
              ...cur,
              custom: [...cur.custom.slice(0, i + 1), { q, fallback: false, ans: null, node: childId }],
            }));
          },
          () => fillNextFromAI(state, i, token),
        );
        return;
      }
      fillNextFromAI(state, i, token);
    },
    [push, fillNextFromAI],
  );

  // ── 답 처리 ──
  /** 앞 단계 답이 바뀌면 맞춤 질문 전체 초기화 */
  const resetCustom = (st: State): State => ({ ...st, custom: [], tone: null });

  const answerQ1 = (a: Answer) => {
    let next = s;
    if (!sameAnswer(s.q1, a)) next = resetCustom({ ...s, q1: a, q2: null, rel: null });
    setS(next);
    push(a.kind === "option" ? { t: "q2" } : { t: "mbti" });
  };

  const answerQ2 = (a: Answer) => {
    let next = s;
    if (!sameAnswer(s.q2, a)) next = resetCustom({ ...s, q2: a, rel: null });
    setS(next);
    // 고른 갈래의 질문 트리를 미리 불러둔다 (MBTI·생년월일 고르는 동안 받아짐)
    const key = branchKey(next.q1, a);
    if (key) loadBranch(key).catch(() => {});
    push(needsRel({ q1: next.q1!, q2: a }) ? { t: "rel" } : { t: "mbti" });
  };

  const answerRel = (a: Answer) => {
    if (a.kind !== "option") return;
    setS(s.rel === a.index ? s : resetCustom({ ...s, rel: a.index }));
    push({ t: "mbti" });
  };

  const answerMbti = (code: string) => {
    const same = s.mbti?.code === code && !s.mbti.estimated;
    setS(same ? s : resetCustom({ ...s, mbti: { code, estimated: false } }));
    push({ t: "birth" });
  };

  const answerMini = (i: number, a: Answer) => {
    if (a.kind !== "option") return;
    const mini = [...s.mini];
    mini[i] = a.index as 0 | 1;
    let next: State = { ...s, mini };
    if (s.mini[i] !== a.index) next = resetCustom(next);
    if (i < MINI.length - 1) {
      setS(next);
      push({ t: "mini", i: i + 1 });
      return;
    }
    const code = MINI.map((m, k) => m.letters[mini[k] ?? 0]).join("");
    if (!(s.mbti?.code === code && s.mbti.estimated)) next = resetCustom({ ...next, mbti: { code, estimated: true } });
    setS(next);
    push({ t: "birth" });
  };

  const startCustom = (state: State) => {
    let st = state;
    if (st.custom.length === 0 && st.q1) {
      const first =
        st.q1.kind === "custom" || st.q2?.kind !== "option" ? FIRST_CUSTOM : FIRST[st.q1.index][st.q2.index];
      const key = branchKey(st.q1, st.q2);
      st = { ...st, custom: [{ q: asFixed(first), fallback: false, ans: null, node: key ? `${key}-0` : undefined }] };
    }
    setS(st);
    push({ t: "custom", i: 0 });
  };

  const submitBirth = (b: BirthInput) => {
    const same = JSON.stringify(s.birth) === JSON.stringify(b) && !s.skipped;
    startCustom(same ? s : resetCustom({ ...s, birth: b, skipped: false, ageBand: null }));
  };

  const skipBirth = () => {
    setS(s.skipped ? s : resetCustom({ ...s, birth: null, skipped: true }));
    push({ t: "age" });
  };

  const answerAge = (a: Answer) => {
    if (a.kind !== "option") return;
    startCustom(s.ageBand === a.index ? s : resetCustom({ ...s, ageBand: a.index }));
  };

  const answerCustom = (i: number, a: Answer) => {
    const item = s.custom[i];
    if (!item) return;
    let custom = s.custom;
    let tone = s.tone;
    if (!sameAnswer(item.ans, a)) {
      // 다른 답을 고르면 그 뒤의 질문·답은 모두 지우고 다시 만든다
      custom = [...s.custom.slice(0, i), { ...item, ans: a }];
      tone = null;
    }
    const next = { ...s, custom, tone };
    setS(next);
    if (shouldFinish(i, item.q.last, limits, item.fallback)) push({ t: "tone" });
    else goNextCustom(next, i);
  };

  const answerTone = (a: Answer) => {
    if (a.kind !== "option") return;
    setS({ ...s, tone: a.index });
    push({ t: "result" });
  };

  const restart = () => {
    navToken.current++;
    cache.current.clear();
    prefetchOff.current = false;
    setS(INITIAL);
    setStack([{ t: "start" }]);
  };

  // ── 진행률 ──
  const percent = useMemo(() => {
    if (screen.t === "result") return 100;
    const f = estimateFixed(s, screen);
    const passed = Math.max(0, stack.length - 2);
    return progressPercent(passed, f, s.custom.length, limitsFromFixed(f));
  }, [s, screen, stack.length]);

  // ── 화면 ──
  if (screen.t === "start") return <StartScreen onStart={() => push({ t: "q1" })} />;

  const showBack = screen.t !== "q1" && screen.t !== "result";
  let body: React.ReactNode = null;

  switch (screen.t) {
    case "q1":
      body = (
        <>
          <QuestionTitle title="요즘 머릿속에 제일 많이 떠오르는 생각은?" />
          <ChoiceList options={Q1} selected={s.q1} onSelect={answerQ1} allowCustom />
        </>
      );
      break;
    case "q2": {
      const branch = s.q1?.kind === "option" ? s.q1.index : 0;
      body = (
        <>
          <QuestionTitle eyebrow={Q1[branch]} title="어떤 마음이 제일 커요?" />
          <ChoiceList options={Q2[branch]} selected={s.q2} onSelect={answerQ2} allowCustom />
        </>
      );
      break;
    }
    case "rel":
      body = (
        <>
          <QuestionTitle eyebrow="자꾸 서운하고 부딪혀" title="그 사람은 나한테 어떤 사람이에요?" />
          <ChoiceList
            options={REL}
            selected={s.rel === null ? null : { kind: "option", index: s.rel }}
            onSelect={answerRel}
          />
        </>
      );
      break;
    case "mbti":
      body = (
        <>
          <QuestionTitle eyebrow="성향" title="나는 어떤 사람에 가까워요?" />
          <MbtiGrid
            selected={s.mbti && !s.mbti.estimated ? s.mbti.code : null}
            onSelect={answerMbti}
            onUnknown={() => push({ t: "mini", i: 0 })}
          />
        </>
      );
      break;
    case "mini": {
      const m = MINI[screen.i];
      const sel = s.mini[screen.i];
      body = (
        <>
          <QuestionTitle eyebrow="성향 찾기" title={m.q} />
          <ChoiceList
            options={m.options}
            selected={sel === null ? null : { kind: "option", index: sel }}
            onSelect={(a) => answerMini(screen.i, a)}
          />
        </>
      );
      break;
    }
    case "birth":
      body = (
        <>
          <QuestionTitle eyebrow="사주" title="태어난 날을 알려주면 더 정확해져요" sub="사주까지 함께 볼 수 있어요" />
          <BirthFormScreen
            form={s.birthForm}
            onChange={(birthForm) => setS((cur) => ({ ...cur, birthForm }))}
            onSubmit={submitBirth}
            onSkip={skipBirth}
          />
        </>
      );
      break;
    case "age":
      body = (
        <>
          <QuestionTitle eyebrow="나이대" title="나이대만 알려줄래요?" sub="나잇대에 맞춰 질문을 골라줄게요" />
          <ChoiceList
            options={AGES}
            selected={s.ageBand === null ? null : { kind: "option", index: s.ageBand }}
            onSelect={answerAge}
          />
        </>
      );
      break;
    case "custom": {
      const item = s.custom[screen.i];
      body = item ? (
        <>
          <QuestionTitle title={item.q.question} />
          <ChoiceList
            options={item.q.options}
            selected={item.ans}
            onSelect={(a) => answerCustom(screen.i, a)}
            allowCustom
          />
        </>
      ) : (
        <QuestionSkeleton />
      );
      break;
    }
    case "tone":
      body = (
        <>
          <QuestionTitle eyebrow="마지막 질문" title="지금 제일 듣고 싶은 말은?" />
          <ChoiceList
            options={TONES.map((t) => t.label)}
            subLabels={TONES.map((t) => t.kind)}
            selected={s.tone === null ? null : { kind: "option", index: s.tone }}
            onSelect={answerTone}
          />
        </>
      );
      break;
    case "result":
      body = profile && s.tone !== null && (
        <ResultScreen
          profile={profile}
          history={historyOf(s.custom, s.custom.length - 1).filter((h) => h.answer)}
          tone={s.tone}
          usedFallback={s.custom.some((c) => c.fallback)}
          onRestart={restart}
        />
      );
      break;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header percent={percent} onBack={back} showBack={showBack} />
      {/* key: 화면이 바뀔 때마다 보기 눌림 상태 등을 새로 시작 */}
      <main key={screenKey} className="flex-1 px-4 pt-6 pb-[max(env(safe-area-inset-bottom),32px)]">
        {body}
      </main>
    </div>
  );
}

// ── [0] 시작 화면 ──
function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col px-4 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo size={72} />
        <h1 className="mt-10 text-[28px] font-bold text-balance">나를 찾는 답</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-sub">
          고민 하나를 고르면
          <br />
          나에게 맞춘 질문이 이어져요
          <br />
          성향과 사주까지 반영해 답을 찾아드려요
        </p>
      </div>
      <PrimaryButton onClick={onStart}>앱 설치 없이 바로 시작하기</PrimaryButton>
      <footer className="mt-5 flex justify-center gap-4 text-[12px] text-sub">
        <Link href="/terms" className="py-2">
          이용약관
        </Link>
        <Link href="/privacy" className="py-2">
          개인정보처리방침
        </Link>
      </footer>
    </main>
  );
}

// ── [7] 결과 화면 ──
function ResultScreen({
  profile,
  history,
  tone,
  usedFallback,
  onRestart,
}: {
  profile: Profile;
  history: QA[];
  tone: number;
  usedFallback: boolean;
  onRestart: () => void;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"loading" | "streaming" | "done" | "rate" | "error">("loading");
  const [sample, setSample] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let acc = "";
    (async () => {
      try {
        const r = await fetch("/api/result", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile, history, tone }),
          signal: ctrl.signal,
        });
        if (r.status === 429) return setStatus("rate");
        if (!r.ok || !r.body) return setStatus("error");
        setSample(r.headers.get("x-nadap-sample") === "1");
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setText(acc);
          setStatus("streaming");
        }
        setStatus(acc.trim() ? "done" : "error");
      } catch {
        if (!ctrl.signal.aborted) setStatus("error"); // 중간에 끊겨도 받은 데까지는 남긴다
      }
    })();
    return () => ctrl.abort();
    // 다시 시도할 때만 새로 요청
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = () => {
    setText("");
    setStatus("loading");
    setAttempt((a) => a + 1);
  };

  const chips: string[] = [concernText(profile)];
  const mind = mindText(profile);
  if (mind) chips.push(mind);
  if (profile.mbti) chips.push(profile.mbti.code);
  if (profile.birth) {
    const saju = calcSaju(profile.birth);
    chips.push(`일간 ${saju.dayGanLabel}`);
    chips.push(`${calcAge(saju.solar).korean}세`);
  } else if (profile.ageBand !== null) {
    chips.push(AGES[profile.ageBand]);
  }

  return (
    <div>
      <QuestionTitle eyebrow="나답의 답" title="당신의 이야기를 정리했어요" />
      <div className="-mt-3 mb-6 flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <span key={i} className="rounded-full bg-surface px-3 py-1.5 text-[13px] text-sub">
            {c}
          </span>
        ))}
      </div>
      {usedFallback && (
        <p className="mb-3 rounded-[12px] border border-line px-4 py-3 text-[13px] text-sub">
          AI 연결이 안 돼서 일부는 예시 질문으로 진행했어요.
        </p>
      )}
      {sample && (
        <p className="mb-3 rounded-[12px] border border-line px-4 py-3 text-[13px] text-sub">
          결과용 AI 키가 없어서 예시 결과를 보여드려요.
        </p>
      )}
      {status === "loading" && (
        <div className="rounded-[16px] bg-surface px-5 py-8 text-center text-[15px] text-sub" aria-busy="true">
          답을 정리하고 있어요… 길면 30초쯤 걸려요
        </div>
      )}
      <ResultCards text={text} />
      {(status === "rate" || status === "error") && (
        <div className="mt-4 rounded-[16px] border border-line px-5 py-5 text-center" role="alert">
          <p className="text-[15px]">
            {status === "rate" ? "지금 요청이 많아요. 잠시 뒤 다시 해볼래요?" : "결과를 만들다 문제가 생겼어요. 다시 시도해주세요."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 h-12 rounded-[12px] border-[1.5px] border-blue px-6 text-[16px] font-bold text-blue active:bg-surface"
          >
            다시 시도
          </button>
        </div>
      )}
      <div className="mt-8">
        <PrimaryButton onClick={onRestart}>
          처음부터 다시 하기
        </PrimaryButton>
      </div>
    </div>
  );
}
