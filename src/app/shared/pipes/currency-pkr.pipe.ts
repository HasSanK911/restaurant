import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats whole rupees the way Pakistani menus print them: `Rs 1,100`.
 *
 * Deliberately not `CurrencyPipe`, which renders `PKR 1,100.00` and adds a
 * decimal part the restaurant never uses.
 */
@Pipe({ name: 'pkr' })
export class CurrencyPkrPipe implements PipeTransform {
  transform(value: number | null | undefined, options?: { symbol?: boolean; compact?: boolean }): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    const symbol = options?.symbol === false ? '' : 'Rs ';

    if (options?.compact && Math.abs(value) >= 1000) {
      const units = [
        { limit: 1e7, suffix: 'Cr' },
        { limit: 1e5, suffix: 'L' },
        { limit: 1e3, suffix: 'K' },
      ];
      for (const { limit, suffix } of units) {
        if (Math.abs(value) >= limit) {
          const scaled = value / limit;
          return `${symbol}${scaled.toFixed(scaled >= 10 ? 0 : 1)}${suffix}`;
        }
      }
    }

    return symbol + Math.round(value).toLocaleString('en-PK');
  }
}
