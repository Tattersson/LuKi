import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getPublicElectionBySlug } from "@/features/voting/server/election-repository";
import { VotingFlow } from "@/features/voting/ui/public/VotingFlow";

export default async function VotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const election = await getPublicElectionBySlug(slug);

  if (!election) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">{election.title}</h1>
        {election.description && (
          <p className="mb-4 text-sm text-neutral-500">{election.description}</p>
        )}

        {election.status === "DRAFT" && (
          <Alert variant="info">Voting hasn&apos;t opened for this election yet.</Alert>
        )}
        {election.status === "CLOSED" && (
          <Alert variant="info">Voting has closed for this election.</Alert>
        )}
        {election.status === "OPEN" && <VotingFlow election={election} />}
      </Card>
    </main>
  );
}
