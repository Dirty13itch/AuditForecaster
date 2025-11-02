import { Badge } from "@/components/ui/badge";
import { FeatureMaturity } from "@shared/featureFlags";
import { cn } from "@/lib/utils";

interface ReadinessChipProps {
  maturity: FeatureMaturity;
  className?: string;
}

export function ReadinessChip({ maturity, className }: ReadinessChipProps) {
  const getVariant = () => {
    switch (maturity) {
      case FeatureMaturity.GA:
        return "bg-green-500 text-white border-green-600";
      case FeatureMaturity.BETA:
        return "bg-yellow-500 text-white border-yellow-600";
      case FeatureMaturity.EXPERIMENTAL:
        return "bg-gray-500 text-white border-gray-600";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const getLabel = () => {
    switch (maturity) {
      case FeatureMaturity.GA:
        return "GA";
      case FeatureMaturity.BETA:
        return "Beta";
      case FeatureMaturity.EXPERIMENTAL:
        return "Experimental";
      default:
        return maturity;
    }
  };

  return (
    <Badge
      className={cn(getVariant(), className)}
      data-testid={`chip-maturity-${maturity}`}
    >
      {getLabel()}
    </Badge>
  );
}
