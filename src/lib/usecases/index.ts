import { apartmentFit } from "./apartment-fit";
import { issueTriage } from "./issue-triage";
import { prGate } from "./pr-gate";
import { scamCheck } from "./scam-check";
import { screenshotJudge } from "./screenshot-judge";
import type { UseCase } from "./types";

export const USE_CASES: UseCase[] = [issueTriage, prGate, scamCheck, screenshotJudge, apartmentFit];

export function getUseCase(id: string): UseCase {
  return USE_CASES.find((u) => u.id === id) ?? USE_CASES[0];
}

export type { BenchItem, UseCase } from "./types";
