import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CalendarAggregationService } from '../../services/calendar-aggregation.service';
import { InstanceResolutionService } from '../../services/instance-resolution.service';
import { SettingsRepository } from '../../repositories/settings.repository';
import { CalendarDayView, TaskInstanceView } from '../../models';
import { StatsComponent } from '../stats/stats.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, StatsComponent],
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
    private instanceResolution: InstanceResolutionService,
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

  async toggleTask(taskView: TaskInstanceView, event: Event) {
    event.stopPropagation();

    // Explicitly type newStatus
    const newStatus: 'pending' | 'completed' | 'skipped' = taskView.status === 'completed' ? 'pending' : 'completed';
    const date = taskView.date;

    // Optimistic Update
    this.calendarData.update(days => {
      return days.map(day => {
        if (day.date === date) {
          const updatedTasks = day.tasks.map(t =>
            t.taskId === taskView.taskId ? { ...t, status: newStatus } : t
          );
          const completedCount = updatedTasks.filter(t => t.status === 'completed').length;

          return {
            ...day,
            tasks: updatedTasks,
            tasksCompleted: completedCount
          };
        }
        return day;
      });
    });

    try {
      if (newStatus === 'completed') {
        await this.instanceResolution.completeTask(taskView.taskId, date);
      } else {
        await this.instanceResolution.resetTask(taskView.taskId, date);
      }
      // Re-fetch to ensure consistency (especially streaks)
      // verify if we need to reload everything? Maybe just for that day if we had a specific method, 
      // but reloading the month is safer for now to get correct streaks
      await this.loadCalendarData();
    } catch (error) {
      console.error('Error toggling task', error);
      // Revert in case of error (by reloading original data)
      await this.loadCalendarData();
    }
  }

  // Helper to determine empty cells before the 1st of the month
  getEmptyCells(): number[] {
    const date = this.currentDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return Array(firstDay).fill(0);
  }

  isToday(dateStr: string): boolean {
    const today = new Date();
    const date = new Date(dateStr);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  isWeekend(dateStr: string): boolean {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
}
