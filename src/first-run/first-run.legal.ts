import type { LegalKind, LegalSection } from './first-run.types'

/* ============================================================================
   Orca legal content — the authoritative Terms of Service and Privacy Policy,
   delivered by Lovable (raw source: ./legal/terms.json, ./legal/privacy.json).
   These are passed into <LegalStep> via props (title / sections / versionLabel),
   exactly the injection path the platform uses in production.
   Update by editing the JSON source and regenerating, or edit here directly.
   ========================================================================== */

export type LegalDocument = {
  kind: LegalKind
  title: string
  versionLabel: string
  sections: LegalSection[]
}

export const ORCA_TERMS: LegalDocument = {
  kind: 'terms',
  title: 'Terms of Service',
  versionLabel: '1.0',
  sections: [
    {
          heading: 'Acceptance of terms',
          paragraphs: [
            'These Terms of Service ("Terms") govern your access to and use of Orca Investment (the "Service"), a trading intelligence terminal that includes a trade journal, performance analytics, risk management tools, economic calendar, and AI-powered coaching features.',
            'By creating an account, accessing, or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
          ],
        },
    {
          heading: 'The service',
          paragraphs: [
            'Orca Investment is a journaling and analytics platform. It allows you to record trades manually, import trading history from files or connected exchanges, analyze your performance, and receive statistical and behavioral insights.',
          ],
          bullets: [
            'The Service is an analytical and record-keeping tool only.',
            'The Service does not execute trades, hold funds, or connect to your capital in any way that permits transactions.',
            'Features may be added, changed, or removed over time; material changes to paid features will be communicated in advance.',
          ],
        },
    {
          heading: 'No financial advice',
          paragraphs: [
            'Nothing in the Service — including analytics, AI-generated insights, coaching responses, expectancy calculations, or risk metrics — constitutes financial, investment, legal, or tax advice, or a recommendation to buy or sell any instrument.',
            'All trading decisions are solely your own. Past performance shown in the Service does not guarantee future results. You are responsible for complying with the laws and regulations that apply to your trading activity.',
          ],
        },
    {
          heading: 'Accounts and eligibility',
          paragraphs: [
            'You must be at least 18 years old and capable of forming a binding contract to use the Service. You agree to provide accurate registration information and to keep your credentials confidential.',
          ],
          bullets: [
            'You are responsible for all activity under your account.',
            'One account per person; do not share accounts or access.',
            'Notify us immediately of any unauthorized use of your account.',
          ],
        },
    {
          heading: 'Subscriptions and billing',
          paragraphs: [
            'The Service offers a Free plan and a paid Pro plan billed monthly. Prices are displayed at checkout and may change with prior notice; changes apply from the next billing cycle.',
          ],
          bullets: [
            'Pro subscriptions renew automatically each month until cancelled.',
            'You may cancel at any time; cancellation takes effect at the end of the current paid period, and your account then converts to the Free plan.',
            'No partial-month refunds except where required by law.',
            'Payments are processed by our third-party payment provider; we do not store your full card details.',
          ],
        },
    {
          heading: 'Acceptable use',
          paragraphs: [
            'You agree not to:',
          ],
          bullets: [
            'Use the Service for any unlawful purpose or in violation of any regulation.',
            'Attempt to access other users\' data, accounts, or systems.',
            'Reverse engineer, scrape, or disrupt the Service or its infrastructure.',
            'Upload malicious code, or data you have no right to use.',
            'Abuse AI features (automated bulk requests, attempts to bypass usage limits or fair-use controls).',
          ],
        },
    {
          heading: 'Your data and imports',
          paragraphs: [
            'You retain full ownership of the trading data you record or import. You grant us a limited license to process that data solely to operate and improve the Service for you.',
            'If you connect exchange or broker integrations, you are responsible for providing read-only credentials where possible and for complying with your broker\'s terms. Imported data is stored under your account and is never shared with other users.',
          ],
        },
    {
          heading: 'AI features',
          paragraphs: [
            'Certain features use third-party AI models to generate insights from your trading data. AI output may be inaccurate or incomplete and is provided for informational and educational purposes only.',
            'Usage of AI features is subject to plan-based quotas and fair-use rate limits described in the Service.',
          ],
        },
    {
          heading: 'Intellectual property',
          paragraphs: [
            'The Service, including its design, code, branding, and content (excluding your data), is owned by Orca Investment and protected by intellectual property laws. These Terms grant you a personal, non-exclusive, non-transferable, revocable license to use the Service.',
          ],
        },
    {
          heading: 'Termination',
          paragraphs: [
            'You may delete your account at any time from the Settings area. We may suspend or terminate access for breach of these Terms, fraud, or abuse. Upon deletion, your personal data and trading records are removed as described in the Privacy Policy.',
          ],
        },
    {
          heading: 'Disclaimers and limitation of liability',
          paragraphs: [
            'The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
            'To the maximum extent permitted by law, Orca Investment and its operators shall not be liable for any indirect, incidental, consequential, or punitive damages, including trading losses, lost profits, or data loss, arising from or related to your use of the Service. Our total aggregate liability shall not exceed the amounts you paid us in the twelve months preceding the claim.',
          ],
        },
    {
          heading: 'Changes to these terms',
          paragraphs: [
            'We may update these Terms from time to time. The version label and effective date are shown above; continued use of the Service after an update constitutes acceptance of the revised Terms.',
          ],
        },
    {
          heading: 'Contact',
          paragraphs: [
            'Questions about these Terms can be sent to us through the Report Bug channel in the app or via the contact details listed on our website.',
          ],
        },
  ],
}

export const ORCA_PRIVACY: LegalDocument = {
  kind: 'privacy',
  title: 'Privacy Policy',
  versionLabel: '1.0',
  sections: [
    {
          heading: 'Overview',
          paragraphs: [
            'This Privacy Policy explains what information Orca Investment ("we", "the Service") collects, how we use it, and the choices you have. The Service is a private trading journal and analytics terminal; your trading data belongs to you and is visible only to you.',
          ],
        },
    {
          heading: 'Information we collect',
          bullets: [
            'Account information: email address and authentication identifiers (including Google sign-in, if you use it).',
            'Trading data: trades you enter manually, import from files, or sync from connected exchanges — including symbols, prices, sizes, times, notes, and screenshots you attach.',
            'Integration credentials: if you connect an exchange or broker, API credentials are stored encrypted and used only to sync your data.',
            'Usage and device data: basic technical logs (browser type, errors, feature usage) used to keep the Service reliable and secure.',
            'Support and feedback: bug reports and messages you send us.',
          ],
        },
    {
          heading: 'How we use your information',
          paragraphs: [
            'We do not sell your personal data, and we do not share your trading data with other users or advertisers.',
          ],
          bullets: [
            'To operate the Service: store your journal, compute analytics, enforce risk limits, and display your dashboards.',
            'To provide AI features: relevant portions of your trading data are sent to our AI provider to generate insights and coaching responses for you.',
            'To process payments and manage subscriptions through our payment provider.',
            'To secure the Service: abuse prevention, rate limiting, and fraud detection.',
            'To communicate with you about your account, billing, and important service changes.',
          ],
        },
    {
          heading: 'AI processing',
          paragraphs: [
            'AI-powered features (such as Orca Coach and AI Insights) process your trading statistics and recent trade history through a third-party AI model to generate responses. Data sent for AI processing is limited to what the feature needs, is tied only to your own account, and is never mixed with other users\' data.',
          ],
        },
    {
          heading: 'Cookies and local storage',
          paragraphs: [
            'We use essential cookies and local storage for authentication, preferences (language, theme), and session continuity. Optional, non-essential cookies are used only with your consent, which you can change at any time via the cookie preferences panel.',
          ],
        },
    {
          heading: 'Data retention and deletion',
          bullets: [
            'Your data is kept while your account is active.',
            'News-wire items are automatically deleted after 3 days.',
            'You may delete individual trades, portfolios, or your entire account at any time from the Settings area.',
            'When you delete your account, your personal data and trading records are permanently removed from active systems within 30 days; encrypted backups expire on their normal rotation.',
          ],
        },
    {
          heading: 'Security',
          paragraphs: [
            'We apply industry-standard measures including encryption in transit, encrypted storage of integration credentials, row-level access isolation so each account can only read its own data, and rate limiting on sensitive endpoints. No method of transmission or storage is 100% secure; if we become aware of a breach affecting your data, we will notify you.',
          ],
        },
    {
          heading: 'Your rights',
          paragraphs: [
            'Depending on your jurisdiction, you may have the right to:',
          ],
          bullets: [
            'Access and export your data (JSON/XLSX export is built into the Service).',
            'Correct inaccurate information.',
            'Delete your account and data.',
            'Object to or restrict certain processing.',
            'Withdraw consent for optional cookies.',
          ],
        },
    {
          heading: 'Children',
          paragraphs: [
            'The Service is not directed at anyone under 18, and we do not knowingly collect data from minors.',
          ],
        },
    {
          heading: 'Changes to this policy',
          paragraphs: [
            'We may update this policy from time to time. The version label and effective date are shown above; material changes will be announced in the app before they take effect.',
          ],
        },
    {
          heading: 'Contact',
          paragraphs: [
            'Privacy questions or requests can be sent through the Report Bug channel in the app or via the contact details listed on our website.',
          ],
        },
  ],
}

export const ORCA_LEGAL: Record<LegalKind, LegalDocument> = {
  terms: ORCA_TERMS,
  privacy: ORCA_PRIVACY,
}
