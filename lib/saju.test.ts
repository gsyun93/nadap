import { describe, expect, it } from "vitest";
import { BirthError, calcAge, calcSaju, type BirthInput } from "./saju";

const base: BirthInput = {
  gender: "남자",
  calendar: "solar",
  year: 1993,
  month: 5,
  day: 17,
  leap: false,
  hourIndex: 7, // 미시 → 14시
};

describe("사주 계산", () => {
  it("양력 1993-05-17 14시 → 癸酉 丁巳 戊戌 己未, 일간 戊", () => {
    const r = calcSaju(base);
    expect(r.pillars).toEqual({ year: "癸酉", month: "丁巳", day: "戊戌", time: "己未" });
    expect(r.dayGan).toBe("戊");
    expect(r.dayGanLabel).toBe("무(토)");
    expect(r.text).toBe("년주 계유, 월주 정사, 일주 무술, 시주 기미 / 일간 무(토) / 오행 목0 화2 토4 금1 수1");
  });

  it("출생시간 모름이면 시주를 빼고 오행에도 넣지 않는다", () => {
    const r = calcSaju({ ...base, hourIndex: null });
    expect(r.pillars.time).toBeNull();
    expect(r.text).toBe("년주 계유, 월주 정사, 일주 무술 / 일간 무(토) / 오행 목0 화2 토2 금1 수1 / 출생시간 모름");
  });

  it("달력에 없는 양력 날짜는 오류", () => {
    expect(() => calcSaju({ ...base, month: 2, day: 30 })).toThrow(BirthError);
    expect(() => calcSaju({ ...base, year: 2001, month: 4, day: 31 })).toThrow(BirthError);
  });

  it("음력에 없는 날짜·윤달은 오류", () => {
    expect(() => calcSaju({ ...base, calendar: "lunar", year: 2020, month: 5, day: 10, leap: true })).toThrow(BirthError);
    expect(() => calcSaju({ ...base, calendar: "lunar", year: 2020, month: 4, day: 30, leap: true })).toThrow(BirthError);
  });

  it("음력 → 양력 변환", () => {
    const r = calcSaju({ ...base, calendar: "lunar", year: 2020, month: 4, day: 10, leap: true });
    expect(r.solar).toEqual({ year: 2020, month: 6, day: 1 });
  });
});

describe("나이 계산", () => {
  it("2026년에 1993년생 → 한국 나이 34세", () => {
    const age = calcAge({ year: 1993, month: 5, day: 17 }, { year: 2026, month: 10, day: 11 });
    expect(age.korean).toBe(34);
    expect(age.full).toBe(33);
    expect(age.text).toBe("34세 (한국 나이, 만 33세)");
  });

  it("생일 전이면 만 나이가 하나 적다", () => {
    const age = calcAge({ year: 1993, month: 5, day: 17 }, { year: 2026, month: 5, day: 16 });
    expect(age.korean).toBe(34);
    expect(age.full).toBe(32);
  });
});
