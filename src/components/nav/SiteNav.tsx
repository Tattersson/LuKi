"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { signOutAction } from "@/lib/auth/actions";

const BASE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/practices", label: "Practices" },
  { href: "/vote", label: "Vote" },
];

export function SiteNav({
  isSignedIn,
  showAdminLink,
  showProfileLink,
}: {
  isSignedIn: boolean;
  showAdminLink: boolean;
  showProfileLink: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    ...BASE_NAV_LINKS,
    ...(showProfileLink ? [{ href: "/profile", label: "Profile" }] : []),
    ...(showAdminLink ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold" onClick={() => setOpen(false)}>
          LuKi
        </Link>

        <nav className="hidden items-center gap-5 sm:flex">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} pathname={pathname} />
          ))}
          <AuthLink isSignedIn={isSignedIn} />
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 sm:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-neutral-200 px-4 py-2 sm:hidden dark:border-neutral-800">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  pathname={pathname}
                  className="block rounded-md px-2 py-2"
                  onNavigate={() => setOpen(false)}
                />
              </li>
            ))}
            <li>
              <AuthLink
                isSignedIn={isSignedIn}
                className="block rounded-md px-2 py-2"
                onNavigate={() => setOpen(false)}
              />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function AuthLink({
  isSignedIn,
  className,
  onNavigate,
}: {
  isSignedIn: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  if (isSignedIn) {
    return (
      <form action={signOutAction}>
        <button
          type="submit"
          className={clsx("text-sm text-neutral-600 hover:underline dark:text-neutral-300", className)}
        >
          Logout
        </button>
      </form>
    );
  }

  return (
    <Link
      href="/api/auth/signin"
      onClick={onNavigate}
      className={clsx(
        "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700",
        className,
      )}
    >
      Login
    </Link>
  );
}

function NavLink({
  href,
  label,
  pathname,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string | null;
  className?: string;
  onNavigate?: () => void;
}) {
  const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={clsx(
        "text-sm hover:underline",
        isActive
          ? "font-medium text-neutral-900 dark:text-white"
          : "text-neutral-600 dark:text-neutral-300",
        className,
      )}
    >
      {label}
    </Link>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
