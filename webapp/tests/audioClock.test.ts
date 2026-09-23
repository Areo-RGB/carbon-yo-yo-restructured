import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtocol, getStartLevelOptions } from '../src/lib/domain/protocol.ts';
import {
  BEEP_TEST_OFFSET_MS,
  YOYO_TEST_OFFSET_MS,
  audioPositionForProtocolElapsed
} from '../src/lib/services/audioTiming.ts';

test('Yo-Yo audio starts at the first protocol beep after its spoken intro', () => {
  assert.equal(YOYO_TEST_OFFSET_MS, 11_947);
  assert.equal(audioPositionForProtocolElapsed('yoyoIR1', 0), 11_947);
});

test('selected Yo-Yo level seeks to its matching audio cue', () => {
  const level12 = getStartLevelOptions(getProtocol('yoyoIR1')).find(
    (option) => option.speedLevel === 12
  );

  assert.ok(level12);
  assert.equal(audioPositionForProtocolElapsed('yoyoIR1', level12.startElapsedMs), 100_501);
});

test('Beep Test keeps its existing intro offset', () => {
  assert.equal(audioPositionForProtocolElapsed('beepTest', 0), BEEP_TEST_OFFSET_MS);
});
