import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listElections } from "@/features/voting/server/election-repository";
import { ElectionList } from "@/features/voting/ui/admin/ElectionList";

export default async function AdminHomePage() {
  const elections = await listElections();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Elections</h1>
        <Link href="/admin/elections/new">
          <Button>New election</Button>
        </Link>
      </div>
      <Card>
        <ElectionList elections={elections} />
      </Card>
    </div>
  );
}
