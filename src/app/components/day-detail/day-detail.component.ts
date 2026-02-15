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

  async toggleTask(task: TaskInstanceView) {
    if (task.status === 'completed') {
      await this.instanceResolution.resetTask(task.task.id, this.date);
    } else {
      await this.instanceResolution.completeTask(task.task.id, this.date);
    }
    await this.loadTasks();
  }

  isCompleted(task: TaskInstanceView): boolean {
    return task.status === 'completed';
  }

  goBack() {
    this.router.navigate(['/calendar']);
  }
}
