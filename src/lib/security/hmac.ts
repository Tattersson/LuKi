import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hmacEquals(secret: string, value: string, expectedHex: string): boolean {
  const actual = Buffer.from(hmacHex(secret, value), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
