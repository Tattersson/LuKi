import type { ReactNode } from "react";
import { SiteNav } from "@/components/nav/SiteNav";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
