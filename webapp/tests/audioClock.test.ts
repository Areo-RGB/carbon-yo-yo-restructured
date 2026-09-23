import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtocol, getStartLevelOptions } from '../src/lib/domain/protocol.ts';
import {
  mediaElapsedFromProtocolMs
} from '../src/lib/domain/audioTimeline.ts';

test('trimmed Yo-Yo audio starts at the first protocol beep', () => {
  assert.equal(mediaElapsedFromProtocolMs('yoyoIR1', 0), 0);
});

test('selected Yo-Yo level seeks to its matching audio cue', () => {
  const level12 = getStartLevelOptions(getProtocol('yoyoIR1')).find(
    (option) => option.speedLevel === 12
  );

  assert.ok(level12);
  assert.equal(mediaElapsedFromProtocolMs('yoyoIR1', level12.startElapsedMs), level12.startElapsedMs);
});

test('trimmed Yo-Yo IR2 audio starts at the first protocol beep', () => {
  assert.equal(mediaElapsedFromProtocolMs('yoyoIR2', 0), 0);
});

test('trimmed Beep Test audio starts at the first protocol beep', () => {
  assert.equal(mediaElapsedFromProtocolMs('beepTest', 0), 0);
});
