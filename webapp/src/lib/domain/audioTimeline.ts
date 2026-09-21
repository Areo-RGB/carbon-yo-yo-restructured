import type { TestType } from './protocol.ts';

/**
 * Offset between the bundled Beep Test media timeline and protocol time.
 * Level 1 Shuttle 1 starts at audio 00:01.215. The following cue is at
 * 00:10.215, exactly one 9-second shuttle later.
 */
export const BEEP_TEST_OFFSET_MS = 1_215;

export function protocolElapsedFromMediaMs(type: TestType, mediaMs: number): number {
  const safeMediaMs = Number.isFinite(mediaMs) ? Math.max(0, mediaMs) : 0;
  return type === 'beepTest'
    ? Math.max(0, safeMediaMs - BEEP_TEST_OFFSET_MS)
    : safeMediaMs;
}

export function mediaElapsedFromProtocolMs(type: TestType, protocolMs: number): number {
  const safeProtocolMs = Number.isFinite(protocolMs) ? Math.max(0, protocolMs) : 0;
  return type === 'beepTest'
    ? safeProtocolMs + BEEP_TEST_OFFSET_MS
    : safeProtocolMs;
}
