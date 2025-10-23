export function getComplianceBadgeVariant(
  status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "compliant") return "default";
  if (status === "pending") return "secondary"; // Will override with className
  if (status === "non-compliant") return "destructive";
  return "outline";
}

export function getComplianceBadgeClassName(
  status: string | null | undefined
): string {
  // Pending uses yellow/warning color (secondary variant is gray by default)
  if (status === "pending") return "bg-warning text-warning-foreground border-transparent";
  return "";
}

export function getComplianceBadgeText(
  status: string | null | undefined
): string {
  if (status === "compliant") return "Compliant";
  if (status === "pending") return "Pending";
  if (status === "non-compliant") return "Non-Compliant";
  return "Unknown";
}
