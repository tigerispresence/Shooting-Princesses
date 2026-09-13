import { GAMES } from "./games";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-4 py-10 sm:py-14">
      <header className="mb-8 text-center sm:mb-12">
        <div className="float mb-3 text-6xl sm:text-7xl" aria-hidden>
          🎮
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-fuchsia-700 sm:text-5xl">
          서연 서정 게임방
        </h1>
        <p className="mt-3 text-base text-purple-800/80 sm:text-lg">
          오늘은 어떤 게임 할까? 하나 골라봐!
        </p>
      </header>

      <ul className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {GAMES.map((g) => (
          <li key={g.id}>
            <a
              href={g.url}
              className={`group flex h-full flex-col rounded-3xl bg-gradient-to-br ${g.gradient} p-5 shadow-lg shadow-purple-200/60 ring-4 ring-white/70 transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] sm:p-6`}
            >
              <div className="mb-3 text-5xl drop-shadow-sm transition-transform group-hover:scale-110 sm:text-6xl">
                {g.emoji}
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
                {g.title}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-snug text-slate-700 sm:text-base">
                {g.subtitle}
              </p>
              <span
                className={`mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold ${g.accent} shadow-sm`}
              >
                놀러가기 ▶
              </span>
            </a>
          </li>
        ))}
      </ul>

      <footer className="mt-12 text-center text-xs text-purple-700/50">
        서연이랑 서정이를 위해 만든 게임들 💜
      </footer>
    </main>
  );
}
