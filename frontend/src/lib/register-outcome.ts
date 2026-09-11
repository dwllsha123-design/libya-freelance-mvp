export type RegisterApiSuccess =
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

export type RegisterClientOutcome =
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

/**
 * Map register HTTP success into UI outcomes.
 * Never treat accountCreated + requiresLogin as registration failure.
 */
export function interpretRegisterSuccess(
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

export function interpretRegisterFailure(error: unknown): RegisterClientOutcome {
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
