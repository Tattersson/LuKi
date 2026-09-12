import { searchLocations } from "@/features/practices/server/location-search-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  try {
    const suggestions = await searchLocations(q);
    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
