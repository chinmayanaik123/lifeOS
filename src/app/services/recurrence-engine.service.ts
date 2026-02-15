import { Injectable } from '@angular/core';
import { Task, RecurrenceRule } from '../models';

/**
 * Recurrence Engine Service
 * Determines if a task should occur on a specific date based on its recurrence rule
 */
@Injectable({
    providedIn: 'root'
})
export class RecurrenceEngineService {
    /**
     * Check if a task occurs on a specific date
     * @param task The task to check
     * @param date The date to check (ISO format YYYY-MM-DD)
     * @returns true if the task should occur on this date
     */
    doesTaskOccurOnDate(task: Task, date: string): boolean {
        const rule = task.recurrence;
        const targetDate = new Date(date);
        const startDate = new Date(rule.startDate);

        // Check if date is before start date
        if (targetDate < startDate) {
            return false;
        }

        // Check if date is after end date (if specified)
        if (rule.endDate) {
            const endDate = new Date(rule.endDate);
            if (targetDate > endDate) {
                return false;
            }
        }

        // Check recurrence type
        switch (rule.type) {
            case 'once':
                return this.isSameDate(targetDate, startDate);

            case 'daily':
                return true; // Occurs every day within the date range

            case 'weekly':
                return this.checkWeeklyRecurrence(targetDate, rule);

            case 'monthly':
                return this.checkMonthlyRecurrence(targetDate, rule);

            case 'custom':
                return this.checkCustomRecurrence(targetDate, rule);

            default:
                return false;
        }
    }

    /**
     * Check if two dates are the same day
     */
    private isSameDate(date1: Date, date2: Date): boolean {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    }

    /**
     * Check weekly recurrence
     */
    private checkWeeklyRecurrence(date: Date, rule: RecurrenceRule): boolean {
        if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
            return false;
        }

        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        return rule.daysOfWeek.includes(dayOfWeek);
    }

    /**
     * Check monthly recurrence
     */
    private checkMonthlyRecurrence(date: Date, rule: RecurrenceRule): boolean {
        if (!rule.dayOfMonth) {
            return false;
        }

        const dayOfMonth = date.getDate();
        return dayOfMonth === rule.dayOfMonth;
    }

    /**
     * Check custom recurrence (can be extended for complex patterns)
     */
    private checkCustomRecurrence(date: Date, rule: RecurrenceRule): boolean {
        // For custom recurrence, check both weekly and monthly conditions
        // This allows for patterns like "first Monday of every month"

        let weeklyMatch = true;
        let monthlyMatch = true;

        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            weeklyMatch = this.checkWeeklyRecurrence(date, rule);
        }

        if (rule.dayOfMonth) {
            monthlyMatch = this.checkMonthlyRecurrence(date, rule);
        }

        return weeklyMatch && monthlyMatch;
    }

    /**
     * Get all occurrence dates for a task within a date range
     * @param task The task
     * @param startDate Start of range (ISO format)
     * @param endDate End of range (ISO format)
     * @returns Array of ISO date strings
     */
    getOccurrenceDates(task: Task, startDate: string, endDate: string): string[] {
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current <= end) {
            const dateStr = this.formatDate(current);
            if (this.doesTaskOccurOnDate(task, dateStr)) {
                dates.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Format date as ISO string (YYYY-MM-DD)
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get the next occurrence date after a given date
     * @param task The task
     * @param afterDate Date to search after (ISO format)
     * @param maxDaysAhead Maximum days to search ahead (default 365)
     * @returns Next occurrence date or null if none found
     */
    getNextOccurrence(task: Task, afterDate: string, maxDaysAhead: number = 365): string | null {
        const start = new Date(afterDate);
        start.setDate(start.getDate() + 1); // Start from next day

        for (let i = 0; i < maxDaysAhead; i++) {
            const dateStr = this.formatDate(start);
            if (this.doesTaskOccurOnDate(task, dateStr)) {
                return dateStr;
            }
            start.setDate(start.getDate() + 1);
        }

        return null;
    }

    /**
     * Get the previous occurrence date before a given date
     * @param task The task
     * @param beforeDate Date to search before (ISO format)
     * @param maxDaysBack Maximum days to search back (default 365)
     * @returns Previous occurrence date or null if none found
     */
    getPreviousOccurrence(task: Task, beforeDate: string, maxDaysBack: number = 365): string | null {
        const start = new Date(beforeDate);
        start.setDate(start.getDate() - 1); // Start from previous day

        for (let i = 0; i < maxDaysBack; i++) {
            const dateStr = this.formatDate(start);
            if (this.doesTaskOccurOnDate(task, dateStr)) {
                return dateStr;
            }
            start.setDate(start.getDate() - 1);
        }

        return null;
    }
}
