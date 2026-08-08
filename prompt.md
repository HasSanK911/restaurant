# Claude Code Prompt – Build a Premium Restaurant Management Website (Angular + Tailwind + JSON Server)

You are an expert Senior Full Stack Software Architect, UI/UX Designer, Angular Architect, SEO Specialist, and Laravel Architect.

Your task is to build a **production-quality demo** for **Salateen Restaurant Swabi**, which will later be connected to a Laravel backend if the client approves the project.

The goal is to create a website that looks and feels like a premium international restaurant brand, not a typical local restaurant website.

---

# IMPORTANT

Do NOT generate placeholder-level code.

Generate production-level architecture.

Follow Angular best practices.

Use reusable components.

Follow SOLID principles.

Follow clean architecture.

Use standalone Angular components.

Use Angular 20+.

Use TailwindCSS.

Use Signals wherever suitable.

Use RxJS only where necessary.

Make everything responsive.

Create beautiful animations.

Optimize for performance.

Optimize for SEO.

Optimize for accessibility.

Optimize for Core Web Vitals.

No Bootstrap.

No PrimeNG.

No Angular Material unless absolutely required.

---

# Tech Stack

Frontend

* Angular 20+
* Standalone Components
* TailwindCSS
* Angular Router
* Angular Signals
* RxJS
* Angular Animations
* JSON Server
* TypeScript

Backend (temporary)

* JSON Server
* Fake REST API
* Mock Authentication
* Mock Admin
* Mock Orders
* Mock Inventory
* Mock Reservations

Later Backend

Laravel 12

---

# Project Structure

Create a scalable architecture.

Example:

/src

/core

/shared

/layouts

/pages

/components

/services

/interceptors

/guards

/models

/interfaces

/pipes

/directives

/utils

/constants

/assets

---

# IMPORTANT

Use JSON Server as a temporary backend.

Everything should work through JSON APIs.

Do NOT hardcode data.

Create proper REST APIs using json-server.

Example resources:

* restaurant
* categories
* menu
* menuImages
* banners
* offers
* chefs
* reservations
* orders
* customers
* deliveryAreas
* inventory
* inventoryLogs
* staff
* users
* roles
* permissions
* testimonials
* gallery
* blogs
* faq
* coupons
* contactMessages
* notifications
* reviews
* tables
* tableBookings
* settings
* dashboardStats

Create a complete db.json with realistic demo data.

---

# IMPORTANT

Fetch all restaurant images from the following website and use them throughout the project wherever appropriate:

https://salateen-restaurant-swabi.wheree.com/

Use:

* restaurant photos
* food images
* dining images
* BBQ images
* family dining images
* restaurant exterior
* restaurant interior

Download and organize them properly inside assets/images.

Use optimized image formats.

Lazy load images.

Compress where possible.

---

# Website Theme

Premium

Luxury

Elegant

Modern

Warm

Family Friendly

Restaurant should feel similar in quality to:

* Salt Bae Restaurants
* PF Chang's
* Texas Roadhouse
* Outback Steakhouse
* Hard Rock Cafe
* High-end BBQ restaurants

Dark luxury theme with elegant warm colors.

Use beautiful typography.

Large hero sections.

Smooth scrolling.

Parallax sections where appropriate.

Micro animations.

Glass morphism where appropriate.

Beautiful hover effects.

Luxury spacing.

---

# Branding

Restaurant Name

Salateen Restaurant Swabi

Location

Jhangira Road
Mal Lar
Swabi
Pakistan

Phone

0312-0991116

Business Type

Family Restaurant

Pakistani Restaurant

BBQ Restaurant

Fine Dining

---

# SEO Requirements

This website must be fully SEO optimized.

Include:

Meta titles

Meta descriptions

Canonical URLs

Structured Data (JSON-LD)

Restaurant Schema

Breadcrumb Schema

Open Graph

Twitter Cards

robots.txt

sitemap.xml

Dynamic page titles

Dynamic meta descriptions

Image alt text

Semantic HTML

Heading hierarchy

Internal linking

Fast loading

Image lazy loading

Route preloading

Core Web Vitals optimization

Server-side rendering readiness

Generate SEO helper services.

---

# Public Website Pages

Create all pages.

Home

About

Our Story

Menu

Categories

Single Food Detail

Gallery

Offers

Reservation

Book Table

Order Online

Checkout

Track Order

Testimonials

Blogs

Blog Detail

FAQ

Contact

Privacy Policy

Terms

Refund Policy

Careers

Events

Catering

Branches (future ready)

404

500

---

# Homepage Sections

Hero Banner

Today's Specials

Popular Dishes

Featured BBQ

Restaurant Story

Why Choose Us

Chef Recommendation

Customer Reviews

Gallery Preview

Reservation CTA

Download Menu CTA

Location Map

Working Hours

Footer

---

# Food Ordering System

Customers should be able to:

Browse menu

Search food

Filter food

Sort food

View details

Customize quantity

Add notes

Add to cart

Update quantity

Remove items

Apply coupon

Checkout

Choose:

Home Delivery

OR

Table Booking

NO ONLINE PAYMENT.

Payment options ONLY:

Home Delivery

Cash on Delivery

Reservation

Cash at Counter

Display these clearly throughout checkout.

---

# Reservation System

Users should:

Choose date

Choose time

Choose guests

Choose table preference

Indoor

Outdoor

Family Hall

Rooftop (future)

Add notes

Receive booking confirmation.

Admin can approve or reject bookings.

---

# Order Tracking

Status flow:

Pending

Accepted

Preparing

Ready

Out for Delivery

Delivered

Cancelled

---

# Customer Features

Profile

Addresses

Past Orders

Reservations

Wishlist

Favorite Foods

Reviews

Notifications

Coupons

Settings

---

# Authentication

Mock Authentication using JSON Server.

Customer

Admin

Manager

Staff

Role-based permissions.

---

# Admin Panel

Create a completely separate admin dashboard.

Premium dashboard.

Responsive.

Dark mode.

Charts.

Statistics.

Modules:

Dashboard

Orders

Reservations

Customers

Users

Roles

Permissions

Inventory

Inventory Logs

Suppliers

Categories

Menu Items

Offers

Coupons

Reviews

Gallery

Blogs

Testimonials

FAQs

Staff

Kitchen Queue

Notifications

Restaurant Settings

Working Hours

Delivery Charges

Delivery Areas

Taxes

Reports

Analytics

System Logs

Profile

Change Password

---

# Inventory Module

Track:

Raw materials

Stock

Purchase quantity

Remaining quantity

Expiry

Supplier

Low stock alerts

Consumption

Kitchen usage

Inventory reports

---

# Dashboard Analytics

Today's Orders

Today's Revenue

Reservations

Top Selling Items

Popular Categories

Inventory Status

Recent Orders

Charts

Revenue Graph

Monthly Reports

Customer Growth

---

# Kitchen Dashboard

Separate screen.

Live incoming orders.

Preparation timer.

Order status update.

Print kitchen receipt.

---

# Delivery Management

Delivery zones

Charges

Estimated delivery

Driver placeholder

Future ready for rider app

---

# UI Requirements

Luxury UI.

Smooth animations.

Page transitions.

Loading skeletons.

Shimmer effects.

Empty states.

Error states.

Confirmation dialogs.

Toast notifications.

Beautiful cards.

Sticky header.

Floating action buttons.

Elegant footer.

Responsive navbar.

Mega menu.

Mobile bottom navigation.

---

# Forms

Reactive Forms.

Validation.

Error messages.

Reusable form components.

---

# Accessibility

WCAG compliance.

Keyboard navigation.

Screen reader friendly.

ARIA labels.

Focus management.

---

# Performance

Lazy loading

Route level code splitting

Image optimization

Tree shaking

OnPush strategy where applicable

Signals

Optimized change detection

---

# JSON Server APIs

Create complete REST APIs for every module.

Use proper relationships.

Create seed data.

Create realistic demo records.

Implement CRUD everywhere.

---

# Documentation

After completing the project, create TWO markdown files.

## 1. BACKEND_PLAN.md

Explain in detail how the future Laravel backend should be built.

Include:

* Complete database architecture
* ERD explanation
* Tables
* Relationships
* Authentication
* Sanctum
* APIs
* Validation
* Business logic
* Admin permissions
* Roles
* Notifications
* Inventory architecture
* Reservation architecture
* Order lifecycle
* Coupon logic
* Delivery architecture
* Reporting
* Logging
* File uploads
* Queue jobs
* Events
* Broadcasting
* Email notifications
* SMS architecture
* Future payment gateway integration (keep disabled for this demo)
* Deployment recommendations
* Security recommendations
* API versioning
* Suggested Laravel folder structure

This document should be detailed enough that a Laravel developer can begin implementation without guessing requirements.

---

## 2. MIGRATION_GUIDE.md

Explain exactly how to migrate from JSON Server to Laravel.

Include:

* Which Angular services need updating
* API endpoint mapping
* JSON models to Laravel models
* Authentication replacement
* Route updates
* Error handling changes
* Environment configuration
* File upload migration
* Inventory migration
* Orders migration
* Reservation migration
* Admin migration
* Deployment checklist
* Testing checklist
* Final production checklist

---

# Final Goal

Deliver a premium, investor-ready restaurant platform that looks like a finished commercial product rather than a prototype. Every page should feel polished, modern, and fully functional using JSON Server as the temporary backend. The codebase must be clean, modular, scalable, and ready for seamless migration to Laravel with minimal frontend changes.
