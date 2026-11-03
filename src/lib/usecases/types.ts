import type { Question } from "../types";

// A benchmark item. Images are paths under /public, turned into data URLs in
// the browser before sending. Labels use the same option keys as answers:
// option names for choice, "yes"/"no" for noul, level indices for score.
export type BenchItem = {
  id: string;
  text: string;
  images?: string[];
  labels: Record<string, string>;
};

export type UseCase = {
  id: string;
  title: string;
  audience: "developers" | "everyone" | "both";
  blurb: string;
  questions: Record<string, Question>;
  items: BenchItem[];
};
