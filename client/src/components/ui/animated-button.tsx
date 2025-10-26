import { forwardRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface AnimatedButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  ripple?: boolean;
  scale?: boolean;
  children?: React.ReactNode;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    children, 
    loading = false, 
    success = false, 
    error = false,
    ripple = true,
    scale = true,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
    const [isPressed, setIsPressed] = useState(false);
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!shouldReduceMotion && ripple && !disabled && !loading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { x, y, id }]);
        
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };
    
    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsPressed(false);
    
    const getIconForState = () => {
      if (loading) {
        return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
      }
      if (success) {
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mr-2"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
          </motion.div>
        );
      }
      if (error) {
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.4 }}
            className="mr-2"
          >
            <XCircle className="h-4 w-4 text-destructive" />
          </motion.div>
        );
      }
      return null;
    };
    
    return (
      <motion.div
        whileHover={scale && !shouldReduceMotion && !disabled ? { scale: 1.02 } : {}}
        whileTap={scale && !shouldReduceMotion && !disabled ? { scale: 0.98 } : {}}
        animate={
          error && !shouldReduceMotion
            ? { x: [0, -10, 10, -10, 10, 0] }
            : {}
        }
        transition={
          error
            ? { duration: 0.5 }
            : { type: "spring", stiffness: 400, damping: 17 }
        }
        className="inline-block"
      >
        <Button
          ref={ref}
          className={cn(
            "relative overflow-hidden transition-all duration-200",
            success && "border-success bg-success/10 hover:bg-success/20",
            error && "border-destructive bg-destructive/10 hover:bg-destructive/20",
            isPressed && !shouldReduceMotion && "scale-95",
            className
          )}
          disabled={disabled || loading}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          <span className="relative z-10 flex items-center justify-center">
            {getIconForState()}
            {children}
          </span>
          
          {/* Ripple effects */}
          {ripples.map(({ x, y, id }) => (
            <span
              key={id}
              className="absolute pointer-events-none"
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.span
                className="block rounded-full bg-white/30"
                initial={{ width: 0, height: 0, opacity: 1 }}
                animate={{ width: 300, height: 300, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </span>
          ))}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

// Floating Action Button with animations
export const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps & { position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" }
>(({ position = "bottom-right", className, children, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();
  
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 200, damping: 15 }
      }
      className={cn("fixed z-50", positionClasses[position])}
    >
      <AnimatedButton
        ref={ref}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg",
          "hover:shadow-xl transition-shadow duration-200",
          className
        )}
        {...props}
      >
        {children}
      </AnimatedButton>
    </motion.div>
  );
});

FloatingActionButton.displayName = "FloatingActionButton";

// Icon button with rotation animation
export const IconButton = forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps & { rotate?: boolean }
>(({ rotate = false, className, children, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <AnimatedButton
      ref={ref}
      variant="ghost"
      size="icon"
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <motion.div
        animate={
          rotate && isHovered && !shouldReduceMotion
            ? { rotate: 180 }
            : { rotate: 0 }
        }
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatedButton>
  );
});

IconButton.displayName = "IconButton";

export { AnimatedButton };