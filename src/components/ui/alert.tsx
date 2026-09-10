import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type AlertVariant = "info" | "success" | "error";

export function Alert({
  className,
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-md border px-4 py-3 text-sm",
        variant === "info" &&
          "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
        variant === "success" &&
          "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
        variant === "error" &&
          "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
        className,
      )}
      {...props}
    />
  );
}
