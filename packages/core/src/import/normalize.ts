import type { ColumnMapping, Field } from "./mapping";

export function normalizeEmail(v: string | undefined | null): string | null {
  const s = (v ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/** Só dígitos, sem o 55 do Brasil. Telefones com menos de 10 dígitos são descartados. */
export function normalizePhone(v: string | undefined | null): string | null {
  let d = (v ?? "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.length >= 10 && d.length <= 11 ? d : null;
}

export function normalizeName(v: string | undefined | null): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

export function nameKey(v: string): string {
  return normalizeName(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Aceita "R$ 1.234,56", "1234.56", "1,234.56", "150". Devolve centavos. */
export function parseMoney(v: string | undefined | null): number | null {
  let s = (v ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, "");
  else if (lastComma === -1 && lastDot >= 0 && s.length - lastDot - 1 === 3 && (s.match(/\./g) ?? []).length >= 1)
    s = s.replace(/\./g, ""); // "1.234" → milhar
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd (com ou sem hora), dd/mm/aa. Devolve ISO yyyy-mm-dd. */
export function parseDate(v: string | undefined | null): string | null {
  const s = (v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return iso(y, +m[2], +m[1]);
  }
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return dt.toISOString().slice(0, 10);
}

export interface RawOrderRow {
  line: number;
  name: string;
  email: string | null;
  phone: string | null;
  date: string;
  totalCents: number;
  products: string[];
  coupon: string | null;
  orderRef: string | null;
  sourceCode: string | null;
}

/** "Whey 900g + Creatina 300g" ou "Whey | Creatina" → dois itens. */
export function splitProducts(v: string | undefined | null): string[] {
  return (v ?? "")
    .split(/\s\+\s|\s*\|\s*/)
    .map((p) => normalizeName(p))
    .filter(Boolean);
}

export interface RowProblem {
  line: number;
  reason: string;
}

/**
 * Aplica o mapeamento às linhas. Colunas ignoradas/sensíveis nunca são lidas:
 * o valor delas não chega a sair desta função.
 */
export function rowsToOrders(rows: string[][], mapping: ColumnMapping[]): { orders: RawOrderRow[]; problems: RowProblem[] } {
  const idx = (f: Field) => mapping.find((m) => m.target === f)?.index;
  const get = (row: string[], f: Field) => {
    const i = idx(f);
    return i === undefined ? undefined : row[i];
  };
  const orders: RawOrderRow[] = [];
  const problems: RowProblem[] = [];
  rows.forEach((row, i) => {
    const line = i + 2;
    const name = normalizeName(get(row, "quem"));
    const date = parseDate(get(row, "quando"));
    const totalCents = parseMoney(get(row, "quanto"));
    const email = normalizeEmail(get(row, "email"));
    const phone = normalizePhone(get(row, "telefone"));
    if (!name && !email && !phone) return problems.push({ line, reason: "Sem quem comprou" });
    if (!date) return problems.push({ line, reason: "Data não reconhecida" });
    if (totalCents === null || totalCents < 0) return problems.push({ line, reason: "Valor não reconhecido" });
    orders.push({
      line,
      name: name || email || phone || "Sem nome",
      email,
      phone,
      date,
      totalCents,
      products: splitProducts(get(row, "produto")),
      coupon: normalizeName(get(row, "cupom")) || null,
      orderRef: normalizeName(get(row, "pedido")) || null,
      sourceCode: normalizeName(get(row, "origem")) || null,
    });
  });
  return { orders, problems };
}
