import { DOCUMENT, Injectable, RendererFactory2, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from '../tokens/api-base-url.token';
import { BRAND } from '../constants/app.constants';
import { RestaurantProfile } from '../models/restaurant.model';
import { MenuItem } from '../models/menu.model';
import { BlogPost } from '../models/content.model';

export interface SeoConfig {
  title: string;
  description: string;
  /** Route path without a leading slash, e.g. `menu/kabuli-pulao`. */
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'restaurant' | 'product';
  keywords?: string[];
  publishedAt?: string;
  modifiedAt?: string;
  authorName?: string;
  noIndex?: boolean;
  /**
   * HTTP status the server should return for this page. Set to 404 by the
   * not-found page so unknown URLs answer with a real 404 rather than a soft
   * 404, which search engines penalise. Read by `src/server.ts`.
   */
  statusCode?: number;
}

export interface BreadcrumbEntry {
  label: string;
  path: string;
}

const SITE_NAME = 'Salateen Restaurant Swabi';
const TITLE_SUFFIX = ' | Salateen Restaurant Swabi';
const DEFAULT_IMAGE = 'assets/brand/og-card.jpg';
const JSONLD_ID_PREFIX = 'seo-jsonld-';

/**
 * Owns everything a crawler or a social card reads: title, meta, canonical,
 * Open Graph, Twitter cards and JSON-LD.
 *
 * Every page component calls `apply()` once. Structured data is written into
 * `<head>` as script tags keyed by id, so navigating between routes replaces
 * rather than accumulates them.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);

  /** Origin this build is actually served from. See the SITE_URL token. */
  private readonly siteUrl = inject(SITE_URL);

  apply(config: SeoConfig): void {
    const fullTitle = config.title.includes('Salateen')
      ? config.title
      : `${config.title}${TITLE_SUFFIX}`;
    const url = this.absolute(config.path ?? '');
    const image = this.absolute(config.image ?? DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);

    this.setTag('name', 'description', config.description);
    this.setTag('name', 'robots', config.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    if (config.keywords?.length) this.setTag('name', 'keywords', config.keywords.join(', '));

    // Open Graph
    this.setTag('property', 'og:site_name', SITE_NAME);
    this.setTag('property', 'og:title', fullTitle);
    this.setTag('property', 'og:description', config.description);
    this.setTag('property', 'og:type', config.type === 'article' ? 'article' : 'website');
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', image);
    this.setTag('property', 'og:image:width', '1200');
    this.setTag('property', 'og:image:height', '630');
    this.setTag('property', 'og:image:alt', config.title);
    this.setTag('property', 'og:locale', 'en_PK');

    if (config.type === 'article') {
      if (config.publishedAt) this.setTag('property', 'article:published_time', config.publishedAt);
      if (config.modifiedAt) this.setTag('property', 'article:modified_time', config.modifiedAt);
      if (config.authorName) this.setTag('property', 'article:author', config.authorName);
    }

    // Twitter
    this.setTag('name', 'twitter:card', 'summary_large_image');
    this.setTag('name', 'twitter:title', fullTitle);
    this.setTag('name', 'twitter:description', config.description);
    this.setTag('name', 'twitter:image', image);

    // Geo, useful for a single-location business
    this.setTag('name', 'geo.region', 'PK-KP');
    this.setTag('name', 'geo.placename', 'Swabi');
    this.setTag('name', 'geo.position', `${BRAND.latitude};${BRAND.longitude}`);
    this.setTag('name', 'ICBM', `${BRAND.latitude}, ${BRAND.longitude}`);

    // Consumed by the SSR server to set a real HTTP status. Harmless in the
    // browser, where the status has already been decided.
    if (config.statusCode && config.statusCode !== 200) {
      this.setTag('name', 'render-status-code', String(config.statusCode));
    } else {
      this.meta.removeTag("name='render-status-code'");
    }

    this.setCanonical(url);
  }

  /** Root Restaurant node. Emitted once from the shell layout. */
  restaurantSchema(profile: RestaurantProfile): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      '@id': `${this.siteUrl}/#restaurant`,
      name: profile.name,
      alternateName: profile.legalName,
      description: profile.shortDescription,
      url: this.siteUrl,
      telephone: profile.phone,
      email: profile.email,
      image: [
        this.absolute(`${profile.heroImage}.webp`),
        this.absolute('assets/images/food/kabuli-pulao.webp'),
        this.absolute('assets/images/interior/main-dining-hall.webp'),
      ],
      logo: this.absolute('assets/brand/icon-512.png'),
      priceRange: profile.priceRange,
      currenciesAccepted: profile.currency,
      paymentAccepted: 'Cash',
      servesCuisine: profile.cuisines,
      address: {
        '@type': 'PostalAddress',
        streetAddress: profile.street,
        addressLocality: profile.city,
        addressRegion: profile.region,
        postalCode: profile.postalCode,
        addressCountry: profile.countryCode,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: profile.geo.latitude,
        longitude: profile.geo.longitude,
      },
      openingHoursSpecification: profile.openingHours
        .filter((h) => !h.isClosed)
        .map((h) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${h.dayName}`,
          opens: h.opensAt,
          closes: h.closesAt === '00:00' ? '23:59' : h.closesAt,
        })),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: profile.rating,
        reviewCount: profile.ratingCount,
        bestRating: 5,
        worstRating: 1,
      },
      hasMenu: `${this.siteUrl}/menu`,
      acceptsReservations: 'True',
      sameAs: Object.values(profile.social).filter(Boolean),
      amenityFeature: profile.amenities.flatMap((g) =>
        g.items.map((item) => ({ '@type': 'LocationFeatureSpecification', name: item, value: true })),
      ),
    };
    this.setJsonLd('restaurant', schema);
  }

  breadcrumbSchema(entries: BreadcrumbEntry[]): void {
    this.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{ label: 'Home', path: '' }, ...entries].map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.label,
        item: this.absolute(entry.path),
      })),
    });
  }

  menuItemSchema(item: MenuItem, categoryName: string): void {
    this.setJsonLd('menuitem', {
      '@context': 'https://schema.org',
      '@type': 'MenuItem',
      name: item.name,
      description: item.shortDescription,
      image: this.absolute(`${item.image}.webp`),
      url: this.absolute(`menu/${item.slug}`),
      menuAddOn: item.addons.map((a) => ({ '@type': 'MenuItem', name: a.name })),
      suitableForDiet: item.tags.includes('vegetarian')
        ? 'https://schema.org/VegetarianDiet'
        : item.tags.includes('vegan')
          ? 'https://schema.org/VeganDiet'
          : 'https://schema.org/HalalDiet',
      offers: item.variants.map((v) => ({
        '@type': 'Offer',
        name: v.label,
        price: v.price,
        priceCurrency: 'PKR',
        availability: item.isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      })),
      nutrition: item.nutrition
        ? {
            '@type': 'NutritionInformation',
            calories: `${item.nutrition.calories} cal`,
            proteinContent: `${item.nutrition.protein} g`,
            carbohydrateContent: `${item.nutrition.carbs} g`,
            fatContent: `${item.nutrition.fat} g`,
          }
        : undefined,
      aggregateRating:
        item.ratingCount > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: item.rating,
              reviewCount: item.ratingCount,
              bestRating: 5,
            }
          : undefined,
      isPartOf: { '@type': 'MenuSection', name: categoryName },
    });
  }

  articleSchema(post: BlogPost): void {
    this.setJsonLd('article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: this.absolute(`${post.coverImage}.webp`),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      author: { '@type': 'Person', name: post.authorName, jobTitle: post.authorTitle },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: this.absolute('assets/brand/icon-512.png') },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': this.absolute(`blog/${post.slug}`) },
      keywords: post.tags.join(', '),
      articleSection: post.category,
      wordCount: post.body.split(/\s+/).length,
    });
  }

  faqSchema(entries: { question: string; answer: string }[]): void {
    this.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entries.map((e) => ({
        '@type': 'Question',
        name: e.question,
        acceptedAnswer: { '@type': 'Answer', text: e.answer },
      })),
    });
  }

  menuSchema(sections: { name: string; description: string; items: MenuItem[] }[]): void {
    this.setJsonLd('menu', {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      name: `${SITE_NAME} Menu`,
      url: this.absolute('menu'),
      inLanguage: 'en',
      hasMenuSection: sections.map((section) => ({
        '@type': 'MenuSection',
        name: section.name,
        description: section.description,
        hasMenuItem: section.items.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.shortDescription,
          offers: { '@type': 'Offer', price: item.basePrice, priceCurrency: 'PKR' },
        })),
      })),
    });
  }

  /** Drops schema blocks a route no longer needs. */
  clearJsonLd(...keys: string[]): void {
    for (const key of keys) {
      const el = this.doc.getElementById(JSONLD_ID_PREFIX + key);
      el?.remove();
    }
  }

  private setJsonLd(key: string, data: unknown): void {
    const id = JSONLD_ID_PREFIX + key;
    this.doc.getElementById(id)?.remove();
    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'application/ld+json');
    this.renderer.setAttribute(script, 'id', id);
    // Strip undefined so the emitted JSON stays valid and lean.
    script.textContent = JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v));
    this.renderer.appendChild(this.doc.head, script);
  }

  private setTag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content }, `${attr}='${key}'`);
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'canonical');
      this.renderer.appendChild(this.doc.head, link);
    }
    this.renderer.setAttribute(link, 'href', url);
  }

  private absolute(pathOrUrl: string): string {
    if (!pathOrUrl) return this.siteUrl;
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    return `${this.siteUrl}/${pathOrUrl.replace(/^\//, '')}`;
  }
}
