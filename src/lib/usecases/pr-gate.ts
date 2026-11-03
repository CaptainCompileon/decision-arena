import type { UseCase } from "./types";

export const prGate: UseCase = {
  id: "pr-gate",
  title: "Pull request gate",
  audience: "developers",
  blurb: "Decide whether a change can merge on autopilot or needs a senior engineer to look first.",
  questions: {
    needs_review: {
      type: "noul",
      instructions: "Should a senior engineer review this change before it merges?",
    },
    risk: {
      type: "score",
      instructions: "How risky is this change if it ships with a mistake?",
      criteria: [
        "Low: cosmetic or isolated, easy to revert",
        "Medium: changes behaviour in one area",
        "High: touches auth, money, user data or shared infrastructure",
      ],
    },
  },
  items: [
    {
      id: "readme-typo",
      text: "PR: Fix typo in README\n\n- Run `npm run dev` to strat the server.\n+ Run `npm run dev` to start the server.",
      labels: { needs_review: "no", risk: "0" },
    },
    {
      id: "eslint-bump",
      text: 'PR: Bump eslint from 9.1.0 to 9.2.0 (devDependency)\n\n- "eslint": "9.1.0"\n+ "eslint": "9.2.0"\n\nCI green, no lint changes.',
      labels: { needs_review: "no", risk: "0" },
    },
    {
      id: "bcrypt-cost",
      text: "PR: Speed up login\n\nLogin p95 is 400ms, mostly hashing.\n\n- const hash = await bcrypt.hash(password, 12)\n+ const hash = await bcrypt.hash(password, 8)",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "drop-column",
      text: "PR: Clean up legacy email column\n\nmigrations/0042_drop_legacy_email.sql\n+ ALTER TABLE users DROP COLUMN legacy_email;\n\nI checked and nothing reads it anymore.",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "rename-test-var",
      text: "PR: Rename variable in parser test\n\ntests/parser.test.ts\n- const x = parse(input)\n+ const parsed = parse(input)",
      labels: { needs_review: "no", risk: "0" },
    },
    {
      id: "button-padding",
      text: "PR: More padding on primary button\n\nstyles/button.css\n- padding: 6px 12px;\n+ padding: 8px 16px;",
      labels: { needs_review: "no", risk: "0" },
    },
    {
      id: "payment-retry",
      text: "PR: Retry payment capture on timeout\n\n+ for (let i = 0; i < 3; i++) {\n+   try { return await stripe.paymentIntents.capture(id) }\n+   catch (e) { if (!isTimeout(e)) throw e }\n+ }\n\nNo idempotency key is passed.",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "unauth-endpoint",
      text: "PR: Add endpoint listing users for the admin dashboard\n\n+ router.get('/api/users', async (req, res) => {\n+   res.json(await db.users.findAll())\n+ })\n\nOther routes in this file use `requireAdmin` middleware.",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "log-request",
      text: "PR: Better debugging for the webhook handler\n\n+ logger.info('incoming webhook', { req })\n\nLogs ship to our shared Datadog account.",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "date-helper-refactor",
      text: "PR: Refactor formatDate helper\n\nRewrites utils/formatDate.ts (used in ~40 places) from moment to Intl.DateTimeFormat. Adds 25 unit tests, including time zones and locales.",
      labels: { needs_review: "yes", risk: "1" },
    },
    {
      id: "page-size",
      text: "PR: Raise default page size on /api/orders from 20 to 50\n\n- const DEFAULT_LIMIT = 20\n+ const DEFAULT_LIMIT = 50",
      labels: { needs_review: "no", risk: "1" },
    },
    {
      id: "deploy-any-branch",
      text: "PR: Simplify CI deploy rule\n\n.github/workflows/deploy.yml\n- if: github.ref == 'refs/heads/main'\n+ if: github.event_name == 'push'\n\nFewer special cases.",
      labels: { needs_review: "yes", risk: "2" },
    },
    {
      id: "parser-tests",
      text: "PR: Add unit tests for the CSV parser\n\nOnly adds tests/csv.test.ts (18 cases). No source files changed.",
      labels: { needs_review: "no", risk: "0" },
    },
    {
      id: "flagged-checkout",
      text: "PR: New checkout summary component behind a flag\n\nAdds CheckoutSummaryV2, rendered only when the `checkout_v2` flag is on. The flag is off in every environment.",
      labels: { needs_review: "no", risk: "1" },
    },
    {
      id: "price-cache-ttl",
      text: "PR: Cache product prices longer\n\n- const PRICE_TTL = 5 * 60\n+ const PRICE_TTL = 24 * 60 * 60\n\nCuts DB load on the catalogue page.",
      labels: { needs_review: "yes", risk: "1" },
    },
    {
      id: "copyright-year",
      text: "PR: Update copyright year\n\n- © 2025 Acme\n+ © 2026 Acme",
      labels: { needs_review: "no", risk: "0" },
    },
  ],
};
