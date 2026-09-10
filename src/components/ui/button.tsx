import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type ButtonVariant = "primary" | "secondary" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
        variant === "secondary" &&
          "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800",
        variant === "danger" &&
          "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}
