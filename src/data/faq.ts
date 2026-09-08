export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: 'O Metriza substitui o meu CRM?',
    answer:
      'Não. O Metriza se conecta ao CRM que você já usa e transforma os dados dele em um painel de performance em tempo real com rankings, metas, comissões e conversão sem exigir que você troque de ferramenta.',
  },
  {
    question: 'Quais CRMs o Metriza integra?',
    answer:
      'Hoje temos integração com Pipedrive, Ollow, Pipefy e PipeRun. Não encontrou o seu? Fale com a gente para avaliarmos a viabilidade.',
  },
  {
    question: 'Quanto tempo leva a implantação?',
    answer:
      'Como cada integração é personalizada para o CRM e o processo comercial do cliente, a implantação leva alguns dias. Nosso time conduz todo o processo junto com você.',
  },
  {
    question: 'O cálculo de comissões é personalizável?',
    answer:
      'Sim. Configuramos as regras de comissionamento por vendedor, time ou tipo de venda junto com o seu time, e o Metriza calcula automaticamente com base nos dados atualizados do CRM.',
  },
  {
    question: 'Meus dados comerciais estão seguros?',
    answer:
      'Sim. O acesso ao CRM é feito via integração oficial e autenticada e cada usuário só enxerga o que tem permissão de ver.',
  },
  {
    question: 'Quanto custa o Metriza?',
    answer:
      'O Metriza é personalizado para a operação comercial de cada empresa, por isso não trabalhamos com um preço fechado publicado. Fale com um vendedor para entender seu cenário e receber uma proposta.',
  },
];
