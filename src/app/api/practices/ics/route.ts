import { practicesToICS } from "@/features/practices/domain/ics";
import { listUpcomingPracticesForFeed } from "@/features/practices/server/practice-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");

  if (team !== null && team !== "luki-2div" && team !== "luki-team") {
    return Response.json({ error: "team must be luki-2div or luki-team" }, { status: 400 });
  }

  try {
    const practices = await listUpcomingPracticesForFeed();
    const filtered = team ? practices.filter((practice) => practice.teamKey === team) : practices;

    // No Content-Disposition: attachment - this is a feed meant to be re-fetched by a
    // calendar client (or opened inline to inspect/copy the URL), not a one-off download.
    return new Response(practicesToICS(filtered), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch {
    return new Response("Failed to build calendar feed", { status: 502 });
  }
}
