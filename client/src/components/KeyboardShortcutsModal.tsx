import { useState, useMemo } from "react";
import { Search, Keyboard, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ShortcutConfig, formatShortcut } from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutConfig[];
}

/**
 * Keyboard Shortcuts Modal
 * 
 * Displays all available keyboard shortcuts organized by category.
 * Includes search/filter functionality.
 * 
 * Triggered by:
 * - ? (Shift + /)
 * - Cmd/Ctrl + /
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutConfig[]> = {
      global: [],
      navigation: [],
      actions: [],
      context: []
    };

    shortcuts.forEach(shortcut => {
      if (shortcut.enabled !== false) {
        groups[shortcut.category]?.push(shortcut);
      }
    });

    return groups;
  }, [shortcuts]);

  // Filter shortcuts by search query
  const filteredShortcuts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    const filtered: Record<string, ShortcutConfig[]> = {
      global: [],
      navigation: [],
      actions: [],
      context: []
    };

    Object.entries(groupedShortcuts).forEach(([category, categoryShortcuts]) => {
      filtered[category] = categoryShortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.id.toLowerCase().includes(query) ||
        (typeof shortcut.key === 'string' && shortcut.key.toLowerCase().includes(query))
      );
    });

    return filtered;
  }, [groupedShortcuts, searchQuery]);

  // Get shortcuts for selected category or all
  const displayShortcuts = useMemo(() => {
    if (selectedCategory === "all") {
      return Object.values(filteredShortcuts).flat();
    }
    return filteredShortcuts[selectedCategory] || [];
  }, [filteredShortcuts, selectedCategory]);

  // Count shortcuts per category
  const categoryCounts = useMemo(() => ({
    all: Object.values(filteredShortcuts).flat().length,
    global: filteredShortcuts.global.length,
    navigation: filteredShortcuts.navigation.length,
    actions: filteredShortcuts.actions.length,
    context: filteredShortcuts.context.length
  }), [filteredShortcuts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="dialog-keyboard-shortcuts">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Navigate faster with keyboard shortcuts. Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Esc</kbd> to close.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-shortcuts"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({categoryCounts.all})
            </TabsTrigger>
            <TabsTrigger value="global" data-testid="tab-global">
              Global ({categoryCounts.global})
            </TabsTrigger>
            <TabsTrigger value="navigation" data-testid="tab-navigation">
              Navigation ({categoryCounts.navigation})
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              Actions ({categoryCounts.actions})
            </TabsTrigger>
            <TabsTrigger value="context" data-testid="tab-context">
              Context ({categoryCounts.context})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {displayShortcuts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No shortcuts found</p>
                  {searchQuery && (
                    <p className="text-sm mt-2">
                      Try a different search term
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {displayShortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-sm text-muted-foreground border-t pt-4">
          <p className="flex items-center gap-2">
            <span className="font-medium">Tip:</span>
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">?</kbd> anytime to open this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual shortcut row component
 */
function ShortcutRow({ shortcut }: { shortcut: ShortcutConfig }) {
  const formattedKeys = formatShortcut(shortcut);
  const categoryColor = getCategoryColor(shortcut.category);

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
      data-testid={`shortcut-${shortcut.id}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{shortcut.description}</p>
          <Badge variant="outline" className={cn("text-xs", categoryColor)}>
            {shortcut.category}
          </Badge>
        </div>
        {shortcut.sequence && (
          <p className="text-xs text-muted-foreground mt-1">
            Press keys in sequence
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {renderKeyboardKeys(formattedKeys)}
      </div>
    </div>
  );
}

/**
 * Render keyboard keys with proper styling
 */
function renderKeyboardKeys(formatted: string): React.ReactNode[] {
  // Split by common separators
  const parts = formatted.split(/(\+|then)/);
  
  return parts.map((part, index) => {
    const trimmed = part.trim();
    
    if (trimmed === '+' || trimmed === 'then') {
      return (
        <span key={index} className="text-xs text-muted-foreground mx-1">
          {trimmed}
        </span>
      );
    }
    
    return (
      <kbd
        key={index}
        className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm min-w-[2rem] text-center"
      >
        {trimmed}
      </kbd>
    );
  });
}

/**
 * Get color class for category badge
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case "global":
      return "text-blue-600 dark:text-blue-400";
    case "navigation":
      return "text-purple-600 dark:text-purple-400";
    case "actions":
      return "text-green-600 dark:text-green-400";
    case "context":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Hook to manage keyboard shortcuts modal state
 */
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}
