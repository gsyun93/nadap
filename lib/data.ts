// 고정 문구 전부 (기획서 5번 섹션 그대로)

export const Q1 = [
  "지금 하는 일, 계속해도 괜찮은 걸까?",
  "그 사람이랑 어떻게 해야 할까?",
  "나, 잘 살고 있는 걸까?",
] as const;

export const Q2: readonly (readonly string[])[] = [
  // 0 일
  [
    "딱히 싫진 않은데, 이대로 괜찮을까?",
    "다른 일을 해보고 싶은데 겁이 나",
    "사람 때문에 회사가 힘들어",
    "돈이 부족해서 고민이야",
  ],
  // 1 관계
  [
    "좋아하는데, 다가가도 될까?",
    "계속 만나는 게 맞는 걸까?",
    "자꾸 서운하고 부딪혀",
    "끝난 사이인데 자꾸 생각나",
  ],
  // 2 나
  [
    "뭘 하고 싶은지 모르겠어",
    "남들보다 뒤처진 것 같아",
    "나를 별로 좋아하지 않는 것 같아",
    "그냥 다 지치고 무기력해",
  ],
];

/** [2-1] 관계 묻기가 나오는 조건: Q1=1(관계) && Q2=2(자꾸 서운하고 부딪혀) */
export const REL_TRIGGER = { q1: 1, q2: 2 } as const;
export const REL = ["연인", "친구", "가족", "직장 사람"] as const;
/** 화면에 보이는 관계 보기 (대화체). 프롬프트에는 REL 값이 들어간다 */
export const REL_LABELS = ["사귀는 사이야", "친구야", "가족이야", "직장에서 만나는 사람이야"] as const;

export type MbtiType = { code: string; nick: string };
export const MBTI_GROUPS: readonly { label: string; types: readonly MbtiType[] }[] = [
  {
    label: "분석가형",
    types: [
      { code: "INTJ", nick: "계획적인 전략가" },
      { code: "INTP", nick: "호기심 많은 탐구자" },
      { code: "ENTJ", nick: "추진력 있는 리더" },
      { code: "ENTP", nick: "톡톡 튀는 발명가" },
    ],
  },
  {
    label: "외교관형",
    types: [
      { code: "INFJ", nick: "속 깊은 조언자" },
      { code: "INFP", nick: "마음 여린 몽상가" },
      { code: "ENFJ", nick: "다정한 선생님" },
      { code: "ENFP", nick: "밝은 분위기 메이커" },
    ],
  },
  {
    label: "관리자형",
    types: [
      { code: "ISTJ", nick: "믿음직한 원칙주의자" },
      { code: "ISFJ", nick: "묵묵한 수호자" },
      { code: "ESTJ", nick: "똑 부러진 해결사" },
      { code: "ESFJ", nick: "잘 챙기는 살림꾼" },
    ],
  },
  {
    label: "탐험가형",
    types: [
      { code: "ISTP", nick: "손재주 좋은 장인" },
      { code: "ISFP", nick: "조용한 예술가" },
      { code: "ESTP", nick: "일단 해보는 행동파" },
      { code: "ESFP", nick: "흥 많은 인싸" },
    ],
  },
];

export const MBTI_NICK: Record<string, string> = Object.fromEntries(
  MBTI_GROUPS.flatMap((g) => g.types.map((t) => [t.code, t.nick])),
);

/** MBTI를 모를 때 간단 질문 4개. 보기 순서대로 [첫 글자, 둘째 글자] */
export const MINI: readonly { q: string; options: readonly [string, string]; letters: readonly [string, string] }[] = [
  { q: "쉬는 날, 에너지는 어떻게 채워요?", options: ["사람들 만나면서 채워", "혼자 조용히 쉬면서 채워"], letters: ["E", "I"] },
  { q: "새로운 걸 배울 때 나는?", options: ["직접 해보면서 하나씩 익혀", "큰 그림부터 그려보고 시작해"], letters: ["S", "N"] },
  { q: "친구가 고민을 털어놓으면?", options: ["해결책부터 떠올라", "마음부터 같이 아파"], letters: ["T", "F"] },
  { q: "여행 갈 때 나는?", options: ["일정표부터 짜둬", "가서 그때그때 정해"], letters: ["J", "P"] },
];

export const AGES = ["10대", "20대 초반", "20대 후반", "30대", "40대", "50대 이상"] as const;
/** 화면에 보이는 나이대 보기 (대화체). 프롬프트와 요약 칩에는 AGES 값이 들어간다 */
export const AGE_LABELS = ["10대야", "20대 초반이야", "20대 후반이야", "30대야", "40대야", "50대 이상이야"] as const;

/** 12시진: 이름 / 표시 시간 / 계산용 시각 */
export const HOURS: readonly { name: string; range: string; hour: number }[] = [
  { name: "자시", range: "23:30~01:29", hour: 0 },
  { name: "축시", range: "01:30~03:29", hour: 2 },
  { name: "인시", range: "03:30~05:29", hour: 4 },
  { name: "묘시", range: "05:30~07:29", hour: 6 },
  { name: "진시", range: "07:30~09:29", hour: 8 },
  { name: "사시", range: "09:30~11:29", hour: 10 },
  { name: "오시", range: "11:30~13:29", hour: 12 },
  { name: "미시", range: "13:30~15:29", hour: 14 },
  { name: "신시", range: "15:30~17:29", hour: 16 },
  { name: "유시", range: "17:30~19:29", hour: 18 },
  { name: "술시", range: "19:30~21:29", hour: 20 },
  { name: "해시", range: "21:30~23:29", hour: 22 },
];

export type FixedQuestion = { question: string; options: string[]; focus: string };

/** 첫 번째 맞춤 질문 (가지별 고정). FIRST[q1][q2] */
export const FIRST: readonly (readonly FixedQuestion[])[] = [
  [
    { question: "이런 생각, 언제부터 자주 들었어요?", options: ["요즘 들어 부쩍 자주 들어", "몇 달째 계속 맴돌고 있어", "연차 쌓일수록 점점 더 들어", "입사 때부터 조금씩 있었어"], focus: "지금 상황" },
    { question: "해보고 싶은 일, 얼마나 구체적이에요?", options: ["딱 정해둔 일이 있어", "몇 가지 후보만 있어", "막연하게 다른 거면 좋겠어", "지금 일만 아니면 뭐든 괜찮아"], focus: "지금 상황" },
    { question: "누구 때문에 제일 힘들어요?", options: ["바로 위 상사 때문이야", "같이 일하는 동료 때문이야", "팀 분위기 전체가 힘들어", "회사 높은 사람들이 문제야"], focus: "지금 상황" },
    { question: "돈 고민, 어느 쪽이 제일 커요?", options: ["하는 일에 비해 월급이 적어", "나갈 돈이 너무 많아", "모아둔 게 없어서 불안해", "갚아야 할 돈이 있어"], focus: "지금 상황" },
  ],
  [
    { question: "그 사람과 지금 어느 정도 사이예요?", options: ["가끔 인사만 하는 사이야", "편하게 연락하는 사이야", "썸인지 헷갈리는 사이야", "아직 거의 모르는 사이야"], focus: "지금 상황" },
    { question: "이 생각, 언제부터 들기 시작했어요?", options: ["최근에 크게 다툰 뒤로 그래", "몇 달 전부터 조금씩 들었어", "처음부터 뭔가 걸렸어", "다른 사람이 신경 쓰이면서부터야"], focus: "지금 상황" },
    { question: "주로 어떤 일로 부딪혀요?", options: ["연락이나 표현 문제로 자주 싸워", "말투나 태도 때문에 부딪혀", "돈이나 생활 습관이 안 맞아", "나를 존중 안 하는 느낌이 들어"], focus: "지금 상황" },
    { question: "끝난 지 얼마나 됐어요?", options: ["끝난 지 한 달도 안 됐어", "벌써 몇 달 지났어", "1년 가까이 됐어", "1년도 훨씬 넘었어"], focus: "지금 상황" },
  ],
  [
    { question: "예전엔 하고 싶은 게 있었어요?", options: ["어릴 땐 꿈이 있었어", "있었는데 잊어버렸어", "원래부터 잘 몰랐어", "있긴 한데 현실적이지 않아"], focus: "지금 상황" },
    { question: "주로 누구랑 비교하게 돼요?", options: ["친구들이랑 자꾸 비교돼", "SNS 속 사람들이랑 비교해", "형제나 가족이랑 비교돼", "또래 전체랑 비교하게 돼"], focus: "지금 상황" },
    { question: "언제 그 마음이 제일 크게 들어요?", options: ["실수했을 때 제일 커져", "거울 볼 때 그런 마음이 들어", "남이랑 비교할 때 커져", "혼자 있을 때 더 심해져"], focus: "지금 상황" },
    { question: "이런 상태, 얼마나 됐어요?", options: ["요 며칠 사이에 그래", "몇 주째 계속 이래", "몇 달째 이러고 있어", "1년 넘게 이래"], focus: "지금 상황" },
  ],
];

/** Q1 또는 Q2를 직접 쓴 경우의 첫 질문 */
export const FIRST_CUSTOM: FixedQuestion = {
  question: "이런 생각, 언제부터 들었어요?",
  options: ["요 몇 주 사이에 갑자기 생겼어", "몇 달째 계속 맴돌고 있어", "1년 넘게 미뤄둔 생각이야", "기억 안 날 만큼 오래됐어"],
  focus: "지금 상황",
};

/** AI 호출이 실패했을 때만 쓰는 예비 질문 (순서대로) */
export const FALLBACK: readonly FixedQuestion[] = [
  { question: "이런 생각, 언제부터 들었어요?", options: ["요 몇 주 사이에 갑자기 생겼어", "몇 달째 계속 맴돌고 있어", "1년 넘게 미뤄둔 생각이야", "기억 안 날 만큼 오래됐어"], focus: "이 고민이 언제부터, 지금 어떤 상태인지" },
  { question: "요즘 이 생각을 하면 어떤 기분이에요?", options: ["답답하고 막막해", "불안해서 잠이 안 와", "그냥 무덤덤해", "조금 설레기도 해"], focus: "요즘 드는 감정" },
  { question: "제일 걸리는 건 뭐예요?", options: ["내가 뭘 원하는지 모르겠어", "남들 시선이 신경 쓰여", "잘못 고를까 봐 무서워", "지쳐서 생각할 힘이 없어"], focus: "가장 두려운 것" },
  { question: "주변 사람들은 뭐라고 해요?", options: ["다들 괜찮다고만 해", "말 꺼내본 적이 없어", "오히려 더 흔들리게 해", "응원해주는 사람이 있어"], focus: "주변 사람과 관계의 영향" },
  { question: "예전에도 비슷한 적 있었어요?", options: ["있었는데 그냥 버텼어", "있었고 결국 바꿨어", "이번이 처음이야", "자주 그래서 지쳤어"], focus: "예전에 비슷했던 경험" },
  { question: "어떻게 되면 마음이 놓일 것 같아요?", options: ["방향만이라도 보였으면 좋겠어", "누가 괜찮다고 말해줬으면 해", "작게라도 뭔가 바뀌었으면 해", "그냥 불안하지만 않으면 돼"], focus: "바라는 모습" },
  { question: "그런데 왜 아직 그대로예요?", options: ["뭘 해야 할지 몰라서 그래", "지금 가진 걸 잃을까 봐 겁나", "시간도 에너지도 없어서 그래", "혼자 정하기가 겁나서 그래"], focus: "알면서도 못 움직이는 이유" },
  { question: "이번 주에 하나만 바꿀 수 있다면?", options: ["생각 정리할 시간을 갖고 싶어", "누군가와 솔직하게 얘기해볼래", "작은 거 하나 시작해볼래", "일단 푹 쉬고 싶어"], focus: "당장 할 수 있는 작은 변화" },
];

/** AI가 참고할 질문 측면 목록 */
export const FOCUS = [
  "이 고민이 언제부터, 지금 어떤 상태인지",
  "요즘 드는 감정",
  "겉으로 말한 고민 밑의 진짜 이유",
  "주변 사람과 관계의 영향",
  "예전에 비슷했던 경험",
  "이미 해본 시도",
  "내가 가진 강점과 기댈 곳",
  "돈·시간·체력 같은 현실 조건",
  "가장 두려운 것",
  "내가 중요하게 여기는 가치",
  "바라는 모습",
  "결정할 때의 기준",
  "알면서도 못 움직이는 이유",
  "당장 할 수 있는 작은 변화",
] as const;

/** [6] 듣고 싶은 말: 보기 문구 / 결과 말투 지시 */
export const TONES: readonly { label: string; kind: string; instruction: string }[] = [
  { label: "괜찮아, 잘하고 있어", kind: "위로", instruction: "위로가 필요한 사람이야. 먼저 충분히 공감하고, 결론도 따뜻하게 전해." },
  { label: "이렇게 해봐", kind: "현실 조언", instruction: "현실 조언을 원해. 공감은 짧게, 구체적인 방법 위주로." },
  { label: "솔직하게 말해줘", kind: "냉정한 판단", instruction: "솔직한 판단을 원해. 돌려 말하지 말고 핵심을 짚되 무례하지 않게." },
];

/** 직접 쓰기 최대 글자 수 */
export const CUSTOM_MAX = 200;
