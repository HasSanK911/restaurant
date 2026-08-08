import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartType,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Tree-shakeable registration: only the controllers the admin panel actually
// draws, which keeps Chart.js out of the ~40kB "register everything" default.
Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
);

export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
}

const CLAY = '#c2542f';
const BASIL = '#2c6b4b';
const TURMERIC = '#d98c1f';
const PLUM = '#7c4a8d';
const PALETTE = [CLAY, BASIL, TURMERIC, PLUM, '#2f6f8f', '#b03a5b', '#8a857c', '#5f8a3a'];

/**
 * Chart.js wrapper.
 *
 * Browser-only: on the server the canvas is skipped entirely and a labelled
 * placeholder renders instead, so SSR never touches a DOM API that does not
 * exist. All theming lives here so no admin page repeats axis colours.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      @if (!hasData()) {
        <!-- An axis frame with no plot reads as "still loading" rather than
             "nothing to show", so the empty case gets its own message. -->
        <div
          class="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-300 px-6 text-center"
        >
          <p class="text-body-sm font-semibold text-ink-700">{{ emptyTitle() }}</p>
          <p class="text-caption text-ink-500">{{ emptyHint() }}</p>
        </div>
      } @else if (isBrowser) {
        <canvas #canvas [attr.aria-label]="ariaLabel()" role="img"></canvas>
        <!-- Screen readers get the numbers themselves, not just the summary
             label: a canvas exposes nothing traversable. -->
        <table class="sr-only">
          <caption>
            {{ ariaLabel() }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              @for (s of series(); track s.label) {
                <th scope="col">{{ s.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (label of labels(); track label; let i = $index) {
              <tr>
                <th scope="row">{{ label }}</th>
                @for (s of series(); track s.label) {
                  <td>{{ s.data[i] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="skeleton h-full w-full"></div>
      }
    </div>
  `,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly type = input<ChartType>('line');
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly height = input(280);
  readonly ariaLabel = input('Chart');
  /** Tri-state: leave unset to show the legend exactly when it disambiguates
   *  something — i.e. when more than one series is plotted. */
  readonly showLegend = input<boolean | undefined>(undefined);
  readonly currency = input(false);
  readonly stacked = input(false);
  readonly emptyTitle = input('No data yet');
  readonly emptyHint = input('Figures appear here once there is activity in this period.');

  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly hasData = computed(() =>
    this.series().some((s) => s.data.some((v) => v !== null && v !== undefined)),
  );
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;
  private ready = false;

  constructor() {
    effect(() => {
      // Touch the inputs so the effect re-runs when data changes. Reading the
      // canvas signal matters too: when a chart goes from empty to populated
      // the element is created only on that pass, so this is what schedules
      // the render that the earlier (canvas-less) pass had to skip.
      this.labels();
      this.series();
      this.type();
      this.canvasRef();
      if (this.ready) this.render();
    });
  }

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const type = this.type();
    const datasets = this.series().map((s, i) => {
      const color = s.color ?? PALETTE[i % PALETTE.length];
      if (type === 'doughnut') {
        return {
          label: s.label,
          data: s.data,
          backgroundColor: s.data.map((_, di) => PALETTE[di % PALETTE.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8,
        };
      }
      if (type === 'bar') {
        return {
          label: s.label,
          data: s.data,
          backgroundColor: hexToRgba(color, 0.65),
          hoverBackgroundColor: color,
          borderColor: color,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 42,
        };
      }
      const gradient = ctx.createLinearGradient(0, 0, 0, this.height());
      gradient.addColorStop(0, hexToRgba(color, 0.34));
      gradient.addColorStop(1, hexToRgba(color, 0));
      return {
        label: s.label,
        data: s.data,
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 2.25,
        fill: true,
        tension: 0.38,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      };
    });

    const config: ChartConfiguration = {
      type,
      data: { labels: this.labels(), datasets: datasets as never },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            // A single-series line needs no key; anything with more than one
            // series (or a doughnut, where every slice is its own category)
            // is unreadable without one.
            display: this.showLegend() ?? (this.series().length > 1 || type === 'doughnut'),
            position: 'bottom',
            labels: {
              color: '#625a51',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              padding: 18,
              font: { family: 'Outfit, sans-serif', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#241f1b',
            borderColor: 'rgba(194,84,47,0.35)',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#e7e1d8',
            padding: 12,
            cornerRadius: 10,
            displayColors: type === 'doughnut',
            titleFont: { family: 'Outfit, sans-serif', weight: 600 },
            bodyFont: { family: 'Outfit, sans-serif' },
            callbacks: this.currency()
              ? {
                  label: (item) =>
                    ` ${item.dataset.label ?? ''}  Rs ${Number(item.parsed.y ?? item.parsed).toLocaleString('en-PK')}`,
                }
              : undefined,
          },
        },
        scales:
          type === 'doughnut'
            ? undefined
            : {
                x: {
                  stacked: this.stacked(),
                  grid: { display: false },
                  border: { color: 'rgba(213,205,193,0.9)' },
                  ticks: {
                    color: '#7a7166',
                    font: { family: 'Outfit, sans-serif', size: 11 },
                    maxRotation: 0,
                    autoSkipPadding: 16,
                  },
                },
                y: {
                  stacked: this.stacked(),
                  beginAtZero: true,
                  grid: { color: 'rgba(231,225,216,0.9)' },
                  border: { display: false },
                  ticks: {
                    color: '#7a7166',
                    font: { family: 'Outfit, sans-serif', size: 11 },
                    padding: 8,
                    callback: (value) => compact(Number(value), this.currency()),
                  },
                },
              },
        // Canvas animation is driven by JS, so the global CSS
        // prefers-reduced-motion rule cannot reach it — it has to be checked
        // here or the chart keeps animating for users who opted out.
        animation: prefersReducedMotion() ? false : { duration: 400, easing: 'easeOutQuart' },
      },
    };

    this.chart = new Chart(ctx, config);
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const int = parseInt(clean.length === 3 ? clean.replace(/./g, '$&$&') : clean, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

function compact(value: number, currency: boolean): string {
  const prefix = currency ? 'Rs ' : '';
  if (Math.abs(value) >= 1e6) return `${prefix}${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${prefix}${(value / 1e3).toFixed(0)}k`;
  return prefix + value;
}
