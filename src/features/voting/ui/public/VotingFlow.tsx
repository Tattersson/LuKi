"use client";

import { useState } from "react";
import {
  requestOtpAction,
  resendOtpAction,
  verifyOtpAction,
  verifyOtpAndCastVoteAction,
} from "../../server/actions";
import type { PublicElectionView } from "../../domain/types";
import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";
import { VoteStep } from "./VoteStep";
import { AlreadyVotedNotice } from "./AlreadyVotedNotice";
import { ThankYouStep } from "./ThankYouStep";

type Step = "email" | "already-voted" | "otp" | "vote" | "done";

export function VotingFlow({ election }: { election: PublicElectionView }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleRequestOtp(submittedEmail: string) {
    setPending(true);
    setError(null);
    const result = await requestOtpAction({
      electionId: election.id,
      email: submittedEmail,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEmail(submittedEmail);
    if (result.data.alreadyVoted) {
      setStep("already-voted");
    } else {
      setStep("otp");
      startResendCooldown();
    }
  }

  async function handleResend() {
    setPending(true);
    setError(null);
    const result = await resendOtpAction({ electionId: election.id, email });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.retryAfterSeconds) {
        setResendCooldown(result.retryAfterSeconds);
      }
      return;
    }
    startResendCooldown();
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function handleVerifyOtp(submittedOtpCode: string) {
    setPending(true);
    setError(null);
    const result = await verifyOtpAction({
      electionId: election.id,
      email,
      otpCode: submittedOtpCode,
    });
    setPending(false);

    if (!result.ok) {
      setError(
        result.attemptsRemaining !== undefined
          ? `${result.error} (${result.attemptsRemaining} attempts remaining)`
          : result.error,
      );
      return;
    }

    setOtpCode(submittedOtpCode);
    setStep("vote");
  }

  async function handleCastVote(params: {
    captainCandidateId: string;
    viceCaptainCandidateIds: string[];
  }) {
    setPending(true);
    setError(null);
    const result = await verifyOtpAndCastVoteAction({
      electionId: election.id,
      email,
      otpCode,
      captainCandidateId: params.captainCandidateId,
      viceCaptainCandidateIds: params.viceCaptainCandidateIds,
    });
    setPending(false);

    if (!result.ok) {
      // The code passed verification a moment ago but no longer checks out (e.g. it
      // expired while choosing a candidate) - send them back to re-verify rather than
      // showing a dead end.
      setError(result.error);
      setStep("otp");
      return;
    }

    setStep("done");
  }

  if (step === "already-voted") return <AlreadyVotedNotice />;
  if (step === "done") return <ThankYouStep />;
  if (step === "vote") {
    return (
      <VoteStep
        candidates={election.candidates}
        onSubmit={handleCastVote}
        pending={pending}
        error={error}
      />
    );
  }
  if (step === "otp") {
    return (
      <OtpStep
        email={email}
        onSubmit={handleVerifyOtp}
        onResend={handleResend}
        pending={pending}
        error={error}
        resendCooldownSeconds={resendCooldown}
      />
    );
  }

  return <EmailStep onSubmit={handleRequestOtp} pending={pending} error={error} />;
}
