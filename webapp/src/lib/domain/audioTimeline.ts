import type { TestType } from './protocol.ts';

function safeElapsedMs(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function protocolElapsedFromMediaMs(_type: TestType, mediaMs: number): number {
  return safeElapsedMs(mediaMs);
}

export function mediaElapsedFromProtocolMs(_type: TestType, protocolMs: number): number {
  return safeElapsedMs(protocolMs);
}
