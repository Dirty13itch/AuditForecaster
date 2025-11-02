import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Keyboard, RotateCcw, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KeyboardPreference {
  enabled: boolean;
  modifier: 'cmd' | 'ctrl' | 'alt';
  customShortcuts: Record<string, string>;
}

const defaultShortcuts = {
  'quick-search': 'K',
  'new-job': 'N',
  'go-photos': 'P',
  'go-jobs': 'J',
  'go-field-day': 'F',
  'save-form': 'S',
  'show-help': '/',
};

const shortcutDescriptions = {
  'quick-search': 'Quick search',
  'new-job': 'Create new job',
  'go-photos': 'Navigate to Photos',
  'go-jobs': 'Navigate to Jobs',
  'go-field-day': 'Navigate to Field Day',
  'save-form': 'Save current form',
  'show-help': 'Show keyboard shortcuts help',
};

export function KeyboardPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<KeyboardPreference>(() => {
    const stored = localStorage.getItem('keyboard-preferences');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      enabled: true,
      modifier: 'cmd',
      customShortcuts: defaultShortcuts,
    };
  });

  const handleToggle = (enabled: boolean) => {
    const newPrefs = { ...preferences, enabled };
    setPreferences(newPrefs);
    localStorage.setItem('keyboard-preferences', JSON.stringify(newPrefs));
    
    // Dispatch custom event for the keyboard shortcuts hook to listen to
    window.dispatchEvent(new CustomEvent('keyboard-preferences-changed', {
      detail: newPrefs
    }));
    
    toast({
      title: enabled ? "Keyboard shortcuts enabled" : "Keyboard shortcuts disabled",
      description: enabled 
        ? "You can now use keyboard shortcuts for quick navigation" 
        : "Keyboard shortcuts have been disabled",
    });
  };

  const handleModifierChange = (modifier: 'cmd' | 'ctrl' | 'alt') => {
    const newPrefs = { ...preferences, modifier };
    setPreferences(newPrefs);
    localStorage.setItem('keyboard-preferences', JSON.stringify(newPrefs));
    
    window.dispatchEvent(new CustomEvent('keyboard-preferences-changed', {
      detail: newPrefs
    }));
    
    toast({
      title: "Modifier key updated",
      description: `Now using ${modifier.toUpperCase()} as the primary modifier key`,
    });
  };

  const handleShortcutChange = (action: string, key: string) => {
    const newShortcuts = { ...preferences.customShortcuts, [action]: key.toUpperCase() };
    const newPrefs = { ...preferences, customShortcuts: newShortcuts };
    setPreferences(newPrefs);
  };

  const handleSave = () => {
    localStorage.setItem('keyboard-preferences', JSON.stringify(preferences));
    
    window.dispatchEvent(new CustomEvent('keyboard-preferences-changed', {
      detail: preferences
    }));
    
    toast({
      title: "Preferences saved",
      description: "Your keyboard shortcut preferences have been updated",
    });
  };

  const handleReset = () => {
    const defaultPrefs: KeyboardPreference = {
      enabled: true,
      modifier: 'cmd',
      customShortcuts: defaultShortcuts,
    };
    setPreferences(defaultPrefs);
    localStorage.setItem('keyboard-preferences', JSON.stringify(defaultPrefs));
    
    window.dispatchEvent(new CustomEvent('keyboard-preferences-changed', {
      detail: defaultPrefs
    }));
    
    toast({
      title: "Reset to defaults",
      description: "Keyboard shortcuts have been reset to default settings",
    });
  };

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierDisplay = preferences.modifier === 'cmd' 
    ? (isMac ? '⌘' : 'Ctrl') 
    : preferences.modifier === 'ctrl' 
    ? 'Ctrl' 
    : 'Alt';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <CardTitle>Keyboard Shortcuts</CardTitle>
        </div>
        <CardDescription>
          Configure keyboard shortcuts for quick navigation and actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="keyboard-enabled">Enable keyboard shortcuts</Label>
            <div className="text-sm text-muted-foreground">
              Use keyboard shortcuts for faster navigation
            </div>
          </div>
          <Switch
            id="keyboard-enabled"
            checked={preferences.enabled}
            onCheckedChange={handleToggle}
            data-testid="switch-keyboard-enabled"
          />
        </div>

        {preferences.enabled && (
          <>
            {/* Primary Modifier Key */}
            <div className="space-y-2">
              <Label htmlFor="modifier-key">Primary modifier key</Label>
              <Select value={preferences.modifier} onValueChange={(value: 'cmd' | 'ctrl' | 'alt') => handleModifierChange(value)}>
                <SelectTrigger id="modifier-key" data-testid="select-modifier-key">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmd">
                    {isMac ? 'Command (⌘)' : 'Ctrl'}
                  </SelectItem>
                  <SelectItem value="ctrl">Control (Ctrl)</SelectItem>
                  <SelectItem value="alt">Alt / Option</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This key is used in combination with other keys for shortcuts
              </p>
            </div>

            {/* Custom Shortcuts */}
            <div className="space-y-4">
              <div>
                <Label>Customize shortcuts</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on a key to change the shortcut
                </p>
              </div>
              
              <div className="grid gap-3">
                {Object.entries(shortcutDescriptions).map(([action, description]) => (
                  <div key={action} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {modifierDisplay} + {preferences.customShortcuts[action] || defaultShortcuts[action]}
                        </Badge>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={preferences.customShortcuts[action] || defaultShortcuts[action]}
                      onChange={(e) => {
                        const value = e.target.value.slice(-1).toUpperCase();
                        if (value && /^[A-Z0-9/]$/.test(value)) {
                          handleShortcutChange(action, value);
                        }
                      }}
                      className="w-12 h-8 text-center border rounded px-2 font-mono text-sm uppercase"
                      maxLength={1}
                      data-testid={`input-shortcut-${action}`}
                    />
                  </div>
                ))}
              </div>

              {/* Additional Shortcuts Info */}
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Additional shortcuts</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">g</kbd> then a letter for quick navigation</div>
                  <div>• Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">Alt</kbd> + <kbd className="px-1 py-0.5 bg-background rounded text-xs">1-9</kbd> for menu items</div>
                  <div>• Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">?</kbd> to show all shortcuts</div>
                  <div>• Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">Esc</kbd> to close dialogs</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4">
              <Button onClick={handleSave} data-testid="button-save-preferences">
                <Save className="h-4 w-4 mr-2" />
                Save preferences
              </Button>
              <Button variant="outline" onClick={handleReset} data-testid="button-reset-preferences">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to defaults
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}