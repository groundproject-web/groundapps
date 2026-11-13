# Relatório de entrega · rodada 1 (Fases 0, 1, 3 e 4 em modo local)

Data: 13/11/2026. Escopo pedido: "todas as fases possíveis" sem contas externas. As chaves de staging ainda não chegaram, então **não há link de staging**: tudo roda local, com o mesmo código que vai para Vercel + Supabase.

## O que foi feito

**Fase 0 — Fundação**
- Monorepo (`apps/web`, `packages/core`, `packages/ui`, `packages/ai`), lint, tipos, testes e CI no GitHub Actions.
- Design system Terra Neutra em `packages/ui` com os componentes pedidos: `Card` (4 estados), `Kpi`, `ChatThread` (texto, áudio, imagem), `MissionCard`, `WhatsAppPreview` (editável + Copiar), `LoopIndicator`, `Matrix` (espaço vazio hachurado), `ChannelCard`, `StatusLegend`. Página `/ui` com todos nos quatro estados.
- Autenticação (local agora; Supabase Auth por variável de ambiente), organizações, membros, entitlements e provedor de cobrança **manual**.
- Modelo de dados central (customers, orders, order_items, products, data_sources, domain_events, …) com **RLS por organização** e **18 testes de RLS** rodando num Postgres real (PGlite).
- Painel interno `/admin`: contas (plano, faixa, última atividade, % de check-in respondido), liberação manual de plano, pendências (gargalos e "Converse com a Ground"), regras de preço versionadas, janela de atribuição e % do grupo de comparação por loja, custo de IA por conta.

**Fase 1 — Marco Zero com planilha**
- Planilha CSV bagunçada → mapeamento (IA propõe; CPF/endereço sempre descartados) → cadastros repetidos (junção automática por e-mail **e** telefone; pares em dúvida para o lojista, com desfazer) → números (recompra, 2ª compra, LTV, alugada × construída por mês) → dinheiro parado com simulador e grade → grupos (com ciclo de recompra por produto) → missão (lista, grupo de comparação de 15%, mensagem editável com [nome], exportar CSV, estimativa como hipótese) → check-in em conversa (todas / parte / nenhuma, bloqueios, respostas coladas ou prints) → resultado (com × sem mensagem, por grupo, Funcionou/Travou/Apareceu) → ajuste (continua/conserta/menor, bloqueios moldam o formato) → aprendizados (fato · testado N×, descartado após 2 falhas, ajustado) → evolução da receita construída semana a semana.
- Ciclo semanal real: rota de cron idempotente (lembrete por e-mail, recálculo dos grupos, faixa de preço, limpeza de prints, gargalo estrutural) + botão **"Avançar uma semana"** só fora de produção.
- Gargalo estrutural (3 semanas seguidas) → alerta no /admin, e-mail para a Ground e link "Converse com a Ground".
- Seed da Carla igual ao protótipo (conferida por teste).
- Custo de IA registrado por organização.

**Fase 2 — parcial**: motor de preços (`pricing_rules` versionada, editável no /admin), upgrade de faixa (aviso em tom de conquista → 30 dias de carência → só com aceite) e testes da seção 4 do Precificacao.md. Freemium atrás de flag, desligado. **Nuvemshop e gateway não foram feitos** (ver abaixo).

**Fase 3 — Sketch**: os dois caminhos (João sozinho, Carla com o Marco Zero): conversa com texto/áudio/print, persona com citações **contadas nas fontes** (toque para ver a origem), matriz do terreno com fonte por célula e espaço vazio, mapa de canais (No plano / Fora do plano), teste de tráfego com verba, prazo e regra de parada, plano do mês, 3 missões com material pronto, check-in, primeiros sinais, ajuste do mês, códigos de origem (UTM, código de indicação, QR), sugestão do Marco Zero "uma vez" (volta só após 60 dias) e de Início → Completo por gatilho.

**Fase 4 — Integração**: eventos internos idempotentes (`domain_events` + consumidores), entitlements num lugar só (função SQL + core), visão "Ciclo" na página inicial, "Novas do Sketch" nos grupos, recompra por canal repriorizando os canais, "Monte o seu terreno" com 20% de combo, sugestões cruzadas, e os testes obrigatórios da seção 6 (assinatura desligada esconde na hora sem perder histórico, idempotência, atribuição única, fixture de recompra por canal, RLS entre organizações).

## Como testar

```bash
npm install
```

```bash
npm run dev
```

Roteiro (≈10 min), em http://localhost:3000/entrar:
1. **Carla** → Marco Zero → *Seu marco zero*, *Dinheiro parado* (arraste o controle), *Grupos*, *Missão* (edite a mensagem, Copiar, Exportar lista).
2. *Check-in* → **Avançar uma semana (staging)** → responda "Mandei para uma parte", 100, "Faltou tempo", cole respostas com 3 queixas de frete → *Resultado* → *Ajuste* (lotes de 50).
3. No *Check-in*, **Responder de outro jeito** e teste "Não consegui" + "receio de incomodar" (missão menor e mensagem mais curta).
4. Sketch (Carla) → *Primeiros sinais* → **Simular o mês do Sketch** → recompra por canal ("Clubes … 23 clientes; 9 já voltaram") e prioridades ajustadas.
5. **João** → Sketch sozinho: persona como hipótese forte, terreno, canais (toque para tirar do plano), missões, "Quando a base chega". Marco Zero bloqueado (vai para o plano).
6. **Criar conta** nova → *Plano* → pedir plano → sair → **Sócio** → liberar MZ2 na aba Contas → entrar com a conta nova → *Conexão* → subir `folego-pedidos-exemplo.csv` (link na tela) → confirmar o par em dúvida → marco zero.

Planilha real anonimizada: use o mesmo passo 6 com um CSV exportado da loja (mínimo: nome, data e valor; telefone e e-mail opcionais). CPF, endereço e pagamento podem vir: são descartados na leitura.

## Testes automatizados

- 199 testes unitários e de RLS (`npm test`): cálculos de métrica, grupos, dinheiro parado, ciclo de produto, grupo de comparação, atribuição nos três caminhos, aprendizados, gargalo estrutural, preço em todas as combinações, versão de regra, upgrade, gamificação, eventos, recompra por canal, citações rastreáveis, seed da Carla e o ciclo completo nos três caminhos do check-in.
- 6 testes de ponta a ponta (Playwright), todos passando: ciclo do Marco Zero, lojista novo com planilha, Sketch sozinho, Sketch integrado, celular sem rolagem horizontal (desktop e Pixel 7).
- Lint e checagem de tipos limpos; build de produção do Next passando.

**Atenção (máquina local):** o projeto está dentro do OneDrive. O OneDrive transforma arquivos de `node_modules` e `.next` em arquivos de nuvem e trava o build às vezes (`EPERM`). Recomendo mover a pasta para fora do OneDrive (ex.: `C:\dev\ground-apps`) ou excluir essas pastas da sincronização.

## O que ficou de fora

- **Staging no ar**: falta receber as chaves (Supabase São Paulo, Vercel, GitHub). O login via Supabase Auth está implementado mas não foi testado contra um projeto real.
- **Nuvemshop** (OAuth, histórico, webhooks de pedido/desinstalação/LGPD): precisa da conta de parceiro e da leitura da documentação atual antes de escrever o código.
- **Gateway de pagamento**: aguardando a escolha (Asaas, Pagar.me ou Stripe). Só o provedor manual existe.
- **XLSX** na importação (só CSV por ora).
- **Transcrição de áudio** automática (precisa de provedor).
- **Pesquisa de concorrência na web**: código pronto, desligado até os sócios aprovarem as fontes.
- **Storage de prints**: hoje o print é lido e descartado na hora (só o resumo fica). Com o Supabase Storage, o prazo de 30 dias já está modelado.
- **Exclusão efetiva em 30 dias**: o pedido é registrado e avisa a Ground; a rotina que apaga ainda não foi escrita.
- Shopify, WhatsApp e resumo semanal por e-mail (Fase 5).

## Decisões que precisam dos sócios

1. Gateway de pagamento: Asaas, Pagar.me ou Stripe?
2. Preços, teste grátis e freemium ("primeira leitura grátis"): os valores atuais são hipótese e estão no /admin.
3. Gamificação (níveis do terreno, bônus de constância): aprovar antes de ligar.
4. Regra ao fim da carência sem aceite do upgrade (missões limitadas ao teto da faixa).
5. Grupo extra "Voltaram há pouco" (lacuna da tabela de grupos).
6. Provedor de transcrição de áudio.
7. Fontes da pesquisa de concorrência (com termos de uso) antes de ligar `RESEARCH_ENABLED`.
8. Domínio e remetente de e-mail (Resend) e o e-mail que recebe os avisos da Ground.
9. Conta de parceiro da Nuvemshop.
