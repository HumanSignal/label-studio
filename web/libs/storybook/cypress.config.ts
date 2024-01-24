import configure from '@humansignal/frontend-test/configure';
import path from 'node:path';

const localPath = (p: string) => path.resolve(process.cwd(), p);

const config = configure((cfg) => {
  cfg.e2e = Object.assign(cfg.e2e ?? {}, {
    supportFolder: localPath('./tests/support/'),
    downloadsFolder: localPath('./tests/downloads'),
    fixturesFolder: localPath('./tests/fixtures'),
  });
  cfg.component = Object.assign(cfg.component ?? {}, {
    devServer: {
      bundler: 'vite',
      framework: 'react',
    },
    indexHtmlFile: localPath('./tests/support/component-index.html'),
    specPattern: localPath('./tests/component/**/*.cy.{ts,tsx}'),
    supportFile: localPath('./tests/support/component.ts'),
    supportFolder: localPath('./tests/support/'),
    downloadsFolder: localPath('./tests/downloads'),
    fixturesFolder: localPath('./tests/fixtures'),
  } as Cypress.Config['component']);

  return cfg;
});

export default config;
