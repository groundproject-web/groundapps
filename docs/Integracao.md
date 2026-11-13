# Integração — como o Sketch e o Marco Zero se alimentam

**O ciclo:** o Sketch traz a cliente certa e o Marco Zero faz ela voltar. Depois, o Marco Zero diz ao Sketch **quais canais trazem a cliente que volta**, e o Sketch reorienta a aquisição.

```
            ┌───────── clientes fiéis e em risco + avaliações ─────────┐
            │                                                          ▼
     [MARCO ZERO] ◀── clientes novas com código de origem ── [SKETCH]
            │                                                          ▲
            └── recompra por canal de origem (qual canal traz quem volta) ┘
```

## 1. Princípio de arquitetura

Os dois apps são **módulos da mesma plataforma**, e não dois sistemas que conversam por API externa:
- **conta compartilhada:** a mesma `organization`, os mesmos usuários e o mesmo login
- **uma só conexão com a loja:** Nuvemshop, Shopify ou planilha alimentam os dois
- **um só cadastro de clientes e pedidos:** as tabelas `customers` e `orders` vivem no `core`
- **cada módulo só enxerga o outro se a organização tiver as duas assinaturas ativas:** a checagem fica num único lugar (`entitlements`)
- **eventos internos:** um módulo publica numa tabela `domain_events` (ou fila) e o outro consome de forma idempotente. Nenhum módulo lê as tabelas internas do outro.

## 2. Contratos de dados (eventos)

| Evento | De → para | Quando | Conteúdo |
| --- | --- | --- | --- |
| `mz.loyal_segment.updated` | MZ → Sketch | Recálculo semanal dos grupos | IDs das clientes fiéis e em risco, contagens, produtos mais recomprados, ciclo de recompra por produto |
| `mz.customer_voice.classified` | MZ → Sketch | Depois de cada check-in com prints | Categorias e trechos (sem nome de cliente) das respostas: dores, pedidos, elogios |
| `sketch.acquisition_source.created` | Sketch → MZ | Ao criar uma missão ou canal | Código de origem, canal, missão, mensagem testada |
| `core.order.attributed_source` | Core → os dois | Pedido novo com UTM, código ou resposta de "como conheceu" | Pedido, cliente, código de origem |
| `mz.cohort_repurchase.by_source` | MZ → Sketch | Mensal | Para cada código de origem: clientes adquiridas, % que recomprou em 60 e em 90 dias, LTV parcial |
| `sketch.persona.updated` | Sketch → MZ | Quando a persona muda | Perfil, frases-chave e espaço vazio. O MZ usa no tom das mensagens das missões. |
| `any.structural_signal` | Os dois → painel interno | Sinal repetido por 3 semanas | Tipo do sinal, evidências, conta |

## 3. O que cada lado faz com o que recebe

**O Sketch, quando recebe do Marco Zero:**
- usa as clientes fiéis e em risco como **ponto de partida** da persona, que vira **fato** em vez de hipótese
- usa a voz das clientes dos check-ins como mais uma fonte da persona e do espaço vazio
- usa a **recompra por canal de origem** para repriorizar os canais. Exemplo: "Clubes de corrida trouxeram 23 clientes; 9 já voltaram. Nutricionistas trouxeram 12; 1 voltou." Os canais que trazem quem recompra sobem de prioridade, e os outros viram hipótese a revisar. **Este é o diferencial central da integração: a aquisição é medida pela recompra, não pela primeira venda.**

**O Marco Zero, quando recebe do Sketch:**
- cria um **mini-grupo "Novas do Sketch"** e acompanha a 2ª compra delas, com uma missão específica quando chegar o ciclo do produto
- usa a persona e as frases da cliente no tom das mensagens das missões
- mostra na receita construída quanto veio de clientes que o Sketch trouxe e voltaram

## 4. Experiência do cliente com os dois apps

- **Navegação:** troca entre Sketch e Marco Zero no topo, com a mesma loja e o mesmo login.
- **Uma visão "Ciclo" na página inicial**, com três números:
  - clientes novas trazidas pelo Sketch no mês
  - quantas já voltaram
  - a % da receita construída
- **Um único check-in semanal**, que cobre as missões dos dois apps numa conversa só. Não mande dois lembretes.
- **Cobrança:** uma assinatura combinada, com 20% de desconto e a gamificação (níveis do terreno e bônus de constância). Veja `docs/Precificacao.md`.
- **Sugestões cruzadas de combo:** quem usa só um módulo recebe a sugestão do outro quando os dados indicarem. As regras estão em `docs/Precificacao.md`, seção 3.

## 5. Sem a integração

- **Sketch sozinho:**
  - sem loja conectada, as vendas novas são informadas pelo lojista
  - com loja conectada (o lojista pode conectar mesmo sem o Marco Zero), as vendas novas por código de origem são medidas, mas **a recompra por canal fica bloqueada**, com o aviso: "Disponível com o Marco Zero."
- **Marco Zero sozinho:** funciona inteiro. O mini-grupo "Novas do Sketch" e a persona não aparecem.

## 6. Testes obrigatórios da integração

- Desligar uma assinatura esconde os dados do outro módulo na hora, sem perder o histórico.
- Os eventos são idempotentes: processar duas vezes não duplica nada.
- Um pedido com código de origem é atribuído uma vez só.
- A recompra por canal confere com uma fixture conhecida.
- RLS: uma organização nunca vê evento, cliente ou código de outra.
