import { Injectable } from '@angular/core';
import { TaskRepository } from '../repositories/task.repository';
import { TaskInstanceRepository } from '../repositories/task-instance.repository';
import { RecurrenceEngineService } from './recurrence-engine.service';

/**
 * Streak Engine Service
 * Calculates and tracks task completion streaks
 */
@Injectable({
    providedIn: 'root'
})
export class StreakEngineService {
    constructor(
        private taskRepo: TaskRepository,
        private instanceRepo: TaskInstanceRepository,
        private recurrenceEngine: RecurrenceEngineService
    ) { }

    /**
     * Calculate the current streak for a task up to a specific date
     * @param taskId The task ID
     * @param upToDate The date to calculate streak up to (ISO format YYYY-MM-DD)
     * @returns The current streak count (number of consecutive completions)
     */
    async calculateStreak(taskId: string, upToDate: string): Promise<number> {
        const task = await this.taskRepo.getById(taskId);
        if (!task || !task.streakEnabled) {
            return 0;
        }

        let streak = 0;
        let currentDate = new Date(upToDate);
        const startDate = new Date(task.recurrence.startDate);

        // Walk backward from upToDate
        while (currentDate >= startDate) {
            const dateStr = this.formatDate(currentDate);

            // Check if task should occur on this date
            const shouldOccur = this.recurrenceEngine.doesTaskOccurOnDate(task, dateStr);

            if (shouldOccur) {
                // Check if task was completed on this date
                const instance = await this.instanceRepo.getByTaskAndDate(taskId, dateStr);

                if (instance && instance.status === 'completed') {
                    streak++;
                } else {
                    // Streak broken - task should have occurred but wasn't completed
                    break;
                }
            }
            // If task doesn't occur on this date, continue checking previous days
            // (non-occurrence days don't break the streak)

            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    /**
     * Check if a streak is broken on a specific date
     * @param taskId The task ID
     * @param date The date to check
     * @returns true if the streak was broken on this date
     */
    async isStreakBroken(taskId: string, date: string): Promise<boolean> {
        const task = await this.taskRepo.getById(taskId);
        if (!task || !task.streakEnabled) {
            return false;
        }

        // Check if task should occur on this date
        const shouldOccur = this.recurrenceEngine.doesTaskOccurOnDate(task, date);
        if (!shouldOccur) {
            return false; // Can't break streak on non-occurrence day
        }

        // Check if task was completed
        const instance = await this.instanceRepo.getByTaskAndDate(taskId, date);

        // Streak is broken if task should occur but wasn't completed or was skipped
        return !instance || instance.status !== 'completed';
    }

    /**
     * Get the longest streak for a task
     * @param taskId The task ID
     * @returns The longest streak achieved
     */
    async getLongestStreak(taskId: string): Promise<number> {
        const task = await this.taskRepo.getById(taskId);
        if (!task || !task.streakEnabled) {
            return 0;
        }

        const instances = await this.instanceRepo.getByTaskId(taskId);
        const completedDates = instances
            .filter(i => i.status === 'completed')
            .map(i => i.date)
            .sort();

        if (completedDates.length === 0) {
            return 0;
        }

        let longestStreak = 0;
        let currentStreak = 0;
        let lastOccurrenceDate: string | null = null;

        for (const date of completedDates) {
            // Check if this is an occurrence date
            if (!this.recurrenceEngine.doesTaskOccurOnDate(task, date)) {
                continue;
            }

            if (lastOccurrenceDate === null) {
                // First occurrence
                currentStreak = 1;
            } else {
                // Check if this is the next consecutive occurrence
                const nextOccurrence = this.recurrenceEngine.getNextOccurrence(task, lastOccurrenceDate);
                if (nextOccurrence === date) {
                    currentStreak++;
                } else {
                    // Streak broken, reset
                    longestStreak = Math.max(longestStreak, currentStreak);
                    currentStreak = 1;
                }
            }

            lastOccurrenceDate = date;
        }

        return Math.max(longestStreak, currentStreak);
    }

    /**
     * Get streak statistics for a task
     * @param taskId The task ID
     * @param upToDate The date to calculate up to
     * @returns Streak statistics
     */
    async getStreakStats(taskId: string, upToDate: string): Promise<{
        currentStreak: number;
        longestStreak: number;
        totalCompletions: number;
        totalOccurrences: number;
        completionRate: number;
    }> {
        const task = await this.taskRepo.getById(taskId);
        if (!task) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalCompletions: 0,
                totalOccurrences: 0,
                completionRate: 0,
            };
        }

        const currentStreak = await this.calculateStreak(taskId, upToDate);
        const longestStreak = await this.getLongestStreak(taskId);

        // Calculate total occurrences and completions
        const startDate = task.recurrence.startDate;
        const occurrenceDates = this.recurrenceEngine.getOccurrenceDates(task, startDate, upToDate);
        const totalOccurrences = occurrenceDates.length;

        const instances = await this.instanceRepo.getByTaskId(taskId);
        const totalCompletions = instances.filter(i => i.status === 'completed').length;

        const completionRate = totalOccurrences > 0 ? (totalCompletions / totalOccurrences) * 100 : 0;

        return {
            currentStreak,
            longestStreak,
            totalCompletions,
            totalOccurrences,
            completionRate,
        };
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
}
