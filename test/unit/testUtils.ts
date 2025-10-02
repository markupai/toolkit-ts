import { fail } from 'assert';
import { ErrorType } from '../../src/utils/errors';
import { expect, vi } from 'vitest';

export const testTimeout = async (pollingFunction: () => Promise<unknown>, timeoutMillis: number) => {
  let success = false;
  try {
    const promise = pollingFunction();
    vi.advanceTimersByTime(timeoutMillis + 1);
    await promise;
    success = true;
  } catch (error) {
    expect(error).toBeDefined();
    expect(error.type).toBe(ErrorType.TIMEOUT_ERROR);
    expect(error.message).toContain('Workflow timed out');
    expect(error.message).toContain('ms');
  }
  if (success) {
    fail('Expected timeout error');
  }
};
