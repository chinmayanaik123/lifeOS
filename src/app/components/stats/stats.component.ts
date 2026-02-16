import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarAggregationService } from '../../services/calendar-aggregation.service';
import { SettingsRepository } from '../../repositories/settings.repository';
import { DailyRecordRepository } from '../../repositories/daily-record.repository';
import { CalendarDayView } from '../../models';

@Component({
    selector: 'app-stats',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit {
    last7Days = signal<CalendarDayView[]>([]);
    allRecords = signal<CalendarDayView[]>([]);
    waterHistory = signal<{ day: string, amount: number, percentage: number }[]>([]);

    completionHistory = computed(() => {
        return this.last7Days().map(day => ({
            day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' }),
            percentage: day.tasksTotal > 0 ? (day.tasksCompleted / day.tasksTotal) * 100 : 0
        }));
    });

    insights = computed(() => {
        const list: { text: string, type: 'info' | 'success' | 'warning' }[] = [];
        const streak = this.currentStreak();
        const best = this.longestStreak();
        const avgWater = this.avgWaterValue();
        const todayWater = this.waterHistory().length > 0 ? this.waterHistory()[this.waterHistory().length - 1].amount : 0;

        // Streak Insight
        if (streak > 0 && streak >= best * 0.9 && best > 5) {
            list.push({ text: `You're close to your record of ${best} days! Keep it up! 🔥`, type: 'success' });
        }

        // Water Insight
        if (todayWater < avgWater * 0.8 && avgWater > 0) {
            list.push({ text: `A bit behind on water today. Grab a glass! 💧`, type: 'info' });
        }

        // Completion Trend (last 3 vs previous 3)
        const history = this.completionHistory();
        if (history.length >= 6) {
            const recent = history.slice(-3).reduce((acc, h) => acc + h.percentage, 0) / 3;
            const prev = history.slice(-6, -3).reduce((acc, h) => acc + h.percentage, 0) / 3;
            if (recent > prev + 10) {
                list.push({ text: `Your productivity is trending up! Great momentum. 📈`, type: 'success' });
            }
        }

        return list;
    });

    currentStreak = computed(() => {
        const days = [...this.allRecords()].reverse();
        let streak = 0;
        // Walk back from today/yesterday
        for (const day of days) {
            if (day.tasksTotal > 0) {
                if (day.tasksCompleted === day.tasksTotal) {
                    streak++;
                } else {
                    // Streak broken on a day where work was scheduled but not fully finished
                    break;
                }
            }
            // If tasksTotal === 0, we don't break the streak (it's a "free" day)
        }
        return streak;
    });

    longestStreak = computed(() => {
        const days = this.allRecords();
        let maxStreak = 0;
        let current = 0;
        for (const day of days) {
            if (day.tasksTotal > 0) {
                if (day.tasksCompleted === day.tasksTotal) {
                    current++;
                    maxStreak = Math.max(maxStreak, current);
                } else {
                    current = 0;
                }
            }
        }
        return Math.max(maxStreak, current);
    });

    completionRate = computed(() => {
        const days = this.last7Days();
        let totalScheduled = 0;
        let totalCompleted = 0;
        days.forEach(d => {
            totalScheduled += d.tasksTotal;
            totalCompleted += d.tasksCompleted;
        });
        return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    });

    avgWaterValue = signal<number>(0);
    weightTrend = signal<string>('No Data');

    constructor(
        private calendarService: CalendarAggregationService,
        private settingsRepo: SettingsRepository,
        private dailyRecordRepo: DailyRecordRepository
    ) { }

    async ngOnInit() {
        await this.loadStats();
    }

    async loadStats() {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 60);

        const dateToStr = (d: Date) => d.toISOString().split('T')[0];
        const location = this.settingsRepo.settings().currentLocation;

        const data = await this.calendarService.buildCalendarViewForRange(
            dateToStr(start),
            dateToStr(today),
            location
        );

        this.allRecords.set(data);
        this.last7Days.set(data.slice(-7));

        const records = await this.dailyRecordRepo.getByDateRange(dateToStr(start), dateToStr(today));

        // Avg Water (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const sevenDaysAgoStr = dateToStr(sevenDaysAgo);

        const last7Records = records.filter(r => r.date >= sevenDaysAgoStr);
        const totalWater = last7Records.reduce((acc, r) => acc + (r.waterIntake || 0), 0);
        const avg = last7Records.length > 0 ? Math.round(totalWater / 7) : 0;
        this.avgWaterValue.set(avg);

        // Water History (last 7 days)
        const last7DaysData = this.last7Days();
        const waterHist = last7DaysData.map(day => {
            const record = records.find(r => r.date === day.date);
            const amount = record?.waterIntake || 0;
            const maxWater = Math.max(avg * 1.5, 2000); // Scale relative to avg or 2L
            return {
                day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' }),
                amount: amount,
                percentage: Math.min(100, (amount / maxWater) * 100)
            };
        });
        this.waterHistory.set(waterHist);

        // Weight Trend
        const weightEntries = records.filter(r => r.weight).sort((a, b) => a.date.localeCompare(b.date));
        if (weightEntries.length >= 2) {
            const last = weightEntries[weightEntries.length - 1].weight!;
            const prev = weightEntries[weightEntries.length - 2].weight!;
            if (last > prev + 0.1) this.weightTrend.set('Rising 📈');
            else if (last < prev - 0.1) this.weightTrend.set('Falling 📉');
            else this.weightTrend.set('Stable ⚖️');
        } else if (weightEntries.length === 1) {
            this.weightTrend.set(`${weightEntries[0].weight}kg (initial)`);
        }
    }
}
