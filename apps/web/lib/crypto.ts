import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * LGPD: telefone e e-mail das clientes ficam criptografados em repouso (AES-256-GCM).
 * O hash (HMAC) serve só para casar cadastros sem decifrar.
 */
function key(): Buffer {
  const raw = env.encryptionKey ?? "chave-de-desenvolvimento-nao-use-em-producao";
  return createHash("sha256").update(raw).digest();
}

export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(token: string | null | undefined): string | null {
  if (!token) return null;
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1") return null;
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}

export function lookupHash(v: string | null | undefined): string | null {
  return v ? createHmac("sha256", key()).update(v).digest("base64url").slice(0, 32) : null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  return `scrypt.${salt.toString("base64")}.${scryptSync(pw, salt, 32).toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [, salt, hash] = stored.split(".");
  const a = scryptSync(pw, Buffer.from(salt, "base64"), 32);
  const b = Buffer.from(hash, "base64");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sign(value: string): string {
  return `${value}.${createHmac("sha256", env.authSecret).update(value).digest("base64url")}`;
}

export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const expected = Buffer.from(sign(value));
  const got = Buffer.from(signed);
  return expected.length === got.length && timingSafeEqual(expected, got) ? value : null;
}
