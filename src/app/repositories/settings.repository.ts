import { Injectable, signal, WritableSignal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { UserSettings, LocationType } from '../models';

/**
 * Repository for UserSettings operations
 * Manages user preferences and configuration
 * Uses Angular signals for reactive state management
 */
@Injectable({
    providedIn: 'root'
})
export class SettingsRepository {
    // Default settings
    private readonly DEFAULT_SETTINGS: UserSettings = {
        currentLocation: 'home',
        financeEnabled: false,
        defaultReminderTime: '09:00',
        morningAlarmEnabled: false
    };

    // Reactive signal for current settings
    private settingsSignal: WritableSignal<UserSettings> = signal(this.DEFAULT_SETTINGS);

    constructor(private storage: StorageService) {
        this.loadSettings();
    }

    /**
     * Get current settings as a signal (reactive)
     */
    get settings() {
        return this.settingsSignal.asReadonly();
    }

    /**
     * Load settings from storage
     */
    private async loadSettings(): Promise<void> {
        const stored = await this.storage.get('settings', this.DEFAULT_SETTINGS.currentLocation);
        if (stored) {
            this.settingsSignal.set(stored);
        } else {
            // Initialize with defaults
            await this.update(this.DEFAULT_SETTINGS);
        }
    }

    /**
     * Get current settings (async)
     */
    async get(): Promise<UserSettings> {
        const stored = await this.storage.get('settings', this.settingsSignal().currentLocation);
        return stored || this.DEFAULT_SETTINGS;
    }

    /**
     * Update settings
     */
    async update(settings: Partial<UserSettings>): Promise<void> {
        const current = this.settingsSignal();
        const updated = { ...current, ...settings };

        await this.storage.put('settings', updated);
        this.settingsSignal.set(updated);
    }

    /**
     * Update current location
     */
    async updateLocation(location: LocationType): Promise<void> {
        await this.update({ currentLocation: location });
    }

    /**
     * Toggle finance tracking
     */
    async toggleFinance(): Promise<void> {
        const current = this.settingsSignal();
        await this.update({ financeEnabled: !current.financeEnabled });
    }

    /**
     * Update default reminder time
     */
    async updateDefaultReminderTime(time: string): Promise<void> {
        await this.update({ defaultReminderTime: time });
    }

    /**
     * Toggle morning alarm
     */
    async toggleMorningAlarm(): Promise<void> {
        const current = this.settingsSignal();
        await this.update({ morningAlarmEnabled: !current.morningAlarmEnabled });
    }

    /**
     * Reset to default settings
     */
    async reset(): Promise<void> {
        await this.update(this.DEFAULT_SETTINGS);
    }
}
