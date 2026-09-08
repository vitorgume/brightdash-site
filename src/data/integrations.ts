export interface Integration {
  name: string;
  logo: string;
}

/**
 * Placeholder wordmarks pending official partner logo files.
 * Replace `logo` paths with real brand assets — confirm usage rights
 * per each partner's brand guidelines before shipping to production.
 *
 * Lista real de CRMs com integração no Metriza.
 */
export const integrations: Integration[] = [
  { name: 'Pipedrive', logo: '/integrations/pipedrive-logo.png' },
  { name: 'Ollow', logo: '/integrations/ollow-logo.jpg' },
  { name: 'Pipefy', logo: '/integrations/pipefy-logo.jpg' },
  { name: 'PipeRun', logo: '/integrations/piperun-logo.png' },
];
