import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getPracticeById } from "@/features/practices/server/practice-repository";
import { PracticeForm } from "@/features/practices/ui/admin/PracticeForm";

export default async function EditPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practice = await getPracticeById(id);

  if (!practice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit practice</h1>
      <Card>
        <PracticeForm practice={practice} />
      </Card>
    </div>
  );
}
