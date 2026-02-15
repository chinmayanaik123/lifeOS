import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Task } from '../models';

/**
 * Repository for Task operations
 * Provides abstraction over storage layer for task management
 */
@Injectable({
    providedIn: 'root'
})
export class TaskRepository {
    constructor(private storage: StorageService) { }

    /**
     * Get all tasks
     */
    async getAll(): Promise<Task[]> {
        return this.storage.getAll('tasks');
    }

    /**
     * Get all active (non-archived) tasks
     */
    async getActiveTasks(): Promise<Task[]> {
        const allTasks = await this.storage.getAll('tasks');
        return allTasks.filter(task => !task.isArchived);
    }

    /**
     * Get a task by ID
     */
    async getById(id: string): Promise<Task | undefined> {
        return this.storage.get('tasks', id);
    }

    /**
     * Create a new task
     */
    async create(task: Task): Promise<string> {
        return this.storage.put('tasks', task);
    }

    /**
     * Update an existing task
     */
    async update(task: Task): Promise<string> {
        return this.storage.put('tasks', task);
    }

    /**
     * Delete a task
     */
    async delete(id: string): Promise<void> {
        return this.storage.delete('tasks', id);
    }

    /**
     * Archive a task (soft delete)
     */
    async archive(id: string): Promise<void> {
        const task = await this.getById(id);
        if (task) {
            task.isArchived = true;
            await this.update(task);
        }
    }

    /**
     * Unarchive a task
     */
    async unarchive(id: string): Promise<void> {
        const task = await this.getById(id);
        if (task) {
            task.isArchived = false;
            await this.update(task);
        }
    }
}
