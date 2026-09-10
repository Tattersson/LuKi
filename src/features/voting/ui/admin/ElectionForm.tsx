"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { createElectionAction } from "../../server/actions";

type CandidateInput = { name: string; description: string };

export function ElectionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    { name: "", description: "" },
    { name: "", description: "" },
  ]);
  const [closesAt, setClosesAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCandidate(index: number, field: keyof CandidateInput, value: string) {
    setCandidates((current) =>
      current.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addCandidate() {
    setCandidates((current) => [...current, { name: "", description: "" }]);
  }

  function removeCandidate(index: number) {
    setCandidates((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await createElectionAction({
      title,
      description: description || undefined,
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      candidates: candidates
        .filter((c) => c.name.trim())
        .map((c) => ({ name: c.name, description: c.description || undefined })),
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/elections/${result.data.id}`);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Team Captain Q3 2026"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description (optional)
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium">Candidates</span>
        <p className="mb-2 text-xs text-neutral-500">
          The same roster is eligible for both Captain and Vice-Captain.
        </p>
        <div className="space-y-3">
          {candidates.map((candidate, index) => (
            <div key={index} className="flex gap-2">
              <Input
                required
                value={candidate.name}
                onChange={(e) => updateCandidate(index, "name", e.target.value)}
                placeholder={`Candidate ${index + 1} name`}
              />
              <Input
                value={candidate.description}
                onChange={(e) => updateCandidate(index, "description", e.target.value)}
                placeholder="Note (optional)"
              />
              {candidates.length > 2 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeCandidate(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addCandidate} className="mt-3">
          Add candidate
        </Button>
      </div>

      <div>
        <label htmlFor="closesAt" className="mb-1 block text-sm font-medium">
          Voting closes at (optional)
        </label>
        <Input
          id="closesAt"
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="w-64"
        />
        <p className="mt-1 text-xs text-neutral-500">
          The election closes automatically at this time and every voter is emailed the
          results. Leave blank to close it manually instead.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create election"}
      </Button>
    </form>
  );
}
