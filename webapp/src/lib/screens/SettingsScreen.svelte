<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Button,
    InlineNotification,
    ProgressBar,
    Slider,
    Tag,
    Tile,
    Toggle
  } from 'carbon-components-svelte';
  import ScreenTitle from '$lib/components/ScreenTitle.svelte';
  import {
    beepCacheStore,
    loadAndCacheBeepAudio,
    loadAndCacheYoYoAudio,
    loadAndCacheYoYoIR2Audio,
    yoyoCacheStore,
    yoyoIR2CacheStore
  } from '$lib/services/audioCache.ts';
  import {
    boostEnabled,
    setBoostEnabled,
    setSoundEnabled,
    setVolumeBoost,
    soundEnabled,
    volumeBoost
  } from '$lib/state/testStore.ts';

  interface VendorDocument extends Document {
    webkitFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  }

  interface VendorHTMLElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
  }

  let isFullscreen = $state(false);
  let fullscreenSupported = $state(true);
  let fullscreenError = $state('');

  onMount(() => {
    const doc = typeof document !== 'undefined' ? (document as VendorDocument) : null;
    fullscreenSupported =
      Boolean(doc && (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true));

    const updateStatus = () => {
      if (!doc) return;
      isFullscreen = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (isFullscreen) {
        fullscreenError = '';
      }
    };

    updateStatus();

    document.addEventListener('fullscreenchange', updateStatus);
    document.addEventListener('webkitfullscreenchange', updateStatus);

    return () => {
      document.removeEventListener('fullscreenchange', updateStatus);
      document.removeEventListener('webkitfullscreenchange', updateStatus);
    };
  });

  async function handleToggleFullscreen(enable: boolean) {
    fullscreenError = '';
    const doc = typeof document !== 'undefined' ? (document as VendorDocument) : null;
    if (!doc) return;

    try {
      if (enable) {
        if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
          const el = doc.documentElement as VendorHTMLElement;
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          } else {
            throw new Error('Fullscreen API is not supported in this browser.');
          }
        }
      } else {
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          }
        }
      }
    } catch {
      isFullscreen = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      fullscreenError =
        'Fullscreen request was blocked or not allowed in this window. If viewing in an embedded frame, open the app in a new tab.';
    }
  }
</script>

<section class="screen">
  <ScreenTitle eyebrow="Configuration" title="Settings" description="Display, audio and preferences." />

  <Tile class="section-gap">
    <div class="setting-stack">
      <Toggle
        labelText="Fullscreen mode"
        toggled={isFullscreen}
        disabled={!fullscreenSupported}
        on:toggle={(e) => handleToggleFullscreen(e.detail.toggled)}
      />
      <p class="setting-hint">Expand the tracker to fill the entire display during testing.</p>
      {#if fullscreenError}
        <InlineNotification
          kind="warning"
          title="Fullscreen unavailable"
          subtitle={fullscreenError}
          lowContrast
          hideCloseButton
        />
      {/if}
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <Toggle
        labelText="Sound cues"
        toggled={$soundEnabled}
        on:toggle={(e) => setSoundEnabled(e.detail.toggled)}
      />
      <p class="setting-hint">Muting changes gain only — the protocol clock keeps running.</p>
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <Toggle
        labelText="Audio volume boost"
        toggled={$boostEnabled}
        on:toggle={(e) => setBoostEnabled(e.detail.toggled)}
      />
      {#if $boostEnabled}
        <Slider
          labelText="Boost level"
          min={1}
          max={3}
          step={0.5}
          value={$volumeBoost}
          on:change={(e) => setVolumeBoost(e.detail)}
        />
        <p class="setting-hint">{Math.round($volumeBoost * 100)}%</p>
      {/if}
      {#if $boostEnabled && $volumeBoost > 2}
        <InlineNotification
          kind="warning"
          title="High gain"
          subtitle="High gain can distort on some devices or speakers."
        />
      {/if}
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div>
          <strong style="font-size: 0.95rem;">Yo-Yo IR1 Protocol Audio</strong>
          <p class="setting-hint" style="margin-top: 0.25rem;">
            Bundled in the app and cached locally for faster repeat starts.
          </p>
        </div>
        {#if $yoyoCacheStore.status === 'ready'}
          <Tag type="green">Cached ({($yoyoCacheStore.sizeBytes / (1024 * 1024)).toFixed(1)} MB)</Tag>
        {:else if $yoyoCacheStore.status === 'downloading'}
          <Tag type="blue">Downloading ({$yoyoCacheStore.progressPercent}%)</Tag>
        {:else if $yoyoCacheStore.status === 'error'}
          <Tag type="red">Error</Tag>
        {:else}
          <Tag type="cool-gray">Offline Ready</Tag>
        {/if}
      </div>

      {#if $yoyoCacheStore.status === 'downloading'}
        <ProgressBar
          value={$yoyoCacheStore.progressPercent}
          max={100}
          labelText="Caching bundled Yo-Yo audio..."
          helperText="Caching to browser storage for instant, offline playback"
        />
      {/if}

      {#if $yoyoCacheStore.error}
        <InlineNotification
          kind="error"
          title="Yo-Yo Audio Cache Status"
          subtitle={$yoyoCacheStore.error}
          lowContrast
        />
      {/if}

      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
        <Button
          size="small"
          kind="tertiary"
          disabled={$yoyoCacheStore.status === 'downloading'}
          on:click={() => void loadAndCacheYoYoAudio()}
        >
          {$yoyoCacheStore.status === 'ready' ? 'Re-cache bundled audio' : 'Cache bundled audio'}
        </Button>
      </div>
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div>
          <strong style="font-size: 0.95rem;">Yo-Yo IR2 Protocol Audio</strong>
          <p class="setting-hint" style="margin-top: 0.25rem;">
            Bundled in the app and cached locally for faster repeat starts.
          </p>
        </div>
        {#if $yoyoIR2CacheStore.status === 'ready'}
          <Tag type="green">Cached ({($yoyoIR2CacheStore.sizeBytes / (1024 * 1024)).toFixed(1)} MB)</Tag>
        {:else if $yoyoIR2CacheStore.status === 'downloading'}
          <Tag type="blue">Downloading ({$yoyoIR2CacheStore.progressPercent}%)</Tag>
        {:else if $yoyoIR2CacheStore.status === 'error'}
          <Tag type="red">Error</Tag>
        {:else}
          <Tag type="cool-gray">Offline Ready</Tag>
        {/if}
      </div>

      {#if $yoyoIR2CacheStore.status === 'downloading'}
        <ProgressBar
          value={$yoyoIR2CacheStore.progressPercent}
          max={100}
          labelText="Caching bundled Yo-Yo IR2 audio..."
          helperText="Caching to browser storage for instant, offline playback"
        />
      {/if}

      {#if $yoyoIR2CacheStore.error}
        <InlineNotification
          kind="error"
          title="Yo-Yo IR2 Audio Cache Status"
          subtitle={$yoyoIR2CacheStore.error}
          lowContrast
        />
      {/if}

      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
        <Button
          size="small"
          kind="tertiary"
          disabled={$yoyoIR2CacheStore.status === 'downloading'}
          on:click={() => void loadAndCacheYoYoIR2Audio()}
        >
          {$yoyoIR2CacheStore.status === 'ready' ? 'Re-cache bundled audio' : 'Cache bundled audio'}
        </Button>
      </div>
    </div>
  </Tile>

  <Tile class="section-gap">
    <div class="setting-stack">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div>
          <strong style="font-size: 0.95rem;">Beep Test Protocol Audio</strong>
          <p class="setting-hint" style="margin-top: 0.25rem;">
            Bundled in the app and cached locally for faster repeat starts.
          </p>
        </div>
        {#if $beepCacheStore.status === 'ready'}
          <Tag type="green">Cached ({($beepCacheStore.sizeBytes / (1024 * 1024)).toFixed(1)} MB)</Tag>
        {:else if $beepCacheStore.status === 'downloading'}
          <Tag type="blue">Downloading ({$beepCacheStore.progressPercent}%)</Tag>
        {:else if $beepCacheStore.status === 'error'}
          <Tag type="red">Error</Tag>
        {:else}
          <Tag type="cool-gray">Offline Ready</Tag>
        {/if}
      </div>

      {#if $beepCacheStore.status === 'downloading'}
        <ProgressBar
          value={$beepCacheStore.progressPercent}
          max={100}
          labelText="Caching bundled Beep Test audio..."
          helperText="Caching to browser storage for instant, offline playback"
        />
      {/if}

      {#if $beepCacheStore.error}
        <InlineNotification
          kind="error"
          title="Beep Test Audio Cache Status"
          subtitle={$beepCacheStore.error}
          lowContrast
        />
      {/if}

      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
        <Button
          size="small"
          kind="tertiary"
          disabled={$beepCacheStore.status === 'downloading'}
          on:click={() => void loadAndCacheBeepAudio()}
        >
          {$beepCacheStore.status === 'ready' ? 'Re-cache bundled audio' : 'Cache bundled audio'}
        </Button>
      </div>
    </div>
  </Tile>
</section>
