import { Card } from "@/components/ui/card";
import { ElectionForm } from "@/features/voting/ui/admin/ElectionForm";

export default function NewElectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New election</h1>
      <Card>
        <ElectionForm />
      </Card>
    </div>
  );
}
