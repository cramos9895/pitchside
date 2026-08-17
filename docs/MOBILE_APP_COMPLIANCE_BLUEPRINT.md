# PitchSide: Mobile Application Architecture, Compliance & Launch Blueprint

This document serves as the master reference for expanding **PitchSide** into native iOS (Apple App Store) and Android (Google Play Store) mobile applications while maintaining full legal compliance, rigorous security, and seamless integration with the existing web platform.

---

## 1. High-Level Architecture: How Web & Mobile Work Together

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 SHARED BACKEND INFRASTRUCTURE            │
                  │                                                          │
                  │  ┌────────────────────────────────────────────────────┐  │
                  │  │          Supabase PostgreSQL Database              │  │
                  │  │  (Single Source of Truth: Games, Bookings, Profiles)│  │
                  │  └──────────────▲──────────────────────▲──────────────┘  │
                  │                 │                      │                 │
                  │  ┌──────────────┴──────────┐ ┌─────────┴──────────────┐  │
                  │  │   Supabase Auth / RLS   │ │   Stripe / Resend API  │  │
                  │  └──────────────▲──────────┘ └─────────▲──────────────┘  │
                  └─────────────────┼──────────────────────┼─────────────────┘
                                    │                      │
                  ┌─────────────────┴──────────────────────┴─────────────────┐
                  │                                                          │
                  ▼                                                          ▼
    ┌───────────────────────────┐                              ┌───────────────────────────┐
    │     PITCHSIDE WEB APP     │                              │    PITCHSIDE MOBILE APP   │
    │  (Next.js App Router/SSR) │                              │    (React Native / Expo)  │
    │                           │                              │                           │
    │  • Browser Cookie Auth    │                              │  • SecureStore / Keychain │
    │  • Desktop / Tablet / Web │                              │  • Native Apple/Google Pay│
    │  • Web Stripe Checkout    │                              │  • APNs / FCM Push Alerts │
    └───────────────────────────┘                              └───────────────────────────┘
```

### Core Architecture FAQ

#### **Q: Are the databases the same?**
**Yes, 100% the exact same database.**
* Whether a player registers for a pickup game on their iPhone, on an Android device, or through a laptop browser at `pitchsidecf.com`, all data flows into the exact same **Supabase PostgreSQL database**.
* If an event host confirms a player's arrival or updates the score on the web admin dashboard, that update is instantly broadcast via **Supabase Realtime** to all players' mobile apps in milliseconds.

#### **Q: Do I need to update the website and mobile app separately?**
* **Database, Logic & Backend Services:** **Updated Once.**
  * When you create new database tables, update match algorithms, adjust tournament schedules, or configure automated emails (Resend) and Stripe webhooks, those changes instantly apply to **both** the website and mobile apps without needing app store resubmission.
* **User Interface & Native Features:** **Updated via their respective deployment pipelines:**
  * **Website UI:** Deploys instantly to Vercel/production when you push code.
  * **Mobile UI:** Built with **React Native / Expo**, compiling into native iOS (`.ipa`) and Android (`.aab`) binaries. UI and JavaScript updates can also be pushed instantly over-the-air (OTA) via EAS Update without waiting for App Store review for standard bug fixes and minor features.

---

## 2. Payment Architecture & Monetization Boundaries

### A. Physical Goods vs. Digital Goods (0% App Store Commission)
Under **Apple App Store Review Guideline 3.1.5(a) & 3.1.3(e)** and **Google Play Billing Policies**:
* **Physical Real-World Services:** Booking soccer pitches, paying pickup match entry fees, registering teams for physical tournaments, renting turf facilities, and referee game compensation are classified as real-world transactions consumed outside the digital app.
* **Mandatory Rail:** PitchSide **must use external payment processing (Stripe / Apple Pay / Google Pay)**. 
* **Zero Store Fee:** Apple and Google collect **0% store commission** on these physical bookings (standard Stripe processing fees apply).
* **Important:** PitchSide **must not** use Apple In-App Purchase (IAP) for match registrations. Attempting to use IAP for physical pitch bookings violates Apple guidelines and results in rejection.

### B. Mobile Apple Pay, Google Pay & Stripe PaymentSheet
* **Zero Raw Card Data:** The mobile app integrates `@stripe/stripe-react-native` (`PaymentSheet`). Card numbers and biometric authorizations are tokenized directly in Apple/Google/Stripe secure enclaves. No card data touches PitchSide servers.
* **Server-Side Intent Generation:** Mobile app requests a `PaymentIntent` via `POST /api/checkout/intent`, receives the `client_secret`, and presents the native Apple Pay / Google Pay sheet.
* **Webhooks:** Stripe webhooks (`/api/webhooks/stripe`) execute backend booking confirmation, slot decrements, and email receipts identically for web and mobile.

### C. Refunds & Customer Disputes
* **Physical Booking Refunds:** Administered directly by PitchSide hosts/admins via the Stripe Refund API.
* **Digital Upgrades (if added in the future):** If purely digital goods (e.g. digital cosmetic profile badges) are introduced, they must use StoreKit 2 / Google Play Billing with Apple-managed refund flows.

---

## 3. Authentication, Account Management & Privacy

### A. Sign in with Apple (Mandatory Parity)
* **Apple Guideline 4.8:** Because PitchSide supports third-party/social authentication (Google OAuth), **Sign in with Apple (SIWA)** is legally required with equal visual prominence on iOS.
* **Implementation:** `expo-apple-authentication` authenticates with FaceID/TouchID and forwards identity tokens to `supabase.auth.signInWithIdToken()`.
* **Apple Private Relay Email Configuration:**
  * When users select "Hide My Email" (`@privaterelay.appleid.com`), Apple filters incoming emails.
  * PitchSide's outbound email domain (`pitchsidecf.com`) and Resend SPF/DKIM records must be registered under **Apple Developer Portal -> Sign in with Apple -> Email Sources** to prevent transactional receipt emails from being discarded.

### B. Mandatory In-App Account Deletion (Apple 5.1.1(v) & Google Play)
* **The Rule:** Any app supporting account creation must provide a visible, self-serve account deletion option in the app settings.
* **Execution Flow:**
  1. User navigates to `Settings -> Security -> Delete Account`.
  2. User confirms intent with a two-step dialog and password/re-auth prompt.
  3. Executes a secure Supabase RPC function (`delete_user_account`) that:
     * Anonymizes PII in `public.profiles` (sets name to `'Deleted Player'`, wipes avatar, phone, bio).
     * Purges notification history, unread alerts, and chat messages.
     * Retains anonymized Stripe charge IDs for tax and financial auditing requirements.
     * Permanently deletes the user record in `auth.users`.

### C. Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)
* **Declared Data Types:**
  * Contact Info: Name, Email Address, Phone Number (for rosters and match alerts).
  * Location: Precise / Coarse Location (for finding local pitches).
  * Financial Info: Purchase history (via Stripe tokenization).
  * User Identifiers: Supabase User UUID.
* **Required Reason APIs:**
  * Declare `NSPrivacyAccessedAPICategoryUserDefaults` with Reason `CA92.1` for local preference and session caching.

### D. Privacy Policy & Terms
* Must be published at live, public URLs (`/legal/privacy` and `/legal/terms`) without login barriers, disclosing data retention, third-party processors (Stripe, Resend, Supabase), and user rights.

---

## 4. Permissions, Location & Push Notifications

### A. Location Permissions & Mandatory Legal Route Disclaimer
* **Permission Justification:**
  * iOS `Info.plist`: `NSLocationWhenInUseUsageDescription`: `"PitchSide uses your location to discover upcoming soccer matches and tournaments near your current location."`
  * Android `AndroidManifest.xml`: `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`.
* **Mandatory Navigation Legal Disclaimer (Apple DPLA Section 3.3.26):**
  When rendering maps or providing directions to facilities, the UI and EULA must include this exact notice:
  > **`YOUR USE OF THIS REAL TIME ROUTE GUIDANCE APPLICATION IS AT YOUR SOLE RISK. LOCATION DATA MAY NOT BE ACCURATE.`**

### B. Push Notifications (APNs / FCM) Hygiene
* **Token Storage:** Device push tokens stored in `user_push_tokens` in Supabase.
* **Zero PII Payload Rule (Apple Attachment 1):** Push notification banners must never contain sensitive financial data, auth tokens, or private details. Banners display generic alerts (e.g., *"Match Update: Your pickup game time has been confirmed"*), and the mobile app securely fetches the authenticated details from Supabase upon opening.
* **Notification Preferences:** Settings screen must provide independent toggles for transactional match reminders vs. promotional/marketing announcements.

---

## 5. Reviewer Submission Kit & Store Metadata

### A. App Review Test Credentials
In App Store Connect and Google Play Console Review Notes, provide pre-configured demo credentials:
1. **Player Reviewer Account:** `reviewer.player@pitchsidecf.com` (pre-seeded with upcoming matches and mock wallet credits).
2. **Facility Owner Account:** `reviewer.facility@pitchsidecf.com` (linked to a test sandbox facility).
3. **Referee Account:** `reviewer.referee@pitchsidecf.com` (assigned to test matches).
4. **Stripe Test Mode:** Review accounts operate against Stripe Test Mode or use a free bypass promo code (`REVIEWER_FREE`) so reviewers can test full booking flows without real credit cards.

### B. Platform Targeting
In App Store Connect -> Pricing and Availability, explicitly uncheck:
* **"Apple Vision Pro (Designed for iPad)"**
* **"Mac (Designed for iPad)"**  
*(Until dedicated desktop and vision layouts are developed and tested).*

### C. Signing Keys & Secret Hygiene
* iOS Distribution Certificates (`.p12`), Android Release Keystores (`.jks`), and Apple `.p8` Auth Keys must reside exclusively in secure CI/CD secret managers (EAS Secrets / GitHub Secrets) and never be committed to git.
