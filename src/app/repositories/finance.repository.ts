import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { FinanceEntry } from '../models';

/**
 * Repository for FinanceEntry operations
 * Manages financial transaction records
 */
@Injectable({
    providedIn: 'root'
})
export class FinanceRepository {
    constructor(private storage: StorageService) { }

    /**
     * Get all finance entries for a specific date
     */
    async getByDate(date: string): Promise<FinanceEntry[]> {
        return this.storage.getAllFromIndex('financeEntries', 'by-date', date);
    }

    /**
     * Get a finance entry by ID
     */
    async getById(id: string): Promise<FinanceEntry | undefined> {
        return this.storage.get('financeEntries', id);
    }

    /**
     * Create a new finance entry
     */
    async create(entry: FinanceEntry): Promise<string> {
        return this.storage.put('financeEntries', entry);
    }

    /**
     * Update an existing finance entry
     */
    async update(entry: FinanceEntry): Promise<string> {
        return this.storage.put('financeEntries', entry);
    }

    /**
     * Delete a finance entry
     */
    async delete(id: string): Promise<void> {
        return this.storage.delete('financeEntries', id);
    }

    /**
     * Get all finance entries
     */
    async getAll(): Promise<FinanceEntry[]> {
        return this.storage.getAll('financeEntries');
    }

    /**
     * Get entries within a date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<FinanceEntry[]> {
        const allEntries = await this.getAll();
        return allEntries.filter(e => e.date >= startDate && e.date <= endDate);
    }

    /**
     * Calculate total for a date
     */
    async getTotalForDate(date: string): Promise<number> {
        const entries = await this.getByDate(date);
        return entries.reduce((sum, entry) => sum + entry.amount, 0);
    }

    /**
     * Calculate total for a date range
     */
    async getTotalForDateRange(startDate: string, endDate: string): Promise<number> {
        const entries = await this.getByDateRange(startDate, endDate);
        return entries.reduce((sum, entry) => sum + entry.amount, 0);
    }
}
