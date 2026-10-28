import type { Units } from '@/core/types';

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;

export function weightUnitLabel(units: Units): 'kg' | 'lb' {
  return units === 'imperial' ? 'lb' : 'kg';
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Input text for a number with at most one decimal, e.g. "67.6", "149", "175". */
export function formatInput(n: number): string {
  return String(round1(n));
}

/** Display string for a stored weight in kilograms, e.g. "67.6 kg" or "149.0 lb". */
export function formatWeight(kg: number, units: Units): string {
  return `${round1(kgToUnits(kg, units)).toFixed(1)} ${weightUnitLabel(units)}`;
}

/** Stored kilograms expressed in the given display units (unrounded). */
export function kgToUnits(kg: number, units: Units): number {
  return units === 'imperial' ? kg / KG_PER_LB : kg;
}

/** A value typed in the given display units converted to kilograms (unrounded). */
export function unitsToKg(value: number, units: Units): number {
  return units === 'imperial' ? value * KG_PER_LB : value;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = round1(totalInches - feet * 12);
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

const NUMBER_PATTERN = /^(\d+(\.\d*)?|\.\d+)$/;

/**
 * Parses typed decimal text. Returns null for empty or malformed input.
 * Accepts a comma as decimal separator. Negative numbers are rejected here.
 */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!NUMBER_PATTERN.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
