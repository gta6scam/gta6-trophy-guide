// Leonida Legend — GTA VI trophy guide & tracker.
// Loads the official trophy data from data/trophies.json, renders a filterable
// checklist with a per-trophy guide panel and a five-stage roadmap, and keeps
// the player's earned ticks in localStorage (exportable / importable as JSON).
// Everything runs locally in the browser: no network calls after the data load.

const PROGRESS_KEY = 'leonida-legend-progress-v1';
const SPOILER_KEY = 'leonida-legend-spoiler-v1';
const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_LABELS = {
  story: 'Story',
  collectible: 'Collectible',
  activity: 'Activity',
  online: 'Online',
  misc: 'Misc',
};
const STAGE_INFO = [
  { stage: 1, title: 'Story playthrough', blurb: 'Play the campaign start to finish and enjoy it. The only homework: keep a manual save at each chapter break, and let the choice counter climb as decisions appear.' },
  { stage: 2, title: 'Story cleanup & chapter leftovers', blurb: 'Before and just after the finale, close every stranger strand (Andy, Kenton, Billy, Randy, Tyrone, Bret) and grab the chapter-tied one-offs like the VCIA departure. Everything flagged missable lives here.' },
  { stage: 3, title: 'Collectibles & exploration', blurb: 'Sweep Leonida region by region: meditation spots, card sets, WAiNK locations, vehicle discoveries and every one of the 52 areas. Strange things happen to players who wander.' },
  { stage: 4, title: 'Activities & grinds', blurb: 'The long tail: shooting-range golds, drone races, stunts, challenges, robberies, and the money trophies (laundering, spending, garages). Sample every activity type if you have not already.' },
  { stage: 5, title: 'The platinum', blurb: 'When the counter reads 100%, the gold A Long Road lands — and with all 54 others earned, Vice Got a Price! follows automatically. (This list has no online trophies; if a future list adds them, they belong in stage 4.)' },
];

const trophyListEl = document.getElementById('trophy-list');
const guidePanelEl = document.getElementById('guide-panel');
const roadmapStagesEl = document.getElementById('roadmap-stages');
const resultCountEl = document.getElementById('result-count');
const gradeFilterEl = document.getElementById('grade-filter');
const searchFilterEl = document.getElementById('search-filter');
const hideEarnedEl = document.getElementById('hide-earned');
const spoilerModeEl = document.getElementById('spoiler-mode');

let trophies = [];
let earnedIds = loadEarnedIds();
let activeKind = 'all';
let selectedTrophyId = null;

function loadEarnedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : parsed.earned ?? []);
  } catch {
    return new Set();
  }
}

function saveEarnedIds() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earnedIds]));
}

function isEarned(trophy) {
  return earnedIds.has(trophy.id);
}

function isMaskedBySpoilerMode(trophy) {
  return spoilerModeEl.checked && (trophy.hidden || trophy.kind === 'story') && !isEarned(trophy);
}

function visibleName(trophy) {
  return isMaskedBySpoilerMode(trophy) ? '??? — hidden trophy' : trophy.name;
}

function visibleDescription(trophy) {
  return isMaskedBySpoilerMode(trophy) ? 'Hidden trophy — earn it to reveal its name and description.' : trophy.description;
}

function trophyMatchesFilters(trophy) {
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && trophy.kind !== activeKind) return false;
  if (gradeFilterEl.value !== 'all' && trophy.grade !== gradeFilterEl.value) return false;
  if (hideEarnedEl.checked && isEarned(trophy)) return false;
  const query = searchFilterEl.value.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${KIND_LABELS[trophy.kind]}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function makeBadge(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter(isEarned).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-count').textContent = `${done} of ${total} earned`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
  for (const grade of GRADES) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const doneInGrade = inGrade.filter(isEarned).length;
    document.getElementById(`count-${grade}`).textContent = `${doneInGrade}/${inGrade.length}`;
  }
}

function renderChecklist() {
  trophyListEl.replaceChildren();
  const visible = trophies.filter(trophyMatchesFilters);
  resultCountEl.textContent = visible.length === trophies.length
    ? `Showing all ${trophies.length} trophies. Select one to read its guide.`
    : `Showing ${visible.length} of ${trophies.length} trophies.`;
  if (visible.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = activeKind === 'online'
      ? 'No online trophies: the official PS5 list for GTA VI is entirely offline. If a future list adds online trophies, they will appear here.'
      : 'No trophies match the current filters.';
    trophyListEl.append(note);
    return;
  }
  for (const trophy of visible) {
    const row = document.createElement('li');
    row.className = `trophy-row grade-${trophy.grade}`;
    row.dataset.trophyId = String(trophy.id);
    if (isEarned(trophy)) row.classList.add('is-earned');
    if (trophy.id === selectedTrophyId) row.classList.add('is-selected');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'earned-box';
    box.checked = isEarned(trophy);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      setEarned(trophy, box.checked);
    });

    const main = document.createElement('div');
    main.className = 'trophy-main';
    const line = document.createElement('div');
    line.className = 'trophy-line';
    const name = document.createElement('span');
    name.className = 'trophy-name';
    if (isMaskedBySpoilerMode(trophy)) name.classList.add('is-masked');
    name.textContent = visibleName(trophy);
    line.append(name, makeBadge(`grade-badge grade-${trophy.grade}`, trophy.grade), makeBadge('kind-tag', KIND_LABELS[trophy.kind]));
    if (trophy.missable) line.append(makeBadge('missable-badge', 'Missable'));
    const stage = document.createElement('span');
    stage.className = 'stage-tag';
    stage.textContent = `Stage ${trophy.stage}`;
    line.append(stage);

    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    if (isMaskedBySpoilerMode(trophy)) desc.classList.add('is-masked');
    desc.textContent = visibleDescription(trophy);

    main.append(line, desc);
    row.append(box, main);
    row.addEventListener('click', () => {
      selectedTrophyId = trophy.id;
      renderChecklistSelection();
      renderGuidePanel();
    });
    trophyListEl.append(row);
  }
}

function renderChecklistSelection() {
  for (const row of trophyListEl.querySelectorAll('.trophy-row')) {
    row.classList.toggle('is-selected', Number(row.dataset.trophyId) === selectedTrophyId);
  }
}

function renderGuidePanel() {
  guidePanelEl.replaceChildren();
  const trophy = trophies.find((t) => t.id === selectedTrophyId);
  if (!trophy) {
    const empty = document.createElement('p');
    empty.className = 'guide-empty';
    empty.textContent = 'Select a trophy from the checklist to read its full guide: what to do, where it sits in the roadmap, whether it can be missed, and the sources the guide is built from.';
    guidePanelEl.append(empty);
    return;
  }

  const badges = document.createElement('div');
  badges.className = 'guide-badges';
  badges.append(
    makeBadge(`grade-badge grade-${trophy.grade}`, trophy.grade),
    makeBadge('kind-tag', KIND_LABELS[trophy.kind]),
  );
  if (trophy.missable) badges.append(makeBadge('missable-badge', 'Missable'));
  const stage = document.createElement('span');
  stage.className = 'stage-tag';
  stage.textContent = `Roadmap stage ${trophy.stage} of 5`;
  badges.append(stage);

  const title = document.createElement('h2');
  title.textContent = visibleName(trophy);
  const official = document.createElement('p');
  official.className = 'guide-official';
  official.textContent = `Official description: “${visibleDescription(trophy)}”`;
  guidePanelEl.append(badges, title, official);

  if (isMaskedBySpoilerMode(trophy)) {
    const masked = document.createElement('p');
    masked.className = 'guide-text';
    masked.textContent = 'Spoiler mode is on and this trophy is still hidden. Earn it in game, tick it off here, and its name, description and guide will be revealed.';
    guidePanelEl.append(masked);
    return;
  }

  if (trophy.missable) {
    const warning = document.createElement('p');
    warning.className = 'missable-warning';
    warning.textContent = '⚠ Missable: tied to content the story can move past — finish it in this stage and keep a pre-finale save.';
    guidePanelEl.append(warning);
  }

  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = trophy.guide;
  guidePanelEl.append(guide);

  const sources = document.createElement('div');
  sources.className = 'guide-sources';
  const sourcesTitle = document.createElement('h3');
  sourcesTitle.textContent = 'Sources';
  const list = document.createElement('ul');
  for (const source of trophy.sources) {
    const item = document.createElement('li');
    if (source.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.label;
      link.rel = 'noopener';
      item.append(link);
    } else {
      item.textContent = source.label;
    }
    list.append(item);
  }
  sources.append(sourcesTitle, list);
  guidePanelEl.append(sources);

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'guide-earned-toggle';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = isEarned(trophy);
  toggle.addEventListener('change', () => setEarned(trophy, toggle.checked));
  toggleLabel.append(toggle, document.createTextNode(' I have earned this trophy'));
  guidePanelEl.append(toggleLabel);
}

function renderRoadmap() {
  roadmapStagesEl.replaceChildren();
  for (const info of STAGE_INFO) {
    const section = document.createElement('section');
    section.className = 'roadmap-stage';
    const inStage = trophies.filter((t) => t.stage === info.stage);
    const doneInStage = inStage.filter(isEarned).length;

    const heading = document.createElement('h3');
    const number = document.createElement('span');
    number.className = 'stage-number';
    number.textContent = `Stage ${info.stage}`;
    heading.append(number, document.createTextNode(info.title));
    const progress = document.createElement('span');
    progress.className = 'stage-progress';
    progress.textContent = ` — ${doneInStage}/${inStage.length} earned`;
    heading.append(progress);

    const blurb = document.createElement('p');
    blurb.className = 'stage-blurb';
    blurb.textContent = info.blurb;

    const list = document.createElement('ul');
    for (const trophy of inStage) {
      const item = document.createElement('li');
      if (isEarned(trophy)) item.classList.add('is-earned');
      const dot = document.createElement('span');
      dot.className = `grade-dot grade-${trophy.grade}`;
      const name = document.createElement('span');
      name.className = 'roadmap-name';
      name.textContent = visibleName(trophy);
      item.append(dot, name);
      if (trophy.missable) item.append(makeBadge('missable-badge', 'Missable'));
      list.append(item);
    }
    section.append(heading, blurb, list);
    roadmapStagesEl.append(section);
  }
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderGuidePanel();
  renderRoadmap();
}

function setEarned(trophy, earned) {
  if (earned) earnedIds.add(trophy.id);
  else earnedIds.delete(trophy.id);
  saveEarnedIds();
  renderAll();
}

function exportProgress() {
  const payload = JSON.stringify({ game: 'gta6', earned: [...earnedIds].sort((a, b) => a - b) }, null, 2);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  link.download = 'leonida-legend-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const ids = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(ids)) return;
  const validIds = new Set(trophies.map((t) => t.id));
  earnedIds = new Set(ids.filter((id) => validIds.has(id)));
  saveEarnedIds();
  renderAll();
}

function showView(view) {
  const isChecklist = view === 'checklist';
  document.getElementById('checklist-view').hidden = !isChecklist;
  document.getElementById('roadmap-view').hidden = isChecklist;
  document.getElementById('tab-checklist').classList.toggle('is-active', isChecklist);
  document.getElementById('tab-roadmap').classList.toggle('is-active', !isChecklist);
}

/* ---------- wiring ---------- */
for (const chip of document.querySelectorAll('.kind-chip')) {
  chip.addEventListener('click', () => {
    activeKind = chip.dataset.kind;
    for (const other of document.querySelectorAll('.kind-chip')) other.classList.toggle('is-active', other === chip);
    renderChecklist();
  });
}
gradeFilterEl.addEventListener('change', renderChecklist);
searchFilterEl.addEventListener('input', renderChecklist);
hideEarnedEl.addEventListener('change', renderChecklist);
spoilerModeEl.checked = localStorage.getItem(SPOILER_KEY) === 'on';
spoilerModeEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerModeEl.checked ? 'on' : 'off');
  renderAll();
});
document.getElementById('export-progress').addEventListener('click', exportProgress);
document.getElementById('import-progress').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) await importProgress(file);
  event.target.value = '';
});
document.getElementById('tab-checklist').addEventListener('click', () => showView('checklist'));
document.getElementById('tab-roadmap').addEventListener('click', () => showView('roadmap'));

/* ---------- boot ---------- */
const dataDoc = await (await fetch('data/trophies.json')).json();
trophies = dataDoc.trophies;
renderAll();
