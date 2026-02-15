import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { DailyRecord } from '../models';

/**
 * Repository for DailyRecord operations
 * Manages daily lifestyle tracking data
 */
@Injectable({
    providedIn: 'root'
})
export class DailyRecordRepository {
    constructor(private storage: StorageService) { }

    /**
     * Get daily record for a specific date
     */
    async getByDate(date: string): Promise<DailyRecord | undefined> {
        return this.storage.get('dailyRecords', date);
    }

    /**
     * Create or update a daily record (upsert)
     */
    async upsert(record: DailyRecord): Promise<string> {
        return this.storage.put('dailyRecords', record);
    }

    /**
     * Delete a daily record
     */
    async delete(date: string): Promise<void> {
        return this.storage.delete('dailyRecords', date);
    }

    /**
     * Get all daily records
     */
    async getAll(): Promise<DailyRecord[]> {
        return this.storage.getAll('dailyRecords');
    }

    /**
     * Get records within a date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<DailyRecord[]> {
        const allRecords = await this.getAll();
        return allRecords.filter(r => r.date >= startDate && r.date <= endDate);
    }

    /**
     * Check if a record exists for a date
     */
    async exists(date: string): Promise<boolean> {
        const record = await this.getByDate(date);
        return record !== undefined;
    }
}
