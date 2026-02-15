import { Injectable } from '@angular/core';
import { TaskRepository } from '../repositories/task.repository';
import { TaskInstanceRepository } from '../repositories/task-instance.repository';
import { RecurrenceEngineService } from './recurrence-engine.service';
import { LocationFilterService } from './location-filter.service';
import { StreakEngineService } from './streak-engine.service';
import { TaskInstanceView, LocationType, TaskInstance } from '../models';

/**
 * Instance Resolution Service
 * Resolves tasks for a specific date by combining task definitions with instances
 */
@Injectable({
    providedIn: 'root'
})
export class InstanceResolutionService {
    constructor(
        private taskRepo: TaskRepository,
        private instanceRepo: TaskInstanceRepository,
        private recurrenceEngine: RecurrenceEngineService,
        private locationFilter: LocationFilterService,
        private streakEngine: StreakEngineService
    ) { }

    /**
     * Resolve all tasks for a specific date
     * @param date The date to resolve (ISO format YYYY-MM-DD)
     * @param currentLocation The current user location
     * @returns Array of resolved task instance views
     */
    async resolveTasksForDate(date: string, currentLocation: LocationType): Promise<TaskInstanceView[]> {
        // Step 1: Get all active tasks
        const allTasks = await this.taskRepo.getActiveTasks();

        // Step 2: Filter by recurrence (does task occur on this date?)
        const recurringTasks = allTasks.filter(task =>
            this.recurrenceEngine.doesTaskOccurOnDate(task, date)
        );

        // Step 3: Filter by location
        const locationFilteredTasks = this.locationFilter.filterTasksByLocation(
            recurringTasks,
            currentLocation
        );

        // Step 4: Get existing task instances for this date
        const existingInstances = await this.instanceRepo.getByDate(date);
        const instanceMap = new Map(existingInstances.map(i => [i.taskId, i]));

        // Step 5: Merge tasks with instances
        const resolvedViews: TaskInstanceView[] = [];

        for (const task of locationFilteredTasks) {
            const existingInstance = instanceMap.get(task.id);

            // Create or use existing instance
            const instance: TaskInstance = existingInstance || {
                id: this.generateInstanceId(task.id, date),
                taskId: task.id,
                date: date,
                status: 'pending',
            };

            // Calculate streak if enabled
            let currentStreak: number | undefined;
            if (task.streakEnabled) {
                currentStreak = await this.streakEngine.calculateStreak(task.id, date);
            }

            // Create resolved view
            const view: TaskInstanceView = {
                ...instance,
                task: task,
                currentStreak: currentStreak,
            };

            resolvedViews.push(view);
        }

        // Sort by priority and title
        return this.sortTaskViews(resolvedViews);
    }

    /**
     * Resolve a single task for a specific date
     * @param taskId The task ID
     * @param date The date (ISO format)
     * @param currentLocation The current user location
     * @returns Resolved task instance view or null if not applicable
     */
    async resolveTaskForDate(
        taskId: string,
        date: string,
        currentLocation: LocationType
    ): Promise<TaskInstanceView | null> {
        const task = await this.taskRepo.getById(taskId);
        if (!task || task.isArchived) {
            return null;
        }

        // Check recurrence
        if (!this.recurrenceEngine.doesTaskOccurOnDate(task, date)) {
            return null;
        }

        // Check location
        if (!this.locationFilter.isLocationAllowed(task, currentLocation)) {
            return null;
        }

        // Get or create instance
        const existingInstance = await this.instanceRepo.getByTaskAndDate(taskId, date);
        const instance: TaskInstance = existingInstance || {
            id: this.generateInstanceId(taskId, date),
            taskId: taskId,
            date: date,
            status: 'pending',
        };

        // Calculate streak
        let currentStreak: number | undefined;
        if (task.streakEnabled) {
            currentStreak = await this.streakEngine.calculateStreak(taskId, date);
        }

        return {
            ...instance,
            task: task,
            currentStreak: currentStreak,
        };
    }

    /**
     * Complete a task instance
     * @param taskId The task ID
     * @param date The date
     * @param value Optional value for counter/dropdown/text types
     */
    async completeTask(taskId: string, date: string, value?: number | string): Promise<void> {
        const existingInstance = await this.instanceRepo.getByTaskAndDate(taskId, date);

        const instance: TaskInstance = existingInstance || {
            id: this.generateInstanceId(taskId, date),
            taskId: taskId,
            date: date,
            status: 'completed',
            completedAt: new Date().toISOString(),
            value: value,
        };

        instance.status = 'completed';
        instance.completedAt = new Date().toISOString();
        if (value !== undefined) {
            instance.value = value;
        }

        await this.instanceRepo.upsert(instance);
    }

    /**
     * Mark a task instance as skipped
     */
    async skipTask(taskId: string, date: string): Promise<void> {
        const existingInstance = await this.instanceRepo.getByTaskAndDate(taskId, date);

        const instance: TaskInstance = existingInstance || {
            id: this.generateInstanceId(taskId, date),
            taskId: taskId,
            date: date,
            status: 'skipped',
        };

        instance.status = 'skipped';
        await this.instanceRepo.upsert(instance);
    }

    /**
     * Reset a task instance to pending
     */
    async resetTask(taskId: string, date: string): Promise<void> {
        const existingInstance = await this.instanceRepo.getByTaskAndDate(taskId, date);

        if (existingInstance) {
            existingInstance.status = 'pending';
            existingInstance.completedAt = undefined;
            existingInstance.value = undefined;
            await this.instanceRepo.upsert(existingInstance);
        }
    }

    /**
     * Generate a unique instance ID
     */
    private generateInstanceId(taskId: string, date: string): string {
        return `${taskId}_${date}`;
    }

    /**
     * Sort task views by priority and title
     */
    private sortTaskViews(views: TaskInstanceView[]): TaskInstanceView[] {
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        return views.sort((a, b) => {
            // Sort by priority first
            const aPriority = a.task.priority || 'low';
            const bPriority = b.task.priority || 'low';
            const priorityDiff = priorityOrder[aPriority] - priorityOrder[bPriority];

            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            // Then by title
            return a.task.title.localeCompare(b.task.title);
        });
    }
}
