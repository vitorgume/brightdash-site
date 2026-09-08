export interface Integration {
  name: string;
  logo: string;
}

/**
 * Placeholder wordmarks pending official partner logo files.
 * Replace `logo` paths with real brand assets — confirm usage rights
 * per each partner's brand guidelines before shipping to production.
 *
 * Lista real de CRMs com integração no Brightdash.
 */
export const integrations: Integration[] = [
  { name: 'Pipedrive', logo: '/integrations/pipedrive.svg' },
  { name: 'Ollow', logo: '/integrations/ollow.svg' },
  { name: 'Pipefy', logo: '/integrations/pipefy.svg' },
  { name: 'PipeRun', logo: '/integrations/piperun.svg' },
];
