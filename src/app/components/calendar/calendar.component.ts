import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CalendarAggregationService } from '../../services/calendar-aggregation.service';
import { SettingsRepository } from '../../repositories/settings.repository';
import { CalendarDayView } from '../../models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  currentDate = signal(new Date());
  calendarData = signal<CalendarDayView[]>([]);
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  currentMonthName = computed(() => {
    return this.currentDate().toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  constructor(
    private calendarService: CalendarAggregationService,
    private settingsRepo: SettingsRepository,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadCalendarData();
  }

  async loadCalendarData() {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const location = this.settingsRepo.settings().currentLocation;

    const data = await this.calendarService.buildCalendarView(year, month, location);
    this.calendarData.set(data);
  }

  async previousMonth() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() - 1);
      return newDate;
    });
    await this.loadCalendarData();
  }

  async nextMonth() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() + 1);
      return newDate;
    });
    await this.loadCalendarData();
  }

  onDayClick(date: string) {
    this.router.navigate(['/day', date]);
  }

  // Helper to determine empty cells before the 1st of the month
  getEmptyCells(): number[] {
    const date = this.currentDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return Array(firstDay).fill(0);
  }
}
