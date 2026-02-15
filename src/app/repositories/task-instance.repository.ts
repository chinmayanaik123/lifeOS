import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { TaskInstance } from '../models';

/**
 * Repository for TaskInstance operations
 * Manages task completion records for specific dates
 */
@Injectable({
    providedIn: 'root'
})
export class TaskInstanceRepository {
    constructor(private storage: StorageService) { }

    /**
     * Get all task instances for a specific date
     */
    async getByDate(date: string): Promise<TaskInstance[]> {
        return this.storage.getAllFromIndex('taskInstances', 'by-date', date);
    }

    /**
     * Get all instances for a specific task
     */
    async getByTaskId(taskId: string): Promise<TaskInstance[]> {
        return this.storage.getAllFromIndex('taskInstances', 'by-taskId', taskId);
    }

    /**
     * Get a specific task instance
     */
    async getById(id: string): Promise<TaskInstance | undefined> {
        return this.storage.get('taskInstances', id);
    }

    /**
     * Get instance for a specific task on a specific date
     */
    async getByTaskAndDate(taskId: string, date: string): Promise<TaskInstance | undefined> {
        const instances = await this.getByDate(date);
        return instances.find(i => i.taskId === taskId);
    }

    /**
     * Create or update a task instance (upsert)
     */
    async upsert(instance: TaskInstance): Promise<string> {
        return this.storage.put('taskInstances', instance);
    }

    /**
     * Delete a task instance
     */
    async delete(id: string): Promise<void> {
        return this.storage.delete('taskInstances', id);
    }

    /**
     * Delete all instances for a specific task
     */
    async deleteByTaskId(taskId: string): Promise<void> {
        const instances = await this.getByTaskId(taskId);
        await Promise.all(instances.map(i => this.delete(i.id)));
    }

    /**
     * Get instances within a date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<TaskInstance[]> {
        const allInstances = await this.storage.getAll('taskInstances');
        return allInstances.filter(i => i.date >= startDate && i.date <= endDate);
    }
}
