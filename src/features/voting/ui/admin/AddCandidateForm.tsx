"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { addCandidateAction } from "../../server/actions";

export function AddCandidateForm({ electionId }: { electionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await addCandidateAction({
      electionId,
      name,
      description: description || undefined,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setDescription("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Add candidate
      </Button>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <Input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Candidate name"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Note (optional)"
        />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add candidate"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
