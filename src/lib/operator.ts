/**
 * Who runs this instance — shown on the About, Privacy and Terms pages.
 * Each white-label copy sets its own via env vars; defaults are the original operator.
 */
export function getOperatorInfo() {
  return {
    name: process.env.OPERATOR_NAME?.trim() || 'Noor Intelligence',
    person: process.env.OPERATOR_PERSON?.trim() || 'Bala Danmeri',
    location: process.env.OPERATOR_LOCATION?.trim() || 'Wincanton, Somerset, United Kingdom',
    contact: process.env.OPERATOR_CONTACT?.trim() || 'info@baladanmeri.com',
  }
}
