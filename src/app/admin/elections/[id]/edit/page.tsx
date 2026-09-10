import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getElectionForAdmin } from "@/features/voting/server/election-repository";
import { ElectionForm } from "@/features/voting/ui/admin/ElectionForm";

export default async function EditElectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const election = await getElectionForAdmin(id);

  if (!election) {
    notFound();
  }
  if (election.status !== "DRAFT") {
    redirect(`/admin/elections/${id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit election</h1>
      <Card>
        <ElectionForm election={election} />
      </Card>
    </div>
  );
}
