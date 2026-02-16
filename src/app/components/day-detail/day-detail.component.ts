import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { InstanceResolutionService } from '../../services/instance-resolution.service';
import { SettingsRepository } from '../../repositories/settings.repository';
import { DailyRecordRepository } from '../../repositories/daily-record.repository';
import { TaskRepository } from '../../repositories/task.repository';
import { TaskInstanceView, DailyRecord } from '../../models';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './day-detail.component.html',
  styleUrls: ['./day-detail.component.css']
})
export class DayDetailComponent implements OnInit {
  date: string = '';
  tasks = signal<TaskInstanceView[]>([]);

  sortedTasks = computed(() => {
    return [...this.tasks()].sort((a, b) => {
      // Completed at bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      // Then by priority ascending
      return (a.task.priority || 0) - (b.task.priority || 0);
    });
  });

  pendingTasks = computed(() => this.tasks().filter(t => t.status !== 'completed').sort((a, b) => (a.task.priority || 0) - (b.task.priority || 0)));
  completedTasksList = computed(() => this.tasks().filter(t => t.status === 'completed').sort((a, b) => (a.task.priority || 0) - (b.task.priority || 0)));

  // Daily Record State
  dailyRecord = signal<DailyRecord>({
    date: '',
    waterIntake: 0,
    fruitIntake: [],
    sleepHours: 0,
    weight: 0,
    notes: ''
  });

  fruitOptions = ['Banana', 'Apple', 'Orange', 'Pomegranate'];

  completedTasks = computed(() => this.tasks().filter(t => t.status === 'completed'));

  fruitSummary = computed(() => {
    const fruits = this.dailyRecord().fruitIntake || [];
    return fruits.length > 0 ? fruits.join(', ') : 'None';
  });

  notePreview = computed(() => {
    const notes = this.dailyRecord().notes || '';
    return notes.length > 50 ? notes.substring(0, 50) + '...' : notes;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceResolution: InstanceResolutionService,
    private settingsRepo: SettingsRepository,
    private dailyRecordRepo: DailyRecordRepository,
    private taskRepo: TaskRepository
  ) { }

  async ngOnInit() {
    this.route.params.subscribe(async params => {
      this.date = params['date'];
      if (this.date) {
        // Ensure dailyRecord has the correct date immediately
        this.dailyRecord.update(r => ({ ...r, date: this.date }));
        await Promise.all([
          this.loadTasks(),
          this.loadDailyRecord()
        ]);
      }
    });
  }

  async loadTasks() {
    const location = this.settingsRepo.settings().currentLocation;
    const resolvedTasks = await this.instanceResolution.resolveTasksForDate(this.date, location);
    this.tasks.set(resolvedTasks);
  }

  async loadDailyRecord() {
    const record = await this.dailyRecordRepo.getByDate(this.date);
    if (record) {
      this.dailyRecord.set({ ...this.dailyRecord(), ...record });
    } else {
      // Reset to default if no record exists, keeping the date
      this.dailyRecord.set({
        date: this.date,
        waterIntake: 0,
        fruitIntake: [],
        sleepHours: 0,
        weight: 0,
        notes: ''
      });
    }
  }

  async toggleTask(taskView: TaskInstanceView) {
    // 1. Determine new status
    const newStatus = taskView.status === 'completed' ? 'pending' : 'completed';

    // 2. Optimistic Update
    this.tasks.update(tasks => tasks.map(t => {
      if (t.taskId === taskView.taskId) {
        // Optimistic streak update (simple heuristic)
        let newStreak = t.currentStreak;
        if (t.task.streakEnabled) {
          if (newStatus === 'completed') {
            newStreak = (newStreak || 0) + 1;
          } else {
            newStreak = Math.max(0, (newStreak || 0) - 1);
          }
        }

        return {
          ...t,
          status: newStatus,
          currentStreak: newStreak
        } as TaskInstanceView;
      }
      return t;
    }));

    try {
      // 3. Perform actual operation
      if (newStatus === 'completed') {
        await this.instanceResolution.completeTask(taskView.task.id, this.date);
      } else {
        await this.instanceResolution.resetTask(taskView.task.id, this.date);
      }

      // 4. Re-fetch to ensure data consistency
      await this.loadTasks();

    } catch (error) {
      console.error('Error toggling task', error);
      // Revert on failure
      await this.loadTasks();
    }
  }

  async drop(event: CdkDragDrop<TaskInstanceView[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const list = [...this.pendingTasks()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);

    // Update priorities locally
    const updates = list.map((item, index) => ({
      id: item.task.id,
      priority: index + 1
    }));

    // Update the parent tasks signal to reflect changes (triggers computed re-sort)
    this.tasks.update(all => {
      return all.map(t => {
        const update = updates.find(u => u.id === t.task.id);
        if (update) {
          return { ...t, task: { ...t.task, priority: update.priority } };
        }
        return t;
      });
    });

    // Persist to repository
    await this.taskRepo.updatePriorities(updates);
  }

  async saveDailyRecord() {
    // Ensure date is set before saving
    if (!this.dailyRecord().date) {
      this.dailyRecord.update(r => ({ ...r, date: this.date }));
    }
    await this.dailyRecordRepo.upsert(this.dailyRecord());
  }

  // Wrapper methods for UI interactions
  async updateWater(amount: number) {
    this.dailyRecord.update(r => ({
      ...r,
      waterIntake: Math.max(0, (r.waterIntake || 0) + amount)
    }));
    await this.saveDailyRecord();
  }

  async toggleFruit(fruit: string) {
    const currentFruits = this.dailyRecord().fruitIntake || [];
    let newFruits: string[];
    if (currentFruits.includes(fruit)) {
      newFruits = currentFruits.filter(f => f !== fruit);
    } else {
      newFruits = [...currentFruits, fruit];
    }
    this.dailyRecord.update(r => ({ ...r, fruitIntake: newFruits }));
    await this.saveDailyRecord();
  }

  isFruitSelected(fruit: string): boolean {
    return (this.dailyRecord().fruitIntake || []).includes(fruit);
  }

  async updateSleep(hours: number) {
    this.dailyRecord.update(r => ({ ...r, sleepHours: hours }));
    await this.saveDailyRecord();
  }

  async updateWeight(weight: number) {
    this.dailyRecord.update(r => ({ ...r, weight: weight }));
    await this.saveDailyRecord();
  }

  async updateNotes(notes: string) {
    this.dailyRecord.update(r => ({ ...r, notes: notes }));
    await this.saveDailyRecord();
  }

  isCompleted(task: TaskInstanceView): boolean {
    return task.status === 'completed';
  }

  goBack() {
    this.router.navigate(['/calendar']);
  }
}
