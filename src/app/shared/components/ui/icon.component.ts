import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Inline SVG icon set.
 *
 * A single component with a path map beats an icon font (no FOUT, no extra
 * request) and beats one component per icon (no barrel of 60 files). Paths are
 * 24x24 on a 2px stroke grid so they sit consistently against text.
 */
export type IconName = keyof typeof ICON_PATHS;

const ICON_PATHS = {
  // --- navigation & chrome
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M18 15l-6-6-6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'arrow-right': 'M4 12h15m0 0-6-6m6 6-6 6',
  'arrow-left': 'M20 12H5m0 0 6-6m-6 6 6 6',
  'arrow-up-right': 'M7 17 17 7m0 0H8m9 0v9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  filter: 'M3 5h18M6 12h12M10 19h4',
  sort: 'M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  'external-link': 'M14 4h6v6M20 4l-9 9M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5',
  'more-vertical': 'M12 6.01V6M12 12.01V12M12 18.01V18',

  // --- commerce
  bag: 'M6 8h12l1 12H5L6 8ZM9 8V6a3 3 0 0 1 6 0v2',
  cart: 'M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.77L20 8H6M9 20.5h.01M17 20.5h.01',
  tag: 'M3 11.5V4a1 1 0 0 1 1-1h7.5L21 12.5 12.5 21 3 11.5ZM7.5 7.5h.01',
  ticket: 'M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2 2 0 0 0 0 8v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-8ZM12 6v2M12 11v2M12 16v2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6',
  receipt: 'M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3H5ZM9 8h6M9 12h6M9 16h3',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16a1 1 0 0 1 1 1v2M17 12.5h.01',
  percent: 'M19 5 5 19M7.5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',

  // --- restaurant
  utensils: 'M5 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M7 12v9M16 3c-1.5 1.5-2 3.5-2 5.5 0 1.7.8 2.8 2 3.2V21',
  flame: 'M12 21c3.3 0 6-2.5 6-5.8 0-3.6-3-5.6-4-9.2-2.2 2-3 3.8-3 5.5 0 .9-.7 1.5-1.4 1-.8-.6-1.1-1.7-1.1-2.5C7 11 6 12.5 6 15.2 6 18.5 8.7 21 12 21Z',
  chicken: 'M8 13a5 5 0 1 1 7.5-4.3A4 4 0 1 1 13 16l-1.5 3.5a1.5 1.5 0 0 1-2.8-1L8 15',
  beef: 'M12 4c4.4 0 8 2.7 8 6s-3.6 6-8 6-8-2.7-8-6 3.6-6 8-6ZM12 16v4M8.5 10a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0Z',
  lamb: 'M6 11a3 3 0 1 1 2.2-5A4 4 0 0 1 16 6a3 3 0 1 1 2 5c0 3.3-2.7 6-6 6s-6-2.7-6-6ZM9 20v-3M15 20v-3',
  kabab: 'M4 20 20 4M7 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  pot: 'M4 9h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9ZM2 11h2M20 11h2M9 6V4M15 6V4M12 6V3.5',
  rice: 'M4 14h16a8 8 0 0 1-16 0ZM3 18h18M8 10.5c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5',
  bowl: 'M3 11h18a9 9 0 0 1-18 0ZM12 7V4M8.5 8 7 5.5M15.5 8 17 5.5',
  bread: 'M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8h-1v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3.5A4 4 0 0 1 4 12Z',
  noodle: 'M4 6h16M6 6v8a6 6 0 0 0 12 0V6M9 20h6',
  dessert: 'M7 11h10l-2 9H9l-2-9ZM8.5 11a3.5 3.5 0 1 1 7 0M12 7.5V6M12 4.5V4',
  cup: 'M5 6h11v7a5 5 0 0 1-10 0V6ZM16 8h2a2.5 2.5 0 0 1 0 5h-2M4 21h14',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  leaf: 'M4 20c0-8 5-14 16-15 0 10-5 14-11 14a5 5 0 0 1-5-5ZM4 20c2-4 5-7 9-9',
  chef: 'M7 21h10v-6H7v6ZM7 15a4 4 0 0 1-1-7.9A4 4 0 0 1 12 4a4 4 0 0 1 6 3.1A4 4 0 0 1 17 15',

  // --- people & account
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  'user-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.2 18.5a6 6 0 0 1 11.6 0',
  users: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 4.5a4 4 0 0 1 0 7.5M18 14.5a6 6 0 0 1 4 6.5',
  badge: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3ZM9.5 12l1.8 1.8 3.4-3.6',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z',
  key: 'M14.5 10a4.5 4.5 0 1 0-4.3 4.5L9 16H7v2H5v2H2.5v-2.6l7-7A4.5 4.5 0 0 0 14.5 10ZM16.5 7.5h.01',
  'log-out': 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M11 16l4-4-4-4M15 12H3',
  'log-in': 'M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3M15 16l4-4-4-4M19 12H9',

  // --- status & feedback
  check: 'M5 13l4.5 4.5L19 7',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12l2.5 2.5L15.5 10',
  'x-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9l6 6M15 9l-6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8.01V8',
  alert: 'M12 9v4.5M12 17.01V17M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.9-.9 1.6v.6M12 17.01V17',
  star: 'm12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z',
  heart: 'M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 13 18 8ZM10.3 18a2 2 0 0 0 3.4 0',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.2l3 1.8',
  quote: 'M9 11H5.5A1.5 1.5 0 0 1 4 9.5v-2A1.5 1.5 0 0 1 5.5 6h2A1.5 1.5 0 0 1 9 7.5V13a5 5 0 0 1-4 4.9M20 11h-3.5a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 16.5 6h2A1.5 1.5 0 0 1 20 7.5V13a5 5 0 0 1-4 4.9',
  sparkle: 'm12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',

  // --- contact & location
  phone: 'M4.5 4h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6L14 13l4 1.5v3a1.5 1.5 0 0 1-1.7 1.5A15.5 15.5 0 0 1 3 5.7 1.5 1.5 0 0 1 4.5 4Z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  map: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  navigation: 'm3 11 18-8-8 18-2-8-8-2Z',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2M14 17.5h2',
  table: 'M3 9h18M3 15h18M9 4v16M15 4v16M3 4h18v16H3z',
  bike: 'M6 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9 16.5 12 8h3M11 8h4l3 8M14.5 5h2.5',
  truck: 'M3 6h11v11H3zM14 10h4l3 3v4h-7zM7.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  building: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  wheelchair: 'M11 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM11 10v5h5l2 5M6 12a5.5 5.5 0 1 0 7 7',
  parking: 'M6 20V4h5a4 4 0 0 1 0 8H6',

  // --- admin
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  'trending-up': 'm3 17 6-6 4 4 8-8M21 7h-5m5 0v5',
  'trending-down': 'm3 7 6 6 4-4 8 8M21 17h-5m5 0v-5',
  document: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  box: 'M12 3 4 7v10l8 4 8-4V7l-8-4ZM4 7l8 4 8-4M12 11v10',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.3 1Z',
  terminal: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 10l2.5 2.5L8 15M13 15h3',
  pen: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 5.5l3 3',
  image: 'M4 5h16v14H4zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4 16l4.5-4 4 3.5L16 12l4 4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.4 4M6.4 8A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16',
  upload: 'M12 16V4m0 0 4 4m-4-4L8 8M4 19h16',
  printer: 'M7 8V3h10v5M7 18H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  refresh: 'M3 12a9 9 0 0 1 15.3-6.4L21 8M21 4v4h-4M21 12a9 9 0 0 1-15.3 6.4L3 16M3 20v-4h4',
  copy: 'M9 9h10v12H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 1 1 7 0V11',

  // --- social
  facebook: 'M14 8.5h2.5V5H14a4 4 0 0 0-4 4v2H8v3.5h2V21h3.5v-6.5H16l.5-3.5H13.5V9.5a1 1 0 0 1 1-1Z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17.5 6.51h.01',
  youtube: 'M21.5 8.2a2.5 2.5 0 0 0-1.8-1.8C18 6 12 6 12 6s-6 0-7.7.4A2.5 2.5 0 0 0 2.5 8.2 26 26 0 0 0 2.1 12c0 1.3.1 2.6.4 3.8a2.5 2.5 0 0 0 1.8 1.8C6 18 12 18 12 18s6 0 7.7-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15V9l5 3-5 3Z',
  whatsapp: 'M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4L3 21ZM9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1.2-.5 1.2-1.1l-.1-.9-2-.6-.8 1a5.9 5.9 0 0 1-2.2-2.2l1-.8-.6-2-.9-.1c-.6 0-1.1.6-1.1 1.2Z',
  tiktok: 'M15 4c.5 2.3 2 3.8 4.5 4v3.2c-1.7 0-3.2-.5-4.5-1.4v5.7a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 1 .1v3.3a2.3 2.3 0 1 0 1.5 2.1V4H15Z',
} as const;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      class="block"
    >
      @if (label()) {
        <title>{{ label() }}</title>
      }
      <path [attr.d]="d()" />
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.6);
  /** Supply when the icon is the only content of a control. */
  readonly label = input('');

  protected readonly d = computed(() => ICON_PATHS[this.name()] ?? ICON_PATHS.info);
}

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
