import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BEEP_LOCAL_PATH,
  BEEP_REMOTE_URL,
  YOYO_LOCAL_PATH,
  YOYO_REMOTE_URL,
  beepCacheStore,
  checkAudioCached,
  clearAudioCache,
  yoyoCacheStore,
  type AudioCacheState
} from '../src/lib/services/audioCache.ts';

test('Remote URLs match the specified Cloudflare R2 bucket assets', () => {
  assert.equal(
    YOYO_REMOTE_URL,
    'https://pub-7c85e81a76e54ba9ad1dd7277f5a1013.r2.dev/yoyo.m4a'
  );
  assert.equal(YOYO_LOCAL_PATH, './assets/audio/yoyo.m4a');
  assert.equal(
    BEEP_REMOTE_URL,
    'https://pub-7c85e81a76e54ba9ad1dd7277f5a1013.r2.dev/beep_test.m4a'
  );
  assert.equal(BEEP_LOCAL_PATH, './assets/audio/beep_test.m4a');
});

test('Yo-Yo and Beep Test audio are bundled in public/assets/audio with valid sizes', () => {
  const yoyoPath = path.resolve(process.cwd(), 'public/assets/audio/yoyo.m4a');
  assert.ok(fs.existsSync(yoyoPath), 'public/assets/audio/yoyo.m4a must exist');
  const yoyoStat = fs.statSync(yoyoPath);
  assert.ok(yoyoStat.size > 25_000_000, `Yo-Yo audio should be ~28MB, was ${yoyoStat.size} bytes`);

  const beepPath = path.resolve(process.cwd(), 'public/assets/audio/beep_test.m4a');
  assert.ok(fs.existsSync(beepPath), 'public/assets/audio/beep_test.m4a must exist');
  const beepStat = fs.statSync(beepPath);
  assert.ok(beepStat.size > 20_000_000, `Beep audio should be ~21MB, was ${beepStat.size} bytes`);
});

test('audio cache stores initialize cleanly and safe functions execute without errors in non-browser environments', async () => {
  const isYoyoCached = await checkAudioCached('yoyoIR1');
  assert.equal(typeof isYoyoCached, 'boolean');

  const isBeepCached = await checkAudioCached('beepTest');
  assert.equal(typeof isBeepCached, 'boolean');

  await clearAudioCache();
  let yoyoSnapshot: AudioCacheState | undefined;
  const unsubYoyo = yoyoCacheStore.subscribe((s) => (yoyoSnapshot = s));
  unsubYoyo();
  assert.equal(yoyoSnapshot?.status, 'idle');

  let beepSnapshot: AudioCacheState | undefined;
  const unsubBeep = beepCacheStore.subscribe((s) => (beepSnapshot = s));
  unsubBeep();
  assert.equal(beepSnapshot?.status, 'idle');
});
