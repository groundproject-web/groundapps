# PRD — Ground Sketch

**O que é:** "O esboço antes da construção." O Sketch ajuda o lojista a encontrar a cliente certa, aquela com chance de recomprar, sem depender de anúncio. Ele mostra quem ela é, por que compraria, quem mais disputa essa cliente, onde ela está e qual é o plano do mês, com missões semanais.

**Promessa:** "Você sai com o plano e já dá os primeiros passos." A Ground entrega o plano e **nunca promete clientes**.

**Espaço de mercado:** as peças já existem soltas no mercado (gerador de persona, leitura de avaliações, inteligência de anúncios). Ninguém junta tudo numa leitura de marca, e é isso que o Sketch faz.

**Referências:**
- `prototipos/sketch-panfleto.html`
- `prototipos/sketch-joao-sozinho.html` (caminho 1)
- `prototipos/sketch-carla-com-marco-zero.html` (caminho 2)

---

## 1. Dois caminhos

| | Caminho 1: Sketch sozinho | Caminho 2: Sketch com o Marco Zero |
| --- | --- | --- |
| Para quem | Quem está começando, sem base de clientes ou vendendo pouco | Quem já usa o Marco Zero |
| Ponto de partida | A conversa e o que o público já escreve | As clientes fiéis e em risco importadas do Marco Zero, com as avaliações delas |
| A persona sai como | **Hipótese** (forte ou fraca) | **Fato**, quando ancorada em clientes que recompram |

## 2. As cinco partes

### 2.1 Entrada (conversa)
- Uma conversa por **texto, áudio e print**. O áudio é transcrito, e a IA lê imagens.
- **Perguntas-guia:**
  - "Me conta da sua marca do jeito que você contaria para um cliente."
  - "O que a sua marca tem que as outras não têm?"
  - os canais onde já vende
  - os concorrentes que o lojista conhece
- **No caminho 2:** um cartão "Importado do Marco Zero: N clientes que já compraram mais de uma vez (fiéis + em risco)".
- **No caminho 1:** o cartão "Base de clientes: sem informação ainda. Tudo bem: o Sketch funciona sozinho."

### 2.2 Quem é a cliente
- **Fontes, em ordem de confiança:**
  1. avaliações e respostas das clientes que recompram, vindas do Marco Zero
  2. comentários e avaliações da própria marca, enviados pelo lojista (prints, CSV, texto colado ou link da própria loja)
  3. o que é público sobre marcas parecidas
- **O que a IA entrega:**
  - o perfil, como "Mulher de 30 a 45 anos que corre", com o estado (fato ou hipótese) e o tamanho da evidência ("412 avaliações lidas")
  - a **frase mais citada, nas palavras da cliente** ("Não pesa no estômago.")
  - as expressões mais frequentes, com contagem
  - a dor, o desejo e o motivo da compra
- **Regra:** as frases mostradas têm de ser **citações reais** das fontes lidas, nunca inventadas. Cada uma guarda a referência da origem.

### 2.3 O terreno ao redor
- **Concorrentes:** 3 a 6 que disputam a mesma cliente, de porte parecido, inclusive os que o lojista não conhece. Eles são sugeridos pela IA e confirmados pelo lojista.
- **Matriz de promessas:** as marcas nas linhas, as promessas e atributos nas colunas (performance, "treine duro", sabor, digestão leve, rótulo limpo…) e um ponto para quem promete.
- **O espaço vazio:** a coluna que ninguém ocupa e que coincide com uma dor ou um desejo da cliente. Ela aparece **hachurada**, com o estado "gargalo/espaço vazio", e gera a "Hipótese a testar" com a mensagem principal.
- **Proibido:** monitoramento de preço e "quem cobra menos". A pergunta é sempre "que espaço ninguém ocupa?".

### 2.3.1 Pesquisa de concorrência real (requisito central)
**Decisão dos sócios:** a pesquisa de concorrência tem de ser **real e baseada em dados**, não uma inferência da IA. Toda sugestão de diferenciação, de aquisição ou de retenção nasce do que foi encontrado e mostra a fonte.

**Como a pesquisa funciona:**
- **Agente de pesquisa** em `packages/ai`, usando a ferramenta de busca na web da API da Anthropic (ou outra API de busca) e leitura de páginas.
- **O agente descobre os concorrentes** com base na categoria, na persona e na região, e confirma a lista com o lojista.
- **Para cada concorrente, ele levanta:**
  - o posicionamento e as promessas: site, páginas de produto, embalagem e descrição
  - os canais onde a marca está presente
  - os conectores e eventos associados
  - **o que as clientes reclamam e elogiam**

**Regra:** cada célula da matriz e cada afirmação sobre um concorrente guarda a **URL, a data da coleta e o trecho de evidência**. Uma afirmação sem fonte aparece como "sem informação", e não como fato.

**A pesquisa se atualiza:**
- no Sketch Completo, todo mês
- no Sketch Início, na entrada e quando o lojista pedir
- o app mostra o que mudou desde a última leitura

**Fontes permitidas, em ordem de preferência:**
1. **APIs oficiais.**
   - Para reviews públicos de lojas físicas: Google Places.
   - Para anúncios ativos: a biblioteca de anúncios da Meta. **Verifique o que a API cobre no Brasil** para anúncios não políticos; se não cobrir, use a consulta pontual pela própria página pública da biblioteca.
   - APIs públicas de marketplaces que ofereçam avaliações e perguntas de produtos (verifique Mercado Livre e afins).
   - Instagram Graph API, para dados públicos de contas comerciais via Business Discovery, a partir da conta do lojista conectada.
2. **Páginas públicas** buscadas e lidas pontualmente pelo agente, respeitando o robots.txt e um volume baixo de requisições, com cache.
3. **Material que o lojista enviar:** prints, links e textos colados.
4. **Provedores de dados de terceiros** (serviços de coleta de reviews ou de redes): só depois de uma análise dos termos de uso, e **com o aval dos sócios**, porque o risco jurídico muda de mãos mas não desaparece.

**Fora:**
- coleta em massa ou contínua que contorne login, bloqueio ou limite de uso
- dados pessoais de clientes dos concorrentes: guarde só o conteúdo e a frequência das reclamações, nunca nome ou perfil de quem escreveu

Registre em `DECISOES.md` cada fonte ativada e o termo de uso consultado. Antes de ativar qualquer fonte da categoria 4, traga a lista para os sócios.

### 2.4 Onde ela está
- **Mapa de canais:** grupos, comunidades, perfis, **conectores** (nutricionistas, personal trainers, coaches, clubes de corrida), eventos e provas.
- **Cada canal mostra:** a descrição concreta ("8 clubes com treinos abertos aos sábados"), a prioridade de 1 a 4 e o botão **No plano / Fora do plano**.
- **Teste de tráfego:**
  - entra só quando faz sentido
  - verba e prazo definidos (exemplo: R$ 300 por 14 dias)
  - serve para testar **uma mensagem**
  - tem regra de parada ("Se não validar, para")
  - no caminho 1, aparece como "depois", até a mensagem estar validada no boca a boca

### 2.5 Plano e missões
- **O plano do mês** e **3 missões por semana**, cada uma com:
  - título
  - detalhe prático
  - categoria (Conectores, Clubes, Conteúdo, Eventos…)
  - material pronto quando couber (roteiro de conversa, texto de carrossel, roteiro de vídeo)
- O lojista marca cada missão como feita.
- **Primeiros sinais**, medidos no fim do mês: conversas iniciadas, indicações de conectores e vendas para clientes novas.
  - Com a loja conectada, as vendas novas são **medidas**.
  - Sem a loja, elas são **informadas** pelo lojista e ficam como hipótese.
- **Ajuste mensal:** a mesma lógica do Marco Zero. O que trouxe sinal continua, o que não trouxe muda ou sai, e tudo vira aprendizado.
- **Check-in semanal:** um check-in curto, como no Marco Zero ("Fez as missões? O que aconteceu?"), com a mesma conversa e os mesmos botões.

### 2.6 Rastreio da aquisição (essencial para a integração)
Toda missão ou canal do Sketch gera um **código de origem**, para que o Marco Zero consiga medir depois se a cliente trazida por aquele canal recompra:
- **link com UTM:** `utm_source=sketch&utm_campaign=<canal>`
- **código de indicação por conector:** o código sem desconto é o padrão; se o lojista quiser oferecer um benefício, ele decide
- **QR code** para amostras e eventos
- **pergunta "Como você nos conheceu?"** no checkout, quando a plataforma permitir

## 3. O momento de subir de degrau (caminho 1)
Quando o lojista sem base passa a ter clientes voltando (exemplo: 38 clientes com contato, 7 com duas compras, 41 dias até a 2ª compra), o Sketch sugere conhecer o Marco Zero **uma vez**, com as opções "Conhecer o Marco Zero" e "Agora não, seguir com o Sketch". Sem pressa e sem empurrar. Se o lojista recusar, a sugestão só volta depois de 60 dias.

## 4. Planos e upgrade

O documento completo está em `docs/Precificacao.md`. Em resumo:
- **Planos:** Início R$ 67 e Completo R$ 147 (valores são hipótese e ficam configuráveis).
- **O Sketch Início fica abaixo do Marco Zero de propósito:** ele é a porta mais barata da escada.
- **Sugestão de upgrade para o Completo** quando o uso pede, por exemplo:
  - o lojista tenta abrir o teste de tráfego guiado
  - o espaço vazio está validado
  - o terreno ao redor está desatualizado há mais de 60 dias
- **Combo com o Marco Zero:** 20% de desconto + a gamificação.

## 5. Critério de pronto (Fase 3)
As simulações do João (caminho 1) e da Carla (caminho 2) rodam ponta a ponta em staging com dados de seed. Toda frase de cliente exibida precisa ter uma fonte guardada, e os códigos de origem precisam ser gerados para cada canal e missão.
