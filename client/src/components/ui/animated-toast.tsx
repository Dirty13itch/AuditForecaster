import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface AnimatedToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  action?: React.ReactNode;
  onDismiss?: () => void;
  duration?: number;
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: "border-success bg-success/10 text-success-foreground",
  error: "border-destructive bg-destructive/10 text-destructive-foreground",
  warning: "border-warning bg-warning/10 text-warning-foreground",
  info: "border-info bg-info/10 text-info-foreground",
  default: "",
};

export function AnimatedToast({
  id,
  title,
  description,
  variant = "default",
  action,
  onDismiss,
  duration = 5000,
}: AnimatedToastProps) {
  const [progress, setProgress] = useState(100);
  const Icon = variant !== "default" ? toastIcons[variant] : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 100));
        return next <= 0 ? 0 : next;
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-background p-4 shadow-lg",
        toastColors[variant]
      )}
    >
      <div className="flex gap-3">
        {Icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        )}
        <div className="flex-1">
          {title && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="font-semibold"
            >
              {title}
            </motion.div>
          )}
          {description && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-1 text-sm opacity-90"
            >
              {description}
            </motion.div>
          )}
        </div>
        {action}
      </div>
      
      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-20"
        initial={{ width: "100%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
}

// Success toast with checkmark animation
export function SuccessToast({ title, description }: { title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex items-center gap-3 rounded-lg border border-success bg-success/10 p-4 text-success-foreground"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
      >
        <div className="relative">
          <motion.svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-success"
          >
            <motion.circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              d="M8 12 L11 15 L16 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            />
          </motion.svg>
        </div>
      </motion.div>
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
      </div>
    </motion.div>
  );
}

// Error toast with shake animation
export function ErrorToast({ title, description }: { title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: [0, -10, 10, -10, 10, 0]
      }}
      transition={{
        x: { duration: 0.5, delay: 0.2 }
      }}
      className="relative flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive-foreground"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.4 }}
      >
        <XCircle className="h-6 w-6 text-destructive" />
      </motion.div>
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="mt-1 text-sm opacity-90">{description}</div>}
      </div>
    </motion.div>
  );
}

// Loading toast with spinner
export function LoadingToast({ title, description }: { title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-lg border bg-background p-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
      </motion.div>
      <div>
        <div className="font-semibold">{title}</div>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
    </motion.div>
  );
}