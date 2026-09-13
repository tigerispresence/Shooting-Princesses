/** Vercel에 실제로 배포된 게임만 여기에 둔다. 배포 후 URL이 살아 있는지 확인하고 추가할 것. */
export interface GameCard {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  url: string;
  /** Tailwind 그라데이션 클래스 — 카드 배경 */
  gradient: string;
  /** 버튼 글자색과 어울리는 진한 색 */
  accent: string;
}

export const GAMES: GameCard[] = [
  {
    id: "princess-shooters",
    title: "프린세스 슈터즈",
    subtitle: "동화 속 탈것을 타고 하늘을 지키는 반짝반짝 슈팅!",
    emoji: "👸",
    url: "https://02princess-shooters.vercel.app",
    gradient: "from-pink-300 via-fuchsia-300 to-purple-300",
    accent: "text-fuchsia-700",
  },
  {
    id: "flash-maze",
    title: "플래시 미로",
    subtitle: "5초 동안 미로를 외우고, 깜깜한 곳에서 탈출!",
    emoji: "🔦",
    url: "https://03flashmaze.vercel.app",
    gradient: "from-indigo-300 via-blue-300 to-cyan-300",
    accent: "text-indigo-700",
  },
  {
    id: "escape-room",
    title: "달빛 성 탈출",
    subtitle: "다섯 개의 방에 숨은 수수께끼를 풀고 성을 빠져나가자!",
    emoji: "🌙",
    url: "https://04escaperoom.vercel.app",
    gradient: "from-violet-300 via-purple-300 to-blue-300",
    accent: "text-violet-700",
  },
  {
    id: "school-zombie",
    title: "학교 좀비, 살아남자!",
    subtitle: "졸음 좀비를 피해 재료를 모아 해독제를 만들자!",
    emoji: "🧟",
    url: "https://06schoolzombieletssurvive.vercel.app",
    gradient: "from-lime-300 via-green-300 to-emerald-300",
    accent: "text-green-800",
  },
];
