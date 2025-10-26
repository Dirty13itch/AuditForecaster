import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  onDebounce?: (value: string) => void;
  loading?: boolean;
  showClear?: boolean;
  showSearchIcon?: boolean;
  animated?: boolean;
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounceMs = 500,
  onDebounce,
  loading = false,
  showClear = true,
  showSearchIcon = true,
  animated = true,
  className,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);
  const [isTyping, setIsTyping] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsTyping(true);

    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (value !== initialValue) {
        onChange(value);
        onDebounce?.(value);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceMs, onChange, onDebounce, initialValue]);

  const handleClear = useCallback(() => {
    setValue("");
    onChange("");
    onDebounce?.("");
  }, [onChange, onDebounce]);

  const showLoading = loading || isTyping;

  return (
    <div className="relative">
      {showSearchIcon && (
        <motion.div
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          animate={
            animated && !shouldReduceMotion
              ? {
                  scale: showLoading ? [1, 1.2, 1] : 1,
                }
              : {}
          }
          transition={{
            duration: 0.3,
            repeat: showLoading ? Infinity : 0,
            repeatDelay: 1,
          }}
        >
          <Search className="h-4 w-4" />
        </motion.div>
      )}

      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "transition-all duration-200",
          showSearchIcon && "pl-8",
          (showClear || showLoading) && "pr-8",
          animated && !shouldReduceMotion && "focus:shadow-lg",
          className
        )}
        {...props}
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <AnimatePresence mode="wait">
          {showLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </motion.div>
          ) : showClear && value ? (
            <motion.button
              key="clear"
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-4 w-4" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Animated search box with suggestions
export function AnimatedSearchBox({
  suggestions = [],
  onSearch,
  onSelect,
  placeholder = "Search...",
  className,
}: {
  suggestions?: string[];
  onSearch: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = filteredSuggestions[selectedIndex];
      setQuery(selected);
      onSelect?.(selected);
      onSearch(selected);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <DebouncedInput
        value={query}
        onChange={(value) => {
          setQuery(value);
          setIsOpen(value.length > 0);
          onSearch(value);
        }}
        onFocus={() => setIsOpen(query.length > 0 && filteredSuggestions.length > 0)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        showSearchIcon
        showClear
      />

      <AnimatePresence>
        {isOpen && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  setQuery(suggestion);
                  onSelect?.(suggestion);
                  onSearch(suggestion);
                  setIsOpen(false);
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}