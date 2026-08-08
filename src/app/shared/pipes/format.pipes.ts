import { Pipe, PipeTransform } from '@angular/core';

/** `family-hall` becomes `Family Hall`. Used for zones, statuses and tags. */
@Pipe({ name: 'humanise' })
export class HumanisePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/** `19:30` becomes `7:30 PM`. */
@Pipe({ name: 'clock12' })
export class Clock12Pipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h)) return value;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
  }
}

/** Truncates on a word boundary rather than mid-word. */
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 140, suffix = '…'): string {
    if (!value) return '';
    if (value.length <= limit) return value;
    const cut = value.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + suffix;
  }
}

/** `7 Aug 2026`. Short, unambiguous, no locale surprises. */
@Pipe({ name: 'niceDate' })
export class NiceDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, withTime = false): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (!withTime) return datePart;
    const timePart = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  }
}

/**
 * Renders the light markdown subset used by blog bodies: `## ` headings,
 * `- ` bullets, `*emphasis*` and blank-line paragraphs.
 *
 * Input is authored by the restaurant through the admin panel, not by the
 * public, and everything is HTML-escaped before any tag is introduced, so this
 * cannot be used to inject markup.
 */
@Pipe({ name: 'articleBody' })
export class ArticleBodyPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const blocks = escaped.split(/\n{2,}/);
    return blocks
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('## ')) {
          return `<h2>${inline(trimmed.slice(3))}</h2>`;
        }
        if (trimmed.startsWith('# ')) {
          return `<h2>${inline(trimmed.slice(2))}</h2>`;
        }
        if (/^[-*] /m.test(trimmed) && trimmed.split('\n').every((l) => /^[-*] /.test(l.trim()))) {
          const items = trimmed
            .split('\n')
            .map((l) => `<li>${inline(l.trim().replace(/^[-*] /, ''))}</li>`)
            .join('');
          return `<ul>${items}</ul>`;
        }
        return `<p>${inline(trimmed.replace(/\n/g, '<br>'))}</p>`;
      })
      .join('');
  }
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
