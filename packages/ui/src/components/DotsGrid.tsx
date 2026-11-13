"use client";
import { useEffect, useRef } from "react";

/** Um quadradinho por cliente sumida; os destacados são as que voltariam. */
export function DotsGrid({ total, highlighted }: { total: number; highlighted: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    const cols = 50;
    const pad = 18;
    const s = (c.width - pad * 2) / cols;
    const rows = Math.ceil(total / cols);
    c.height = Math.max(120, Math.ceil(rows * s + pad * 2));
    x.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < total; i++) {
      const cx = pad + (i % cols) * s;
      const cy = pad + Math.floor(i / cols) * s;
      // espalha as que voltam, sem formar um bloco
      const on = (i * 977) % total < highlighted;
      if (on) {
        x.fillStyle = "#F2EFE7";
        x.fillRect(cx + 2, cy + 2, s - 5, s - 5);
      } else {
        x.strokeStyle = "rgba(184,177,162,.45)";
        x.lineWidth = 1;
        x.setLineDash([2, 2]);
        x.strokeRect(cx + 2.5, cy + 2.5, s - 6, s - 6);
        x.setLineDash([]);
      }
    }
  }, [total, highlighted]);
  return (
    <canvas
      ref={ref}
      width={760}
      height={460}
      className="w-full h-auto block border border-[var(--rule)] rounded-xl bg-deep"
      role="img"
      aria-label={`${total.toLocaleString("pt-BR")} quadrados, um por cliente; ${highlighted.toLocaleString("pt-BR")} destacados são as que voltariam`}
    />
  );
}
