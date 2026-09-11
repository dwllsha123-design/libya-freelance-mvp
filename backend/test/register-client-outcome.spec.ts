import { describe, expect, it } from 'vitest';

/**
 * Mirrors frontend/src/lib/register-outcome.ts decision rules so we can
 * typecheck/test without importing the frontend package into backend rootDir.
 */
type RegisterApiSuccess =
  | {
      accountCreated?: true;
      authenticated?: true;
      user: { id: string };
      accessToken: string;
    }
  | {
      accountCreated: true;
      authenticated: false;
      requiresLogin: true;
    };

type RegisterClientOutcome =
  | { kind: 'authenticated'; user: { id: string } }
  | { kind: 'requiresLogin' }
  | { kind: 'emailExists' }
  | { kind: 'ambiguousNetwork' }
  | { kind: 'failed'; message: string };

function isApiError(
  error: unknown,
): error is Error & { name: 'ApiError'; status: number } {
  return (
    error instanceof Error &&
    error.name === 'ApiError' &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'NetworkError') {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  return (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed|network request failed/i.test(
      error.message,
    )
  );
}

function interpretRegisterSuccess(
  response: RegisterApiSuccess,
): Extract<RegisterClientOutcome, { kind: 'authenticated' | 'requiresLogin' }> {
  if (
    'authenticated' in response &&
    response.authenticated === false &&
    response.accountCreated === true
  ) {
    return { kind: 'requiresLogin' };
  }

  if (
    !('user' in response) ||
    !response.user ||
    !('accessToken' in response) ||
    !response.accessToken
  ) {
    return { kind: 'requiresLogin' };
  }

  return { kind: 'authenticated', user: response.user };
}

function interpretRegisterFailure(error: unknown): RegisterClientOutcome {
  if (isNetworkError(error)) {
    return { kind: 'ambiguousNetwork' };
  }

  if (isApiError(error) && error.status === 409) {
    return { kind: 'emailExists' };
  }

  if (isApiError(error)) {
    return { kind: 'failed', message: error.message };
  }

  return {
    kind: 'failed',
    message: error instanceof Error ? error.message : 'registerFailed',
  };
}

describe('register client outcome mapping (TEST 8 / TEST 9)', () => {
  it('maps accountCreated + authenticated to authenticated session', () => {
    const outcome = interpretRegisterSuccess({
      accountCreated: true,
      authenticated: true,
      user: { id: 'u1' },
      accessToken: 'tok',
    });
    expect(outcome).toEqual({ kind: 'authenticated', user: { id: 'u1' } });
  });

  it('maps accountCreated + authenticated=false to requiresLogin (not failure)', () => {
    const outcome = interpretRegisterSuccess({
      accountCreated: true,
      authenticated: false,
      requiresLogin: true,
    });
    expect(outcome).toEqual({ kind: 'requiresLogin' });
    expect(outcome.kind).not.toBe('failed');
  });

  it('maps ambiguous network failure without definitive creation failure', () => {
    const network = new Error('Failed to fetch');
    network.name = 'NetworkError';
    expect(interpretRegisterFailure(network)).toEqual({
      kind: 'ambiguousNetwork',
    });
    expect(interpretRegisterFailure(new TypeError('Failed to fetch'))).toEqual({
      kind: 'ambiguousNetwork',
    });
  });

  it('maps HTTP 409 to emailExists', () => {
    const err = new Error('conflict');
    err.name = 'ApiError';
    (err as Error & { status: number }).status = 409;
    expect(interpretRegisterFailure(err)).toEqual({ kind: 'emailExists' });
  });
});
