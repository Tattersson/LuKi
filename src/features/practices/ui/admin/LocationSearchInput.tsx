"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { LocationSuggestion } from "../../domain/types";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

/** Debounced address/rink-name autocomplete backed by the Photon API (proxied through
 *  /api/practices/location-search, see that route and location-search-client.ts). Free
 *  typing without picking a suggestion is allowed - locationLat/locationLng just stay
 *  unset in that case. */
export function LocationSearchInput({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/practices/location-search?q=${encodeURIComponent(value)}`);
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search for a rink or address"
        required
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-300 bg-white text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                // Prevent the input's onBlur (which closes this list) from firing before
                // the click below is registered.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(suggestion);
                  setOpen(false);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
