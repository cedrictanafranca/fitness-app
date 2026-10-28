import { useCallback, useEffect, useState } from 'react';

import type { Units, UserProfile } from '@/core/types';
import { profileRepo } from '@/data/repos';

import {
  buildProfilePatch,
  convertDraftUnits,
  draftFromProfile,
  validateDraft,
  type DraftErrors,
  type SetDraftField,
  type SettingsDraft,
} from './draft';

const SAVED_BADGE_MS = 2000;

/**
 * Owns the editable settings draft. The draft is re-seeded whenever a new profile arrives
 * (initial load, after a save, or after a data reset), so unsaved edits never outlive a save.
 */
export function useSettingsForm(profile: UserProfile | undefined) {
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [draftSource, setDraftSource] = useState<UserProfile | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-seed during render when the profile object changes (the React-recommended pattern
  // for resetting state from a prop, avoiding an extra effect pass).
  if (profile && profile !== draftSource) {
    setDraftSource(profile);
    setDraft(draftFromProfile(profile));
  }

  useEffect(() => {
    if (savedAt == null) return;
    const timer = setTimeout(() => setSavedAt(null), SAVED_BADGE_MS);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const errors: DraftErrors = draft ? validateDraft(draft) : {};
  const hasErrors = Object.keys(errors).length > 0;
  const patch = draft && profile && !hasErrors ? buildProfilePatch(draft, profile) : null;
  const dirty = patch != null && Object.keys(patch).length > 0;
  const canSave = dirty && !saving;

  const setField = useCallback<SetDraftField>((key, value) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  const setUnits = useCallback((units: Units) => {
    setDraft((d) => (d ? convertDraftUnits(d, units) : d));
  }, []);

  const save = useCallback(async () => {
    if (!patch || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await profileRepo.save(patch);
      setSavedAt(Date.now());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }, [patch, canSave]);

  return {
    draft,
    errors,
    hasErrors,
    dirty,
    canSave,
    saving,
    saveError,
    saved: savedAt != null,
    setField,
    setUnits,
    save,
  };
}
