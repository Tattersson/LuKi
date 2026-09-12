import { fetchRosters } from "@/features/games/server/roster-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = Number(searchParams.get("gameId"));
  const season = Number(searchParams.get("season"));

  if (!Number.isInteger(gameId) || !Number.isInteger(season)) {
    return Response.json({ error: "gameId and season must be integers" }, { status: 400 });
  }

  try {
    const rosters = await fetchRosters(gameId, season);
    return Response.json(rosters);
  } catch {
    return Response.json({ error: "Failed to fetch rosters" }, { status: 502 });
  }
}
