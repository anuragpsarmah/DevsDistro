export function isSafeRelativePath(
  value: string | null | undefined
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("://")
  );
}

export function isMongoObjectId(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}
