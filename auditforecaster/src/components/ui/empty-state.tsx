import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    action?: {
        label: string
        onClick?: () => void
        href?: string
    }
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-lg bg-muted/20",
                className
            )}
            role="status"
            aria-label={`No ${title.toLowerCase()} found`}
        >
            {Icon && (
                <Icon
                    className="h-12 w-12 text-muted-foreground mb-4"
                    aria-hidden="true"
                />
            )}
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                    {description}
                </p>
            )}
            {action && (
                action.href ? (
                    <Button asChild>
                        <a href={action.href}>{action.label}</a>
                    </Button>
                ) : (
                    <Button onClick={action.onClick}>
                        {action.label}
                    </Button>
                )
            )}
        </div>
    )
}
