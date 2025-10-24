import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // 48x48px touch target with 24x24px visual checkbox centered inside
      "peer min-h-12 min-w-12 shrink-0 flex items-center justify-center relative",
      // Visual 24x24px box using pseudo-element
      "before:content-[''] before:absolute before:h-6 before:w-6 before:rounded-sm before:border before:border-primary before:bg-background",
      // Checked state styling for visual box
      "data-[state=checked]:before:bg-primary",
      // Focus and disabled states
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:before:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current relative z-10 data-[state=checked]:text-primary-foreground")}
    >
      <Check className="h-5 w-5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
