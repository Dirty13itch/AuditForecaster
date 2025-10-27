import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-dialog-cancel">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover-elevate active-elevate-2" : ""}
            onClick={onConfirm}
            data-testid="button-dialog-confirm"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Utility hook for using the confirm dialog
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm">>({
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showConfirm = (
    title: string,
    description?: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        description,
        confirmText: options?.confirmText || "Confirm",
        cancelText: options?.cancelText || "Cancel",
        variant: options?.variant || "default",
      });
      setResolvePromise(() => resolve);
      setOpen(true);
    });
  };

  const handleConfirm = () => {
    resolvePromise?.(true);
    setOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolvePromise?.(false);
    }
    setOpen(open);
  };

  const DialogComponent = () => (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      onConfirm={handleConfirm}
      {...config}
    />
  );

  return { showConfirm, ConfirmDialog: DialogComponent };
}