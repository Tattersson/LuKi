import { Alert } from "@/components/ui/alert";

export function AlreadyVotedNotice() {
  return (
    <Alert variant="info">
      This email has already been used to vote in this election. Only one vote per
      person is allowed.
    </Alert>
  );
}
