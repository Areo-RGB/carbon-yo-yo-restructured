export type AudioProtocolType = 'yoyoIR1' | 'beepTest';

/**
 * The bundled Yo-Yo recording contains an 11.9465-second spoken intro before
 * the first Level 5 cue. Rounded to the media clock's millisecond precision.
 */
export const YOYO_TEST_OFFSET_MS = 11_947;

/** The bundled Beep Test recording contains a 10.215-second spoken intro. */
export const BEEP_TEST_OFFSET_MS = 10_215;

export function audioPositionForProtocolElapsed(
  type: AudioProtocolType,
  elapsedMs: number
): number {
  const offsetMs = type === 'yoyoIR1' ? YOYO_TEST_OFFSET_MS : BEEP_TEST_OFFSET_MS;
  return Math.max(0, elapsedMs) + offsetMs;
}

export function protocolElapsedForAudioPosition(
  type: AudioProtocolType,
  audioMs: number
): number {
  const offsetMs = type === 'yoyoIR1' ? YOYO_TEST_OFFSET_MS : BEEP_TEST_OFFSET_MS;
  return Math.max(0, audioMs - offsetMs);
}
