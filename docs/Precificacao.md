# Precificação — escadas por módulo, combo gamificado e upgrade

**Regra geral:** todo valor e toda regra deste documento ficam numa **tabela de regras de preço** editável no painel interno (`pricing_rules`), com versão e data de início. Nada fica fixo no código. Os valores são **HIPÓTESE** até a validação com lojistas. As mecânicas marcadas como "proposta" precisam do aval dos sócios antes de ir para produção.

## 1. Escada de cada módulo

Cada módulo tem a sua escada e a sua lógica de cobrança. A cobrança acompanha o que gera valor em cada produto.

**Marco Zero: cobra pelo tamanho da base de clientes.**

| Faixa | Clientes na base | Mensal |
| --- | --- | --- |
| MZ 1 | Até 500 | R$ 97 |
| MZ 2 | 500 a 5.000 | R$ 247 |
| MZ 3 | 5.000 a 20.000 | R$ 497 |
| MZ 4 | Acima de 20.000 | R$ 897, com ponte para o ECOM |

**Sketch: cobra pela profundidade do acompanhamento.**

| Plano | Inclui | Mensal |
| --- | --- | --- |
| Sketch Início | Plano de aquisição e missões da semana | R$ 67 |
| Sketch Completo | + o terreno ao redor atualizado todo mês + o teste de tráfego guiado | R$ 147 |

## 2. O combo unificado (Sketch + Marco Zero)

**Base, decidida pelo Igor:** 20% de desconto sobre a soma dos dois módulos.

**Tela "Monte o seu terreno"** (referência: a calculadora de combo em `prototipos/sketch-panfleto.html`):
- o lojista escolhe o plano do Sketch, e a faixa do Marco Zero vem da base dele
- a tela mostra o preço cheio riscado, o preço do combo e a economia em reais por mês
- é uma assinatura só, com uma fatura e um dia de cobrança

### Gamificação (PROPOSTA, aguarda o aval dos sócios)
A gamificação **premia o uso que gera resultado**, e não o volume de compra. Ela reforça a métrica de saúde nº 1 (check-in respondido) e a tese do produto (receita construída).

1. **Níveis do terreno.** O nível vem da % de receita construída da loja, medida pelo Marco Zero. Os nomes são os níveis do "Mapa do Terreno" da proposta do Luca:

   | Nível | Receita construída |
   | --- | --- |
   | Terreno alugado | < 20% |
   | Terreno marcado | 20–35% |
   | Fundação | 35–50% |
   | Terreno construído | > 50% |

   O nível aparece no topo da plataforma, com o traço evoluindo: tracejado → sólido. Subir de nível é uma conquista visível. **Não é desconto**, para não premiar quem já está bem.

2. **Constância.** Cada **4 check-ins seguidos** respondidos (em qualquer módulo) somam +5% de desconto no mês seguinte, sobre o preço do combo, com teto de 30% de desconto total.
   - Perder a sequência zera o bônus, mas não tira o desconto base.
   - Só vale para quem tem o combo. Isso cria um motivo concreto para assinar os dois.

3. **Missões concluídas.** Cada missão com resultado medido vale um selo no histórico ("Missão do whey · +15 pedidos"). Isso não mexe no preço: é a prova acumulada de valor, que reduz o cancelamento.

**Guarda-corpos:**
- o desconto nunca passa do teto configurado
- o lojista vê sempre como ganha e como perde cada benefício
- nenhuma mecânica pressiona a cliente final do lojista; tudo acontece entre a Ground e o lojista

## 3. Upgrade de plano

### Marco Zero: a base cresceu
- O cálculo da faixa roda a cada sincronização ou planilha nova.
- **Quando a base passa do limite da faixa:**
  1. O app mostra um aviso, em tom de conquista: "Sua base passou de 5.000 clientes. Isso é terreno construído." Logo abaixo vêm a faixa nova, o preço novo e o que muda.
  2. Começa uma **carência de 30 dias** (configurável) em que nada muda no preço.
  3. **O upgrade só acontece com o aceite do lojista.** Não existe cobrança automática maior sem o clique dele.
  4. Se o lojista não aceitar ao fim da carência, a leitura continua funcionando, mas as missões passam a cobrir só as clientes até o limite da faixa atual, e o app avisa isso com clareza. **Proposta: confirmar a regra com os sócios.**
- **Base que encolhe** (por exemplo, depois de excluir dados): sugira o downgrade no próximo ciclo. Ser honesto aqui gera confiança.
- **Faixa MZ 4:** o upgrade também abre a ponte direta para o ECOM.

### Sketch: Início → Completo
O app sugere o Completo quando o uso pede. Exemplos:
- o lojista tenta abrir o teste de tráfego guiado
- a persona tem um espaço vazio validado e está pronta para teste pago
- o lojista consultou o terreno ao redor e ele está desatualizado há mais de 60 dias

A sugestão aparece uma vez por gatilho e some se o lojista recusar.

### Módulo isolado → combo
- **Sketch sozinho com clientes voltando:** sugere o Marco Zero (veja o PRD do Sketch, seção 3).
- **Marco Zero sozinho:** quando a receita alugada passa de 70% por 2 meses, sugere o Sketch ("sua aquisição ainda depende de anúncio").
- As duas sugestões mostram o preço do combo e a gamificação.

## 4. Testes obrigatórios
- Cálculo de preço para todas as combinações de módulo, plano, faixa e bônus de constância, respeitando o teto.
- Mudança de faixa: aviso → carência → aceite. Sem aceite, o preço não muda.
- Uma regra de preço nova só vale para cobranças a partir da sua data de início.
