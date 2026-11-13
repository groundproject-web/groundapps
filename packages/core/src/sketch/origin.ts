import { hash32 } from "../util";

/**
 * Códigos de origem: toda missão ou canal do Sketch gera um, para o Marco Zero
 * medir depois se a cliente trazida por aquele canal recompra.
 */
export interface OriginCode {
  code: string; // ex.: SK-CLUBES-4F2K
  channelKey: string;
  missionKey?: string;
  utmUrl: string;
  referralCode: string; // sem desconto por padrão
  qrPayload: string;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function makeOriginCode(params: { orgId: string; storeUrl: string; channelKey: string; missionKey?: string }): OriginCode {
  const base = `${params.orgId}|${params.channelKey}|${params.missionKey ?? ""}`;
  const suffix = hash32(base).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  const ch = slug(params.channelKey).toUpperCase().replace(/-/g, "").slice(0, 8);
  const code = `SK-${ch}-${suffix}`;
  const url = new URL(params.storeUrl);
  url.searchParams.set("utm_source", "sketch");
  url.searchParams.set("utm_campaign", slug(params.channelKey));
  if (params.missionKey) url.searchParams.set("utm_content", slug(params.missionKey));
  url.searchParams.set("ref", code);
  return { code, channelKey: params.channelKey, missionKey: params.missionKey, utmUrl: url.toString(), referralCode: code, qrPayload: url.toString() };
}

/**
 * core.order.attributed_source: extrai o código de origem de um pedido
 * (UTM, código de indicação/cupom sem desconto, ou resposta de "como conheceu").
 */
export function extractSourceCode(order: { landingUrl?: string | null; coupon?: string | null; howFound?: string | null }, knownCodes: Set<string>): string | null {
  if (order.landingUrl) {
    try {
      const u = new URL(order.landingUrl);
      const ref = u.searchParams.get("ref");
      if (ref && knownCodes.has(ref.toUpperCase())) return ref.toUpperCase();
    } catch {
      /* url inválida: ignora */
    }
  }
  const c = order.coupon?.trim().toUpperCase();
  if (c && knownCodes.has(c)) return c;
  const h = order.howFound?.trim().toUpperCase();
  if (h && knownCodes.has(h)) return h;
  return null;
}
