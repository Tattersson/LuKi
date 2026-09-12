/** "Lastname F." - the compact display form used wherever a roster of players is
 *  shown (e.g. RSVP lists), not their full name. */
export function playerDisplayName(player: { firstName: string; lastName: string }): string {
  const initial = player.firstName.trim().charAt(0).toUpperCase();
  return `${player.lastName.trim()} ${initial}.`;
}
