import type { Reporter, SerializedError, TestModule, TestRunEndReason } from 'vitest/node';

export default class E2eCiReporter implements Reporter {
  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    _reason: TestRunEndReason,
  ): void {
    if (process.env.REQUIRE_E2E !== '1') {
      return;
    }

    let skipped = 0;
    let passed = 0;
    let failed = 0;

    for (const mod of testModules) {
      for (const task of mod.children.allTests()) {
        const state = task.result()?.state;
        if (state === 'skip') skipped += 1;
        if (state === 'pass') passed += 1;
        if (state === 'fail') failed += 1;
      }
    }

    if (skipped > 0) {
      throw new Error(
        `CI E2E failure: ${skipped} skipped, ${passed} passed, ${failed} failed. ` +
          'All marketplace E2E must execute in CI.',
      );
    }
  }
}
