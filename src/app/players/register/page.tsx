import { Card } from "@/components/ui/card";
import { RegisterFlow } from "@/features/players/ui/public/RegisterFlow";

export default function PlayerRegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Create your player card</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Verify your email, then fill in your details.
        </p>
        <RegisterFlow />
      </Card>
    </main>
  );
}
