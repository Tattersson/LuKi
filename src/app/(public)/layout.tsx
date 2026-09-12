import type { ReactNode } from "react";
import { SiteNav } from "@/components/nav/SiteNav";
import { getNavAuthState } from "@/lib/auth/rbac";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { isSignedIn, showAdminLink, showProfileLink } = await getNavAuthState();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav isSignedIn={isSignedIn} showAdminLink={showAdminLink} showProfileLink={showProfileLink} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
