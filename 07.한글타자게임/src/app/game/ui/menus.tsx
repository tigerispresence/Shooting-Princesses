"use client";

import { useEffect, useRef, useState } from "react";
import { compose, isConsonant, isVowel } from "../hangul";
import { JARI_STAGES, WORD_LEVEL_NAMES, WORD_LISTS, jariStageKeys } from "../content";
import {
  AVATARS,
  FAMILY_MILESTONES,
  GOLDEN_UMBRELLA,
  HOUSES,
  MAX_PROFILES,
  NAME_MAX_CHARS,
  PROFILE_COLORS,
  RAIN_BACKGROUNDS,
  RAIN_LEVELS,
  STICKERS,
  TOTAL_STARS,
  UMBRELLAS,
} from "../constants";
import { playSfx } from "../audio";
import {
  buyItem,
  grantSticker,
  newProfile,
  ownsUmbrella,
  streakDays,
  todayFamilyKeys,
  totalStars,
  weekDays,
  wordWeeklyGain,
  type Avatar,
  type Profile,
} from "../progress";
import { drawCandy, drawHouse, drawJar, drawPpu, drawUmbrella, drawUmbrellaBuddy, starPath } from "../sprites";
import { AnimalFace, Art, Btn, Header, ScreenBg, SpeakerButton, StarRow, StickerArt, isSelect, useApp, useKeys, useMenuNav } from "./common";

// ---------------------------------------------------------------------------
// S1 프로필 선택
// ---------------------------------------------------------------------------

export function ProfileSelect() {
  const { save, commit, go } = useApp();
  const profiles = save.profiles;
  const canAdd = profiles.length < MAX_PROFILES;
  const count = profiles.length + (canAdd ? 1 : 0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const initial = Math.max(0, profiles.findIndex((p) => p.id === save.lastProfileId));
  const choose = (i: number) => {
    if (i < profiles.length) {
      const id = profiles[i].id;
      commit((d) => void (d.lastProfileId = id));
      go({ name: "menu" });
    } else go({ name: "create" });
  };
  const [focus, setFocus] = useMenuNav(count, count, choose, undefined, { initial, enabled: confirmId === null });
  useKeys((a) => {
    if (a.type === "escape") setConfirmId(null);
  }, confirmId !== null);

  return (
    <ScreenBg>
      <Art
        w={1280}
        h={720}
        animate
        className="absolute inset-0"
        draw={(ctx, t) => {
          for (let i = 0; i < 14; i++) {
            const x = (i * 97 + t * 20 * ((i % 3) + 1)) % 1340 - 30;
            const y = (i * 151) % 700;
            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = 0.35;
            drawCandy(ctx, (["ball", "lolli", "bear", "caramel"] as const)[i % 4], ["#8FD3FF", "#C9B6FF", "#9EF0D0", "#FFB3D1"][i % 4], 30);
            ctx.restore();
          }
        }}
      />
      <div className="absolute right-5 top-4">
        <SpeakerButton />
      </div>
      <div className="absolute left-0 right-0 top-[90px] text-center">
        <div className="title-wobble text-[72px] font-black tracking-tight text-[#FF6F91] drop-shadow-[0_4px_0_#fff]">타닥타닥 타자교실</div>
        <div className="mt-1 text-2xl font-bold text-[#8a6f98]">누가 칠까요? 친구를 골라요</div>
      </div>
      <div className="absolute left-0 right-0 top-[300px] flex justify-center gap-6">
        {profiles.map((p, i) => (
          <div
            key={p.id}
            onClick={() => {
              setFocus(i);
              choose(i);
            }}
            className={`relative flex w-[210px] cursor-pointer flex-col items-center rounded-[28px] bg-white px-4 pb-5 pt-6 shadow-[0_6px_0_#F0D7EA] transition-transform hover:scale-105 ${
              focus === i ? "scale-105 ring-[6px] ring-[#FF8FB8]" : ""
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmId(p.id);
              }}
              className="absolute right-3 top-2 rounded-lg px-2 text-xl font-black text-[#B9A9C6] hover:bg-[#F6EEF8] cursor-pointer"
              aria-label="프로필 지우기"
            >
              ···
            </button>
            <AnimalFace kind={p.avatar} size={110} color={p.color} />
            <div className="mt-2 text-3xl font-extrabold" style={{ color: PROFILE_COLORS[p.color] === "#FFE066" ? "#C9A100" : PROFILE_COLORS[p.color] }}>
              {p.name}
            </div>
            <div className="mt-1 text-lg font-bold text-[#8a6f98]">
              <span className="text-[#FFC93B]">★</span> {totalStars(p)} · 사탕 {p.candies}
            </div>
          </div>
        ))}
        {canAdd && (
          <div
            onClick={() => go({ name: "create" })}
            className={`flex w-[210px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-4 border-dashed border-[#E3C7E8] bg-white/70 text-[#B88CFF] transition-transform hover:scale-105 ${
              focus === profiles.length ? "scale-105 ring-[6px] ring-[#FF8FB8]" : ""
            }`}
            style={{ minHeight: 238 }}
          >
            <div className="text-6xl font-black">+</div>
            <div className="text-2xl font-extrabold">새 친구</div>
          </div>
        )}
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center text-lg font-bold text-[#B9A9C6]">← → 로 고르고 Enter</div>
      {confirmId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#5b4a6b]/40">
          <div className="overlay-pop flex w-[440px] flex-col items-center gap-5 rounded-[32px] bg-white p-8">
            <div className="text-3xl font-extrabold">정말 지울까요?</div>
            <div className="text-lg text-[#8a6f98]">{profiles.find((p) => p.id === confirmId)?.name}의 별과 스티커가 모두 없어져요</div>
            <div className="flex gap-4">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  const id = confirmId;
                  commit((d) => {
                    d.profiles = d.profiles.filter((p) => p.id !== id);
                    if (d.lastProfileId === id) d.lastProfileId = null;
                  });
                  setConfirmId(null);
                  setFocus(0);
                }}
                className="rounded-2xl bg-[#E9E4EE] px-7 py-3 text-xl font-bold text-[#8a6f98] cursor-pointer hover:bg-[#FFC2D1]"
              >
                지우기
              </button>
              <Btn big className="bg-[#FF8FB8]! text-white!" onClick={() => setConfirmId(null)}>
                아니요
              </Btn>
            </div>
          </div>
        </div>
      )}
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S2 프로필 만들기
// ---------------------------------------------------------------------------

export function ProfileCreate() {
  const { save, commit, go } = useApp();
  const [keys, setKeys] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<Avatar>(0);
  const [color, setColor] = useState<Avatar>(0);
  const [msg, setMsg] = useState("");
  const name = compose(keys);

  const create = () => {
    const n = name.trim();
    if (!n) return;
    if (save.profiles.some((p) => p.name === n)) {
      setMsg("이미 있는 이름이에요");
      playSfx("wrong");
      return;
    }
    const p = newProfile(n, avatar, color);
    commit((d) => {
      d.profiles.push(p);
      d.lastProfileId = p.id;
    });
    go({ name: "menu" });
  };

  useKeys((a) => {
    if (a.type === "escape") return go({ name: "profiles" });
    if (a.type === "enter") return create();
    if (a.type === "backspace") {
      setKeys((k) => k.slice(0, -1));
      setMsg("");
      return;
    }
    if (a.type === "arrow") {
      if (a.dir === "left") setAvatar((v) => ((v + 5) % 6) as Avatar);
      if (a.dir === "right") setAvatar((v) => ((v + 1) % 6) as Avatar);
      if (a.dir === "up") setColor((v) => ((v + 5) % 6) as Avatar);
      if (a.dir === "down") setColor((v) => ((v + 1) % 6) as Avatar);
      playSfx("click");
      return;
    }
    if (a.type === "key") {
      const j = a.key.jamo;
      if (!isConsonant(j) && !isVowel(j)) return;
      const next = [...keys, j];
      if (compose(next).length > NAME_MAX_CHARS) return;
      setKeys(next);
      setMsg("");
      playSfx("key");
    }
  });

  return (
    <ScreenBg>
      <Header title="새 친구 만들기" onBack={() => go({ name: "profiles" })} />
      <div className="absolute left-0 right-0 top-[100px] flex flex-col items-center">
        <div className="text-2xl font-bold text-[#8a6f98]">이름을 쳐요 (1~5글자)</div>
        <div className="mt-3 flex h-[84px] w-[460px] items-center justify-center rounded-full border-4 border-[#E3C7E8] bg-white text-5xl font-extrabold text-[#6b4f7a]">
          {name}
          <span className="caret ml-1 inline-block h-12 w-1 rounded bg-[#B88CFF]" />
        </div>
        <div className="mt-2 h-8 text-xl font-bold text-[#FF6F91]">{msg || (name ? "" : "키보드로 바로 쳐요. 한/영은 신경 쓰지 않아도 돼요!")}</div>

        <div className="mt-4 text-xl font-bold text-[#8a6f98]">동물 친구 (← →)</div>
        <div className="mt-2 flex gap-4">
          {AVATARS.map((nm, i) => (
            <div
              key={nm}
              onClick={() => setAvatar(i as Avatar)}
              className={`flex cursor-pointer flex-col items-center rounded-3xl bg-white p-2 transition-transform hover:scale-105 ${avatar === i ? "scale-110 ring-[5px] ring-[#FF8FB8]" : ""}`}
            >
              <AnimalFace kind={i} size={92} color={color} />
              <div className="text-base font-bold">{nm}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-xl font-bold text-[#8a6f98]">좋아하는 색 (↑ ↓)</div>
        <div className="mt-2 flex gap-4">
          {PROFILE_COLORS.map((c, i) => (
            <div
              key={c}
              onClick={() => setColor(i as Avatar)}
              className={`h-14 w-14 cursor-pointer rounded-full transition-transform hover:scale-110 ${color === i ? "scale-110 ring-[5px] ring-[#6b4f7a]/40" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="mt-8">
          <Btn big disabled={!name.trim()} className={name.trim() ? "bg-[#FF8FB8]! text-white!" : ""} onClick={create}>
            만들기 (Enter)
          </Btn>
        </div>
      </div>
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S3 메인 메뉴
// ---------------------------------------------------------------------------

function FamilyJar({ size = 70 }: { size?: number }) {
  const { save } = useApp();
  const next = FAMILY_MILESTONES.find((m) => save.familyCandies < m.at);
  const prev = [...FAMILY_MILESTONES].reverse().find((m) => save.familyCandies >= m.at)?.at ?? 0;
  const frac = next ? (save.familyCandies - prev) / (next.at - prev) : 1;
  return (
    <div className="flex items-center gap-2">
      <Art
        w={size}
        h={size}
        animate
        draw={(ctx, t) => {
          ctx.translate(size / 2, size / 2 + 2);
          drawJar(ctx, size * 0.92, frac, t);
        }}
      />
      <div className="leading-tight">
        <div className="text-sm font-bold text-[#8a6f98]">우리 집 사탕 병</div>
        <div className="text-2xl font-extrabold text-[#C46BFF]">{save.familyCandies.toLocaleString("ko-KR")}</div>
        {next && <div className="text-xs font-bold text-[#9d8aa8]">{next.name}까지 {(next.at - save.familyCandies).toLocaleString("ko-KR")}</div>}
      </div>
    </div>
  );
}

function ProfileBadge({ p }: { p: Profile }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-1.5 shadow-[0_3px_0_#F0D7EA]">
      <AnimalFace kind={p.avatar} size={44} color={p.color} />
      <div className="leading-tight">
        <div className="text-lg font-extrabold">{p.name}</div>
        <div className="text-sm font-bold text-[#8a6f98]">
          <span className="text-[#FFC93B]">★</span> {totalStars(p)} / {TOTAL_STARS} · 사탕 {p.candies}
        </div>
      </div>
    </div>
  );
}

export function MainMenu() {
  const { profile, go } = useApp();
  const items: { label: string; sub: string; color: string; go: () => void }[] = [
    { label: "자리연습", sub: "손가락 자리 익히기", color: "#FF8FB8", go: () => go({ name: "jariSelect" }) },
    { label: "낱말연습", sub: "낱말 15개", color: "#FFB86B", go: () => go({ name: "wordSelect" }) },
    { label: "짧은 글 연습", sub: "문장 5개", color: "#8EE6A0", go: () => go({ name: "practice", mode: "sentence", level: 0 }) },
    { label: "사탕비 마을", sub: "낱말 사탕을 받아요!", color: "#7CC8FF", go: () => go({ name: "rainSelect" }) },
    { label: "스티커북", sub: "", color: "#C9B6FF", go: () => go({ name: "stickers" }) },
    { label: "기록판", sub: "", color: "#C9B6FF", go: () => go({ name: "records" }) },
    { label: "꾸미기", sub: "", color: "#C9B6FF", go: () => go({ name: "shop" }) },
  ];
  const [focus, setFocus] = useMenuNav(items.length, 4, (i) => items[i].go(), () => go({ name: "profiles" }), { digits: true });
  if (!profile) return null;
  const unseen = profile.stickers.some((s) => !s.seen);
  const days = streakDays(profile);
  const week = weekDays();

  return (
    <ScreenBg>
      <Art
        w={1280}
        h={720}
        animate
        className="absolute inset-0"
        draw={(ctx, t) => {
          ctx.fillStyle = "#CDEFC0";
          ctx.fillRect(0, 620, 1280, 100);
          for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.translate(140 + i * 250, 676);
            drawHouse(ctx, profile.equipped.house, 130, { t });
            ctx.restore();
          }
          ctx.save();
          ctx.translate(1180, 560 + Math.sin(t * 2) * 4);
          drawUmbrellaBuddy(ctx, profile.avatar, profile.equipped.umbrella, 90, 1, t);
          ctx.restore();
        }}
      />
      <div className="absolute left-6 top-5 text-[44px] font-black text-[#FF6F91] drop-shadow-[0_3px_0_#fff]">타닥타닥 타자교실</div>
      <div className="absolute right-5 top-4 flex items-center gap-3">
        <FamilyJar size={58} />
        <ProfileBadge p={profile} />
        <SpeakerButton />
      </div>
      <div className="absolute left-6 top-[92px] flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2">
        <div className="text-lg font-extrabold text-[#FF6F91]">{days > 0 ? `${days}일째 연습 중!` : "오늘도 타닥타닥!"}</div>
        <div className="flex gap-1.5">
          {week.map((d, i) => (
            <div
              key={d}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                (profile.daily[d] ?? 0) > 0 ? "bg-[#FF8FB8] text-white" : "bg-[#F1E8F4] text-[#B9A9C6]"
              }`}
            >
              {"월화수목금토일"[i]}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-0 right-0 top-[170px] flex justify-center gap-6">
        {items.slice(0, 4).map((it, i) => (
          <button
            key={it.label}
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setFocus(i);
              playSfx("click");
              it.go();
            }}
            className={`flex h-[230px] w-[250px] cursor-pointer flex-col items-center justify-center rounded-[32px] text-white shadow-[0_8px_0_rgba(0,0,0,0.08)] transition-transform hover:scale-105 ${
              focus === i ? "scale-105 ring-[6px] ring-white" : ""
            }`}
            style={{ background: it.color }}
          >
            <div className="text-xl font-black opacity-70">{i + 1}</div>
            <MenuIcon i={i} />
            <div className="text-[32px] font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]">{it.label}</div>
            <div className="text-lg font-bold opacity-90">{it.sub}</div>
          </button>
        ))}
      </div>
      <div className="absolute left-0 right-0 top-[440px] flex justify-center gap-5">
        {items.slice(4).map((it, k) => {
          const i = k + 4;
          return (
            <div key={it.label} className="relative">
              <Btn big focused={focus === i} onClick={() => it.go()} className="min-w-[180px]">
                {it.label}
              </Btn>
              {i === 4 && unseen && <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-white bg-[#FF4F7B]" />}
            </div>
          );
        })}
      </div>
      <div className="absolute left-0 right-0 top-[520px] text-center text-base font-bold text-[#8a6f98]">
        화살표나 숫자 1~4로 고르고 Enter · Esc는 친구 바꾸기
      </div>
    </ScreenBg>
  );
}

function MenuIcon({ i }: { i: number }) {
  return (
    <Art
      w={80}
      h={70}
      draw={(ctx) => {
        ctx.translate(40, 38);
        if (i === 0) {
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.roundRect(-36 + k * 25, -14, 22, 22, 5);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#FF6F91";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("ㅁㄴㅇ"[k], -25 + k * 25, -2);
          }
        } else if (i === 1) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 30px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("나비", 0, 0);
        } else if (i === 2) {
          ctx.fillStyle = "#fff";
          for (let k = 0; k < 3; k++) ctx.fillRect(-30, -18 + k * 14, 60 - k * 14, 6);
        } else {
          drawCandy(ctx, "lolli", "#FFB3D1", 40);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// S4 자리연습 단계 선택
// ---------------------------------------------------------------------------

export function JariSelect() {
  const { profile, go } = useApp();
  const stars = profile?.stars.jari ?? [];
  const unlocked = (i: number) => i === 0 || (stars[i - 1] ?? 0) > 0;
  const firstOpen = Math.max(0, stars.findIndex((s, i) => s === 0 && unlocked(i)));
  const pick = (i: number) => {
    if (!unlocked(i)) return playSfx("wrong");
    go({ name: "practice", mode: "jari", level: i });
  };
  const [focus, setFocus] = useMenuNav(8, 4, pick, () => go({ name: "menu" }), { initial: firstOpen });
  return (
    <ScreenBg>
      <Header title="자리연습" onBack={() => go({ name: "menu" })} />
      <div className="absolute left-0 right-0 top-[110px] grid grid-cols-4 justify-items-center gap-6 px-16">
        {JARI_STAGES.map((st, i) => {
          const open = unlocked(i);
          const keys = jariStageKeys(i);
          return (
            <div
              key={i}
              onClick={() => {
                if (open) setFocus(i);
                pick(i);
              }}
              className={`relative flex h-[240px] w-[260px] flex-col items-center rounded-[28px] p-5 transition-transform ${
                open ? "cursor-pointer bg-white shadow-[0_6px_0_#F0D7EA] hover:scale-105" : "bg-[#EEE9F1] text-[#B9A9C6]"
              } ${focus === i ? "scale-105 ring-[6px] ring-[#FF8FB8]" : ""}`}
            >
              <div className="text-lg font-black text-[#FF8FB8]">{i + 1}단계</div>
              <div className="text-2xl font-extrabold">{st.name}</div>
              <div className="mt-3 flex min-h-[64px] flex-wrap justify-center gap-1.5">
                {keys.length ? (
                  keys.slice(0, 8).map((k) => (
                    <span key={k} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0F7] text-xl font-extrabold">
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-xl font-bold">모든 글쇠 복습</span>
                )}
              </div>
              <div className="mt-auto">{open ? <StarRow n={stars[i] ?? 0} size={30} /> : <Lock />}</div>
            </div>
          );
        })}
      </div>
    </ScreenBg>
  );
}

function Lock() {
  return (
    <Art
      w={34}
      h={34}
      draw={(ctx) => {
        ctx.translate(17, 19);
        ctx.strokeStyle = "#B9A9C6";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -4, 8, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = "#B9A9C6";
        ctx.beginPath();
        ctx.roundRect(-12, -4, 24, 18, 4);
        ctx.fill();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// S5 낱말연습 단계 선택
// ---------------------------------------------------------------------------

export function WordSelect() {
  const { profile, go } = useApp();
  const pick = (i: number) => go({ name: "practice", mode: "word", level: i });
  const [focus, setFocus] = useMenuNav(3, 3, pick, () => go({ name: "menu" }), { digits: true });
  const [samples] = useState(() => WORD_LISTS.map((l) => [...l].sort(() => Math.random() - 0.5).slice(0, 3)));
  const desc = ["받침 없는 낱말", "받침 있는 낱말", "쌍자음 · 겹받침"];
  return (
    <ScreenBg>
      <Header title="낱말연습" onBack={() => go({ name: "menu" })} />
      <div className="absolute left-0 right-0 top-[140px] flex justify-center gap-8">
        {WORD_LEVEL_NAMES.map((nm, i) => (
          <div
            key={nm}
            onClick={() => {
              setFocus(i);
              pick(i);
            }}
            className={`flex h-[400px] w-[320px] cursor-pointer flex-col items-center rounded-[32px] bg-white p-6 shadow-[0_6px_0_#F0D7EA] transition-transform hover:scale-105 ${
              focus === i ? "scale-105 ring-[6px] ring-[#FF8FB8]" : ""
            }`}
          >
            <div className="text-xl font-black text-[#FFB86B]">{i + 1}</div>
            <div className="text-4xl font-black">{nm}</div>
            <div className="mt-1 text-lg font-bold text-[#8a6f98]">{desc[i]}</div>
            <div className="mt-6 flex flex-col items-center gap-2 text-3xl font-extrabold text-[#6b4f7a]">
              {samples[i].map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="mt-auto text-lg font-bold">최고 {profile?.best.wordCpm[i] ?? 0}타</div>
            <StarRow n={profile?.stars.word[i] ?? 0} size={32} />
          </div>
        ))}
      </div>
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S8 사탕비 단계 선택
// ---------------------------------------------------------------------------

const PATH = RAIN_LEVELS.map((_, i) => {
  if (i < 6) return { x: 150 + i * 196, y: 250 + (i % 2) * 50 };
  const k = i - 6;
  return { x: 1130 - k * 196, y: 470 + (k % 2) * 50 };
});

export function RainSelect() {
  const { profile, commit, go, toast } = useApp();
  const stars = profile?.stars.rain ?? [];
  const unlocked = (i: number) => i === 0 || (stars[i - 1] ?? 0) > 0;
  const firstOpen = Math.max(0, stars.findIndex((s, i) => s === 0 && unlocked(i)));
  const [focus, setFocus] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [ppuHello, setPpuHello] = useState(false);
  const typed = useRef<string[]>([]);
  const pick = (i: number) => {
    if (!unlocked(i)) return playSfx("wrong");
    go({ name: "rain", level: i });
  };
  useKeys((a) => {
    if (a.type === "escape") return go({ name: "menu" });
    if (a.type === "arrow") {
      const d = a.dir === "left" || a.dir === "up" ? -1 : 1;
      setFocus((f) => Math.max(0, Math.min(11, f + d)));
      playSfx("click");
      return;
    }
    if (isSelect(a)) return pick(focus);
    if (a.type === "key") {
      typed.current = [...typed.current, a.key.jamo].slice(-4);
      if (typed.current.join("") === "ㅃㅜㅃㅜ") {
        typed.current = [];
        setPpuHello(true);
        playSfx("gold");
        if (profile) {
          let isNew = false;
          commit((d) => {
            isNew = grantSticker(d, profile.id, 25);
          });
          if (isNew) toast({ kind: "sticker", sticker: 25 });
        }
      }
    }
  });
  useEffect(() => {
    if (!ppuHello) return;
    const t = setTimeout(() => setPpuHello(false), 3500);
    return () => clearTimeout(t);
  }, [ppuHello]);

  const lv = RAIN_LEVELS[focus];
  return (
    <ScreenBg className="from-[#E6F4FF]! to-[#FFF0F7]!">
      <Art
        w={1280}
        h={720}
        animate
        className="absolute inset-0"
        draw={(ctx, t) => {
          // winding candy road
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.lineWidth = 46;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.setLineDash([22, 22]);
          ctx.lineDashOffset = -t * 20;
          ctx.lineWidth = 34;
          ctx.strokeStyle = "#FFD1E3";
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.save();
          ctx.translate(640, 120);
          drawPpu(ctx, ppuHello ? 260 : 170, { happy: ppuHello, t });
          ctx.restore();
          if (ppuHello) {
            ctx.font = "bold 24px sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#FF6F91";
            ctx.fillText("안녕! 나를 불렀어? 에취~ 고마워!", 640, 215);
          }
        }}
      />
      <Header title="사탕비 마을" onBack={() => go({ name: "menu" })} />
      {PATH.map((p, i) => {
        const open = unlocked(i);
        return (
          <div
            key={i}
            onClick={() => {
              setFocus(i);
              pick(i);
            }}
            className={`absolute flex cursor-pointer flex-col items-center transition-transform ${focus === i ? "scale-125" : "hover:scale-110"}`}
            style={{ left: p.x - 45, top: p.y - 45, width: 90 }}
          >
            <Art
              w={90}
              h={90}
              draw={(ctx) => {
                ctx.translate(45, 45);
                ctx.beginPath();
                ctx.arc(0, 0, 38, 0, Math.PI * 2);
                ctx.fillStyle = open ? ["#8FD3FF", "#C9B6FF", "#9EF0D0", "#FFB3D1"][i % 4] : "#DCD6E0";
                ctx.fill();
                ctx.lineWidth = focus === i ? 6 : 3;
                ctx.strokeStyle = "#fff";
                ctx.stroke();
                ctx.fillStyle = open ? "#fff" : "#A79DB3";
                ctx.font = "900 34px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(open ? String(i + 1) : "?", 0, 2);
              }}
            />
            {open && <StarRow n={stars[i] ?? 0} size={20} />}
          </div>
        );
      })}
      <div className="absolute bottom-6 left-1/2 flex w-[720px] -translate-x-1/2 items-center gap-5 rounded-3xl bg-white/90 px-6 py-3 shadow">
        <div className="text-3xl font-black text-[#7CC8FF]">{focus + 1}단계</div>
        <div>
          <div className="text-xl font-extrabold">{RAIN_BACKGROUNDS[lv.bg]}</div>
          <div className="text-base font-bold text-[#8a6f98]">
            {lv.feature} · 사탕 {lv.goal}개 받기
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm font-bold text-[#9d8aa8]">내 최고 점수</div>
          <div className="text-2xl font-extrabold text-[#FF6F91]">{(profile?.best.rainScore[focus] ?? 0).toLocaleString("ko-KR")}</div>
        </div>
        <Btn big disabled={!unlocked(focus)} className={unlocked(focus) ? "bg-[#7CC8FF]! text-white!" : ""} onClick={() => pick(focus)}>
          {unlocked(focus) ? "시작 (Enter)" : "잠겨 있어요"}
        </Btn>
      </div>
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S12 스티커북
// ---------------------------------------------------------------------------

export function StickerBook() {
  const { profile, commit, go } = useApp();
  useKeys((a) => {
    if (a.type === "escape") go({ name: "menu" });
  });
  useEffect(() => {
    if (!profile || !profile.stickers.some((s) => !s.seen)) return;
    const id = profile.id;
    commit((d) => {
      const p = d.profiles.find((x) => x.id === id);
      p?.stickers.forEach((s) => (s.seen = true));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!profile) return null;
  const have = new Set(profile.stickers.map((s) => s.id));
  return (
    <ScreenBg>
      <Header title={`스티커북 ${have.size} / ${STICKERS.length}`} onBack={() => go({ name: "menu" })} />
      <div className="absolute left-0 right-0 top-[84px] grid grid-cols-7 justify-items-center gap-x-3 gap-y-3 px-10">
        {STICKERS.map((st) => {
          const ok = have.has(st.id);
          return (
            <div key={st.id} className="flex w-[160px] flex-col items-center rounded-2xl bg-white/80 px-2 py-2" style={{ height: 150 }}>
              <StickerArt id={st.id} size={78} earned={ok} hidden={st.hidden} />
              <div className={`mt-1 text-center text-base font-extrabold ${ok ? "text-[#6b4f7a]" : "text-[#B9A9C6]"}`}>{ok || !st.hidden ? st.name : "?"}</div>
              {!ok && <div className="text-center text-xs font-bold leading-tight text-[#B9A9C6]">{st.hint}</div>}
            </div>
          );
        })}
      </div>
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S13 기록판
// ---------------------------------------------------------------------------

export function RecordBoard() {
  const { save, go } = useApp();
  useKeys((a) => {
    if (a.type === "escape") go({ name: "menu" });
  });
  return (
    <ScreenBg>
      <Header title="기록판" onBack={() => go({ name: "menu" })} />
      <div className="absolute left-1/2 top-[80px] flex -translate-x-1/2 items-center gap-10 rounded-3xl bg-white/90 px-8 py-3 shadow">
        <FamilyJar size={90} />
        <div className="text-2xl font-extrabold text-[#6b4f7a]">
          오늘 우리 집 타닥타닥: <span className="text-[#FF6F91]">{todayFamilyKeys(save).toLocaleString("ko-KR")}타</span>
        </div>
      </div>
      <div className="absolute left-0 right-0 top-[230px] flex justify-center gap-5">
        {save.profiles.map((p) => {
          const gain = wordWeeklyGain(p);
          return (
            <div key={p.id} className="flex w-[270px] flex-col items-center rounded-[28px] bg-white p-5 shadow-[0_6px_0_#F0D7EA]">
              <AnimalFace kind={p.avatar} size={84} color={p.color} />
              <div className="text-3xl font-extrabold">{p.name}</div>
              <div className="mt-2 grid w-full grid-cols-2 gap-y-1 text-lg font-bold">
                <div className="text-[#8a6f98]">낱말 최고</div>
                <div className="text-right">{Math.max(...p.best.wordCpm)}타</div>
                <div className="text-[#8a6f98]">짧은 글 최고</div>
                <div className="text-right">{p.best.sentenceCpm}타</div>
                <div className="text-[#8a6f98]">사탕비</div>
                <div className="text-right">{p.best.rainLevel}단계</div>
                <div className="text-[#8a6f98]">별</div>
                <div className="text-right">★ {totalStars(p)}</div>
                <div className="text-[#8a6f98]">스티커</div>
                <div className="text-right">{p.stickers.length}개</div>
                <div className="text-[#8a6f98]">연속</div>
                <div className="text-right">{streakDays(p)}일</div>
              </div>
              <div className="mt-3 rounded-full bg-[#FFF0F7] px-4 py-1.5 text-base font-extrabold text-[#FF6F91]">
                {gain !== null && gain > 0 ? `이번 주에 늘었어요 +${gain}타` : "이번 주도 화이팅!"}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenBg>
  );
}

// ---------------------------------------------------------------------------
// S14 꾸미기
// ---------------------------------------------------------------------------

export function Shop() {
  const { save, profile, commit, go, toast } = useApp();
  const [tab, setTab] = useState<"umbrella" | "house">("umbrella");
  const [ask, setAsk] = useState<number | null>(null);
  const goldUnlocked = save.familyCandies >= FAMILY_MILESTONES[3].at;
  const list = tab === "umbrella" ? UMBRELLAS.map((u, i) => ({ ...u, i })).filter((u) => u.i !== GOLDEN_UMBRELLA || goldUnlocked) : HOUSES.map((h, i) => ({ ...h, i }));

  const owns = (i: number) => (profile ? (tab === "umbrella" ? ownsUmbrella(save, profile, i) : profile.owned.house.includes(i)) : false);
  const equip = (i: number) => {
    if (!profile) return;
    commit((d) => {
      const p = d.profiles.find((x) => x.id === profile.id);
      if (p) p.equipped[tab] = i;
    });
  };
  const choose = (k: number) => {
    const it = list[k];
    if (!it) return;
    if (owns(it.i)) equip(it.i);
    else setAsk(it.i);
  };
  const buy = () => {
    if (!profile || ask === null) return;
    const price = (tab === "umbrella" ? UMBRELLAS : HOUSES)[ask].price;
    if (profile.candies < price) return;
    let st: number[] = [];
    commit((d) => {
      st = buyItem(d, profile.id, tab, ask);
    });
    playSfx("levelup");
    st.forEach((id) => toast({ kind: "sticker", sticker: id }));
    setAsk(null);
  };
  const [focus, setFocus] = useMenuNav(list.length, 4, choose, () => go({ name: "menu" }), { enabled: ask === null });
  useKeys((a) => {
    if (ask !== null) {
      if (a.type === "escape") setAsk(null);
      else if (a.type === "enter") buy();
      return;
    }
    if (a.type === "digit" && (a.n === 1 || a.n === 2)) {
      setTab(a.n === 1 ? "umbrella" : "house");
      setFocus(0);
    }
  });
  if (!profile) return null;
  const askItem = ask !== null ? (tab === "umbrella" ? UMBRELLAS : HOUSES)[ask] : null;
  const lack = askItem ? askItem.price - profile.candies : 0;

  return (
    <ScreenBg>
      <Header
        title="꾸미기"
        onBack={() => go({ name: "menu" })}
        right={<div className="rounded-2xl bg-white px-4 py-1.5 text-xl font-extrabold text-[#C46BFF]">사탕 {profile.candies}개</div>}
      />
      <div className="absolute left-8 top-[90px] flex h-[580px] w-[400px] flex-col items-center rounded-[32px] bg-white/90 p-4 shadow">
        <div className="text-xl font-extrabold text-[#8a6f98]">미리 보기</div>
        <Art
          w={360}
          h={500}
          animate
          draw={(ctx, t) => {
            ctx.fillStyle = "#D8F3CF";
            ctx.fillRect(0, 400, 360, 100);
            ctx.save();
            ctx.translate(130, 420);
            drawHouse(ctx, profile.equipped.house, 200, { t });
            ctx.restore();
            ctx.save();
            ctx.translate(285, 300 + Math.sin(t * 2) * 4);
            drawUmbrellaBuddy(ctx, profile.avatar, profile.equipped.umbrella, 120, 1, t);
            ctx.restore();
          }}
        />
      </div>
      <div className="absolute left-[460px] right-8 top-[90px]">
        <div className="mb-4 flex gap-3">
          {(["umbrella", "house"] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              tabIndex={-1}
              onClick={() => {
                setTab(t);
                setFocus(0);
              }}
              className={`rounded-2xl px-6 py-2 text-xl font-extrabold cursor-pointer ${tab === t ? "bg-[#FF8FB8] text-white" : "bg-white text-[#8a6f98]"}`}
            >
              {i + 1} {t === "umbrella" ? "우산" : "쿠키 집"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {list.map((it, k) => {
            const own = owns(it.i);
            const eq = profile.equipped[tab] === it.i;
            return (
              <div
                key={it.i}
                onClick={() => {
                  setFocus(k);
                  choose(k);
                }}
                className={`flex h-[230px] cursor-pointer flex-col items-center rounded-3xl bg-white p-3 shadow-[0_5px_0_#F0D7EA] transition-transform hover:scale-105 ${
                  focus === k ? "scale-105 ring-[5px] ring-[#FF8FB8]" : ""
                }`}
              >
                <Art
                  w={150}
                  h={130}
                  draw={(ctx, t) => {
                    if (tab === "umbrella") {
                      ctx.translate(75, 75);
                      drawUmbrella(ctx, it.i, 120, 1, t);
                    } else {
                      ctx.translate(75, 120);
                      drawHouse(ctx, it.i, 120);
                    }
                  }}
                />
                <div className="text-lg font-extrabold">{it.name}</div>
                <div className={`mt-auto text-base font-bold ${eq ? "text-[#3aa86b]" : own ? "text-[#8a6f98]" : "text-[#C46BFF]"}`}>
                  {eq ? "쓰고 있어요" : own ? "가졌어요" : `사탕 ${it.price}개`}
                </div>
              </div>
            );
          })}
        </div>
        {tab === "umbrella" && !goldUnlocked && (
          <div className="mt-4 flex items-center gap-2 text-base font-bold text-[#9d8aa8]">
            <Art
              w={28}
              h={28}
              draw={(ctx) => {
                ctx.translate(14, 14);
                starPath(ctx, 12);
                ctx.fillStyle = "#FFD43B";
                ctx.fill();
              }}
            />
            우리 집 사탕 병이 6,000개가 되면 모두에게 금빛 우산이 생겨요!
          </div>
        )}
      </div>
      {askItem && ask !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#5b4a6b]/40">
          <div className="overlay-pop flex w-[480px] flex-col items-center gap-4 rounded-[32px] bg-white p-8">
            <Art
              w={160}
              h={140}
              draw={(ctx, t) => {
                if (tab === "umbrella") {
                  ctx.translate(80, 80);
                  drawUmbrella(ctx, ask, 130, 1, t);
                } else {
                  ctx.translate(80, 130);
                  drawHouse(ctx, ask, 130);
                }
              }}
            />
            <div className="text-2xl font-extrabold">{askItem.name}</div>
            {lack > 0 ? (
              <>
                <div className="text-xl font-bold text-[#C46BFF]">사탕 {lack}개 더 모으면 돼요!</div>
                <div className="flex gap-3">
                  <Btn big disabled>
                    살래요
                  </Btn>
                  <Btn big className="bg-[#FF8FB8]! text-white!" onClick={() => setAsk(null)}>
                    알겠어요
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold">사탕 {askItem.price}개로 살까요?</div>
                <div className="flex gap-3">
                  <Btn big className="bg-[#FF8FB8]! text-white!" onClick={buy}>
                    살래요 (Enter)
                  </Btn>
                  <Btn big onClick={() => setAsk(null)}>
                    아니요 (Esc)
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ScreenBg>
  );
}

