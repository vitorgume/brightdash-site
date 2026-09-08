import { Plug, SlidersHorizontal, LineChart } from 'lucide-astro';

export interface Step {
  icon: typeof Plug;
  number: string;
  title: string;
  description: string;
}

export const steps: Step[] = [
  {
    icon: Plug,
    number: '01',
    title: 'Implantação e integração com o CRM',
    description:
      'Nosso time cuida da implantação e conecta o Brightdash ao seu CRM (Pipedrive, Ollow, Pipefy ou PipeRun). Por ser uma integração personalizada, esse processo leva algumas semanas.',
  },
  {
    icon: SlidersHorizontal,
    number: '02',
    title: 'Configuração de metas e comissões',
    description:
      'Junto com o seu time, configuramos metas por vendedor, por time ou por período, e as regras de comissionamento do jeito que a sua operação funciona.',
  },
  {
    icon: LineChart,
    number: '03',
    title: 'Acompanhe em tempo real',
    description:
      'Com tudo implantado, seu painel entra no ar: números atualizados automaticamente conforme o CRM é usado pela equipe.',
  },
];
