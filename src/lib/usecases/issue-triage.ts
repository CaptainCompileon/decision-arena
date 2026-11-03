import type { UseCase } from "./types";

export const issueTriage: UseCase = {
  id: "issue-triage",
  title: "GitHub issue triage",
  audience: "developers",
  blurb: "Label a new issue and decide how urgent it is, the way a maintainer would on a Monday morning.",
  questions: {
    label: {
      type: "choice",
      instructions: "What kind of issue is this?",
      criteria: {
        bug: "Something that should work is broken",
        feature: "A request for new behaviour or capability",
        question: "The author needs help or an explanation; nothing is broken",
        docs: "Documentation is wrong, missing or unclear",
      },
    },
    urgency: {
      type: "score",
      instructions: "How urgently should the maintainers act on it?",
      criteria: [
        "Can wait for a future release",
        "Should be handled this cycle",
        "Blocks users now; fix soon",
        "Emergency: data loss, security hole or outage",
      ],
    },
  },
  items: [
    {
      id: "crash-on-startup",
      text: "Title: Crash on startup after upgrading to 3.2.0\n\nAfter `npm i app@3.2.0` the CLI exits immediately with `TypeError: Cannot read properties of undefined (reading 'split')` in config.js:41. Happens on every Windows machine on our team. 3.1.4 works fine, we pinned it for now.",
      labels: { label: "bug", urgency: "2" },
    },
    {
      id: "dark-mode",
      text: "Title: Dark mode for the settings page\n\nThe rest of the app follows the system theme but settings is always white. Would be nice to have it match.",
      labels: { label: "feature", urgency: "0" },
    },
    {
      id: "proxy-config",
      text: "Title: How do I configure a proxy?\n\nOur office routes everything through an HTTP proxy. Is there an env var or config key for that? Couldn't find it.",
      labels: { label: "question", urgency: "0" },
    },
    {
      id: "readme-flag",
      text: "Title: README install command uses removed flag\n\nThe quick start says `app init --legacy` but --legacy was removed in 3.0, so new users get 'unknown option' on the very first command.",
      labels: { label: "docs", urgency: "1" },
    },
    {
      id: "csv-drops-rows",
      text: "Title: CSV export silently drops rows with commas\n\nAny row where the description contains a comma is missing from the exported file. No error is shown. We only noticed because our monthly totals didn't match.",
      labels: { label: "bug", urgency: "2" },
    },
    {
      id: "draft-overwrite",
      text: "Title: Saving a draft deletes the previous version permanently\n\nSince today's release, pressing Save on a draft replaces the published version and the history is empty. Three of our customers have lost published articles.",
      labels: { label: "bug", urgency: "3" },
    },
    {
      id: "keys-in-log",
      text: "Title: API keys written to debug log in plain text\n\nWith LOG_LEVEL=debug, every outgoing request is logged including the Authorization header. Our logs ship to a third-party service.",
      labels: { label: "bug", urgency: "3" },
    },
    {
      id: "parquet-export",
      text: "Title: Support exporting to Parquet\n\nWe load exports into our data warehouse; Parquet would save us a conversion step.",
      labels: { label: "feature", urgency: "0" },
    },
    {
      id: "vpn",
      text: "Title: Can this run behind a corporate VPN?\n\nBefore we roll it out: does the desktop app need any outbound ports besides 443?",
      labels: { label: "question", urgency: "0" },
    },
    {
      id: "timeout-units",
      text: "Title: Config reference says timeout is in seconds\n\nThe docs table lists `timeout: 30` as 30 seconds, but the code (and the changelog for 2.0) treats it as milliseconds, so I set 30 and every request timed out.",
      labels: { label: "docs", urgency: "1" },
    },
    {
      id: "typo-error",
      text: "Title: Typo in error message\n\n'Unexpected token recieved' should be 'received'.",
      labels: { label: "bug", urgency: "0" },
    },
    {
      id: "sidebar-shortcut",
      text: "Title: Keyboard shortcut to toggle the sidebar\n\nI hide the sidebar a lot on my laptop; a shortcut like Cmd+B would be great.",
      labels: { label: "feature", urgency: "0" },
    },
    {
      id: "login-500",
      text: "Title: Login returns 500 for everyone since the 14:00 deploy\n\nEvery login attempt on production gets a 500. Status page still says operational. Support queue is filling up.",
      labels: { label: "bug", urgency: "3" },
    },
    {
      id: "slow-ci",
      text: "Title: Why does the build take 10 minutes on CI but 1 locally?\n\nSame commit, same Node version. Is there a cache I should be configuring? It's slowing our whole team's PRs.",
      labels: { label: "question", urgency: "1" },
    },
    {
      id: "old-screenshot",
      text: "Title: Tutorial step 4 shows the old UI\n\nThe screenshot still has the blue toolbar from v1. The steps themselves still work.",
      labels: { label: "docs", urgency: "0" },
    },
    {
      id: "multi-account",
      text: "Title: Allow switching between multiple accounts\n\nOur support agents log out and back in about 20 times a day to move between client workspaces. It's costing real time.",
      labels: { label: "feature", urgency: "1" },
    },
  ],
};
