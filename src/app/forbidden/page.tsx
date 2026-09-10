import { Alert } from "@/components/ui/alert";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Alert variant="error">
        Your account is signed in but doesn&apos;t have access to the admin area.
        Contact an administrator if you believe this is a mistake.
      </Alert>
    </main>
  );
}
