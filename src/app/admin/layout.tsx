import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/rbac";
import { signOut } from "@/lib/auth/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            Voting admin
          </Link>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{session.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button type="submit" className="underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
