import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPracticesForAdmin } from "@/features/practices/server/practice-repository";
import { PracticeAdminList } from "@/features/practices/ui/admin/PracticeAdminList";

export default async function AdminPracticesPage() {
  const practices = await listPracticesForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Practices</h1>
        <Link href="/admin/practices/new">
          <Button>New practice</Button>
        </Link>
      </div>
      <Card>
        <PracticeAdminList practices={practices} />
      </Card>
    </div>
  );
}
