/**
 * Aggregated view of a single day in the calendar
 */
export interface CalendarDayView {
    /** Date for this view (ISO date string YYYY-MM-DD) */
    date: string;
    /** Number of tasks completed on this day */
    tasksCompleted: number;
    /** Total number of tasks scheduled for this day */
    tasksTotal: number;
    /** Whether a daily note exists for this day */
    hasNote: boolean;
    /** Whether finance entries exist for this day */
    hasFinanceEntry: boolean;
    /** Whether any streak was broken on this day */
    streakBroken: boolean;
    /** Visual indicator icons for the day */
    icons: string[];
}
