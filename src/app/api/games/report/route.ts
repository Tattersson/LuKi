import { fetchFullGameReport } from "@/features/games/server/game-report-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = Number(searchParams.get("gameId"));
  const season = Number(searchParams.get("season"));

  if (!Number.isInteger(gameId) || !Number.isInteger(season)) {
    return Response.json({ error: "gameId and season must be integers" }, { status: 400 });
  }

  try {
    const report = await fetchFullGameReport(gameId, season);
    return Response.json(report);
  } catch {
    return Response.json({ error: "Failed to fetch game report" }, { status: 502 });
  }
}
