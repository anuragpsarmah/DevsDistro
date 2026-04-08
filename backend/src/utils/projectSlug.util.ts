export function generateProjectSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/-+$/, "");

  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return base ? `${base}-${suffix}` : `project-${suffix}`;
}
