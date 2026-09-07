/** Parse `location.search`. Must use `URLSearchParams` so `+` decodes as space. */
export function parseLocationSearch(search: string | undefined): Record<string, string> {
  if (!search) return {};
  return Object.fromEntries(new URLSearchParams(search));
}
