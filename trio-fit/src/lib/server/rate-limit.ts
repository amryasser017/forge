export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MIN = 15;

/** Pure decision used by the login action (the failure count comes from the login_attempts table). */
export function isRateLimited(failuresInWindow: number, max = LOGIN_MAX_FAILURES): boolean {
  return failuresInWindow >= max;
}
