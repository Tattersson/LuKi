import { listUpcomingPractices } from "@/features/practices/server/practice-repository";
import { PracticesSection } from "@/features/practices/ui/public/PracticesSection";
import type { Practice } from "@/features/practices/domain/types";

async function getUpcomingPracticesOrEmpty(): Promise<Practice[]> {
  try {
    return await listUpcomingPractices();
  } catch {
    return [];
  }
}

export default async function PracticesPage() {
  const practices = await getUpcomingPracticesOrEmpty();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PracticesSection practices={practices} />
    </main>
  );
}
