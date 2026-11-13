# PRD — Ground Marco Zero

**O que é:** um SaaS de uso contínuo que faz o raio-x de recompra da base de clientes do lojista e transforma esse dado em **uma ação por semana**. A ação **fecha o ciclo**: o app pergunta se ela foi feita, mede o resultado na loja e ajusta a missão seguinte.

**Para quem:** lojistas de e-commerce em crescimento, inclusive os grandes que não têm os dados organizados. O exemplo-modelo é uma marca de suplementos na Nuvemshop.

**Concorrente direto:** Martz, um CRM de retenção integrado à Nuvemshop. A Martz executa automações. O Marco Zero **interpreta e aprende**: "seu problema não é tráfego, é recompra".

**Referência visual e de fluxo:** `prototipos/marco-zero-v2-ciclo-semanal.html` (9 telas) e `prototipos/marco-zero-panfleto.pdf`.

---

## 1. Jornada

```
Conexão → Organização dos dados → Seu marco zero → Dinheiro parado → Grupos
   → Missão da semana → [1 semana] → Check-in → Resultado → Ajuste → nova Missão ↺
```

## 2. Funcionalidades

### 2.1 Conexão e entrada de dados
- **Três fontes:**
  - Planilha (CSV ou XLSX, inclusive bagunçada). **Fase 1.**
  - Nuvemshop, por OAuth com importação do histórico e webhooks de pedido novo. **Fase 2.**
  - Shopify. **Fase 5.**
- **Campos mínimos:** quem comprou, quando e quanto gastou. Telefone, e-mail, produto e cupom são opcionais, mas enriquecem a leitura.
- **Sincronização.** Com uma integração ligada, os pedidos novos entram sozinhos. Com planilha, o app pede uma atualização por semana, junto com o check-in.

### 2.2 Organização dos dados (com IA)
- **Mapeamento de colunas.** A IA propõe o mapeamento ("Nome do comprador" → Quem, "Total pago" → Quanto). Colunas inúteis para medir recompra, ou com dado sensível (CPF, endereço), são **descartadas** e aparecem com o rótulo "Ignorado".
- **Cadastros repetidos.**
  - Junção automática quando bater e-mail **e** telefone.
  - Quando houver dúvida (mesmo telefone com nome diferente, por exemplo), o app mostra os pares para o lojista confirmar ("Esses dois cadastros são a mesma cliente?"), com opção de desfazer.
- **Barra de progresso** com os pedidos lidos, as clientes únicas e os cadastros repetidos encontrados.
- **Custo da organização.** No primeiro mês, ela está incluída no plano. Bases muito grandes ou muito bagunçadas recebem a marcação "organização cobrada à parte", e o valor é definido pelo painel interno.

### 2.3 Seu marco zero (os números principais)
Calcule, guarde por mês e mostre os últimos 6 meses:
- **Clientes na base:** clientes únicas depois da deduplicação.
- **Taxa de recompra:** % de clientes com 2 compras ou mais.
- **Tempo até a 2ª compra:** a mediana e a média, em dias.
- **LTV médio:** o total gasto dividido pelo número de clientes.
- **Receita alugada × construída**, por mês:
  - alugada = receita de pedidos que foram a **primeira compra** da cliente
  - construída = receita de pedidos de clientes que **voltaram**
  - Mostre em gráfico de barras empilhadas: tracejado/hachurado para a alugada e sólido para a construída.

### 2.4 Dinheiro parado (o choque do mês 1)
- "**N** clientes compraram uma vez e sumiram", com o ticket médio da primeira compra delas.
- **Simulador:** um controle deslizante de 1% a 40%. A receita potencial é `sumidas × % × ticket médio da 1ª compra`, mostrada também como valor por mês ao longo de 6 meses.
- **Visual:** uma grade com um quadradinho por cliente, onde os destacados são as que voltariam.
- **O choque do mês 1** tem 3 partes: a dependência (% da receita que é alugada), o dinheiro parado em reais e a primeira missão.

### 2.5 Grupos de clientes
As regras padrão abaixo ficam numa tabela de configuração, com valores ajustáveis por loja no futuro:

| Grupo | Regra | Estado |
| --- | --- | --- |
| Fiéis | 3 compras ou mais e a última há ≤ 60 dias | Fato |
| Em risco | Já recomprou (2 ou mais) e não compra há > 60 dias | Hipótese |
| Sumidos | 1 compra só, há > 90 dias | Gargalo |
| Compra única recente | 1 compra só, há ≤ 90 dias | Sem informação |

- Mostre a quantidade e o valor acumulado em reais de cada grupo.
- **Ciclo de recompra por produto.** Quando houver dado de item, calcule o intervalo típico entre duas compras do mesmo produto (exemplo: whey de 900 g ≈ 40 a 50 dias). As missões usam esse intervalo.

### 2.6 Missão da semana
- **Uma missão principal por semana**, gerada pela IA a partir dos grupos, do ciclo de produto e dos **aprendizados** da loja (seção 2.9).
- **Conteúdo da missão:**
  - título com o número de clientes ("180 clientes compraram whey há 45 dias")
  - o motivo ("Por que esta missão")
  - a lista de clientes
  - a mensagem pronta, editável e com botão Copiar, usando a variável `[nome]`
  - a estimativa de pedidos e receita, rotulada como hipótese
- **Lista de clientes:** pode ser exportada (CSV com nome e telefone) ou copiada. **O app não envia mensagens.**
- **Grupo de comparação automático.** O app sorteia cerca de 15% da lista (percentual configurável) e deixa essas clientes de fora. Assim o resultado é medido com honestidade. Explique isso em uma frase: "Separamos 27 clientes para comparar. Não mande para elas."
- **Regras da IA ao gerar a missão:**
  - por padrão, a mensagem fala de cuidado e não de desconto
  - nunca promete resultado
  - uma ação simples, que caiba na semana do lojista
  - quando o check-in anterior trouxe um bloqueio (falta de tempo, de contato ou receio de incomodar), a nova missão é desenhada para contorná-lo
- **Gargalo estrutural.** Quando a IA detecta um gargalo estrutural, a missão traz o link "Converse com a Ground" (seção 2.10).

### 2.7 Check-in (uma semana depois)
É uma **conversa, não um formulário.** O lembrete sai por e-mail na segunda-feira; o WhatsApp entra na Fase 5.

1. "Você conseguiu mandar a mensagem para as N clientes?" com três botões: **Mandei para todas · Mandei para uma parte · Não consegui**.
2. Se for "uma parte": "Para quantas?", respondido com um número ou marcando quem recebeu na lista.
3. Se for "uma parte" ou "Não consegui": "O que travou?", com as opções **Faltou tempo · Não tinha o contato de todas · Fiquei com receio de incomodar**, mais um campo livre.
4. "Me manda um print das respostas, se tiver." O lojista pode mandar vários prints, áudio ou texto. A IA (visão e transcrição) **classifica as respostas** em categorias livres, como pediu link, comprou em outro lugar, reclamação de frete, pedido de sabor novo ou sem interesse, e conta quantas caíram em cada uma.
5. Ao lado da conversa, um quadro explica o que é "Medido pela loja" (fato, automático) e o que é "Contado por você" (1 minuto).

Tudo o que o lojista conta é guardado como **hipótese**. Só o que a loja mostra vira **fato**.

### 2.8 Resultado
- **Janela de atribuição:** 7 dias depois do envio, configurável.
- **Atribuição:** um pedido conta para a missão quando é de uma cliente que recebeu a mensagem e cai dentro da janela.
- **Comparação:**
  - taxa de volta de quem recebeu × taxa do grupo de comparação
  - se não houver grupo de comparação válido (menos de 20 clientes), use a taxa de clientes parecidas sem contato no período anterior e **avise** que a comparação é mais fraca
- **O que a tela mostra:**
  - quantas receberam (contado por você), quantas voltaram (medido pela loja), a receita da missão e o **estimado × real**
  - o gráfico "com × sem a mensagem"
  - "+X pedidos que não teriam acontecido"
  - o resultado separado por grupo
  - três cartões:
    - **Funcionou** (fato): grupos e horários de envio com resposta acima da média, e o ticket sem cupom comparado com o ticket com cupom
    - **Travou** (gargalo): grupo com volta abaixo da comparação e queixas frequentes
    - **Apareceu** (hipótese): pedidos e sinais novos vindos das respostas
- **Se a missão não foi enviada:** mostre quantas clientes "voltaram sozinhas". Esse número vira a régua das próximas missões. O efeito da mensagem fica como "sem informação".

### 2.9 Ajuste e aprendizados (a memória da loja)
- **Tabela `learnings`:** cada aprendizado tem a frase, o estado (`fato | hipotese | ajustado | descartado | sem_info`), as missões que servem de evidência, um contador de recorrência e o histórico.
- **Regras de evolução de um aprendizado:**
  - funcionou 1 vez com comparação válida → **fato · testado 1×**
  - repetiu com sucesso → o contador sobe
  - falhou em 2 testes → **descartado**
  - ajustado depois de travar → **ajustado**
- **A próxima missão** tem duas partes:
  - **Continua:** o que deu certo, aplicado a um novo grupo
  - **Conserta:** o que travou, com outro formato
  - Se nada foi enviado, a próxima missão é **menor** ("do tamanho da sua semana").
- **Bloqueios de execução** (falta de tempo, de contato ou receio) também viram aprendizado e moldam o formato das missões. Exemplos: dividir o envio em lotes, ou criar uma missão extra para pedir o WhatsApp no checkout.
- **Painel de evolução:** a % de receita construída semana a semana.

### 2.10 Ponte para o ECOM (gargalo estrutural)
- Um sinal que **se repete por 3 semanas seguidas** e está fora do alcance de uma missão é marcado como **gargalo estrutural**. Exemplos: queixa de frete, de preço ou de produto, ou missões que travam por problema de operação.
- **O que o lojista vê:** "Se isso aparecer por três semanas seguidas, deixa de ser uma missão. Vira um assunto de estrutura." e o link **Converse com a Ground**. O link abre um formulário curto, que **avisa a Ground no painel interno e por e-mail**.
- **O lojista no plano de mais de 20 mil clientes** vê a "ponte direta para o Método ECOM".

## 3. Planos e upgrade

O documento completo está em `docs/Precificacao.md`. Em resumo:
- **Escada por tamanho da base:** R$ 97 / 247 / 497 / 897 (valores são hipótese e ficam configuráveis).
- **A faixa é recalculada a cada sincronização.** Quando a base cresce, o app **sugere o upgrade** em tom de conquista, com 30 dias de carência. O upgrade **só acontece com o aceite do lojista**.
- **Combo com o Sketch:** 20% de desconto + a gamificação (níveis do terreno e bônus de constância).
- **Pendente de decisão dos sócios:** se a primeira leitura (o choque do mês 1) é grátis, como freemium, e as missões são pagas. Deixe isso como *feature flag*.

## 4. Painel interno da Ground

- **Contas:** lista de contas com plano, faixa, última atividade e taxa de check-in respondido (a métrica de saúde nº 1).
- **Pendências comerciais:** alertas de gargalo estrutural e pedidos de "Converse com a Ground", para o Igor acompanhar.
- **Configuração:** preços, janela de atribuição, % do grupo de comparação e liberação manual de plano.
- **Custo:** custo de IA por conta.

## 5. Critério de pronto do MVP (Fase 1)

Com a planilha fictícia da Carla, o fluxo inteiro (importar → organizar → números → grupos → missão → check-in → resultado → ajuste) funciona em staging. Os cálculos precisam bater com os testes unitários, e os três caminhos do check-in precisam gerar resultado e ajuste coerentes.
