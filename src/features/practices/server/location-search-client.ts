import { LOCATION_SEARCH_RESULT_LIMIT } from "../constants";
import type { LocationSuggestion } from "../domain/types";

const PHOTON_BASE_URL = "https://photon.komoot.io/api/";

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lon, lat]
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function labelFor(properties: PhotonFeature["properties"]): string {
  return [properties.name, properties.city, properties.state, properties.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

/** Proxied server-side (see api/practices/location-search/route.ts) so the external
 *  hostname stays out of client code and there's a single place to add caching/rate
 *  limiting later. No API key required - Photon (komoot.io) is a free, open service. */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(PHOTON_BASE_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", String(LOCATION_SEARCH_RESULT_LIMIT));

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return [];

  const data = (await response.json()) as PhotonResponse;
  return data.features
    .map((feature) => ({
      label: labelFor(feature.properties),
      lon: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
    }))
    .filter((suggestion) => suggestion.label.length > 0);
}
