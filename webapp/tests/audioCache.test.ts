import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_CONFIGS,
  BEEP_LOCAL_PATH,
  YOYO_IR2_LOCAL_PATH,
  YOYO_LOCAL_PATH,
  beepCacheStore,
  checkAudioCached,
  clearAudioCache,
  yoyoCacheStore,
  yoyoIR2CacheStore,
  type AudioCacheState
} from '../src/lib/services/audioCache.ts';

function mediaDurationSeconds(filePath: string): number {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return Number(result.stdout.trim());
}

test('audio configs use only bundled app assets', () => {
  assert.equal(YOYO_LOCAL_PATH, './assets/audio/yoyo.m4a');
  assert.equal(YOYO_IR2_LOCAL_PATH, './assets/audio/yoyo_ir2.mp3');
  assert.equal(BEEP_LOCAL_PATH, './assets/audio/beep_test.m4a');

  for (const config of Object.values(AUDIO_CONFIGS)) {
    assert.match(config.localPath, /^\.\/assets\/audio\/.+\.(?:m4a|mp3)$/);
    assert.equal('remoteUrl' in config, false);
    assert.equal('fallbackPath' in config, false);
  }
});

test('Yo-Yo and Beep Test audio are bundled and trimmed in public/assets/audio', () => {
  const yoyoPath = path.resolve(process.cwd(), 'public/assets/audio/yoyo.m4a');
  assert.ok(fs.existsSync(yoyoPath), 'public/assets/audio/yoyo.m4a must exist');
  const yoyoStat = fs.statSync(yoyoPath);
  assert.ok(yoyoStat.size > 25_000_000, `Yo-Yo audio should remain high quality, was ${yoyoStat.size} bytes`);
  assert.ok(yoyoStat.size < 28_084_810, `Yo-Yo audio should exclude its leading padding, was ${yoyoStat.size} bytes`);
  const yoyoDuration = mediaDurationSeconds(yoyoPath);
  assert.ok(yoyoDuration > 1_735.5, `Yo-Yo audio should retain its opening protocol cues, was ${yoyoDuration}s`);
  assert.ok(yoyoDuration < 1_736.53, `Yo-Yo audio should exclude only leading padding, was ${yoyoDuration}s`);

  const beepPath = path.resolve(process.cwd(), 'public/assets/audio/beep_test.m4a');
  assert.ok(fs.existsSync(beepPath), 'public/assets/audio/beep_test.m4a must exist');
  const beepStat = fs.statSync(beepPath);
  assert.ok(beepStat.size > 20_000_000, `Beep audio should remain high quality, was ${beepStat.size} bytes`);
  assert.ok(beepStat.size < 21_678_955, `Beep audio should exclude its spoken intro, was ${beepStat.size} bytes`);

  const yoyoIR2Path = path.resolve(process.cwd(), 'public/assets/audio/yoyo_ir2.mp3');
  assert.ok(fs.existsSync(yoyoIR2Path), 'public/assets/audio/yoyo_ir2.mp3 must exist');
  const yoyoIR2Stat = fs.statSync(yoyoIR2Path);
  assert.ok(yoyoIR2Stat.size > 28_000_000, `Yo-Yo IR2 audio should remain high quality, was ${yoyoIR2Stat.size} bytes`);
  assert.ok(yoyoIR2Stat.size < 28_800_000, `Yo-Yo IR2 audio should use the supplied bundled file, was ${yoyoIR2Stat.size} bytes`);
  const yoyoIR2Duration = mediaDurationSeconds(yoyoIR2Path);
  assert.ok(yoyoIR2Duration > 1_197.5, `Yo-Yo IR2 audio should retain the full protocol, was ${yoyoIR2Duration}s`);
  assert.ok(yoyoIR2Duration < 1_198, `Yo-Yo IR2 audio should not include extra leading media, was ${yoyoIR2Duration}s`);
});

test('audio cache stores initialize cleanly and safe functions execute without errors in non-browser environments', async () => {
  const isYoyoCached = await checkAudioCached('yoyoIR1');
  assert.equal(typeof isYoyoCached, 'boolean');

  const isYoyoIR2Cached = await checkAudioCached('yoyoIR2');
  assert.equal(typeof isYoyoIR2Cached, 'boolean');

  const isBeepCached = await checkAudioCached('beepTest');
  assert.equal(typeof isBeepCached, 'boolean');

  await clearAudioCache();
  let yoyoSnapshot: AudioCacheState | undefined;
  const unsubYoyo = yoyoCacheStore.subscribe((s) => (yoyoSnapshot = s));
  unsubYoyo();
  assert.equal(yoyoSnapshot?.status, 'idle');

  let yoyoIR2Snapshot: AudioCacheState | undefined;
  const unsubYoyoIR2 = yoyoIR2CacheStore.subscribe((s) => (yoyoIR2Snapshot = s));
  unsubYoyoIR2();
  assert.equal(yoyoIR2Snapshot?.status, 'idle');

  let beepSnapshot: AudioCacheState | undefined;
  const unsubBeep = beepCacheStore.subscribe((s) => (beepSnapshot = s));
  unsubBeep();
  assert.equal(beepSnapshot?.status, 'idle');
});
