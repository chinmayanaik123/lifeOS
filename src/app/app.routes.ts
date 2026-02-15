import { Routes } from '@angular/router';
import { CalendarComponent } from './components/calendar/calendar.component';
import { DayDetailComponent } from './components/day-detail/day-detail.component';
import { AddTaskComponent } from './components/add-task/add-task.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
    { path: '', redirectTo: '/calendar', pathMatch: 'full' },
    { path: 'calendar', component: CalendarComponent },
    { path: 'day/:date', component: DayDetailComponent },
    { path: 'today', redirectTo: '/day/' + new Date().toISOString().split('T')[0], pathMatch: 'full' },
    { path: 'add', component: AddTaskComponent },
    { path: 'settings', component: SettingsComponent }
];
