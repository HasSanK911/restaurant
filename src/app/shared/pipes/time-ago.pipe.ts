import { Pipe, PipeTransform } from '@angular/core';

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/** "3 minutes ago", "in 2 days". Impure so it refreshes with change detection. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  private readonly formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';

    let duration = (date.getTime() - Date.now()) / 1000;
    for (const division of DIVISIONS) {
      if (Math.abs(duration) < division.amount) {
        return this.formatter.format(Math.round(duration), division.unit);
      }
      duration /= division.amount;
    }
    return '';
  }
}
