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
      'As informações ficaram muito mais otimizadas. Os dashboards do nosso CRM não traziam os dados da forma que eu precisava, mas com o Metriza, agora tenho acesso a números muito mais precisos.',
    name: 'Aleison Ramos',
    role: 'Head de Vendas',
    company: 'KM Sistemas',
    initials: 'AR',
  },
  {
    quote:
      'A plataforma foi fundamental para que eu pudesse ter um acompanhamento mais macro e estratégico de toda a minha operação comercial.',
    name: 'Rafael Roncoleta',
    role: 'Diretor Comercial',
    company: 'Adecon',
    initials: 'RR',
  },
  {
    quote:
      'O Metriza tem sido essencial para as reuniões trimestrais da empresa. O software compila todos os dados da área comercial de forma sempre atualizada e automática.',
    name: 'André Ajita',
    role: 'CEO',
    company: 'Minus',
    initials: 'AA',
  },
];
