import { STATUSES, STATUS_LABEL, type Status } from "@ground/core";
import { carlaSketchSeed } from "@ground/core/seeds";
import { Button, Card, ChannelCard, ChatThread, CheckMission, GroundMark, Kpi, KpiRow, Label, LoopIndicator, Matrix, MissionCard, PageHeader, RentedBuiltChart, Say, StatusLegend, StatusTag, VsRow, WhatsAppPreview } from "@ground/ui";

export const metadata = { title: "Design system · Terra Neutra" };

const COLORS = [
  ["Vazio", "#0A0A0A", "bg-vazio"],
  ["Carvão", "#2A2724", "bg-carvao"],
  ["Deep", "#211F1C", "bg-deep"],
  ["Panel", "#33302C", "bg-panel"],
  ["Sombra", "#6B675D", "bg-sombra"],
  ["Duna", "#B8B1A2", "bg-duna"],
  ["Piedra", "#E0DAC9", "bg-piedra"],
  ["Bone", "#F2EFE7", "bg-bone"],
];

const KPI: Record<Status, [string, string]> = { fato: ["2.000", "Clientes na base"], hipotese: ["27", "Pedidos estimados"], gargalo: ["1.400", "Sumidos"], sem_info: ["?", "Efeito da mensagem"] };

export default function UiPage() {
  const sk = carlaSketchSeed();
  const monthly = [
    ["2026-06", 41, 0.66],
    ["2026-07", 44, 0.69],
    ["2026-08", 52, 0.72],
    ["2026-09", 47, 0.68],
    ["2026-10", 58, 0.71],
    ["2026-11", 63, 0.73],
  ].map(([m, v, s]) => ({ month: m as string, rentedCents: Math.round((v as number) * (s as number) * 100_000), builtCents: Math.round((v as number) * (1 - (s as number)) * 100_000) }));
  return (
    <main id="conteudo" className="max-w-[1120px] mx-auto px-4 md:px-6 py-10 flex flex-col gap-12">
      <PageHeader label="Design system · Terra Neutra" title="A gramática do traço." sub="Todo dado ou insight tem um estado. Fato é traço sólido; hipótese, tracejado; gargalo, hachura; sem informação, pontilhado. O estado é um campo do dado, não só um estilo." />

      <section aria-labelledby="marca" className="flex flex-col gap-4">
        <h2 id="marca" className="lbl">
          Símbolo e tipografia
        </h2>
        <div className="flex items-center gap-8 flex-wrap">
          <GroundMark width={160} />
          <div className="flex flex-col gap-2">
            <span className="font-display font-extrabold text-3xl uppercase">Archivo 800 · títulos</span>
            <span className="font-body">Montserrat · texto corrido, frases curtas.</span>
            <Say>Fraunces · frases de destaque.</Say>
            <Label>IBM Plex Mono · rótulos</Label>
          </div>
        </div>
      </section>

      <section aria-labelledby="cores">
        <h2 id="cores" className="lbl">
          Cores
        </h2>
        <ul className="list-none p-0 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLORS.map(([n, hex, cls]) => (
            <li key={n} className="flex flex-col gap-1.5">
              <span className={`h-16 rounded-xl border border-[var(--rule)] ${cls}`} aria-hidden />
              <b className="text-sm">{n}</b>
              <code className="font-mono text-xs text-duna">{hex}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="estados" className="flex flex-col gap-4">
        <h2 id="estados" className="lbl">
          Card · nos quatro estados
        </h2>
        <StatusLegend />
        <div className="grid md:grid-cols-2 gap-3.5">
          {STATUSES.map((s) => (
            <Card key={s} status={s} title={STATUS_LABEL[s]}>
              <p className="m-0 text-sm text-duna">Card com status=&quot;{s}&quot;. O selo sempre traz o texto, não só o traço.</p>
            </Card>
          ))}
        </div>
        <h2 className="lbl mt-4">Kpi · nos quatro estados</h2>
        <KpiRow>
          {STATUSES.map((s) => (
            <Kpi key={s} status={s} label={KPI[s][1]} value={KPI[s][0]} detail={STATUS_LABEL[s]} />
          ))}
        </KpiRow>
        <h2 className="lbl mt-4">StatusTag</h2>
        <div className="flex gap-5 flex-wrap">
          {STATUSES.map((s) => (
            <StatusTag key={s} status={s} />
          ))}
        </div>
        <h2 className="lbl mt-4">ChannelCard · nos quatro estados</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {STATUSES.map((s, i) => (
            <ChannelCard key={s} title={["Clubes de corrida", "Nutricionistas", "Provas de rua", "Perfis"][i]} detail={STATUS_LABEL[s]} priority={4 - i} inPlan={i !== 3} status={s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="ciclo" className="flex flex-col gap-4">
        <h2 id="ciclo" className="lbl">
          LoopIndicator
        </h2>
        {([0, 1, 2, 3] as const).map((i) => (
          <LoopIndicator key={i} current={i} />
        ))}
      </section>

      <section aria-labelledby="missao" className="grid lg:grid-cols-2 gap-7 items-start">
        <h2 id="missao" className="lbl lg:col-span-2">
          MissionCard e WhatsAppPreview
        </h2>
        <MissionCard why={["São clientes do grupo Em risco e de Compra única recente.", "A mensagem fala de cuidado, não de desconto."]} estimate={{ orders: 27, revenue: "R$ 4.050", rateLabel: "Se 15% responderem" }} />
        <WhatsAppPreview storeName="Fôlego Nutrição" initial={"Oi, [nome]! Aqui é a Carla, da Fôlego. Vi que faz uns 45 dias que você levou o seu whey, então ele deve estar perto do fim.\n\nSeparei o seu sabor de sempre. Quer que eu reserve?"} />
        <div className="flex flex-col gap-2.5 lg:col-span-2">
          <CheckMission title="Falar com três nutricionistas esportivas" detail="Levar amostras e a ficha do rótulo." category="Conectoras" done={false} />
          <CheckMission title="Oferecer amostras num clube de corrida" detail="60 sachês com QR code para a loja." category="Clubes" done />
        </div>
      </section>

      <section aria-labelledby="chat" className="grid lg:grid-cols-2 gap-7">
        <h2 id="chat" className="lbl lg:col-span-2">
          ChatThread · texto, áudio e imagem
        </h2>
        <ChatThread
          appName="Sketch"
          messages={[
            { from: "app", kind: "texto", text: "O que a sua marca tem que as outras não têm?" },
            { from: "lojista", kind: "audio", duration: "0:14", transcript: "O nosso whey é limpo, sem adoçante artificial." },
            { from: "lojista", kind: "imagem", images: [{ title: "Print 1", caption: "Respostas no WhatsApp" }] },
            { from: "app", kind: "texto", text: "Anotado. Vou cruzar com as avaliações." },
          ]}
        />
        <div className="flex flex-col gap-3">
          <Label>Botões</Label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="solid">Próximo →</Button>
            <Button>← Anterior</Button>
            <Button disabled>Desativado</Button>
          </div>
          <Label className="mt-4">VsRow</Label>
          <VsRow label="Receberam a mensagem" rate={0.18} kind="own" />
          <VsRow label="Grupo de comparação" rate={0.05} kind="base" />
        </div>
      </section>

      <section aria-labelledby="matriz" className="flex flex-col gap-3">
        <h2 id="matriz" className="lbl">
          Matrix · o terreno ao redor, com a coluna de espaço vazio
        </h2>
        <Matrix matrix={sk.matrix} gapColumn={3} />
      </section>

      <section aria-labelledby="grafico" className="border border-[var(--rule)] rounded-[14px] p-[22px] bg-deep">
        <h2 id="grafico" className="lbl">
          Receita alugada × construída
        </h2>
        <RentedBuiltChart data={monthly} />
      </section>
    </main>
  );
}
