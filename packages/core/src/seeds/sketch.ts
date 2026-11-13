import type { Channel, Persona, SketchMission, TerrainMatrix, TrafficTest, SourceRef } from "../sketch/model";
import { countExpression, type SourceDoc } from "../sketch/quotes";
import { rng } from "../util";

/**
 * Seeds do Sketch, fiéis aos protótipos.
 * Caminho 1: João · Brutal Wear (sem base). Caminho 2: Carla · Fôlego (com o Marco Zero).
 * As frases da persona são CONTADAS no corpus de fontes abaixo, não digitadas à mão:
 * assim a regra "toda citação tem fonte" vale também para a demonstração.
 * URLs de concorrentes usam example.com: são fictícias e marcadas como demonstração.
 */
export interface ChatSeedMessage {
  from: "app" | "lojista";
  kind: "texto" | "audio" | "imagem";
  text?: string;
  transcript?: string;
  duration?: string;
  images?: { title: string; caption: string }[];
}

export interface SketchSeed {
  path: 1 | 2;
  owner: string;
  store: string;
  segment: string;
  storeUrl: string;
  intro: { label: string; title: string; subtitle: string };
  chat: ChatSeedMessage[];
  baseCard: { status: "fato" | "sem_info"; title: string; text: string; count?: number };
  persona: Persona;
  readLabel: string;
  matrix: TerrainMatrix;
  emptySpaceColumn: number;
  emptySpace: { title: string; text: string };
  hypothesis: { title: string; text: string };
  terrainTitle: string;
  channelsTitle: string;
  channels: Channel[];
  traffic: TrafficTest;
  missions: SketchMission[];
  signals: { label: string; value: number; measured: boolean }[];
  later?: { withContact: number; repeatBuyers: number; daysToSecond: number };
  docs: SourceDoc[];
}

const AT = "2026-11-10T12:00:00.000Z";

function corpus(seed: number, prefix: string, total: number, expressions: [string, number][], fillers: string[], source: (i: number) => SourceDoc["source"], wraps: string[]): SourceDoc[] {
  const r = rng(seed);
  const docs: SourceDoc[] = [];
  let i = 0;
  for (const [phrase, n] of expressions) {
    for (let k = 0; k < n; k++, i++) {
      const w = wraps[Math.floor(r() * wraps.length)];
      docs.push({ id: `${prefix}-${String(i + 1).padStart(4, "0")}`, text: w.replace("{x}", phrase), source: source(i) });
    }
  }
  while (i < total) {
    docs.push({ id: `${prefix}-${String(i + 1).padStart(4, "0")}`, text: fillers[Math.floor(r() * fillers.length)], source: source(i) });
    i++;
  }
  return docs;
}

function ev(url: string, excerpt: string): SourceRef {
  return { kind: "url_publica", ref: url, url, collectedAt: AT, excerpt };
}

/* ======================= Caminho 1 · João ======================= */
export function joaoSeed(): SketchSeed {
  const docs = corpus(
    7,
    "jw",
    416,
    [
      ["lavou três vezes e acabou", 52],
      ["desbotou rápido", 37],
      ["marca suor no peito", 29],
      ["estampa descascou", 18],
    ],
    ["Chegou rápido, tamanho certo.", "Bonita, mas achei o tecido fino.", "Uso no box quatro vezes por semana.", "Comprei pro meu treino de sábado.", "Atendimento bom pelo direct.", "Queria em outras cores.", "Caimento bom no ombro.", "Vale pelo visual.", "Meu coach usa uma parecida."],
    (i) => (i % 2 === 0 ? { kind: "comentario", url: null, collectedAt: AT } : { kind: "url_publica", url: `https://example.com/avaliacoes/marca-${(i % 4) + 1}`, collectedAt: AT }),
    ["{x}. Não compro mais dessa marca.", "Sinceramente: {x}.", "Gostei do modelo, mas {x}.", "{x}, igual a todas que já tive."],
  );
  const q = (p: string) => countExpression(docs, p)!;
  const matrix: TerrainMatrix = {
    columns: ["Visual agressivo", "Atitude", "Preço baixo", "Durabilidade", "Não marca suor"],
    readAt: AT,
    rows: [
      row("Rage Fit", [1, 1, 0, 0, 0], "rage-fit"),
      row("Box Riot", [1, 1, 1, 0, 0], "box-riot"),
      row("Wod Kings", [1, 1, 0, 0, 1], "wod-kings"),
      row("Grit Co.", [1, 0, 1, 0, 0], "grit-co"),
      { ...row("Brutal Wear (você)", [0, 1, 0, 1, 1], "brutal-wear"), isYou: true },
    ],
  };
  // "Preço baixo" aparece como o que a marca PROMETE na comunicação, não como monitoramento de preço.
  return {
    path: 1,
    owner: "João",
    store: "Brutal Wear",
    segment: "Roupa de treino · Instagram",
    storeUrl: "https://example.com/brutalwear",
    intro: { label: "Ground Sketch · sozinho", title: "Sem base de clientes? A gente começa pela conversa.", subtitle: "O João vende umas dez peças por mês pelo Instagram. Não tem loja virtual nem lista de clientes. O Sketch parte do que ele sabe e do que o público dele já escreve." },
    chat: [
      { from: "app", kind: "texto", text: "Me conta da sua marca do jeito que você contaria para um cliente. Pode mandar áudio e print." },
      { from: "lojista", kind: "audio", duration: "0:22", transcript: "A minha camiseta não marca suor e dura muito. Tem cliente que usa há um ano." },
      { from: "lojista", kind: "imagem", images: [{ title: "Print 1", caption: "Comentários do post da camiseta preta" }, { title: "Print 2", caption: "Direct de cliente pedindo outra cor" }] },
      { from: "app", kind: "texto", text: "Valeu. Vou ler os comentários do seu perfil e as avaliações de marcas parecidas." },
    ],
    baseCard: { status: "sem_info", title: "Base de clientes", text: "Sem loja virtual e sem planilha. Tudo bem: o Sketch funciona sozinho. Quando a base existir, ela entra no plano." },
    readLabel: "186 comentários e 230 avaliações lidas",
    persona: {
      profile: "Homem de 30 a 40 anos que faz crossfit",
      description: "Treina quatro a cinco vezes por semana, lava a roupa de treino toda hora e já trocou de marca por causa de tecido que não aguenta.",
      status: "hipotese",
      strength: "forte",
      evidenceLabel: "416 textos lidos",
      topQuote: q("lavou três vezes e acabou"),
      expressions: [q("lavou três vezes e acabou"), q("desbotou rápido"), q("marca suor no peito"), q("estampa descascou")],
      pain: "Pagar caro em camiseta que não dura o mês.",
      desire: "Uma peça que aguenta o treino pesado e a máquina de lavar.",
      motive: "Durabilidade comprovada, não visual agressivo.",
    },
    terrainTitle: "Todo mundo vende atitude. Quase ninguém fala de durabilidade.",
    matrix,
    emptySpaceColumn: 3,
    emptySpace: { title: "A camiseta que dura", text: "Nenhuma das quatro promete durabilidade. É exatamente a reclamação que o público mais faz." },
    hypothesis: { title: "“Aguenta o treino e a máquina de lavar”", text: "Testar primeiro no boca a boca dos boxes, antes de qualquer anúncio." },
    channelsTitle: "Ele está no box do bairro.",
    channels: [
      { key: "boxes", title: "Boxes de crossfit do bairro", detail: "6 boxes num raio de 5 km", kind: "clubes", priority: 4, inPlan: true, status: "hipotese" },
      { key: "coaches", title: "Coaches com influência local", detail: "Conectores: o aluno copia o que o coach veste", kind: "conectores", priority: 4, inPlan: true, status: "hipotese" },
      { key: "grupos", title: "Grupos de WhatsApp dos boxes", detail: "Onde os alunos combinam treino e campeonato", kind: "grupos", priority: 3, inPlan: true, status: "hipotese" },
      { key: "campeonatos", title: "Campeonatos amadores", detail: "2 campeonatos no próximo mês", kind: "eventos", priority: 3, inPlan: true, status: "hipotese" },
    ],
    traffic: { budgetCents: 20000, days: 14, message: "Aguenta o treino e a máquina de lavar.", stopRule: "Se não validar, para.", phase: "depois", status: "sem_info" },
    missions: [
      { key: "m1", week: 1, title: "Levar camisetas para dois coaches usarem nas aulas", detail: "Uma de cada cor. Peça só que contem quantas lavagens aguentou.", category: "Conectores", channelKey: "coaches", done: false, material: { kind: "roteiro_conversa", text: "Oi, [coach]! Sou o João, da Brutal Wear. Queria te dar duas camisetas para usar nas aulas. Não precisa postar nada: só me conta, daqui a um mês, quantas lavagens elas aguentaram." } },
      { key: "m2", week: 1, title: "Gravar um vídeo lavando a camiseta pela décima vez", detail: "Antes e depois lado a lado. Roteiro de 30 segundos pronto.", category: "Conteúdo", channelKey: "grupos", done: false, material: { kind: "roteiro_video", text: "0–5s: camiseta nova ao lado da lavada 10 vezes.\n5–20s: mão esticando o tecido, close na estampa.\n20–30s: “Dez lavagens. Mesma cor. Aguenta o treino e a máquina de lavar.”" } },
      { key: "m3", week: 1, title: "Oferecer um kit para os vencedores de um campeonato amador", detail: "Três kits no campeonato do dia 30, com cartão e QR code.", category: "Eventos", channelKey: "campeonatos", done: false, material: { kind: "cartao", text: "Parabéns pelo pódio. Essa camiseta aguenta o treino e a máquina de lavar. Conta pra gente quantas lavagens ela aguentou." } },
    ],
    signals: [
      { label: "mensagens recebidas", value: 31, measured: false },
      { label: "indicações dos coaches", value: 6, measured: false },
      { label: "vendas novas", value: 14, measured: false },
    ],
    later: { withContact: 38, repeatBuyers: 7, daysToSecond: 41 },
    docs,
  };
}

/* ======================= Caminho 2 · Carla ======================= */
export function carlaSketchSeed(): SketchSeed {
  const docs = corpus(
    11,
    "fl",
    412,
    [
      ["não pesa no estômago", 64],
      ["sem gosto artificial", 41],
      ["rótulo curto, sei o que tem", 28],
      ["uso no pós-corrida", 22],
    ],
    ["Chegou bem embalado.", "Comprei de novo, como sempre.", "Entrega demorou um pouco.", "Sabor baunilha é o meu preferido.", "Indiquei para minha amiga do treino.", "Bom custo-benefício.", "Dissolve fácil na água."],
    () => ({ kind: "avaliacao_mz", url: null, collectedAt: AT }),
    ["{x}. Por isso voltei.", "Gosto porque {x}.", "Melhor whey que já tomei: {x}.", "{x} — finalmente!"],
  );
  const q = (p: string) => countExpression(docs, p)!;
  return {
    path: 2,
    owner: "Carla",
    store: "Fôlego Nutrição",
    segment: "Suplementos · Nuvemshop",
    storeUrl: "https://example.com/folego",
    intro: { label: "Ground Sketch · com o Marco Zero", title: "A aquisição começa por quem já volta.", subtitle: "A Carla já usa o Marco Zero. Em vez de começar do zero, o Sketch parte das clientes que recompram e pergunta o que ninguém mais sabe sobre a marca." },
    chat: [
      { from: "app", kind: "texto", text: "O que a sua marca tem que as outras não têm?" },
      { from: "lojista", kind: "audio", duration: "0:14", transcript: "O nosso whey é limpo, sem adoçante artificial. Quem prova sente a diferença no estômago." },
      { from: "app", kind: "texto", text: "Anotado. Vou cruzar isso com o que as suas 360 clientes escrevem nas avaliações." },
    ],
    baseCard: { status: "fato", title: "Importado do Marco Zero", text: "clientes que já compraram mais de uma vez: 140 fiéis e 220 em risco", count: 360 },
    readLabel: "412 avaliações lidas",
    persona: {
      profile: "Mulher de 30 a 45 anos que corre",
      description: "Treina para provas de rua, lê o rótulo antes de comprar e já desistiu de outros wheys por desconforto.",
      status: "fato",
      evidenceLabel: "Fato · 360 clientes",
      topQuote: q("não pesa no estômago"),
      expressions: [q("não pesa no estômago"), q("sem gosto artificial"), q("rótulo curto, sei o que tem"), q("uso no pós-corrida")],
      pain: "Inchaço e desconforto com wheys cheios de adoçante.",
      desire: "Recuperar depois da corrida sem pensar no que está tomando.",
      motive: "Confiança no rótulo, não a promessa de músculo.",
    },
    terrainTitle: "Todo mundo fala de performance. Ninguém fala de digestão leve.",
    matrix: {
      columns: ["Performance", "“Treine duro”", "Sabor", "Digestão leve", "Rótulo limpo"],
      readAt: AT,
      rows: [
        row("Força Max", [1, 1, 1, 0, 0], "forca-max"),
        row("Titan Whey", [1, 1, 0, 0, 0], "titan-whey"),
        row("Pulse Nutri", [1, 0, 1, 0, 0], "pulse-nutri"),
        row("Vigor+", [1, 1, 1, 0, 0], "vigor-mais"),
        row("Atlas Sport", [1, 1, 0, 0, 1], "atlas-sport"),
        { ...row("Fôlego (você)", [0, 0, 1, 1, 1], "folego"), isYou: true },
      ],
    },
    emptySpaceColumn: 3,
    emptySpace: { title: "Digestão leve e rótulo limpo", text: "Nenhuma das cinco fala de digestão. Só uma menciona rótulo, e de passagem." },
    hypothesis: { title: "“Não pesa no estômago” como mensagem principal", text: "É a frase das suas clientes e não aparece em nenhum concorrente." },
    channelsTitle: "Ela está onde corre, não onde rola anúncio.",
    channels: [
      { key: "clubes", title: "Clubes de corrida do Rio", detail: "8 clubes com treinos abertos aos sábados", kind: "clubes", priority: 4, inPlan: true, status: "hipotese" },
      { key: "nutris", title: "Nutricionistas esportivas", detail: "Conectoras: indicam produto para atletas amadoras", kind: "conectores", priority: 4, inPlan: true, status: "hipotese" },
      { key: "grupos", title: "Grupos de corrida no WhatsApp", detail: "Grupos de assessorias e de provas", kind: "grupos", priority: 3, inPlan: true, status: "hipotese" },
      { key: "provas", title: "Provas de rua", detail: "3 provas no Rio nos próximos 60 dias", kind: "eventos", priority: 3, inPlan: true, status: "hipotese" },
      { key: "perfis", title: "Perfis de corredoras", detail: "Atletas amadoras com 5 a 30 mil seguidores", kind: "perfis", priority: 2, inPlan: true, status: "hipotese" },
    ],
    traffic: { budgetCents: 30000, days: 14, message: "Não pesa no estômago.", stopRule: "Se não validar, para.", phase: "pronto", status: "hipotese" },
    missions: [
      { key: "m1", week: 1, title: "Falar com três nutricionistas esportivas", detail: "Levar amostras e a ficha do rótulo. Roteiro de conversa pronto.", category: "Conectoras", channelKey: "nutris", done: false, material: { kind: "roteiro_conversa", text: "Oi, [nome]! Sou a Carla, da Fôlego. Muitas das nossas clientes correm e contam que o nosso whey não pesa no estômago. Trouxe amostras e a ficha do rótulo, linha por linha, para você avaliar com as suas atletas." } },
      { key: "m2", week: 1, title: "Oferecer amostras num clube de corrida", detail: "Treino de sábado no Aterro. 60 sachês com QR code para a loja.", category: "Clubes", channelKey: "clubes", done: false, material: { kind: "cartao", text: "Não pesa no estômago. Prova depois do treino e conta pra gente. Aponte a câmera para o QR code." } },
      { key: "m3", week: 1, title: "Postar um carrossel sobre rótulo limpo", detail: "“O que tem no seu whey, linha por linha.” Texto e roteiro prontos.", category: "Conteúdo", channelKey: "perfis", done: false, material: { kind: "carrossel", text: "1. O que tem no seu whey, linha por linha.\n2. Proteína do soro do leite. Só.\n3. Sem adoçante artificial.\n4. Por que isso importa para quem corre.\n5. Não pesa no estômago: palavras das nossas clientes." } },
    ],
    signals: [
      { label: "conversas iniciadas", value: 46, measured: false },
      { label: "indicações das nutricionistas", value: 9, measured: false },
      { label: "vendas para clientes novas", value: 23, measured: true },
    ],
    docs,
  };
}

function row(name: string, v: number[], slug: string) {
  return {
    name,
    confirmed: true,
    cells: v.map((x, i) => ({ promises: x === 1, evidence: ev(`https://example.com/${slug}/sobre#c${i}`, x === 1 ? `Trecho da página de ${name} que menciona a promessa.` : `Página de ${name} lida; a promessa não aparece.`) })),
  };
}
