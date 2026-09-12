"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function EmailStep({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (email: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email);
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Your email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <p className="mt-1 text-xs text-neutral-500">
          We&apos;ll send you a one-time code to confirm this is your email before
          creating your player card.
        </p>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  );
}
