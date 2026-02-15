import { LocationType } from './task.model';

/**
 * Daily lifestyle tracking record
 */
export interface DailyRecord {
    /** Date for this record (ISO date string YYYY-MM-DD) */
    date: string;
    /** Water intake in ml */
    waterIntake?: number;
    /** List of fruits consumed */
    fruitIntake?: string[];
    /** Weight in kg */
    weight?: number;
    /** Sleep duration in hours */
    sleepHours?: number;
    /** Text notes for the day */
    notes?: string;
    /** URL to voice note recording */
    voiceNoteUrl?: string;
    /** URL to daily selfie */
    selfieUrl?: string;
    /** Current location for the day */
    location?: LocationType;
}
