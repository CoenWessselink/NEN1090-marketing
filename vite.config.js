import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'auditlog-staalbouw': 'auditlog-staalbouw.html',
        'cancel': 'cancel.html',
        'ce-dossier': 'ce-dossier.html',
        'ce-markering-staal': 'ce-markering-staal.html',
        'ce-markering': 'ce-markering.html',
        'checkout': 'checkout.html',
        'contact': 'contact.html',
        'index': 'index.html',
        'iso-3834': 'iso-3834.html',
        'iso-5817': 'iso-5817.html',
        'lascontrole': 'lascontrole.html',
        'lasdocumentatie': 'lasdocumentatie.html',
        'nen-en-1090': 'nen-en-1090.html',
        'onboarding': 'onboarding.html',
        'pricing': 'pricing.html',
        'privacy': 'privacy.html',
        'security': 'security.html',
        'set-password': 'set-password.html',
        'success': 'success.html',
      }
    }
  },
  server: { host: '127.0.0.1', port: 5173 }
});
