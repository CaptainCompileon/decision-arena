import type { BenchItem, UseCase } from "./types";

// Images come from scripts/render-screens.mjs.
const screen = (id: string, broken: boolean, defect: string): BenchItem => ({
  id,
  text: "Screenshot of one screen from a web app, rendered at 480×360.",
  images: [`/bench/ui/${id}.png`],
  labels: { broken: broken ? "yes" : "no", defect },
});

export const screenshotJudge: UseCase = {
  id: "screenshot-judge",
  title: "Screenshot judge",
  audience: "both",
  blurb: "Spot a broken UI from a screenshot. A visual-regression check for developers, a 'is this site legit?' gut check for everyone else.",
  questions: {
    broken: {
      type: "noul",
      instructions: "Does this screen have a visible layout or rendering defect?",
    },
    defect: {
      type: "choice",
      instructions: "Which defect, if any, is the most visible?",
      criteria: {
        none: "No visible defect",
        overlap: "Elements or text overlap each other",
        overflow: "Content is clipped or spills outside its container",
        missing_image: "An image failed to load (broken icon or empty box)",
        contrast: "Text is too low-contrast to read",
      },
    },
  },
  items: [
    screen("login-ok", false, "none"),
    screen("pricing-ok", false, "none"),
    screen("profile-ok", false, "none"),
    screen("settings-ok", false, "none"),
    screen("login-overlap", true, "overlap"),
    screen("pricing-overlap", true, "overlap"),
    screen("profile-overflow", true, "overflow"),
    screen("settings-overflow", true, "overflow"),
    screen("profile-missing-image", true, "missing_image"),
    screen("product-missing-image", true, "missing_image"),
    screen("pricing-low-contrast", true, "contrast"),
    screen("login-low-contrast", true, "contrast"),
  ],
};
