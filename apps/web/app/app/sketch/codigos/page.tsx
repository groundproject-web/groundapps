import QRCode from "qrcode";
import { PageHeader } from "@ground/ui";
import { getSkPage } from "@/lib/skPage";

export const metadata = { title: "Sketch · Códigos de origem" };

export default async function Codigos() {
  const { sk, data } = await getSkPage();
  const title = (key: string) => data?.channels.find((c) => c.key === key)?.title ?? key;
  const mission = (key: string | null) => (key ? sk.missions.find((m) => m.key === key)?.title : null);
  const rows = await Promise.all(sk.codes.map(async (c) => ({ ...c, svg: await QRCode.toString(c.utm_url, { type: "svg", margin: 1, color: { dark: "#2A2724", light: "#F2EFE7" } }) })));
  return (
    <>
      <PageHeader label="Códigos de origem" title="Cada canal e cada missão com o seu código." sub="Link com UTM, código de indicação (sem desconto por padrão: se quiser dar um benefício, a decisão é sua) e QR code para amostras e eventos. É assim que o Marco Zero mede se a cliente de cada canal volta." />
      <ul className="list-none p-0 m-0 grid md:grid-cols-2 gap-3.5">
        {rows.map((c) => (
          <li key={c.code} className="border border-[var(--rule)] rounded-[14px] p-4 bg-deep grid grid-cols-[96px_minmax(0,1fr)] gap-4 items-start">
            <div className="w-24 h-24 rounded-md overflow-hidden" role="img" aria-label={`QR code do código ${c.code}`} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="min-w-0 flex flex-col gap-1">
              <b className="font-display font-semibold">{title(c.channel_key)}</b>
              {mission(c.mission_key) && <span className="text-xs text-duna">Missão: {mission(c.mission_key)}</span>}
              <code className="font-mono text-sm">{c.code}</code>
              <a href={c.utm_url} className="text-xs text-duna underline underline-offset-4 break-all" rel="noreferrer" target="_blank">
                {c.utm_url}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="lbl tracking-[0.08em] mt-5">Quando a plataforma permitir, adicione a pergunta “Como você nos conheceu?” no checkout com estes códigos.</p>
    </>
  );
}
