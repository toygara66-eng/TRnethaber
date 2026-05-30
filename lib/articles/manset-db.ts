export function isMissingMansetColumn(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("is_manset") ||
    message.includes("is_ust_manset") ||
    message.includes("does not exist")
  );
}
