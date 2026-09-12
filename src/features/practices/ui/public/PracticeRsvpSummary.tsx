import { Button } from "@/components/ui/button";

/**
 * Placeholder for the goalkeeper/player IN-OUT breakdown described in the practices
 * feature request. There's no member login yet, so nobody can actually RSVP - this
 * renders the real (currently always-empty) shape rather than fabricating numbers, with
 * a disabled call to action. Once Keycloak member login lands, replace the static
 * zeros with rsvp-repository.ts's getRsvpSummary(practiceId) and enable the button.
 */
export function PracticeRsvpSummary() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
      <span>Goalies IN: 0 · OUT: 0</span>
      <span>Players IN: 0 · OUT: 0</span>
      <Button
        type="button"
        variant="secondary"
        className="px-2 py-0.5 text-xs"
        disabled
        title="Member sign-in is coming soon"
      >
        Sign in to RSVP
      </Button>
    </div>
  );
}
