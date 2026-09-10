"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function OtpStep({
  email,
  onSubmit,
  onResend,
  pending,
  error,
  resendCooldownSeconds,
}: {
  email: string;
  onSubmit: (otpCode: string) => void;
  onResend: () => void;
  pending: boolean;
  error: string | null;
  resendCooldownSeconds: number;
}) {
  const [otpCode, setOtpCode] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(otpCode);
      }}
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        We sent a code to <strong>{email}</strong>.
      </p>

      <div>
        <label htmlFor="otp" className="mb-1 block text-sm font-medium">
          Verification code
        </label>
        <Input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
          maxLength={6}
          placeholder="123456"
        />
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldownSeconds > 0}
          className="mt-1 text-xs text-neutral-500 underline disabled:cursor-not-allowed disabled:no-underline"
        >
          {resendCooldownSeconds > 0
            ? `Resend available in ${resendCooldownSeconds}s`
            : "Resend code"}
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Verifying..." : "Verify code"}
      </Button>
    </form>
  );
}
