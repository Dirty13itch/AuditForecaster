import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateRangePreset =
  | "today"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "last3months"
  | "last6months"
  | "thisYear"
  | "custom";

const PRESETS: Record<DateRangePreset, { label: string; getRange: () => DateRange }> = {
  today: {
    label: "Today",
    getRange: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  last7days: {
    label: "Last 7 days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  last30days: {
    label: "Last 30 days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  thisMonth: {
    label: "This month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  lastMonth: {
    label: "Last month",
    getRange: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  last3months: {
    label: "Last 3 months",
    getRange: () => ({
      from: subMonths(new Date(), 2),
      to: new Date(),
    }),
  },
  last6months: {
    label: "Last 6 months",
    getRange: () => ({
      from: subMonths(new Date(), 5),
      to: new Date(),
    }),
  },
  thisYear: {
    label: "This year",
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  custom: {
    label: "Custom range",
    getRange: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [preset, setPreset] = useState<DateRangePreset>("last6months");
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const range = PRESETS[newPreset].getRange();
      onChange(range);
    }
  };

  const handleCustomDateChange = (date: Date | undefined, field: "from" | "to") => {
    if (!date) return;
    setPreset("custom");
    onChange({
      ...value,
      [field]: date,
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={preset} onValueChange={(val) => handlePresetChange(val as DateRangePreset)}>
        <SelectTrigger className="w-[180px]" data-testid="select-daterange-preset">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          <SelectItem value="last3months">Last 3 months</SelectItem>
          <SelectItem value="last6months">Last 6 months</SelectItem>
          <SelectItem value="thisYear">This year</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !value.from && "text-muted-foreground"
            )}
            data-testid="button-daterange-picker"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.from && value.to ? (
              <>
                {format(value.from, "MMM d, yyyy")} - {format(value.to, "MMM d, yyyy")}
              </>
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="p-3 border-r">
              <p className="text-sm font-medium mb-2">From</p>
              <Calendar
                mode="single"
                selected={value.from}
                onSelect={(date) => handleCustomDateChange(date, "from")}
                initialFocus
                data-testid="calendar-from"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium mb-2">To</p>
              <Calendar
                mode="single"
                selected={value.to}
                onSelect={(date) => handleCustomDateChange(date, "to")}
                disabled={(date) => date < value.from}
                data-testid="calendar-to"
              />
            </div>
          </div>
          <div className="p-3 border-t flex justify-end">
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              data-testid="button-daterange-apply"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
