import type { FitnessGoal, Units, UserProfile } from '@/core/types';

import {
  cmToFeetInches,
  feetInchesToCm,
  formatInput,
  kgToUnits,
  parseNumber,
  unitsToKg,
} from './units';

/** Form state as typed. Numeric fields stay as strings so partial input such as "67." survives. */
export interface SettingsDraft {
  units: Units;
  /** Height in centimetres, used when units are metric. */
  heightCm: string;
  /** Height feet component, used when units are imperial. */
  heightFt: string;
  /** Height inches component (0 to 11.9), used when units are imperial. */
  heightIn: string;
  /** Body weight in the units selected above (kg or lb). */
  weight: string;
  age: string;
  goal: FitnessGoal;
  calorieTarget: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
  activityCreditEnabled: boolean;
  activityCreditPercent: number;
}

export type DraftField = keyof SettingsDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;
export type SetDraftField = <K extends DraftField>(key: K, value: SettingsDraft[K]) => void;
export type ProfilePatch = Partial<Omit<UserProfile, 'id' | 'updatedAt'>>;

const POSITIVE_MESSAGE = 'Enter a number greater than 0';

export function draftFromProfile(p: UserProfile): SettingsDraft {
  const { feet, inches } = cmToFeetInches(p.heightCm);
  return {
    units: p.units,
    heightCm: formatInput(p.heightCm),
    heightFt: String(feet),
    heightIn: formatInput(inches),
    weight: formatInput(kgToUnits(p.weightKg, p.units)),
    age: p.age == null ? '' : String(p.age),
    goal: p.goal,
    calorieTarget: String(p.calorieTarget),
    proteinTarget: String(p.proteinTarget),
    carbTarget: p.carbTarget == null ? '' : String(p.carbTarget),
    fatTarget: p.fatTarget == null ? '' : String(p.fatTarget),
    activityCreditEnabled: p.activityCreditEnabled,
    activityCreditPercent: p.activityCreditPercent,
  };
}

/**
 * Switches the display units and converts the typed values so the user sees the same body
 * measurements in the new units. Invalid height input is cleared so it cannot save a stale value.
 */
export function convertDraftUnits(d: SettingsDraft, to: Units): SettingsDraft {
  if (d.units === to) return d;
  if (to === 'imperial') {
    const cm = parseNumber(d.heightCm);
    const imperial = cm == null ? null : cmToFeetInches(cm);
    return {
      ...d,
      units: to,
      weight: convertWeightText(d.weight, d.units, to),
      heightFt: imperial ? String(imperial.feet) : '',
      heightIn: imperial ? formatInput(imperial.inches) : '',
    };
  }
  const ft = parseNumber(d.heightFt);
  const inches = parseNumber(d.heightIn);
  const cm = ft == null || inches == null ? null : feetInchesToCm(ft, inches);
  return {
    ...d,
    units: to,
    weight: convertWeightText(d.weight, d.units, to),
    heightCm: cm == null ? '' : formatInput(cm),
  };
}

function convertWeightText(text: string, from: Units, to: Units): string {
  const value = parseNumber(text);
  if (value == null) return text;
  return formatInput(kgToUnits(unitsToKg(value, from), to));
}

const isPositive = (text: string) => {
  const n = parseNumber(text);
  return n != null && n > 0;
};

const isPositiveInteger = (text: string) => {
  const n = parseNumber(text);
  return n != null && n > 0 && Number.isInteger(n);
};

const isBlank = (text: string) => text.trim() === '';

export function validateDraft(d: SettingsDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (d.units === 'metric') {
    if (!isPositive(d.heightCm)) errors.heightCm = POSITIVE_MESSAGE;
  } else {
    if (!isPositive(d.heightFt)) errors.heightFt = 'Enter feet greater than 0';
    const inches = parseNumber(d.heightIn);
    if (inches == null || inches >= 12) errors.heightIn = 'Enter inches from 0 to 11.9';
  }
  if (!isPositive(d.weight)) errors.weight = POSITIVE_MESSAGE;
  if (!isBlank(d.age) && !isPositiveInteger(d.age)) errors.age = 'Enter a whole number, e.g. 30';
  if (!isPositive(d.calorieTarget)) errors.calorieTarget = POSITIVE_MESSAGE;
  if (!isPositive(d.proteinTarget)) errors.proteinTarget = POSITIVE_MESSAGE;
  if (!isBlank(d.carbTarget) && !isPositive(d.carbTarget)) errors.carbTarget = POSITIVE_MESSAGE;
  if (!isBlank(d.fatTarget) && !isPositive(d.fatTarget)) errors.fatTarget = POSITIVE_MESSAGE;
  return errors;
}

/** Only call after validateDraft returns no errors. */
export function buildProfilePatch(d: SettingsDraft, profile: UserProfile): ProfilePatch {
  const base = draftFromProfile(profile);
  const patch: ProfilePatch = {};

  if (d.units !== base.units) patch.units = d.units;

  const heightChanged =
    d.units !== base.units ||
    (d.units === 'metric'
      ? d.heightCm !== base.heightCm
      : d.heightFt !== base.heightFt || d.heightIn !== base.heightIn);
  if (heightChanged) patch.heightCm = heightCmOf(d);

  if (d.units !== base.units || d.weight !== base.weight) patch.weightKg = weightKgOf(d);
  if (d.age !== base.age) patch.age = optionalNumber(d.age);
  if (d.goal !== base.goal) patch.goal = d.goal;
  if (d.calorieTarget !== base.calorieTarget) patch.calorieTarget = Math.round(requiredNumber(d.calorieTarget));
  if (d.proteinTarget !== base.proteinTarget) patch.proteinTarget = requiredNumber(d.proteinTarget);
  if (d.carbTarget !== base.carbTarget) patch.carbTarget = optionalNumber(d.carbTarget);
  if (d.fatTarget !== base.fatTarget) patch.fatTarget = optionalNumber(d.fatTarget);
  if (d.activityCreditEnabled !== base.activityCreditEnabled) {
    patch.activityCreditEnabled = d.activityCreditEnabled;
  }
  if (d.activityCreditPercent !== base.activityCreditPercent) {
    patch.activityCreditPercent = d.activityCreditPercent;
  }
  return patch;
}

function heightCmOf(d: SettingsDraft): number {
  const cm =
    d.units === 'metric'
      ? requiredNumber(d.heightCm)
      : feetInchesToCm(requiredNumber(d.heightFt), requiredNumber(d.heightIn));
  return roundTo(cm, 1);
}

function weightKgOf(d: SettingsDraft): number {
  return roundTo(unitsToKg(requiredNumber(d.weight), d.units), 2);
}

/** Only used after validation, so a missing value means a bug; fall back to 0 rather than NaN. */
function requiredNumber(text: string): number {
  return parseNumber(text) ?? 0;
}

function optionalNumber(text: string): number | undefined {
  if (isBlank(text)) return undefined;
  return parseNumber(text) ?? undefined;
}

function roundTo(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
