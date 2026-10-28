/**
 * expo-speech-recognition wrapper. The native module only exists in a dev build, not
 * Expo Go, so it is loaded lazily and `available` is false when it can't be used.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type SpeechModule = typeof import('expo-speech-recognition');

let speech: SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  speech = require('expo-speech-recognition') as SpeechModule;
} catch {
  speech = null;
}

function checkAvailable(): boolean {
  if (!speech) return false;
  try {
    return speech.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export async function requestSpeechPermissions(): Promise<boolean> {
  if (!speech) return false;
  try {
    const res = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export interface SpeechToText {
  transcript: string;
  listening: boolean;
  start: () => Promise<void>;
  stop: () => void;
  available: boolean;
  error: string | null;
}

export function useSpeechToText(): SpeechToText {
  const [available] = useState(checkAvailable);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Android delivers finalized segments; iOS delivers the running session text. */
  const committed = useRef('');

  useEffect(() => {
    if (!speech || !available) return;
    const mod = speech.ExpoSpeechRecognitionModule;
    const subs = [
      mod.addListener('start', () => setListening(true)),
      mod.addListener('end', () => setListening(false)),
      mod.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        if (Platform.OS === 'android') {
          if (e.isFinal) {
            committed.current = `${committed.current} ${text}`.trim();
            setTranscript(committed.current);
          } else {
            setTranscript(`${committed.current} ${text}`.trim());
          }
        } else {
          setTranscript(text);
        }
      }),
      mod.addListener('error', (e) => {
        setListening(false);
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        setError(
          e.error === 'not-allowed'
            ? 'Microphone or speech recognition access is off. Enable it in Settings, or type instead.'
            : e.message || 'Voice input failed. You can type instead.'
        );
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      try {
        mod.abort();
      } catch {}
    };
  }, [available]);

  const start = useCallback(async () => {
    if (!speech || !available) return;
    setError(null);
    const granted = await requestSpeechPermissions();
    if (!granted) {
      setError('Microphone or speech recognition access is off. Enable it in Settings, or type instead.');
      return;
    }
    committed.current = '';
    setTranscript('');
    try {
      speech.ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start voice input.');
    }
  }, [available]);

  const stop = useCallback(() => {
    try {
      speech?.ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  return { transcript, listening, start, stop, available, error };
}
