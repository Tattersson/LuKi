import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getElectionForAdmin,
  getElectionResults,
} from "@/features/voting/server/election-repository";
import { ElectionStatusBadge } from "@/features/voting/ui/admin/ElectionStatusBadge";
import { OpenCloseControls } from "@/features/voting/ui/admin/OpenCloseControls";
import { ElectionResults } from "@/features/voting/ui/admin/ElectionResults";

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [election, results] = await Promise.all([
    getElectionForAdmin(id),
    getElectionResults(id),
  ]);

  if (!election || !results) {
    notFound();
  }

  const voteUrl = `${process.env.APP_BASE_URL ?? ""}/vote/${election.publicSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{election.title}</h1>
          <div className="mt-1">
            <ElectionStatusBadge status={election.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {election.status === "DRAFT" && (
            <Link href={`/admin/elections/${election.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          )}
          <OpenCloseControls electionId={election.id} status={election.status} />
        </div>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Shareable link</h2>
        <a href={voteUrl} className="break-all text-sm underline">
          {voteUrl}
        </a>
      </Card>

      {election.closesAt && (
        <Card>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Closes at</h2>
          <p className="text-sm">
            {election.closesAt.toLocaleString()}
            {election.status === "OPEN" &&
              " - voting will close automatically and results will be emailed to every voter."}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Candidates</h2>
        <p className="mb-2 text-xs text-neutral-500">
          Each voter picks one Captain and up to two Vice-Captains from this roster.
        </p>
        <ul className="space-y-1 text-sm">
          {election.candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.name}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Results</h2>
        <ElectionResults results={results} />
      </Card>
    </div>
  );
}
