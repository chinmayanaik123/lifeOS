import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsRepository } from '../../repositories/settings.repository';
import { LocationType } from '../../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  // Options for the location selector
  locationOptions: { value: LocationType; label: string; icon: string }[] = [
    { value: 'home', label: 'Home', icon: '🏠' },
    { value: 'office', label: 'Office', icon: '🏢' },
    { value: 'bengaluru', label: 'Bengaluru', icon: '🌆' },
    { value: 'native', label: 'Native', icon: '🏡' },
    { value: 'outside', label: 'Outside', icon: '🌳' }
  ];

  constructor(public settingsRepo: SettingsRepository) { }

  // Methods to update settings
  updateLocation(location: LocationType) {
    this.settingsRepo.updateLocation(location);
  }

  toggleFinance() {
    this.settingsRepo.toggleFinance();
  }

  toggleMorningAlarm() {
    this.settingsRepo.toggleMorningAlarm();
  }

  updateReminderTime(event: Event) {
    const input = event.target as HTMLInputElement;
    this.settingsRepo.updateDefaultReminderTime(input.value);
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      await this.settingsRepo.reset();
    }
  }
}
