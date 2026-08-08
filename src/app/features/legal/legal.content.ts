import { BRAND } from '../../core/constants/app.constants';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  key: 'privacy' | 'terms' | 'refund';
  path: string;
  title: string;
  accent: string;
  eyebrow: string;
  summary: string;
  updated: string;
  image: string;
  sections: LegalSection[];
}

const CONTACT_BLOCK: LegalSection = {
  heading: 'How to reach us',
  paragraphs: [
    `Questions about this document should go to the restaurant directly. Call ${BRAND.phoneDisplay}, email ${BRAND.email}, or come to ${BRAND.street}, ${BRAND.city}, ${BRAND.region}, ${BRAND.country}. We answer during opening hours, ten in the morning until midnight, every day.`,
  ],
};

/**
 * Plain-language legal copy.
 *
 * Written for a single-location cash-only restaurant in Pakistan. It is
 * deliberately specific rather than boilerplate, because a generic template
 * would claim things that are not true here (card processing, third-party
 * payment processors, international transfers).
 *
 * NOTE FOR THE CLIENT: this is a good-faith draft, not legal advice. Have it
 * reviewed before go-live.
 */
export const LEGAL_DOCUMENTS: Record<LegalDocument['key'], LegalDocument> = {
  privacy: {
    key: 'privacy',
    path: 'privacy-policy',
    title: 'Privacy',
    accent: ' Policy',
    eyebrow: 'Legal',
    summary:
      'What we collect when you order or book, why we collect it, and what we do not do with it.',
    updated: '7 August 2026',
    image: 'assets/images/interior/dining-seating',
    sections: [
      {
        heading: 'The short version',
        paragraphs: [
          'We collect the minimum needed to cook your food, bring it to you, or hold your table. We do not sell your details, we do not share them with advertisers, and we never ask for card or bank details because we do not take card payments.',
        ],
      },
      {
        heading: 'What we collect',
        bullets: [
          'Your name and mobile number, so we can confirm an order or a booking.',
          'Your delivery address and landmark, if you order for delivery.',
          'Your email address, if you choose to give one, for the order receipt.',
          'The contents of your order, and any note you leave for the kitchen.',
          'Basic technical information your browser sends, such as page views and device type, used only to keep the site working.',
        ],
      },
      {
        heading: 'What we do not collect',
        bullets: [
          'Card numbers, bank details or any payment credentials. There is no online payment step on this website.',
          'Your CNIC or any government identifier.',
          'Precise location data. We ask you to choose a delivery area from a list instead.',
        ],
      },
      {
        heading: 'Why we hold it',
        paragraphs: [
          'To take, prepare and deliver your order. To confirm and honour a table reservation. To call you back if something is unclear or if the rider cannot find the address. To keep our own records of what we sold and when, which we are required to do for tax purposes.',
          'If you have opted in, we may also send occasional messages about offers. You can tell us to stop at any time, by phone or in your account settings, and we will.',
        ],
      },
      {
        heading: 'Who sees it',
        paragraphs: [
          'The people working at the restaurant who need it to do their job: the manager taking the order, the kitchen preparing it, and the rider delivering it. Nobody else.',
          'We do not sell, rent or trade your information. We do not share it with advertising networks or data brokers.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Order and reservation records are kept for three years, which covers our tax and accounting obligations. Account details are kept until you ask us to delete the account. Contact messages are kept for one year.',
        ],
      },
      {
        heading: 'Your choices',
        bullets: [
          'Ask us what we hold about you, and we will tell you.',
          'Ask us to correct anything that is wrong.',
          'Ask us to delete your account and its history, which we will do unless we are required to keep a record for tax purposes.',
          'Opt out of marketing messages at any time without affecting your ability to order.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        paragraphs: [
          'This site stores your basket and, if you sign in, your session in your own browser. That data never leaves your device except when you place an order. We do not run third-party advertising or tracking cookies.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'This site is not directed at children. We do not knowingly collect information from anyone under 13. If you believe a child has given us their details, call us and we will remove them.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'If this policy changes in a way that matters, we will update the date at the top and, where the change is significant, mention it on the site.',
        ],
      },
      CONTACT_BLOCK,
    ],
  },

  terms: {
    key: 'terms',
    path: 'terms',
    title: 'Terms of',
    accent: ' Service',
    eyebrow: 'Legal',
    summary:
      'The agreement between you and Salateen Restaurant when you order online or book a table.',
    updated: '7 August 2026',
    image: 'assets/images/interior/hall-wide',
    sections: [
      {
        heading: 'Who you are dealing with',
        paragraphs: [
          `${BRAND.fullName}, ${BRAND.street}, ${BRAND.city}, ${BRAND.region}, ${BRAND.country}. Reachable on ${BRAND.phoneDisplay} and at ${BRAND.email}.`,
          'Using this website to place an order or request a table means you accept these terms.',
        ],
      },
      {
        heading: 'Orders',
        bullets: [
          'An order placed on this website is a request, not a confirmed sale. It becomes an order once we call you to confirm it.',
          'We may decline an order if an item has run out, if the delivery address is outside our areas, or if we cannot reach you on the number given.',
          'Prices shown are those on our printed menu card at the time of ordering. If a price on the site is wrong, we will tell you before we confirm, and you may cancel.',
          'Preparation and delivery times are estimates. Everything is cooked to order, and on a Friday evening it takes longer.',
        ],
      },
      {
        heading: 'Payment',
        paragraphs: [
          'We accept cash only. For delivery, you pay the rider in cash on arrival. For dine-in and collection, you pay at the counter.',
          'There is no online payment on this website and there never has been. We will never ask you for card details, bank details, an OTP or a transfer. If anyone contacts you claiming to be Salateen and asks for any of those things, it is not us. Please call us on ' +
            BRAND.phoneDisplay +
            ' and report it.',
        ],
      },
      {
        heading: 'Reservations',
        bullets: [
          'A booking request is confirmed by the restaurant, usually within an hour during opening times.',
          'We hold your table for fifteen minutes past the booked time. After that we may release it if the room is full.',
          'There is no charge to book and no charge to cancel. We simply ask that you tell us, so the table can go to someone else.',
          'For parties over twenty, or for the whole family hall, please call rather than booking online.',
        ],
      },
      {
        heading: 'Allergies and dietary requirements',
        paragraphs: [
          'All our food is halal. Ingredient and allergen information on this site is provided in good faith, but everything is cooked in a shared kitchen where nuts, dairy, gluten, egg, fish and mustard are all in use.',
          'If you have a serious allergy, tell us when you order and speak to a member of staff. We will be honest with you about whether we can serve you safely.',
        ],
      },
      {
        heading: 'Your account',
        bullets: [
          'You are responsible for keeping your password to yourself.',
          'Give us accurate contact details. We cannot deliver to an address that does not exist or call a number that is wrong.',
          'We may suspend an account used to place repeated false orders.',
        ],
      },
      {
        heading: 'Content on this site',
        paragraphs: [
          'Photographs, menu descriptions, prices and articles on this site belong to Salateen Restaurant. You are welcome to share links and to quote us. Please do not republish our photographs as your own.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'We take responsibility for the food we serve and the service we provide. We are not responsible for delays caused by things outside our control, such as road closures, weather or power cuts, though we will always tell you what is happening and offer you the choice to cancel.',
          'Nothing in these terms limits any right you have under Pakistani consumer law.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These terms are governed by the laws of the Islamic Republic of Pakistan, and the courts of Swabi District, Khyber Pakhtunkhwa, have jurisdiction.',
        ],
      },
      CONTACT_BLOCK,
    ],
  },

  refund: {
    key: 'refund',
    path: 'refund-policy',
    title: 'Refund',
    accent: ' Policy',
    eyebrow: 'Legal',
    summary:
      'What happens when something is wrong with your order. Short answer: tell us and we will fix it.',
    updated: '7 August 2026',
    image: 'assets/images/food/karahi-closeup',
    sections: [
      {
        heading: 'The principle',
        paragraphs: [
          'If we get your order wrong, we replace it or refund it. We do not argue about it and we do not make you prove anything unreasonable. That has been the rule since 2011 and it has not cost us anything we regret.',
        ],
      },
      {
        heading: 'Because we take cash only',
        paragraphs: [
          'There is no online payment, so there is nothing to reverse on a card. A refund means cash back to you, either handed over by the rider, refunded at the counter, or credited against your next order if you prefer.',
        ],
      },
      {
        heading: 'When we replace or refund in full',
        bullets: [
          'The wrong dish arrived.',
          'A dish is missing from the order.',
          'The food arrived cold, spilled or spoiled in transit.',
          'A dish is undercooked or genuinely not up to standard.',
          'Delivery is more than forty-five minutes past the estimate without us having called you.',
        ],
      },
      {
        heading: 'How to tell us',
        paragraphs: [
          `Call ${BRAND.phoneDisplay} within two hours of receiving the order, or tell a member of staff before you leave if you are dining in. Have your SLT reference to hand. Two hours is not a legal deadline, it is simply so we can still work out what happened in the kitchen.`,
          'Please do not throw away the food until we have spoken. We may ask you to describe it or send a photograph on WhatsApp, which usually settles the matter in a minute.',
        ],
      },
      {
        heading: 'What we cannot refund',
        bullets: [
          'A dish you ordered and did not enjoy, when it was cooked correctly. Tell us anyway; we would rather know, and we will usually offer you something else.',
          'Spice level, when the menu described it accurately and you did not ask for it to be changed.',
          'An order collected or delivered several hours before you contacted us, where we can no longer establish what happened.',
          'A cancelled order that had already been cooked. We will always try, but a degh of pulao cannot be un-cooked.',
        ],
      },
      {
        heading: 'Cancelling an order',
        paragraphs: [
          'Call us as soon as you can. If the kitchen has not started, we cancel with no charge at all. If it has started, we will tell you honestly what has already been cooked and what can still be stopped.',
        ],
      },
      {
        heading: 'Reservations and catering',
        bullets: [
          'Table reservations are free to make and free to cancel at any time.',
          'Catering orders take a fifty percent advance. Cancel more than seventy-two hours before the event and the advance is returned in full.',
          'Cancel within seventy-two hours and we retain what we have already spent on ingredients, and return the rest. We will show you the figure.',
        ],
      },
      {
        heading: 'How long it takes',
        paragraphs: [
          'Cash refunds are immediate: the rider hands it over, or the counter pays it out. There is no waiting period, because there is no payment processor in between.',
        ],
      },
      CONTACT_BLOCK,
    ],
  },
};
