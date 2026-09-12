import { beforeEach, describe, expect, it } from "vitest";
import { hashEmail, hashIp, normalizeEmail } from "./email-hash";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  Player@Example.COM  ")).toBe("player@example.com");
  });
});

describe("hashEmail", () => {
  beforeEach(() => {
    process.env.EMAIL_HASH_SECRET = "test-secret";
  });

  it("is deterministic for the same email regardless of case/whitespace", () => {
    expect(hashEmail("Player@Example.com")).toBe(hashEmail(" player@example.com "));
  });

  it("differs for different emails", () => {
    expect(hashEmail("a@example.com")).not.toBe(hashEmail("b@example.com"));
  });

  it("differs when the secret differs", () => {
    const first = hashEmail("a@example.com");
    process.env.EMAIL_HASH_SECRET = "different-secret";
    expect(hashEmail("a@example.com")).not.toBe(first);
  });

  it("throws when the secret isn't configured", () => {
    delete process.env.EMAIL_HASH_SECRET;
    expect(() => hashEmail("a@example.com")).toThrow();
  });
});

describe("hashIp", () => {
  beforeEach(() => {
    process.env.IP_HASH_SECRET = "test-secret";
  });

  it("is deterministic for the same IP", () => {
    expect(hashIp("127.0.0.1")).toBe(hashIp("127.0.0.1"));
  });

  it("differs for different IPs", () => {
    expect(hashIp("127.0.0.1")).not.toBe(hashIp("10.0.0.1"));
  });
});
