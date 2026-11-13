import { NextResponse } from "next/server";
import { generateCarlaSeed } from "@ground/core/seeds";

/** Planilha de exemplo da Fôlego (dados fictícios, bagunçada de propósito). Só fora de produção. */
export async function GET() {
  if (process.env.APP_ENV === "production") return new NextResponse("Não disponível", { status: 404 });
  return new NextResponse("﻿" + generateCarlaSeed().csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="folego-pedidos-exemplo.csv"' },
  });
}
