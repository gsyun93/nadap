// 나답 로고 컴포넌트 (글자 로고 / 앱 아이콘)
// SVG 경로는 기획서 3번 섹션 그대로 사용

const FONT = "'IBM Plex Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

/** 앱 아이콘: 블루 둥근 사각형 + "나" 딥블루 말풍선 + "답" 흰 말풍선 */
export function AppIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="나답"
    >
      <rect width="120" height="120" rx="28" fill="#1E5BFF" />
      <path
        d="M24 8 H54 A16 16 0 0 1 70 24 V46 A16 16 0 0 1 54 62 H30 L16 74 L20 61 A16 16 0 0 1 8 46 V24 A16 16 0 0 1 24 8 Z"
        fill="#0E2B85"
      />
      <text
        x="34"
        y="34"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="700"
        fontSize="27"
        fill="#FFFFFF"
        fontFamily={FONT}
      >
        나
      </text>
      <path
        d="M58 44 H96 A18 18 0 0 1 114 62 V90 A18 18 0 0 1 96 108 H94 L100 118 L82 108 H58 A18 18 0 0 1 40 90 V62 A18 18 0 0 1 58 44 Z"
        fill="#FFFFFF"
        stroke="#1E5BFF"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text
        x="77"
        y="76"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="700"
        fontSize="37"
        fill="#1E5BFF"
        fontFamily={FONT}
      >
        답
      </text>
    </svg>
  );
}

/** 글자 로고 심볼: 물음표 말풍선 + 체크 말풍선 (답 말풍선 테두리는 배경색) */
export function LogoSymbol({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M26 12 H56 A18 18 0 0 1 74 30 V44 A18 18 0 0 1 56 62 H34 L20 74 L24 62 H26 A18 18 0 0 1 8 44 V30 A18 18 0 0 1 26 12 Z"
        className="fill-deep"
      />
      <path
        d="M34 30 A7 7 0 1 1 44 36.5 Q41 38 41 42"
        className="stroke-on-deep"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="41" cy="50" r="2.8" className="fill-on-deep" />
      <path
        d="M62 50 H94 A18 18 0 0 1 112 68 V84 A18 18 0 0 1 94 102 H92 L98 114 L80 102 H62 A18 18 0 0 1 44 84 V68 A18 18 0 0 1 62 50 Z"
        className="fill-blue stroke-bg"
        strokeWidth="5"
      />
      <path
        d="M65 76 L74 85 L91 68"
        stroke="#FFFFFF"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 글자 로고: 심볼 + "나답" ("나" 딥블루, "답" 블루) */
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label="나답">
      <LogoSymbol size={size} />
      <span className="font-bold leading-none tracking-tight" style={{ fontSize: size * 0.72 }}>
        <span className="text-deep">나</span>
        <span className="text-blue">답</span>
      </span>
    </div>
  );
}
