import { hmacHex } from "@/lib/security/hmac";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  const secret = process.env.EMAIL_HASH_SECRET;
  if (!secret) throw new Error("EMAIL_HASH_SECRET is not configured");
  return hmacHex(secret, normalizeEmail(email));
}

export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not configured");
  return hmacHex(secret, ip);
}
