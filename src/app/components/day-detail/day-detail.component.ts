import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InstanceResolutionService } from '../../services/instance-resolution.service';
import { SettingsRepository } from '../../repositories/settings.repository';
import { TaskInstanceView } from '../../models';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './day-detail.component.html',
  styleUrls: ['./day-detail.component.css']
})
export class DayDetailComponent implements OnInit {
  date: string = '';
  tasks = signal<TaskInstanceView[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceResolution: InstanceResolutionService,
    private settingsRepo: SettingsRepository
  ) { }

  async ngOnInit() {
    this.route.params.subscribe(async params => {
      this.date = params['date'];
      if (this.date) {
        await this.loadTasks();
      }
    });
  }

  async loadTasks() {
    const location = this.settingsRepo.settings().currentLocation;
    const resolvedTasks = await this.instanceResolution.resolveTasksForDate(this.date, location);
    this.tasks.set(resolvedTasks);
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

      // 4. Re-fetch to ensure data consistency (especially complex streak logic)
      // We do this silently so the UI doesn't flicker, but data becomes "truth"
      const refreshedTasks = await this.instanceResolution.resolveTasksForDate(this.date,
        this.settingsRepo.settings().currentLocation);
      this.tasks.set(refreshedTasks);

    } catch (error) {
      console.error('Error toggling task', error);
      // Revert on failure
      const revertedTasks = await this.instanceResolution.resolveTasksForDate(this.date,
        this.settingsRepo.settings().currentLocation);
      this.tasks.set(revertedTasks);
    }
  }

  isCompleted(task: TaskInstanceView): boolean {
    return task.status === 'completed';
  }

  goBack() {
    this.router.navigate(['/calendar']);
  }
}
