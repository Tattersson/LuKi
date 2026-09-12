"use client";

import { useState } from "react";
import {
  requestPlayerRegistrationOtpAction,
  resendPlayerRegistrationOtpAction,
  verifyPlayerRegistrationOtpAction,
  completePlayerRegistrationAction,
} from "../../server/actions";
import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";
import { PlayerDetailsStep, type PlayerDetailsInput } from "./PlayerDetailsStep";
import { DoneStep } from "./DoneStep";

type Step = "email" | "otp" | "details" | "done";

export function RegisterFlow() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  async function handleRequestOtp(submittedEmail: string) {
    setPending(true);
    setError(null);
    const result = await requestPlayerRegistrationOtpAction({ email: submittedEmail });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEmail(submittedEmail);
    setStep("otp");
    startResendCooldown();
  }

  async function handleResend() {
    setPending(true);
    setError(null);
    const result = await resendPlayerRegistrationOtpAction({ email });
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

  async function handleVerifyOtp(submittedOtpCode: string) {
    setPending(true);
    setError(null);
    const result = await verifyPlayerRegistrationOtpAction({
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
    setStep("details");
  }

  async function handleCompleteRegistration(details: PlayerDetailsInput) {
    setPending(true);
    setError(null);
    const result = await completePlayerRegistrationAction({
      email,
      otpCode,
      firstName: details.firstName,
      lastName: details.lastName,
      position: details.position,
      heightCm: details.heightCm,
      weightKg: details.weightKg,
      stickSide: details.stickSide,
      birthDate: details.birthDate,
    });
    setPending(false);

    if (!result.ok) {
      // The code passed verification a moment ago but no longer checks out (e.g. it
      // expired while filling in details) - send them back to re-verify rather than
      // showing a dead end.
      setError(result.error);
      setStep("otp");
      return;
    }

    setStep("done");
  }

  if (step === "done") return <DoneStep />;
  if (step === "details") {
    return (
      <PlayerDetailsStep onSubmit={handleCompleteRegistration} pending={pending} error={error} />
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
