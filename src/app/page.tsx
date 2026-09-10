"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleVoteCodeSubmit(e: FormEvent) {
    e.preventDefault();
    const slug = code.trim();
    if (slug) {
      router.push(`/vote/${encodeURIComponent(slug)}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">LuKi</h1>
        <p className="mt-2 text-sm text-neutral-500">Internal team tools.</p>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-medium">Do you have a code to vote?</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Paste the code from your voting link below, or open the link directly.
        </p>
        <form className="flex gap-2" onSubmit={handleVoteCodeSubmit}>
          <Input
            aria-label="Voting code"
            placeholder="e.g. demo-team-captain"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit">Go</Button>
        </form>
      </Card>

      <Card className="text-center">
        <h2 className="mb-2 text-sm font-medium">Logging in?</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Team admins can sign in to manage elections and view results.
        </p>
        <Link href="/admin">
          <Button variant="secondary" className="w-full">
            Admin login
          </Button>
        </Link>
      </Card>
    </main>
  );
}
