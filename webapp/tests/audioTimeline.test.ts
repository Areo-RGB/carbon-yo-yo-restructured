import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaElapsedFromProtocolMs, protocolElapsedFromMediaMs } from '../src/lib/domain/audioTimeline.ts';

test('trimmed media starts protocol time at zero for both protocols', () => {
  assert.equal(protocolElapsedFromMediaMs('beepTest', 0), 0);
  assert.equal(protocolElapsedFromMediaMs('beepTest', 9_000), 9_000);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 0), 0);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 9_000), 9_000);
});

test('audio and protocol timeline conversion round-trips', () => {
  assert.equal(mediaElapsedFromProtocolMs('beepTest', 9_000), 9_000);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 0), 0);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 9_000), 9_000);
  assert.equal(mediaElapsedFromProtocolMs('yoyoIR1', 9_000), 9_000);
});
