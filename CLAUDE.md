# Ground Apps — contexto permanente do projeto

Você vai construir e publicar dois produtos digitais da **Ground Project**, um estúdio de estratégia de Marca, Marketing e Produto do Rio de Janeiro: o **Ground Marco Zero** e o **Ground Sketch**. Eles ficam numa mesma plataforma, com conta, login e dados compartilhados, e conversam entre si quando o cliente assina os dois.

Leia este arquivo inteiro antes de qualquer tarefa. Depois, leia os documentos em `docs/`:

| Arquivo | O que tem |
| --- | --- |
| `docs/PRD_Marco_Zero.md` | Requisitos do Marco Zero |
| `docs/PRD_Sketch.md` | Requisitos do Sketch |
| `docs/Integracao.md` | Como os dois apps se alimentam |
| `docs/Precificacao.md` | Escada de preço de cada módulo, combo gamificado e upgrade |
| `docs/FASES.md` | A ordem de construção e o critério de pronto de cada fase |
| `docs/prototipos/` | Protótipos clicáveis em HTML. São a referência visual e de fluxo, com dados fictícios. |

Os protótipos mostram o comportamento esperado, mas não são código de produção. Reaproveite o design, não a implementação.

---

## 1. A tese, que deve aparecer em todo o produto

- **Inimigo:** o crescimento alugado, ou seja, crescer comprando atenção com anúncio, cupom e influenciador.
- **O contrário:** o crescimento construído, com marca, comunidade, recompra e indicação.
- **Tese-mãe:** *paid attention → owned ground*.
- **A Ground dirige, não produz.** Os apps mostram onde olhar e o que fazer, mas não executam pelo lojista: não disparam campanhas, não gerenciam anúncios e não postam conteúdo.
- **Não ataque a mídia paga.** O problema é depender só dela. O tráfego pago só aparece como teste pequeno, com verba e prazo definidos.

**A escada de produtos:**
1. **Ground Sketch:** a aquisição construída. Mostra quem é a cliente ideal, por que ela compraria e onde ela está.
2. **Ground Marco Zero:** a retenção e a recompra. Faz o raio-x da base de clientes e propõe uma missão por semana.
3. **Método ECOM:** a consultoria premium da Ground, fora destes apps. Os apps só convidam para ela quando detectam um gargalo estrutural.

Cada app vive sozinho, com assinatura própria e uma promessa completa. **Nunca trate um app como isca para outro produto.**

**Frases de produto, que devem ser usadas como estão:**
- Marco Zero: "A venda que você procura já está na sua base." e "Em vez de investir mais em anúncio, recupere quem já te conhece. É mais barato e mais rápido."
- Sketch: "Você sai com o plano e já dá os primeiros passos." e "Aquisição construída, não alugada."

## 2. Regras de produto que não se negociam

1. **Os apps nunca prometem resultado.** Eles entregam leitura, plano e missões. Toda estimativa vem rotulada como hipótese.
2. **Nada de guerra de preço.** Não existe monitoramento de preço da concorrência, e as missões não usam cupom como alavanca padrão. A concorrência é lida pelo que promete e pelo que as clientes reclamam dela.
3. **A gramática do traço** marca o estado de todo dado ou insight exibido:
   - **Fato:** traço sólido. Confirmado pelos dados.
   - **Hipótese:** traço tracejado. Ainda pode mudar.
   - **Gargalo:** hachura. É onde o crescimento trava, ou o espaço vazio no mercado.
   - **Sem informação:** pontilhado ou vazado.

   Esse estado é um campo do dado (`status: fato | hipotese | gargalo | sem_info`), e não só um estilo visual. A IA tem de devolvê-lo em toda saída estruturada.
4. **Mostrar onde olhar, sem entregar o diagnóstico da consultoria.** Quando o problema é estrutural (marca, produto, operação, comunidade), o app mostra o sinal e convida para conversar com a Ground. Não resolve o porquê.
5. **Medir sozinho e perguntar pouco.** Tudo o que a loja mostra é medido automaticamente. O lojista só responde o que só ele sabe, em menos de 1 minuto por semana.
6. **Linguagem:** português do Brasil, frases curtas, tom próximo e sem jargão. Fale com o lojista na 2ª pessoa ("você"). Nada de "guru", "hack" ou "explodir vendas".

## 3. Identidade visual (design system "Terra Neutra")

Extraia os tokens dos protótipos em `docs/prototipos/` e transforme em design system com Tailwind e componentes.

- **Cores:**
  - Vazio `#0A0A0A`
  - Carvão `#2A2724`, o fundo principal
  - Sombra `#6B675D`
  - Duna `#B8B1A2`, para rótulos
  - Piedra `#E0DAC9`
  - Bone `#F2EFE7`, para texto e traço
  - Tons derivados usados nos protótipos: deep `#211F1C` e panel `#33302C`
- **Fontes:**
  - Archivo (títulos, peso 800)
  - Montserrat (texto)
  - Fraunces (frases de destaque, em serifa)
  - IBM Plex Mono (rótulos em caixa alta com espaçamento largo)
- **Símbolo:** a linha de terra com hachura. O PNG está embutido como máscara nos protótipos.
- **Componentes a criar desde o início:**
  - `Card` com a variante de estado (`fato | hipotese | gargalo | sem_info`)
  - `Kpi`
  - `ChatThread`, com mensagens de texto, áudio e imagem
  - `MissionCard`
  - `WhatsAppPreview` (bolha editável com botão Copiar)
  - `LoopIndicator` (Missão → Check-in → Resultado → Ajuste)
  - `Matrix` (o terreno ao redor, com a coluna de espaço vazio)
  - `ChannelCard`
  - `StatusLegend`
- O layout precisa ser responsivo de verdade: o lojista usa muito pelo celular. Respeite as regras de acessibilidade AA, `prefers-reduced-motion` e a navegação por teclado.

## 4. Stack recomendada

Proponha mudanças se tiver um motivo forte, mas peça aprovação antes de trocar.

- **App:** Next.js (App Router) + TypeScript + Tailwind, num monorepo único com `apps/web`, `packages/core` (domínio e cálculos), `packages/ui` e `packages/ai`.
- **Banco, autenticação e arquivos:** Supabase (Postgres + Auth + Storage), **na região de São Paulo**. Toda tabela com dados de loja tem Row Level Security por `organization_id`.
- **Rotinas agendadas:** o fechamento semanal de missões, a sincronização com as lojas e o recálculo de métricas rodam em fila ou cron (Supabase Cron, Inngest ou equivalente), de forma idempotente.
- **IA:** a API da Anthropic (Claude), concentrada em `packages/ai`, com prompts versionados em arquivos, saída em JSON validada com Zod e registro de custo por chamada e por organização.
- **E-mail:** Resend ou equivalente, para o lembrete semanal de check-in e o resumo da semana.
- **Pagamento:** uma camada `billing` com interface própria. O gateway ainda não foi decidido: Asaas e Pagar.me (Pix e boleto recorrente) ou Stripe. Implemente primeiro um provedor "manual" que permite liberar o plano pelo painel interno e deixe o real atrás da interface.
- **Deploy:** Vercel (app) + Supabase. Haverá dois ambientes, `staging` e `production`.
- **Qualidade:**
  - testes unitários (Vitest) para **todos** os cálculos de métrica, segmentação, atribuição e preço, com fixtures em CSV
  - testes de RLS
  - um teste de ponta a ponta (Playwright) por fluxo principal
  - CI no GitHub Actions

## 5. Dados pessoais (LGPD)

O lojista é o **controlador** dos dados das clientes dele; a Ground é a **operadora**.

- **Coleta mínima.** O Marco Zero só precisa saber quem comprou, quando, quanto e o contato. Não importe CPF, endereço nem dados de pagamento. Descarte essas colunas na leitura da planilha.
- **Proteção.** Criptografe telefone e e-mail em repouso e guarde os tokens de integração num cofre de segredos. Nada de dado pessoal nos logs.
- **Prints do check-in.** Extraia o conteúdo e apague a imagem depois de 30 dias (prazo configurável). Guarde só o resumo classificado, sem nome de cliente.
- **Exclusão.** Ao cancelar a conta ou quando o lojista pedir, apague os dados em até 30 dias. Implemente também os webhooks de privacidade exigidos por Nuvemshop e Shopify.
- **Textos legais.** Crie as páginas de Termos de uso e Política de privacidade como *rascunho marcado*. A versão final passa por advogado e não deve ser publicada como definitiva.

## 6. O que você NÃO decide sozinho

Pare e pergunte aos sócios (Luca e Igor) antes de:
- comprar domínio, criar conta paga ou usar chave de produção;
- publicar em produção, ou submeter o app à loja da Nuvemshop ou da Shopify;
- fixar preços, regras de teste grátis ou mecânicas de gamificação. Os valores dos planos são **hipóteses** e ficam configuráveis no painel interno;
- ativar uma fonte nova de pesquisa de concorrência que dependa de provedor terceiro ou de termos de uso duvidosos;
- mudar a stack, as regras da seção 2 ou o modelo de dados central;
- enviar qualquer mensagem às clientes do lojista. **Os apps não disparam mensagens** nesta versão: o lojista copia e envia por conta própria.

## 7. Como trabalhar

- Trabalhe **por fases**, seguindo `docs/FASES.md`. No fim de cada fase, pare e entregue:
  - o que foi feito
  - o link de staging
  - como testar
  - o que ficou de fora
  - as decisões que precisam dos sócios
- Mantenha os dados fictícios da **Carla (Fôlego Nutrição, 2.000 clientes)** e do **João (Brutal Wear, sem base)** como seed de demonstração, iguais aos dos protótipos. O modo demo precisa funcionar sem nenhuma integração.
- Mantenha um `docs/DECISOES.md`, onde cada decisão técnica relevante ganha uma linha com data e motivo.
- Antes de usar qualquer API externa (Nuvemshop, Shopify, Meta, gateway), leia a documentação **atual** e não confie em memória. As APIs mudam.
