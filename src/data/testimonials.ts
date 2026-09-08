export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
}

/** Fictitious testimonials for illustrative purposes — no real customer data. */
export const testimonials: Testimonial[] = [
  {
    quote:
      'Em duas semanas paramos de brigar com planilha de comissão. O time inteiro vê o ranking em tempo real e isso mudou o clima da operação.',
    name: 'Marina Cavalcante',
    role: 'Head de Vendas',
    company: 'Nortis Soluções',
    initials: 'MC',
  },
  {
    quote:
      'Conseguimos identificar em uma semana quais SDRs não estavam atualizando o CRM. Isso destravou nossos dados de conversão.',
    name: 'Rafael Tondin',
    role: 'Gerente Comercial',
    company: 'Vaya Tech',
    initials: 'RT',
  },
  {
    quote:
      'O time do Brightdash conduziu toda a implantação com o nosso Pipedrive. Hoje o painel fica na TV da sala comercial e virou rotina olhar todo dia.',
    name: 'Camila Dourado',
    role: 'Diretora Comercial',
    company: 'Fluxo Digital',
    initials: 'CD',
  },
];
