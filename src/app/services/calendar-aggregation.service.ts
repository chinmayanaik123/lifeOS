import { Injectable } from '@angular/core';
import { TaskRepository } from '../repositories/task.repository';
import { TaskInstanceRepository } from '../repositories/task-instance.repository';
import { DailyRecordRepository } from '../repositories/daily-record.repository';
import { FinanceRepository } from '../repositories/finance.repository';
import { RecurrenceEngineService } from './recurrence-engine.service';
import { LocationFilterService } from './location-filter.service';
import { StreakEngineService } from './streak-engine.service';
import { CalendarDayView, LocationType } from '../models';

/**
 * Calendar Aggregation Service
 * Builds calendar views with aggregated daily information
 */
@Injectable({
    providedIn: 'root'
})
export class CalendarAggregationService {
    constructor(
        private taskRepo: TaskRepository,
        private instanceRepo: TaskInstanceRepository,
        private dailyRecordRepo: DailyRecordRepository,
        private financeRepo: FinanceRepository,
        private recurrenceEngine: RecurrenceEngineService,
        private locationFilter: LocationFilterService,
        private streakEngine: StreakEngineService
    ) { }

    /**
     * Build calendar view for a specific month
     * @param year The year
     * @param month The month (1-12)
     * @param currentLocation The current user location
     * @returns Array of calendar day views for the month
     */
    async buildCalendarView(
        year: number,
        month: number,
        currentLocation: LocationType
    ): Promise<CalendarDayView[]> {
        const daysInMonth = new Date(year, month, 0).getDate();
        const views: CalendarDayView[] = [];

        // Get all active tasks once
        const allTasks = await this.taskRepo.getActiveTasks();

        // Get all instances for the month
        const startDate = this.formatDate(new Date(year, month - 1, 1));
        const endDate = this.formatDate(new Date(year, month - 1, daysInMonth));
        const instances = await this.instanceRepo.getByDateRange(startDate, endDate);
        const dailyRecords = await this.dailyRecordRepo.getByDateRange(startDate, endDate);
        const financeEntries = await this.financeRepo.getByDateRange(startDate, endDate);

        // Create maps for quick lookup
        const instancesByDate = this.groupByDate(instances);
        const recordsByDate = new Map(dailyRecords.map(r => [r.date, r]));
        const financeByDate = this.groupByDate(financeEntries);

        // Build view for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dateStr = this.formatDate(date);

            const dayView = await this.buildDayView(
                dateStr,
                allTasks,
                instancesByDate.get(dateStr) || [],
                recordsByDate.has(dateStr),
                financeByDate.has(dateStr),
                currentLocation
            );

            views.push(dayView);
        }

        return views;
    }

    /**
     * Build view for a single day
     */
    private async buildDayView(
        date: string,
        allTasks: any[],
        instances: any[],
        hasRecord: boolean,
        hasFinance: boolean,
        currentLocation: LocationType
    ): Promise<CalendarDayView> {
        // Filter tasks that occur on this date
        const tasksForDate = allTasks.filter(task =>
            this.recurrenceEngine.doesTaskOccurOnDate(task, date)
        );

        // Filter by location
        const locationFilteredTasks = this.locationFilter.filterTasksByLocation(
            tasksForDate,
            currentLocation
        );

        const tasksTotal = locationFilteredTasks.length;

        // Create instance map for quick lookup
        const instanceMap = new Map(instances.map(i => [i.taskId, i]));

        // Count completed tasks
        let tasksCompleted = 0;
        let streakBroken = false;

        for (const task of locationFilteredTasks) {
            const instance = instanceMap.get(task.id);

            if (instance && instance.status === 'completed') {
                tasksCompleted++;
            } else if (task.streakEnabled) {
                // Check if streak was broken
                const isBreak = await this.streakEngine.isStreakBroken(task.id, date);
                if (isBreak) {
                    streakBroken = true;
                }
            }
        }

        // Generate icons
        const icons = this.generateIcons(
            tasksCompleted,
            tasksTotal,
            hasRecord,
            hasFinance,
            streakBroken
        );

        return {
            date,
            tasksCompleted,
            tasksTotal,
            hasNote: hasRecord,
            hasFinanceEntry: hasFinance,
            streakBroken,
            icons,
        };
    }

    /**
     * Generate visual indicator icons for a day
     */
    private generateIcons(
        completed: number,
        total: number,
        hasNote: boolean,
        hasFinance: boolean,
        streakBroken: boolean
    ): string[] {
        const icons: string[] = [];

        // Task completion icon
        if (total > 0) {
            if (completed === total) {
                icons.push('✓'); // All tasks completed
            } else if (completed > 0) {
                icons.push('◐'); // Partially completed
            } else {
                icons.push('○'); // No tasks completed
            }
        }

        // Note icon
        if (hasNote) {
            icons.push('📝');
        }

        // Finance icon
        if (hasFinance) {
            icons.push('💰');
        }

        // Streak broken icon
        if (streakBroken) {
            icons.push('⚠️');
        }

        return icons;
    }

    /**
     * Get calendar view for a date range
     * @param startDate Start date (ISO format)
     * @param endDate End date (ISO format)
     * @param currentLocation Current user location
     * @returns Array of calendar day views
     */
    async buildCalendarViewForRange(
        startDate: string,
        endDate: string,
        currentLocation: LocationType
    ): Promise<CalendarDayView[]> {
        const views: CalendarDayView[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get all data once
        const allTasks = await this.taskRepo.getActiveTasks();
        const instances = await this.instanceRepo.getByDateRange(startDate, endDate);
        const dailyRecords = await this.dailyRecordRepo.getByDateRange(startDate, endDate);
        const financeEntries = await this.financeRepo.getByDateRange(startDate, endDate);

        // Create maps
        const instancesByDate = this.groupByDate(instances);
        const recordsByDate = new Map(dailyRecords.map(r => [r.date, r]));
        const financeByDate = this.groupByDate(financeEntries);

        // Build views
        const current = new Date(start);
        while (current <= end) {
            const dateStr = this.formatDate(current);

            const dayView = await this.buildDayView(
                dateStr,
                allTasks,
                instancesByDate.get(dateStr) || [],
                recordsByDate.has(dateStr),
                financeByDate.has(dateStr),
                currentLocation
            );

            views.push(dayView);
            current.setDate(current.getDate() + 1);
        }

        return views;
    }

    /**
     * Group items by date
     */
    private groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
        const map = new Map<string, T[]>();

        for (const item of items) {
            const existing = map.get(item.date) || [];
            existing.push(item);
            map.set(item.date, existing);
        }

        return map;
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
