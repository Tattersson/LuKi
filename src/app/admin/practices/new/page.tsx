import { Card } from "@/components/ui/card";
import { PracticeForm } from "@/features/practices/ui/admin/PracticeForm";

export default function NewPracticePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New practice</h1>
      <Card>
        <PracticeForm />
      </Card>
    </div>
  );
}
