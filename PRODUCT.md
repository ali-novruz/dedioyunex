# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: elderly people and people with vision, hearing, motor, or cognitive difficulties who cannot finish bank, government, and other digital tasks without help. Secondary: relatives who set up a profile for them and pass it over by QR code; institutions and developers who integrate the SDK.

## Product Purpose

A personal digital accessibility profile. The user describes their needs once, by voice, text, or by hand; AI turns that into concrete settings; every integrated website or app adapts through one "bring my settings" button. Success: an elderly person finishes their task without asking anyone for help.

## Positioning

The profile belongs to the person and travels with them. It reaches inside the service: simple mode, longer session time, and plain-language confirmation are applied within the bank or portal itself, not just on the device. Sites receive interface settings only, never name, e-mail, or need categories.

## Operating Context

Hackathon MVP (YUNEX). Live on Vercel + Supabase. Demonstrated through DEMO Market scenarios: bank transfer, government certificate, doctor appointment, long news article, relative's QR hand-over.

## Capabilities and Constraints

- Web platform (Next.js), Web SDK, Android and iOS SDKs, OAuth 2.0 + PKCE API.
- Languages: Azerbaijani (default) and English, complete across interface, errors, SDK controls, AI answers, and demo pages. Russian is not offered.
- Browsers have no Azerbaijani voice; a Turkish voice is used and the interface says so.
- Real e-mail delivery is not configured; login codes appear on screen only for `@demo.az`.
- iOS SDK is not compiled; Android SDK is not tested on a device.

## Brand Commitments

Name: MƏNƏ UYĞUN. Slogan: "Bir dəfə qur, hər xidmətdə özünə uyğun istifadə et." Visual reference chosen by the user: Canva design "Yellow Colorful UI Health and Wellness Bio-Link Website". Must read as premium and simple, with no generic AI look.

## Evidence on Hand

Working demo scenarios in `demo-partner/`; live end-to-end tests. No real user testing, customers, or letters of intent exist yet; none may be claimed.

## Product Principles

1. One task on screen at a time.
2. Nothing may look clickable unless it is.
3. Say what will happen in plain words before it happens.
4. The person's settings outrank the brand: high contrast, dark mode, and large text always win over the visual style.
5. Never ask for a password, card number, or money.

## Accessibility & Inclusion

WCAG 2.2 AA minimum, AAA contrast for body text in the default theme. Large touch targets, visible focus, full keyboard use, reduced-motion support, and correct `lang` on every page in both languages.
