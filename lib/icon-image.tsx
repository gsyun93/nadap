// 앱 아이콘 PNG 생성 (apple-touch-icon, manifest 아이콘용)
// 말풍선은 SVG 이미지로, "나"/"답" 글자는 IBM Plex Sans KR 700으로 그린다.
import { ImageResponse } from "next/og";

const BUBBLES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<rect width="120" height="120" rx="28" fill="#1E5BFF"/>
<path d="M24 8 H54 A16 16 0 0 1 70 24 V46 A16 16 0 0 1 54 62 H30 L16 74 L20 61 A16 16 0 0 1 8 46 V24 A16 16 0 0 1 24 8 Z" fill="#0E2B85"/>
<path d="M58 44 H96 A18 18 0 0 1 114 62 V90 A18 18 0 0 1 96 108 H94 L100 118 L82 108 H58 A18 18 0 0 1 40 90 V62 A18 18 0 0 1 58 44 Z" fill="#FFFFFF" stroke="#1E5BFF" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

// "나답" 두 글자만 담은 작은 폰트 파일을 Google Fonts에서 받아온다 (빌드 시 1회)
async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@700&text=%EB%82%98%EB%8B%B5")
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

/** size×size 앱 아이콘 PNG. rounded=false면 모서리를 꽉 채운다(iOS가 알아서 둥글게 자름) */
export async function renderAppIcon(size: number, rounded = true) {
  const font = await loadFont();
  const s = size / 120;
  const svg = rounded ? BUBBLES_SVG : BUBBLES_SVG.replace('rx="28"', 'rx="0"');
  const letter = (ch: string, x: number, y: number, fs: number, color: string) => (
    <div
      style={{
        position: "absolute",
        left: (x - fs / 2) * s,
        top: (y - fs * 0.62) * s,
        width: fs * s,
        height: fs * 1.24 * s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fs * s,
        fontWeight: 700,
        color,
        fontFamily: "IBM Plex Sans KR",
      }}
    >
      {ch}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          width={size}
          height={size}
          alt=""
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        {letter("나", 34, 34, 27, "#FFFFFF")}
        {letter("답", 77, 76, 37, "#1E5BFF")}
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: font ? [{ name: "IBM Plex Sans KR", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
