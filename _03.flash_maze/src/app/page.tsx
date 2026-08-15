import GameCanvas from "./game/GameCanvas";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center py-2">
      <GameCanvas />
    </main>
  );
}
