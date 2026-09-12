"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VoteCodeCard() {
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
  );
}
