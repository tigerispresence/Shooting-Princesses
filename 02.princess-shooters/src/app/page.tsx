import GameCanvas from "./game/GameCanvas";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#1a0a2e]">
      <GameCanvas />
    </main>
  );
}
