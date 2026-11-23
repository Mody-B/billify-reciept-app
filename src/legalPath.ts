export type LegalId = "privacy" | "terms";

export function legalPage(pathname: string, base: string): LegalId | null {
  const prefix = base.replace(/\/$/, "");
  let path = pathname;
  if (prefix && path.startsWith(prefix)) path = path.slice(prefix.length);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/privacy") return "privacy";
  if (path === "/terms") return "terms";
  return null;
}
