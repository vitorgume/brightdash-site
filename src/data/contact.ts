/**
 * TODO: substituir pelo número real do vendedor (DDI + DDD + número, só dígitos).
 * Ex.: "5511999999999" para +55 11 99999-9999.
 */
export const WHATSAPP_NUMBER = '5511999999999';

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
