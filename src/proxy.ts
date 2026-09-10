export { auth as proxy } from "@/lib/auth/auth";

export const config = {
  matcher: ["/admin/:path*"],
};
