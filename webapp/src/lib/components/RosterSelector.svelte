<script lang="ts">
  import { Button, TextInput, Tile } from 'carbon-components-svelte';
  import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
  import Reset from 'carbon-icons-svelte/lib/Reset.svelte';
  import AthleteAvatar from './AthleteAvatar.svelte';
  import { getAthleteFullName } from '$lib/domain/avatar.ts';
  import { getProtocol, getStartLevelOptions } from '$lib/domain/protocol.ts';
  import { activeTab, selectedTestType } from '$lib/state/app.ts';
  import {
    addAthlete,
    athletes,
    deselectAllAthletes,
    removeAthlete,
    resetRoster,
    selectAllAthletes,
    selectedAthletes,
    selectedYoYoStartLevel,
    setSelectedYoYoStartLevel,
    startTest,
    testState,
    toggleAthleteSelected
  } from '$lib/state/testStore.ts';

  interface Props {
    /** Show the "Back" button returning to the dashboard (roster tab only). */
    showBack?: boolean;
    /** Show the add-athlete tile (hidden on the home tab). */
    showAdd?: boolean;
  }

  let { showBack = false, showAdd = true }: Props = $props();

  let newName = $state('');
  const protocol = $derived(getProtocol($selectedTestType));
  const yoyoStartLevels = getStartLevelOptions(getProtocol('yoyoIR1'));
  const editingLocked = $derived($testState !== 'idle');

  function submit() {
    addAthlete(newName);
    newName = '';
  }

  function handleStartLevelChange(event: Event) {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    setSelectedYoYoStartLevel(value);
  }
</script>

<Tile class="section-gap">
  <div class="button-row">
    <Button size="small" kind="ghost" disabled={editingLocked} on:click={selectAllAthletes}>
      Select all
    </Button>
    <Button size="small" kind="ghost" disabled={editingLocked} on:click={deselectAllAthletes}>
      Clear
    </Button>
    <Button size="small" kind="ghost" icon={Reset} disabled={editingLocked} on:click={resetRoster}>
      Reset squad
    </Button>
  </div>
</Tile>

{#if $selectedTestType === 'yoyoIR1'}
  <Tile class="section-gap start-level-panel">
    <div class="start-level-copy">
      <strong>Starting speed level</strong>
      <p id="yoyo-start-level-help">
        Choose where the Yo-Yo audio should begin. Changing this selection does not play audio;
        press Start when the group is ready.
      </p>
    </div>
    <label class="start-level-control" for="yoyo-start-level">
      <span>Speed (km/h)</span>
      <select
        id="yoyo-start-level"
        value={$selectedYoYoStartLevel}
        aria-describedby="yoyo-start-level-help"
        disabled={editingLocked}
        onchange={handleStartLevelChange}
      >
        {#each yoyoStartLevels as option (option.speedLevel)}
          <option value={option.speedLevel}>{option.label}</option>
        {/each}
      </select>
    </label>
  </Tile>
{/if}

{#if $athletes.length === 0}
  <Tile class="empty-state section-gap">
    <strong>No athletes in roster</strong>
    <p style="margin: 0.5rem 0 1rem; opacity: 0.7;">Add an athlete below or restore the default squad.</p>
    <Button kind="secondary" size="small" icon={Reset} on:click={resetRoster}>Restore default squad</Button>
  </Tile>
{/if}

<div class="roster-list section-gap">
  {#each $athletes as athlete (athlete.id)}
    <Tile class="roster-row{athlete.isSelected ? ' selected' : ''}" light={athlete.isSelected}>
      <div
        class="roster-athlete-info grow"
        role="button"
        tabindex="0"
        aria-pressed={athlete.isSelected}
        aria-disabled={editingLocked}
        onclick={() => !editingLocked && toggleAthleteSelected(athlete.id)}
        onkeydown={(e) => {
          if (!editingLocked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleAthleteSelected(athlete.id);
          }
        }}
      >
        <AthleteAvatar name={athlete.name} size="md" />
        <div class="athlete-meta">
          <strong class="athlete-name">{athlete.name}</strong>
          {#if getAthleteFullName(athlete.name) && getAthleteFullName(athlete.name) !== athlete.name}
            <small class="athlete-fullname">{getAthleteFullName(athlete.name)}</small>
          {/if}
        </div>
      </div>
      {#if !editingLocked}
        <Button
          class="roster-remove-btn"
          kind="danger-ghost"
          size="small"
          tooltipPosition="left"
          iconDescription={`Remove ${athlete.name}`}
          icon={TrashCan}
          on:click={(e) => {
            e.stopPropagation();
            removeAthlete(athlete.id);
          }}
        />
      {/if}
    </Tile>
  {/each}
</div>

{#if showAdd}
  <Tile class="section-gap">
    <div class="add-row">
      <TextInput
        labelText="Add athlete"
        hideLabel
        placeholder="Athlete name (max 40 characters)"
        maxlength={40}
        bind:value={newName}
        on:keydown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <Button kind="secondary" disabled={editingLocked || !newName.trim()} on:click={submit}>
        Add athlete
      </Button>
    </div>
    <p class="protocol-note">
      <strong>Protocol:</strong> {protocol.badges.join(' · ')}. The test clock is
      synchronized to the protocol audio.
    </p>
  </Tile>
{/if}

<div class="start-row">
  {#if showBack}
    <Button kind="secondary" size="lg" on:click={() => activeTab.set('startup')}>
      Back
    </Button>
  {/if}
  <Button
    size="lg"
    disabled={$selectedAthletes.length === 0}
    on:click={() => void startTest()}
  >
    Start [{$selectedAthletes.length}]
  </Button>
</div>
