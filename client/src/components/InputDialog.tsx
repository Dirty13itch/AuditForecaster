import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  defaultValue = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  multiline = false,
  required = false,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (required && !value.trim()) {
      setError("This field is required");
      return;
    }
    onConfirm(value);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-4">
          {label && (
            <Label htmlFor="input-dialog-field">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          )}
          {multiline ? (
            <Textarea
              id="input-dialog-field"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              className={error ? "border-destructive" : ""}
              rows={4}
              data-testid="textarea-dialog-input"
            />
          ) : (
            <Input
              id="input-dialog-field"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={error ? "border-destructive" : ""}
              autoFocus
              data-testid="input-dialog-field"
            />
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-dialog-cancel"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            data-testid="button-dialog-confirm"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility hook for using the input dialog
export function useInputDialog() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Omit<InputDialogProps, "open" | "onOpenChange" | "onConfirm">>({
    title: "",
    description: "",
    label: "",
    placeholder: "",
    defaultValue: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    multiline: false,
    required: false,
  });
  const [resolvePromise, setResolvePromise] = useState<((value: string | null) => void) | null>(null);

  const showInput = (
    title: string,
    options?: {
      description?: string;
      label?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmText?: string;
      cancelText?: string;
      multiline?: boolean;
      required?: boolean;
    }
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        description: options?.description,
        label: options?.label,
        placeholder: options?.placeholder,
        defaultValue: options?.defaultValue || "",
        confirmText: options?.confirmText || "Confirm",
        cancelText: options?.cancelText || "Cancel",
        multiline: options?.multiline || false,
        required: options?.required || false,
      });
      setResolvePromise(() => resolve);
      setOpen(true);
    });
  };

  const handleConfirm = (value: string) => {
    resolvePromise?.(value);
    setOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolvePromise?.(null);
    }
    setOpen(open);
  };

  const DialogComponent = () => (
    <InputDialog
      open={open}
      onOpenChange={handleOpenChange}
      onConfirm={handleConfirm}
      {...config}
    />
  );

  return { showInput, InputDialog: DialogComponent };
}