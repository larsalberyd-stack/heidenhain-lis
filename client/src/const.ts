
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Returns the login page URL. Used by components that need to redirect unauthenticated users. */
export function getLoginUrl(): string {
  return "/login";
}
