import { assertE2eEnvironmentReady } from './helpers/e2e-require.js';

export default function globalSetup() {
  assertE2eEnvironmentReady();
}
