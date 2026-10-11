// lunar-javascript 1.7.7에는 타입 정의가 없어서 쓰는 부분만 선언
declare module "lunar-javascript" {
  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getDayGan(): string;
  }
  export interface Lunar {
    getEightChar(): EightChar;
    getSolar(): Solar;
  }
  export interface Solar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
  }
  export const Solar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar;
  };
  export const Lunar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Lunar;
  };
  export interface LunarMonth {
    getDayCount(): number;
  }
  export const LunarMonth: {
    fromYm(y: number, m: number): LunarMonth | null;
  };
}
