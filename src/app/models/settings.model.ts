import { LocationType } from './task.model';

/**
 * User settings and preferences
 */
export interface UserSettings {
    /** Current location of the user */
    currentLocation: LocationType;
    /** Whether finance tracking is enabled */
    financeEnabled: boolean;
    /** Default time for reminders (HH:mm format) */
    defaultReminderTime?: string;
    /** Whether morning alarm is enabled */
    morningAlarmEnabled: boolean;
}
