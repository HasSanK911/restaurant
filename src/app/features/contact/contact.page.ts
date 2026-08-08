import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BRAND, CONTACT_TOPICS, DAY_NAMES } from '../../core/constants/app.constants';
import { ContactMessage } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { normalisePhone, pakPhoneValidator, revealErrors } from '../../shared/validators/form.validators';
import { Clock12Pipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeroComponent,
    IconComponent,
    FieldComponent,
    SpinnerComponent,
    RevealDirective,
    Clock12Pipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Contact"
      title="Talk to someone"
      accent=" who works here"
      description="Call the restaurant directly, message us on WhatsApp, or send a note and we will come back to you."
      image="assets/images/exterior/main-entrance"
      imageAlt="The main entrance to Salateen Restaurant on Jhangira Road"
      [crumbs]="[{ label: 'Contact' }]"
      size="sm"
    />

    <!-- Quick channels -->
    <section class="pt-12">
      <div class="container-lux">
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (channel of channels; track channel.label; let i = $index) {
            <li appReveal [appRevealDelay]="i * 70">
              <a
                [href]="channel.href"
                [attr.target]="channel.external ? '_blank' : null"
                [attr.rel]="channel.external ? 'noopener' : null"
                class="card-lux group flex h-full items-start gap-4 p-5 transition-all hover:-translate-y-1 hover:border-clay-500/40"
              >
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700 transition-transform group-hover:scale-110"
                >
                  <app-icon [name]="channel.icon" [size]="19" />
                </span>
                <span class="min-w-0">
                  <span class="block text-caption tracking-wide text-ink-500 uppercase">{{
                    channel.label
                  }}</span>
                  <span class="mt-1 block truncate text-sm font-semibold text-ink-900">{{
                    channel.value
                  }}</span>
                  <span class="mt-0.5 block text-caption text-ink-500">{{ channel.hint }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>

    <section class="section pt-14">
      <div class="container-lux grid gap-10 lg:grid-cols-12">
        <!-- Form -->
        <div class="lg:col-span-7">
          @if (sent()) {
            <div class="panel p-10 text-center">
              <span
                class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-50 text-emerald-700"
              >
                <app-icon name="check" [size]="30" [strokeWidth]="2.2" />
              </span>
              <h2 class="mt-6 font-display text-2xl">Message sent</h2>
              <p class="mx-auto mt-3 max-w-md leading-relaxed text-ink-600">
                Thank you. Someone will read this and come back to you, usually the same day during
                opening hours. If it is urgent, please call {{ brand.phoneDisplay }}.
              </p>
              <button type="button" class="btn btn-secondary btn-md mt-7" (click)="sendAnother()">
                Send another message
              </button>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="panel p-7">
              <h2 class="font-display text-2xl">Send us a message</h2>
              <p class="mt-2 text-sm text-ink-600">
                For catering and large orders, a phone call is usually quicker.
              </p>

              <div class="mt-7 grid gap-4 sm:grid-cols-2">
                <app-field label="Your name" [required]="true" [control]="form.controls.name" fieldId="cname">
                  <input id="cname" type="text" class="field" formControlName="name" autocomplete="name" />
                </app-field>
                <app-field label="Mobile number" [required]="true" [control]="form.controls.phone" fieldId="cphone">
                  <input
                    id="cphone"
                    type="tel"
                    class="field"
                    formControlName="phone"
                    autocomplete="tel"
                    placeholder="0312-0991116"
                  />
                </app-field>
                <app-field label="Email" [control]="form.controls.email" fieldId="cemail" hint="Optional.">
                  <input id="cemail" type="email" class="field" formControlName="email" autocomplete="email" />
                </app-field>
                <app-field label="What is it about?" [required]="true" [control]="form.controls.topic" fieldId="ctopic">
                  <select id="ctopic" class="field" formControlName="topic">
                    @for (topic of topics; track topic.value) {
                      <option [value]="topic.value">{{ topic.label }}</option>
                    }
                  </select>
                </app-field>
                <app-field
                  label="Subject"
                  [required]="true"
                  [control]="form.controls.subject"
                  fieldId="csubject"
                  class="sm:col-span-2"
                >
                  <input id="csubject" type="text" class="field" formControlName="subject" />
                </app-field>
                <app-field
                  label="Message"
                  [required]="true"
                  [control]="form.controls.message"
                  fieldId="cmessage"
                  class="sm:col-span-2"
                  hint="Guest counts, dates and a phone number help us answer properly."
                >
                  <textarea
                    id="cmessage"
                    rows="6"
                    class="field resize-none"
                    maxlength="1200"
                    formControlName="message"
                  ></textarea>
                </app-field>
              </div>

              <button type="submit" class="btn btn-primary btn-lg mt-7 w-full sm:w-auto" [disabled]="sending()">
                @if (sending()) {
                  <app-spinner [size]="17" />
                  Sending
                } @else {
                  Send message
                  <app-icon name="mail" [size]="16" />
                }
              </button>
              <p class="mt-3 text-caption text-ink-500">
                We use your details only to reply to this message. See our
                <a routerLink="/privacy-policy" class="text-clay-700 hover:underline">privacy policy</a>.
              </p>
            </form>
          }
        </div>

        <!-- Details -->
        <aside class="space-y-5 lg:col-span-5">
          <div class="panel p-6">
            <p class="eyebrow mb-4">Visit us</p>
            <address class="space-y-3.5 text-sm not-italic">
              <span class="flex items-start gap-3 text-ink-700">
                <app-icon name="map" [size]="17" class="mt-0.5 shrink-0 text-clay-600" />
                <span>
                  {{ brand.street }}<br />
                  {{ brand.city }}, {{ brand.region }}<br />
                  {{ brand.country }} {{ brand.postalCode }}
                </span>
              </span>
            </address>
            <a
              [href]="directionsUrl"
              target="_blank"
              rel="noopener"
              class="btn btn-secondary btn-sm mt-4 w-full"
            >
              <app-icon name="navigation" [size]="13" />
              Get directions
            </a>
          </div>

          <div class="panel overflow-hidden">
            <div class="aspect-[4/3]">
              @if (mapUrl(); as url) {
                <iframe
                  [src]="url"
                  class="h-full w-full"
                  style="border:0"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  title="Map showing Salateen Restaurant on Jhangira Road, Swabi"
                ></iframe>
              }
            </div>
          </div>

          <div class="panel p-6">
            <div class="flex items-center justify-between">
              <p class="eyebrow">Opening hours</p>
              <span
                class="flex items-center gap-1.5 text-micro font-bold uppercase"
                [class]="status().isOpen ? 'text-emerald-700' : 'text-amber-700'"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                {{ status().isOpen ? 'Open now' : 'Closed' }}
              </span>
            </div>
            <dl class="mt-4 space-y-2 text-sm">
              @for (hour of hours(); track hour.day) {
                <div
                  class="flex items-center justify-between gap-4"
                  [class]="hour.day === today ? 'font-semibold text-clay-700' : 'text-ink-600'"
                >
                  <dt>{{ dayNames[hour.day] }}</dt>
                  <dd class="tabular-nums">
                    @if (hour.isClosed) {
                      Closed
                    } @else {
                      {{ hour.opensAt | clock12 }} &ndash; {{ hour.closesAt | clock12 }}
                    }
                  </dd>
                </div>
              }
            </dl>
          </div>

          <div class="panel bg-clay-50 p-6">
            <p class="font-display text-xl">Catering or a large booking?</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-600">
              For functions from a hundred guests upwards, call and ask for the manager. We will
              talk you through deghs, timings and staffing.
            </p>
            <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-md mt-4 w-full">
              <app-icon name="phone" [size]="15" />
              {{ brand.phoneDisplay }}
            </a>
            <a routerLink="/catering" class="btn btn-ghost btn-sm mt-2 w-full border border-ink-300"
              >See catering packages</a
            >
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class ContactPage {
  private readonly content = inject(ContentService);
  private readonly restaurant = inject(RestaurantService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly brand = BRAND;
  protected readonly topics = CONTACT_TOPICS;
  protected readonly dayNames = DAY_NAMES;
  protected readonly today = new Date().getDay();
  protected readonly status = this.restaurant.status;
  protected readonly hours = this.restaurant.hours;
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected readonly directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${BRAND.fullName}, ${BRAND.street}, ${BRAND.city}`,
  )}`;

  protected readonly channels: {
    icon: IconName;
    label: string;
    value: string;
    hint: string;
    href: string;
    external?: boolean;
  }[] = [
    {
      icon: 'phone',
      label: 'Call us',
      value: BRAND.phoneDisplay,
      hint: 'Fastest for orders and bookings',
      href: `tel:${BRAND.phone}`,
    },
    {
      icon: 'whatsapp',
      label: 'WhatsApp',
      value: BRAND.phoneDisplay,
      hint: 'Send a menu photo or your location',
      href: `https://wa.me/${BRAND.whatsapp.replace('+', '')}`,
      external: true,
    },
    {
      icon: 'mail',
      label: 'Email',
      value: BRAND.email,
      hint: 'Catering quotes and invoices',
      href: `mailto:${BRAND.email}`,
    },
    {
      icon: 'map',
      label: 'Find us',
      value: 'Jhangira Road, Mal Lar',
      hint: 'Free parking for thirty cars',
      href: `https://maps.google.com/?q=${encodeURIComponent(`${BRAND.fullName}, ${BRAND.city}`)}`,
      external: true,
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, pakPhoneValidator()]],
    email: ['', [Validators.email]],
    topic: ['general', [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(4)]],
    message: ['', [Validators.required, Validators.minLength(15)]],
  });

  protected readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.restaurant.profile()?.mapEmbedUrl;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    this.seo.apply({
      title: 'Contact Salateen Restaurant Swabi | 0312-0991116',
      description:
        'Call Salateen Restaurant Swabi on 0312-0991116, message us on WhatsApp, or send a note. Jhangira Road, Mal Lar, Swabi. Open daily 10am to midnight.',
      path: 'contact',
      image: 'assets/images/exterior/main-entrance.webp',
      keywords: [
        'Salateen Restaurant contact',
        'Swabi restaurant phone number',
        'Jhangira Road restaurant',
      ],
    });
    this.seo.breadcrumbSchema([{ label: 'Contact', path: 'contact' }]);
  }

  protected submit(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      this.toast.error('Check the form', 'Some required details are missing.');
      return;
    }
    this.sending.set(true);
    const value = this.form.getRawValue();

    const message: Omit<ContactMessage, 'id'> = {
      name: value.name.trim(),
      email: value.email.trim(),
      phone: normalisePhone(value.phone),
      subject: value.subject.trim(),
      message: value.message.trim(),
      topic: value.topic as ContactMessage['topic'],
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    this.content.sendMessage(message).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.form.reset({ topic: 'general' });
        this.toast.success('Message sent', 'We will come back to you shortly.');
      },
      error: () => {
        this.sending.set(false);
        this.toast.error('That did not send', 'Please try again or call us on 0312-0991116.');
      },
    });
  }

  protected sendAnother(): void {
    this.sent.set(false);
  }
}
