# Fases de construção

Cada fase termina com um **relatório de entrega** (veja o item 7 do `CLAUDE.md`) e só segue para a próxima com a aprovação dos sócios. Os textos em blocos abaixo são os comandos para colar no Claude Code, um por vez.

---

## Fase 0 — Fundação

```
Leia CLAUDE.md e todos os arquivos de docs/, incluindo os protótipos em docs/prototipos/ (abra os HTML e entenda as telas). Depois:
1. Me devolva um plano curto da Fase 0 e as perguntas que bloqueiam a execução. Espere minha resposta antes de criar contas externas.
2. Crie o monorepo (apps/web, packages/core, packages/ui, packages/ai), com CI, lint, testes e o ambiente de staging.
3. Monte o design system Terra Neutra em packages/ui, com os componentes listados no CLAUDE.md, e uma página /ui que mostre todos eles nos quatro estados da gramática do traço.
4. Implemente autenticação, organizations, memberships, entitlements (quais módulos cada organização assinou) e o provedor de billing "manual".
5. Crie o modelo de dados central (customers, orders, order_items, products, data_sources, domain_events) com RLS e testes de RLS.
6. Crie o painel interno da Ground (/admin), restrito aos sócios: lista de contas e liberação manual de plano.
7. Faça o deploy em staging e me mande o link.
```

**Pronto quando:** o login funciona, a página /ui está fiel aos protótipos, os testes de RLS passam e o staging está no ar.

## Fase 1 — Marco Zero com planilha (o MVP de validação)

```
Construa o Marco Zero conforme docs/PRD_Marco_Zero.md, seções 2.1 (só planilha), 2.2 a 2.9 e o painel interno da seção 4, com a ponte para o ECOM da 2.10.
- Crie a seed da Carla (Fôlego Nutrição, 2.000 clientes, 3.412 pedidos) como planilha CSV bagunçada de propósito: colunas com nomes diferentes, cadastros repetidos e uma coluna de CPF que deve ser descartada.
- Escreva primeiro os testes dos cálculos (recompra, tempo até a 2ª compra, LTV, receita alugada x construída, grupos, dinheiro parado, atribuição com grupo de comparação, evolução dos aprendizados) e depois implemente.
- O ciclo semanal precisa rodar de verdade: rotina agendada que fecha a semana, lembrete por e-mail do check-in, resultado e nova missão. Crie também um botão "avançar uma semana" só em staging, para demonstrar.
- Os três caminhos do check-in (todas, parte, nenhuma) precisam gerar resultado e ajuste coerentes, como no protótipo v2.
- Registre o custo de IA por organização.
Ao terminar, me entregue um roteiro de teste com uma planilha real anonimizada.
```

**Pronto quando:** um lojista real consegue subir a planilha dele e passar por um ciclo completo, de missão a ajuste.

> **Recomendação do Conselho:** pare aqui e valide com 5 lojistas antes de seguir. A métrica que decide é o **check-in respondido 4 semanas seguidas**.

## Fase 2 — Nuvemshop + cobrança

```
1. Integre a Nuvemshop como app (leia a documentação atual de parceiros): OAuth, importação do histórico de pedidos e clientes, webhooks de pedido novo e de desinstalação, e os webhooks de privacidade/LGPD exigidos. Sincronização idempotente.
2. Implemente o motor de preços de docs/Precificacao.md (tabela pricing_rules versionada, editável no /admin) e o fluxo de upgrade do Marco Zero: recálculo da faixa, aviso em tom de conquista, carência e upgrade só com aceite. Escreva os testes da seção 4 do documento.
3. Integre o gateway de pagamento escolhido pelos sócios (pergunte antes qual será) atrás da interface de billing: assinatura recorrente, Pix e cartão, tela de plano, cancelamento e exclusão de dados.
4. Coloque o freemium atrás de feature flag ("primeira leitura grátis"), desligado por padrão.
Não submeta o app à loja da Nuvemshop sem aprovação.
```

## Fase 3 — Sketch

```
Construa o Sketch conforme docs/PRD_Sketch.md, nos dois caminhos.
- Conversa com texto, áudio (transcrição) e imagem.
- Persona com citações rastreáveis até a fonte; matriz do terreno com espaço vazio; mapa de canais com No plano / Fora do plano; teste de tráfego com verba, prazo e regra de parada; plano mensal; 3 missões por semana; check-in; primeiros sinais; ajuste mensal.
- Códigos de origem (UTM, código de indicação, QR code) para cada canal e missão.
- Seeds do João (caminho 1) e da Carla (caminho 2), fiéis aos protótipos.
- Pesquisa de concorrência real (PRD, seção 2.3.1): agente de pesquisa com busca na web e APIs oficiais, e toda afirmação com URL, data e evidência. Antes de ativar fontes, me mande a lista com o termo de uso de cada uma.
- Sugestão de upgrade de Início para Completo (docs/Precificacao.md, seção 3).
```

## Fase 4 — Integração Sketch ↔ Marco Zero

```
Implemente docs/Integracao.md inteiro: eventos e consumidores idempotentes, entitlements, a visão "Ciclo" na página inicial, o check-in semanal unificado, o mini-grupo "Novas do Sketch", a recompra por canal de origem repriorizando os canais do Sketch, a cobrança combinada com 20% de desconto, a tela "Monte o seu terreno", a gamificação de docs/Precificacao.md (só depois do aval dos sócios sobre as mecânicas), as sugestões cruzadas de combo e os testes obrigatórios da seção 6.
```

## Fase 5 — Expansão (só depois da validação)

- Integração com a Shopify.
- Check-in pelo WhatsApp, via WhatsApp Business Platform oficial. Exige aprovação da Meta e tem custo por conversa; traga a proposta de custo antes.
- Resumo semanal por e-mail com o placar do ciclo.
- Avaliar se o app passa a enviar as mensagens das missões. **Decisão dos sócios:** muda a natureza do produto ("a Ground dirige, não produz").
