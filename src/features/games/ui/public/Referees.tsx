import { Card } from "@/components/ui/card";

export function Referees({ referees }: { referees: Array<{ role: string; name: string }> }) {
  if (referees.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-1 text-sm font-medium text-neutral-500">Referees</h2>
      <p className="text-sm">{referees.map((referee) => referee.name).join(", ")}</p>
    </Card>
  );
}
