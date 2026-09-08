# Dashboard Personalizado (frontend)

Criação de dashboards por prompt, montagem visual por arrasto e visualização com dados do CRM.
Integrado ao `DashboardPersonalizadoController`.

## Telas

| Rota | Arquivo | Papel |
|---|---|---|
| `/dashboard/personalizado` | `index.tsx` | Tela em branco → prompt → montagem por arrasto → salvar |
| `/dashboard/personalizado/lista` | `Lista/index.tsx` | Dashboards salvos da empresa; abrir ou remover |
| `/dashboard/personalizado/:idDashboard` | `Visualizacao/index.tsx` | Render com dados reais + filtros de funil/ano/meses/usuário |

`rotulos.ts` concentra a tradução dos enums do backend, as classes de largura e a formatação de
valores — é o único lugar que sabe que `POR_USUARIO` se lê "Por usuário" e que `INTEIRA` vale 12
colunas.

## Fluxo de criação

1. O usuário descreve o dashboard. `POST /{idEmpresa}/interpretar` roda a IA e devolve a
   sugestão **sem persistir**.
2. Na montagem: arrastar métrica da lateral cria widget; arrastar widget sobre outro reordena;
   lápis edita; X remove. Nada disso toca o servidor.
3. "Salvar dashboard" faz `POST /{idEmpresa}` com a especificação confirmada. A tela reinicia em
   branco, pronta para o próximo.

Gerar e desistir não deixa registro no banco — foi por isso que interpretar e salvar viraram
endpoints distintos.

## Regras espelhadas do backend

Duas regras do `CriarDashboardPersonalizadoUseCase` são antecipadas na tela para o usuário não
salvar uma coisa e receber outra:

- **Gráfico sem agrupamento vira KPI.** Sem série não há o que desenhar. O modal avisa e o
  `salvarDashboard` já envia `KPI`.
- **Trocar a métrica pode invalidar o agrupamento.** O modal recai no padrão da métrica nova.

A validação de verdade continua no backend: o catálogo é a fronteira de confiança, e uma
especificação montada à mão passa exatamente pela mesma peneira que a devolvida pela IA.

## Métricas individuais

Métricas de painel operacional têm `exigeUsuario`. A lateral marca essas métricas com um badge, a
montagem avisa quando o dashboard passa a depender de uma delas, e a visualização mostra o seletor
de usuário apenas quando `especificacao.exigeUsuario` é verdadeiro. Sem usuário escolhido, esses
widgets voltam do backend com `indisponibilidade` preenchida e o card exibe o motivo.

## Não coberto

- Editar um dashboard já salvo (só criar, abrir e remover). Exigiria um `PUT` no controller.
- Reordenar widgets por teclado — o arrasto é a única forma.
