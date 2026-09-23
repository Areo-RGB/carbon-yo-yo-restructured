import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEEP_TEST_OFFSET_MS,
  mediaElapsedFromProtocolMs,
  protocolElapsedFromMediaMs
} from '../src/lib/domain/audioTimeline.ts';

test('Beep Test media starts protocol time on the first Level 1 cue', () => {
  assert.equal(BEEP_TEST_OFFSET_MS, 1_215);
  assert.equal(protocolElapsedFromMediaMs('beepTest', 1_214), 0);
  assert.equal(protocolElapsedFromMediaMs('beepTest', 1_215), 0);
  assert.equal(protocolElapsedFromMediaMs('beepTest', 10_215), 9_000);
});

test('audio and protocol timeline conversion round-trips', () => {
  assert.equal(mediaElapsedFromProtocolMs('beepTest', 9_000), 10_215);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 11_946), 0);
  assert.equal(protocolElapsedFromMediaMs('yoyoIR1', 20_947), 9_000);
  assert.equal(mediaElapsedFromProtocolMs('yoyoIR1', 9_000), 20_947);
});
