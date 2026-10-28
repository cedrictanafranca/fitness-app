/**
 * Manual exercise logging (PRD §6, Phase 3 groundwork): a deterministic calories-burned
 * estimate from MET values. Apple Health stays the source of truth when it arrives; this is
 * for workouts the user logs by hand, and the result is always labeled an estimate.
 */

export type ActivityKind = 'run' | 'walk' | 'cycle' | 'weights' | 'other';
export type Intensity = 'low' | 'medium' | 'high';

export interface ActivityKindInfo {
  kind: ActivityKind;
  label: string;
  description: string;
  /** Metabolic equivalents by intensity (Compendium of Physical Activities, rounded). */
  met: Record<Intensity, number>;
}

export const ACTIVITY_KINDS: readonly ActivityKindInfo[] = [
  { kind: 'run', label: 'Run', description: 'Running, jogging, sprinting', met: { low: 6, medium: 9.8, high: 12.3 } },
  { kind: 'walk', label: 'Walk', description: 'Casual to brisk walking', met: { low: 2.8, medium: 3.5, high: 5 } },
  { kind: 'cycle', label: 'Cycling', description: 'Road, indoor or commute', met: { low: 4, medium: 6.8, high: 10 } },
  { kind: 'weights', label: 'Weight lifting', description: 'Machines, free weights', met: { low: 3, medium: 5, high: 6 } },
  { kind: 'other', label: 'Other', description: 'Sports, classes, chores', met: { low: 3, medium: 5, high: 8 } },
];

export const INTENSITIES: readonly { value: Intensity; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'Not breaking a sweat, easy effort' },
  { value: 'medium', label: 'Medium', hint: 'Breaking a sweat, can still talk' },
  { value: 'high', label: 'High', hint: 'Breathing heavily, near your limit' },
];

export const DURATION_PRESETS_MIN = [15, 30, 60, 90] as const;

export function activityInfo(kind: ActivityKind): ActivityKindInfo {
  return ACTIVITY_KINDS.find((a) => a.kind === kind) ?? ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1];
}

/** kcal ≈ MET × kg × hours. Rounded to the nearest 5 kcal: anything finer is false precision. */
export function estimateCaloriesBurned(input: {
  kind: ActivityKind;
  intensity: Intensity;
  minutes: number;
  weightKg: number;
}): number {
  const { kind, intensity, minutes, weightKg } = input;
  if (!Number.isFinite(minutes) || minutes <= 0) throw new RangeError(`minutes must be positive, got ${minutes}`);
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new RangeError(`weightKg must be positive, got ${weightKg}`);
  const met = activityInfo(kind).met[intensity];
  return Math.max(5, Math.round((met * weightKg * (minutes / 60)) / 5) * 5);
}
