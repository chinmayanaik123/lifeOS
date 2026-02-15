import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskRepository } from '../../repositories/task.repository';
import { Task, LocationType, RecurrenceRule } from '../../models';

@Component({
  selector: 'app-add-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.css']
})
export class AddTaskComponent {
  taskForm: FormGroup;
  isSaving = signal(false);
  weekDays = [
    { value: 1, label: 'M' },
    { value: 2, label: 'T' },
    { value: 3, label: 'W' },
    { value: 4, label: 'T' },
    { value: 5, label: 'F' },
    { value: 6, label: 'S' },
    { value: 0, label: 'S' }
  ];

  constructor(
    private fb: FormBuilder,
    private taskRepo: TaskRepository,
    private router: Router
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      type: ['checkbox', Validators.required],
      recurrenceType: ['once', Validators.required],
      daysOfWeek: [[]],
      streakEnabled: [false],
      reminderTime: [''],
      location: ['']
    });

    // Re-validate when recurrence type changes
    this.taskForm.get('recurrenceType')?.valueChanges.subscribe(() => {
      this.taskForm.updateValueAndValidity();
    });
  }

  toggleDay(dayValue: number) {
    const currentDays = this.taskForm.get('daysOfWeek')?.value as number[];
    const index = currentDays.indexOf(dayValue);

    if (index === -1) {
      currentDays.push(dayValue);
    } else {
      currentDays.splice(index, 1);
    }

    // Sort to keep standard order
    currentDays.sort((a, b) => {
      // 0 is Sunday, 1 is Monday.
      return a - b;
    });

    this.taskForm.patchValue({ daysOfWeek: currentDays });
    this.taskForm.updateValueAndValidity();
  }

  isDaySelected(dayValue: number): boolean {
    return (this.taskForm.get('daysOfWeek')?.value as number[]).includes(dayValue);
  }

  get isValid(): boolean {
    if (!this.taskForm.valid) return false;

    const type = this.taskForm.get('recurrenceType')?.value;
    const days = this.taskForm.get('daysOfWeek')?.value as number[];

    if (type === 'weekly' && days.length === 0) {
      return false;
    }

    return true;
  }

  async onSubmit() {
    if (this.isValid && !this.isSaving()) {
      this.isSaving.set(true);
      try {
        const formValue = this.taskForm.value;

        const recurrence: RecurrenceRule = {
          type: formValue.recurrenceType,
          startDate: new Date().toISOString().split('T')[0]
        };

        if (formValue.recurrenceType === 'weekly') {
          recurrence.daysOfWeek = formValue.daysOfWeek;
        } else if (formValue.recurrenceType === 'monthly') {
          recurrence.dayOfMonth = new Date().getDate(); // Default to today's day of month
        }

        const newTask: Task = {
          id: crypto.randomUUID(),
          title: formValue.title,
          type: formValue.type,
          recurrence: recurrence,
          streakEnabled: formValue.streakEnabled,
          isArchived: false,
          createdAt: new Date().toISOString()
        };

        // Optional: Add Location Condition
        if (formValue.location) {
          newTask.locationCondition = {
            allowedLocations: [formValue.location as LocationType]
          };
        }

        // Optional: Add Reminder
        if (formValue.reminderTime) {
          newTask.reminder = {
            time: formValue.reminderTime,
            silent: false,
            snapReminderEnabled: false
          };
        }

        await this.taskRepo.create(newTask);

        // Success feedback
        alert('Task saved successfully!');
        this.router.navigate(['/calendar']);
      } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task.');
        this.isSaving.set(false);
      }
    }
  }

  goBack() {
    this.router.navigate(['/calendar']);
  }
}
