import crypto from "node:crypto";

export function createId() {
  return crypto.randomUUID();
}

export function createJoinCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 7; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
