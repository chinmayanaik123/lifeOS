import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase, StoreNames } from 'idb';
import { Task, TaskInstance, DailyRecord, FinanceEntry, UserSettings } from '../models';

/**
 * IndexedDB database schema
 */
interface LifeOSDB extends DBSchema {
    tasks: {
        key: string;
        value: Task;
    };
    taskInstances: {
        key: string;
        value: TaskInstance;
        indexes: { 'by-date': string; 'by-taskId': string };
    };
    dailyRecords: {
        key: string;
        value: DailyRecord;
    };
    financeEntries: {
        key: string;
        value: FinanceEntry;
        indexes: { 'by-date': string };
    };
    settings: {
        key: string;
        value: UserSettings;
    };
}

/**
 * Storage adapter service for IndexedDB
 * Provides abstraction layer over IndexedDB operations
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly DB_NAME = 'LifeOSDB';
    private readonly DB_VERSION = 1;
    private db: IDBPDatabase<LifeOSDB> | null = null;

    constructor() {
        this.initDB();
    }

    /**
     * Initialize IndexedDB database with object stores and indexes
     */
    private async initDB(): Promise<void> {
        this.db = await openDB<LifeOSDB>(this.DB_NAME, this.DB_VERSION, {
            upgrade(db) {
                // Tasks store
                if (!db.objectStoreNames.contains('tasks')) {
                    db.createObjectStore('tasks', { keyPath: 'id' });
                }


                // Task Instances store
                if (!db.objectStoreNames.contains('taskInstances')) {
                    const instanceStore = db.createObjectStore('taskInstances', { keyPath: 'id' });
                    instanceStore.createIndex('by-date', 'date');
                    instanceStore.createIndex('by-taskId', 'taskId');
                }

                // Daily Records store
                if (!db.objectStoreNames.contains('dailyRecords')) {
                    db.createObjectStore('dailyRecords', { keyPath: 'date' });
                }

                // Finance Entries store
                if (!db.objectStoreNames.contains('financeEntries')) {
                    const financeStore = db.createObjectStore('financeEntries', { keyPath: 'id' });
                    financeStore.createIndex('by-date', 'date');
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'currentLocation' });
                }
            },
        });
    }

    /**
     * Ensure database is initialized
     */
    private async ensureDB(): Promise<IDBPDatabase<LifeOSDB>> {
        if (!this.db) {
            await this.initDB();
        }
        return this.db!;
    }

    /**
     * Get all items from a store
     */
    async getAll<K extends StoreNames<LifeOSDB>>(storeName: K): Promise<LifeOSDB[K]['value'][]> {
        const db = await this.ensureDB();
        return db.getAll(storeName);
    }

    /**
     * Get a single item by key
     */
    async get<K extends StoreNames<LifeOSDB>>(
        storeName: K,
        key: string
    ): Promise<LifeOSDB[K]['value'] | undefined> {
        const db = await this.ensureDB();
        return db.get(storeName, key);
    }

    /**
     * Add or update an item
     */
    async put<K extends StoreNames<LifeOSDB>>(
        storeName: K,
        value: LifeOSDB[K]['value']
    ): Promise<string> {
        const db = await this.ensureDB();
        return db.put(storeName, value) as Promise<string>;
    }

    /**
     * Delete an item by key
     */
    async delete<K extends StoreNames<LifeOSDB>>(storeName: K, key: string): Promise<void> {
        const db = await this.ensureDB();
        await db.delete(storeName, key);
    }

    /**
     * Get items from an index
     */
    async getAllFromIndex<K extends StoreNames<LifeOSDB>>(
        storeName: K,
        indexName: string,
        query?: IDBKeyRange | string | boolean
    ): Promise<LifeOSDB[K]['value'][]> {
        const db = await this.ensureDB();
        // @ts-ignore
        return db.getAllFromIndex(storeName, indexName, query);
    }

    /**
     * Clear all data from a store
     */
    async clear<K extends StoreNames<LifeOSDB>>(storeName: K): Promise<void> {
        const db = await this.ensureDB();
        await db.clear(storeName);
    }

    /**
     * Execute a transaction with multiple operations
     */
    async transaction<K extends StoreNames<LifeOSDB>>(
        storeNames: K[],
        mode: IDBTransactionMode,
        callback: (stores: { [P in K]: any }) => Promise<void>
    ): Promise<void> {
        const db = await this.ensureDB();
        const tx = db.transaction(storeNames, mode);
        const stores = Object.fromEntries(
            storeNames.map(name => [name, tx.objectStore(name)])
        ) as { [P in K]: any };

        await callback(stores);
        await tx.done;
    }
}
