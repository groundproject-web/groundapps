import { toCsv } from "../import/csv";
import { addDays, rng } from "../util";

/**
 * Seed da Carla · Fôlego Nutrição (suplementos, Nuvemshop).
 * Planilha CSV BAGUNÇADA DE PROPÓSITO: separador ";", datas em dois formatos,
 * telefones em três formatos, valores com e sem "R$", cadastros repetidos,
 * uma coluna de CPF e uma de endereço que precisam ser descartadas.
 *
 * Números fixos (iguais ao protótipo):
 * - 2.000 clientes únicas (depois de juntar o par em dúvida), 3.412 pedidos
 * - Fiéis 140 (R$ 98.000) · Em risco 220 (R$ 74.000) · Sumidos 1.400 (R$ 210.000) · Compra única recente 240 (R$ 36.000)
 * - Recompra 18% (360), LTV R$ 209, ticket médio da 1ª compra das sumidas R$ 150
 * - 180 clientes no fim do ciclo do whey (60 fiéis + 120 compra única recente)
 * - 37 cadastros repetidos unidos sozinhos (mesmo e-mail e telefone) + 1 par em dúvida
 * Tudo fictício. CPFs e endereços são inventados e servem só para testar o descarte.
 */
export const CARLA_AS_OF = "2026-11-16"; // segunda-feira
export const CARLA_START = "2024-03-01";

export const CARLA_PRODUCTS = {
  whey: "Whey Fôlego 900g",
  creatina: "Creatina Pura 300g",
  pre: "Pré-treino Limpo 300g",
  colageno: "Colágeno + Vitamina C",
  refil: "Whey Fôlego Refil 1,8kg",
};

const FIRST = ["Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia", "Renata", "Sofia", "Tatiana", "Vanessa", "Bruna", "Carolina", "Débora", "Elisa", "Flávia", "Giovana", "Lívia", "Luana", "Marina", "Paula", "Raquel", "Simone", "Bruno", "Diego", "Felipe", "Gustavo", "Lucas", "Marcelo", "Rafael", "Rodrigo", "Thiago", "Vinícius", "Clara", "Alice", "Lara", "Yasmin", "Priscila", "Aline", "Cíntia", "Joana", "Lúcia", "Mônica"];
const LAST = ["Souza", "Oliveira", "Santos", "Lima", "Pereira", "Costa", "Ferreira", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins", "Araújo", "Ribeiro", "Barbosa", "Rocha", "Dias", "Moreira", "Cardoso", "Teixeira", "Correia", "Mendes", "Freitas", "Nunes", "Vieira", "Monteiro", "Pinto", "Cavalcanti", "Batista", "Campos", "Lopes", "Machado", "Azevedo", "Fonseca", "Moura", "Duarte", "Farias", "Reis", "Siqueira"];

const DDDS = ["21", "21", "21", "21", "22", "24", "11", "31"];
const FRETE = ["Entregue", "Entregue", "Entregue", "Em trânsito", "Entregue", "Devolvido"];
const RUAS = ["Rua das Laranjeiras", "Rua Voluntários da Pátria", "Av. Nossa Senhora de Copacabana", "Rua Conde de Bonfim", "Rua Barão da Torre", "Estrada do Galeão"];

interface SeedCustomer {
  idx: number;
  group: "fieis" | "em_risco" | "sumidos" | "compra_unica_recente";
  name: string;
  email: string;
  phone: string; // só dígitos
  cpf: string;
  address: string;
  orders: { day: number; products: string[]; cents: number; regVariant?: "dup" | "doubt" }[];
}

export interface CarlaSeed {
  csv: string;
  asOf: string;
  expected: {
    customers: number;
    orders: number;
    groups: Record<"fieis" | "em_risco" | "sumidos" | "compra_unica_recente", { count: number; totalCents: number }>;
    autoMerged: number;
    doubts: number;
    dueForWhey: number;
  };
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function int(r: () => number, a: number, b: number): number {
  return a + Math.floor(r() * (b - a + 1));
}

/** Ajusta uma lista de contagens para somar exatamente `target`, respeitando [min, max]. */
function fitCounts(r: () => number, counts: number[], target: number, min: number, max: number): number[] {
  const c = [...counts];
  let sum = c.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (sum !== target && guard++ < 1e6) {
    const i = Math.floor(r() * c.length);
    if (sum < target && c[i] < max) {
      c[i]++;
      sum++;
    } else if (sum > target && c[i] > min) {
      c[i]--;
      sum--;
    }
  }
  return c;
}

/** Distribui `totalCents` entre pedidos proporcionalmente a pesos, fechando o centavo. */
function distribute(weights: number[], totalCents: number): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.round(((w / sumW) * totalCents) / 100) * 100); // reais inteiros
  const diff = totalCents - raw.reduce((a, b) => a + b, 0);
  raw[raw.length - 1] += diff;
  return raw;
}

const PRICE: Record<string, number> = { whey: 149, creatina: 89, pre: 119, colageno: 99, refil: 259 };

export function generateCarlaSeed(seed = 20261116): CarlaSeed {
  const r = rng(seed);
  // dias relativos: 0 = asOf, positivo = no passado
  const maxBack = 990; // ~mar/2024
  const customers: SeedCustomer[] = [];
  const usedPhones = new Set<string>();

  const mkPerson = (idx: number): Pick<SeedCustomer, "name" | "email" | "phone" | "cpf" | "address"> => {
    const f = FIRST[idx % FIRST.length];
    const l = LAST[Math.floor(idx / FIRST.length) % LAST.length];
    const l2 = LAST[(idx * 7 + 3) % LAST.length];
    const name = idx % 5 === 0 ? `${f} ${l2} ${l}` : `${f} ${l}`;
    const emailUser = `${f}.${l}${idx}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    let phone: string;
    do phone = `${pick(r, DDDS)}9${int(r, 6000, 9999)}${String(int(r, 0, 9999)).padStart(4, "0")}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    const cpf = `${int(r, 100, 999)}.${int(r, 100, 999)}.${int(r, 100, 999)}-${String(int(r, 0, 99)).padStart(2, "0")}`;
    const address = `${pick(r, RUAS)}, ${int(r, 10, 2400)} - Rio de Janeiro/RJ`;
    return { name, email: `${emailUser}@example.com`, phone, cpf, address };
  };

  let idx = 0;
  // ---------- Fiéis: 140, 3+ pedidos, última ≤ 60 dias; 60 delas no fim do ciclo do whey ----------
  const fCounts = fitCounts(r, Array.from({ length: 140 }, () => int(r, 3, 10)), 910, 3, 12);
  for (let i = 0; i < 140; i++) {
    const due = i < 60;
    const last = due ? int(r, 44, 46) : int(r, 2, 34);
    const days: number[] = [last];
    for (let k = 1; k < fCounts[i]; k++) days.unshift(days[0] + (k === fCounts[i] - 1 ? int(r, 40, 64) : int(r, 40, 50)));
    customers.push({ idx, group: "fieis", ...mkPerson(idx++), orders: days.map((d) => ({ day: d, products: r() < 0.3 ? ["whey", "creatina"] : ["whey"], cents: 0 })) });
  }
  // ---------- Em risco: 220, 2+ pedidos, última > 60 dias ----------
  const rCounts = fitCounts(r, Array.from({ length: 220 }, () => int(r, 2, 6)), 862, 2, 8);
  for (let i = 0; i < 220; i++) {
    const last = int(r, 62, 420);
    const days: number[] = [last];
    for (let k = 1; k < rCounts[i]; k++) days.unshift(days[0] + (k === rCounts[i] - 1 ? int(r, 40, 64) : int(r, 40, 50)));
    customers.push({ idx, group: "em_risco", ...mkPerson(idx++), orders: days.map((d) => ({ day: Math.min(d, maxBack), products: r() < 0.2 ? ["whey", "colageno"] : ["whey"], cents: 0 })) });
  }
  // ---------- Sumidos: 1.400, 1 pedido, há > 90 dias (crescimento recente, puxado por anúncio) ----------
  for (let i = 0; i < 1400; i++) {
    const u = r();
    // crescimento gradual, puxado por anúncio: mais clientes novas nos meses recentes
    const day = 91 + Math.floor(899 * Math.pow(u, 1.5));
    const roll = r();
    const products = roll < 0.6 ? ["whey"] : roll < 0.75 ? ["whey", "creatina"] : roll < 0.9 ? ["creatina"] : ["pre"];
    customers.push({ idx, group: "sumidos", ...mkPerson(idx++), orders: [{ day, products, cents: 0 }] });
  }
  // ---------- Compra única recente: 240, 1 pedido, há ≤ 90 dias; 120 no fim do ciclo do whey ----------
  for (let i = 0; i < 240; i++) {
    const due = i < 120;
    let day: number;
    let products: string[];
    if (due) {
      day = int(r, 44, 46);
      products = ["whey"];
    } else {
      // espalha as primeiras compras recentes por set/out, para o gráfico mensal não ter buraco
      day = r() < 0.75 ? int(r, 47, 90) : int(r, 1, 46);
      products = r() < 0.5 ? ["whey"] : [pick(r, ["creatina", "pre", "colageno"])];
      if (products[0] === "whey" && day >= 34 && day <= 62) products = ["creatina"];
    }
    customers.push({ idx, group: "compra_unica_recente", ...mkPerson(idx++), orders: [{ day, products, cents: 0 }] });
  }

  // ---------- Valores: fecha o total de cada grupo exatamente ----------
  const groupTotal = { fieis: 9_800_000, em_risco: 7_400_000, sumidos: 21_000_000, compra_unica_recente: 3_600_000 };
  for (const g of Object.keys(groupTotal) as (keyof typeof groupTotal)[]) {
    const list = customers.filter((c) => c.group === g).flatMap((c) => c.orders);
    const weights = list.map((o) => o.products.reduce((s, p) => s + PRICE[p], 0) * (0.85 + r() * 0.3));
    const cents = distribute(weights, groupTotal[g]);
    list.forEach((o, i) => (o.cents = cents[i]));
  }

  // ---------- Cadastros repetidos: 37 automáticos (mesmo e-mail e telefone, nome escrito diferente) ----------
  const repeaters = customers.filter((c) => c.group === "em_risco" || c.group === "fieis");
  for (let i = 0; i < 37; i++) {
    const c = repeaters[(i * 9 + 4) % repeaters.length];
    c.orders[c.orders.length - 1].regVariant = "dup";
  }
  // ---------- Par em dúvida: mesmo telefone, nome e e-mail diferentes ----------
  const doubt = customers.find((c) => c.group === "em_risco" && c.orders.length === 5 && !c.orders.some((o) => o.regVariant))!;
  doubt.name = "Carla S.";
  doubt.email = "carla.s.corre@example.com";
  const doubtLast = doubt.orders[doubt.orders.length - 1];
  doubtLast.day = 72; // set/26
  doubtLast.regVariant = "doubt";
  // garante a ordem cronológica
  for (let k = doubt.orders.length - 2; k >= 0; k--) if (doubt.orders[k].day <= doubt.orders[k + 1].day) doubt.orders[k].day = doubt.orders[k + 1].day + int(r, 40, 50);

  // ---------- Monta o CSV bagunçado ----------
  type Row = { day: number; c: SeedCustomer; o: SeedCustomer["orders"][number] };
  const rows: Row[] = customers.flatMap((c) => c.orders.map((o) => ({ day: o.day, c, o })));
  rows.sort((a, b) => b.day - a.day || a.c.idx - b.c.idx);
  const headers = ["Nº Pedido", "Data do pedido", "Nome do comprador", "E-mail", "Telefone", "CPF", "Total pago", "Produto", "Cupom utilizado", "Status do frete", "Endereço de entrega"];
  const fmtPhone = (p: string, k: number) => (k % 3 === 0 ? `(${p.slice(0, 2)}) ${p.slice(2, 3)} ${p.slice(3, 7)}-${p.slice(7)}` : k % 3 === 1 ? p : `+55 ${p.slice(0, 2)} ${p.slice(2, 7)}-${p.slice(7)}`);
  const fmtDate = (iso: string, k: number) => (k % 19 === 0 ? iso : `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`);
  const fmtMoney = (cents: number, k: number) => (k % 7 === 0 ? (cents / 100).toFixed(2) : `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  const out = rows.map((row, k) => {
    const iso = addDays(CARLA_AS_OF, -row.day);
    let name = row.c.name;
    let email = row.c.email;
    // cadastro repetido: o nome vem escrito de outro jeito (abreviado), com o mesmo e-mail e telefone
    if (row.o.regVariant === "dup") name = row.c.name.split(" ")[0] + " " + row.c.name.split(" ").slice(-1)[0][0] + ".";
    if (row.o.regVariant === "doubt") {
      name = "Carla Souza";
      email = "carlasouza.run@example.com";
    }
    return [
      String(100000 + k),
      fmtDate(iso, k),
      k % 23 === 0 ? `  ${name} ` : name,
      k % 11 === 0 ? email.toUpperCase() : email,
      fmtPhone(row.c.phone, k),
      row.c.cpf,
      fmtMoney(row.o.cents, k),
      row.o.products.map((p) => CARLA_PRODUCTS[p as keyof typeof CARLA_PRODUCTS]).join(" + "),
      row.o.products.length > 1 && k % 4 === 0 ? "VOLTA10" : "",
      pick(r, FRETE),
      row.c.address,
    ];
  });
  // reverte para ordem cronológica de pedido
  const csv = toCsv(headers, out.reverse(), ";");

  return {
    csv,
    asOf: CARLA_AS_OF,
    expected: {
      customers: 2000,
      orders: 3412,
      groups: {
        fieis: { count: 140, totalCents: 9_800_000 },
        em_risco: { count: 220, totalCents: 7_400_000 },
        sumidos: { count: 1400, totalCents: 21_000_000 },
        compra_unica_recente: { count: 240, totalCents: 3_600_000 },
      },
      autoMerged: 37,
      doubts: 1,
      dueForWhey: 180,
    },
  };
}
