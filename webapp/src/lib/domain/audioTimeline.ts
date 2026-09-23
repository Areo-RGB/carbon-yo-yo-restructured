import type { TestType } from './protocol.ts';

/**
 * Media intro offsets between each bundled recording and protocol time.
 * Beep Test Level 1 Shuttle 1 starts at audio 00:01.215. The Yo-Yo
 * recording's first Level 5 cue follows its 11.9465-second spoken intro.
 */
export const BEEP_TEST_OFFSET_MS = 1_215;
export const YOYO_TEST_OFFSET_MS = 11_947;

export function protocolElapsedFromMediaMs(type: TestType, mediaMs: number): number {
  const safeMediaMs = Number.isFinite(mediaMs) ? Math.max(0, mediaMs) : 0;
  const offsetMs = type === 'beepTest' ? BEEP_TEST_OFFSET_MS : YOYO_TEST_OFFSET_MS;
  return Math.max(0, safeMediaMs - offsetMs);
}

export function mediaElapsedFromProtocolMs(type: TestType, protocolMs: number): number {
  const safeProtocolMs = Number.isFinite(protocolMs) ? Math.max(0, protocolMs) : 0;
  const offsetMs = type === 'beepTest' ? BEEP_TEST_OFFSET_MS : YOYO_TEST_OFFSET_MS;
  return safeProtocolMs + offsetMs;
}
