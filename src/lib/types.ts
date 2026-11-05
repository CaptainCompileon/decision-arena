// One decision format shared by both models. It mirrors Baseten's System One
// API, so elephant-1 requests pass through untouched and the challenger
// adapter translates to and from it.

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>; // option name -> description
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[]; // ordered levels, lowest first
};

export type Question = ChoiceQuestion | NoulQuestion | ScoreQuestion;

export type ImagePart = { type: "image_url"; image_url: { url: string } };
export type TextPart = { type: "text"; text: string };

// Either plain text or a single user message with text and images.
export type DecisionState = string | { text: string; images: string[] };

export type DecisionRequest = {
  state: DecisionState;
  questions: Record<string, Question>;
};

// Every answer is reduced to a probability per option. For noul the options
// are "yes" and "no"; for score they are the level indices as strings.
export type Answer = {
  type: Question["type"];
  probabilities: Record<string, number>;
  pick: string; // the most likely option
  confidence: number; // probability of the pick
};

// "local" is the same elephant-1, quantized to 4 bits and run on this Mac with MLX.
export type ModelId = "elephant" | "local" | "challenger";

export type DecisionResult = {
  model: ModelId;
  answers: Record<string, Answer>;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number;
  reason?: string; // only the challenger can explain itself
  error?: string;
};

// A self-hosted elephant-1 server: the MLX port on a Mac, or llama.cpp with
// the decision GGUF on an NVIDIA (or other) GPU.
export type LocalBackend = {
  kind: "mlx" | "llama.cpp";
  label: string;
  images: boolean;
};

export type ChallengerConfig = {
  provider: ChallengerProviderId;
  model: string;
};

export type ChallengerProviderId = "opencode-go" | "deepseek" | "openrouter";
