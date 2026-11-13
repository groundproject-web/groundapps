/**
 * Parser de CSV tolerante: detecta separador (; , ou tab), aceita aspas,
 * quebras de linha dentro de aspas e BOM. Devolve cabeçalho + linhas.
 */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

export function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/)[0] ?? "";
  const counts = [";", ",", "\t"].map((d) => ({ d, n: countOutsideQuotes(firstLine, d) }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function countOutsideQuotes(line: string, d: string): number {
  let inQ = false;
  let n = 0;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === d && !inQ) n++;
  }
  return n;
}

export function parseCsv(text: string, delimiter?: string): ParsedCsv {
  const src = text.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(src);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === d) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      if (record.some((c) => c.trim() !== "")) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((c) => c.trim() !== "")) records.push(record);
  const [headers = [], ...rows] = records;
  return { headers: headers.map((h) => h.trim()), rows, delimiter: d };
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][], d = ","): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /["\n\r]/.test(s) || s.includes(d) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(d)).join("\n") + "\n";
}
