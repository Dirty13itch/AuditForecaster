import { lazy, Suspense } from "react";
import { CalendarLoadingFallback } from "@/components/LoadingStates";
import type { ComponentProps } from "react";
import type { momentLocalizer } from "react-big-calendar";

/**
 * Lazy-loaded wrapper for react-big-calendar
 * This splits the heavy calendar library into a separate bundle
 * that only loads when calendar views are accessed
 */

// Lazy load the calendar component
const LazyBigCalendar = lazy(() =>
  import("react-big-calendar").then((module) => ({ 
    default: module.Calendar 
  }))
);

// Export localizer setup directly (it's small)
export { momentLocalizer, dateFnsLocalizer } from "react-big-calendar";
export type { Event, View, NavigateAction, Messages, Formats } from "react-big-calendar";

// Import styles when the module loads
import("react-big-calendar/lib/css/react-big-calendar.css");

// Wrapper component with loading state
export function Calendar<
  TEvent extends object = Event,
  TResource extends object = object
>(props: ComponentProps<typeof LazyBigCalendar<TEvent, TResource>>) {
  return (
    <Suspense fallback={<CalendarLoadingFallback />}>
      <LazyBigCalendar {...props} />
    </Suspense>
  );
}

// Common event interface for type safety
export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
}