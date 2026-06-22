const MODE_ORDER = ['overall', 'nethpot', 'crystal', 'mace', 'uhc', 'sword', 'smp'];
const PLAY_MODES = ['nethpot', 'crystal', 'mace', 'uhc', 'sword', 'smp'];

const GAMEMODES = {
  overall: { name: 'Overall', icon: '/assets/icons/overall.svg' },
  nethpot: { name: 'NethPot', icon: '/assets/icons/nethpot.svg' },
  crystal: { name: 'Crystal', icon: '/assets/icons/crystal.svg' },
  mace: { name: 'Mace', icon: '/assets/icons/mace.svg' },
  uhc: { name: 'UHC', icon: '/assets/icons/uhc.svg' },
  sword: { name: 'Sword', icon: '/assets/icons/sword.svg' },
  smp: { name: 'SMP', icon: '/assets/icons/smp.svg' },
};

const TIER_POINTS = {
  LT5: 1,
  HT5: 2,
  LT4: 4,
  HT4: 6,
  LT3: 10,
  HT3: 20,
  LT2: 30,
  HT2: 40,
  LT1: 50,
  HT1: 60,
  NT: 0,
  'N/A': 0,
};

const el = {
  intro: document.getElementById('intro'),
  tabs: document.getElementById('tabs'),
  panel: document.getElementById('panel'),
  panelTop: document.getElementById('panelTop'),
  content: document.getElementById('content'),
  loader: document.getElementById('dataLoader'),
  panelTitle: document.getElementById('panelTitle'),
  searchInput: document.getElementById('searchInput'),
  searchResults: document.getElementById('searchResults'),
  profileOverlay: document.getElementById('profileOverlay'),
  profileClose: document.getElementById('profileClose'),
  profileAvatar: document.getElementById('profileAvatar'),
  profileName: document.getElementById('profileName'),
  profileRank: document.getElementById('profileRank'),
  profileRankIcon: document.getElementById('profileRankIcon'),
  profileRegion: document.getElementById('profileRegion'),
  profilePosition: document.getElementById('profilePosition'),
  profileTiers: document.getElementById('profileTiers'),
  namemc: document.getElementById('namemc'),
  profileLoader: document.getElementById('profileLoader'),
  profileContent: document.getElementById('profileContent'),
  contextMenu: document.getElementById('contextMenu'),
  docsModal: document.getElementById('docsModal'),
  docsBtn: document.getElementById('docsBtn'),
  docsClose: document.getElementById('docsClose'),
  infoBtn: document.getElementById('infoBtn'),
  copyIpBtn: document.getElementById('copyIpBtn'),
};

const state = {
  page: 'home',
  cache: new Map(),
  contextPlayer: null,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function skinUrl(ign) {
  return `https://render.crafty.gg/3d/bust/${encodeURIComponent(String(ign || 'Steve'))}`;
}

function tierPoints(tier) {
  return TIER_POINTS[String(tier || 'NT').toUpperCase()] ?? 0;
}

function tierNumber(tier) {
  const match = String(tier || '').match(/[1-5]/);
  return match ? Number(match[0]) : 99;
}

function isHT(tier) {
  return String(tier || '').toUpperCase().startsWith('HT');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function modeIcon(mode) {
  return GAMEMODES[mode]?.icon || '/assets/icons/overall.svg';
}

function rankTitle(points) {
  const p = Number(points || 0);
  if (p >= 220) return 'Combat Grandmaster';
  if (p >= 160) return 'Combat Master';
  if (p >= 100) return 'Combat Specialist';
  if (p >= 40) return 'Knight';
  if (p >= 1) return 'Rookie';
  return 'Unranked';
}

function rankIcon(points) {
  const title = rankTitle(points);
  if (title === 'Combat Grandmaster') return '/assets/ranks/combat-grandmaster.webp';
  if (title === 'Combat Master') return '/assets/ranks/combat-master.webp';
  if (title === 'Combat Specialist') return '/assets/ranks/combat-specialist.svg';
  if (title === 'Knight') return '/assets/ranks/knight.svg';
  if (title === 'Rookie') return '/assets/ranks/rookie.svg';
  return '/assets/icons/overall.svg';
}

function regionName(code) {
  const clean = String(code || 'NA').toUpperCase();
  const names = {
    AS: 'Asia',
    EU: 'Europe',
    NA: 'North America',
    SA: 'South America',
    OCE: 'Oceania',
    AF: 'Africa',
    ME: 'Middle East',
  };

  return names[clean] || clean;
}

function regionBadge(region) {
  const code = String(region || 'NA').toUpperCase();
  return `<span class="region-badge ${code.toLowerCase()}">${escapeHtml(code)}</span>`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function setLoading(show) {
  el.loader.classList.toggle('show', show);
  el.content.classList.toggle('loading', show);
  if (show) el.content.innerHTML = '';
}

function setProfileLoading(show) {
  el.profileLoader.classList.toggle('show', show);
  el.profileContent.classList.toggle('loading', show);
}

function fullRanks(player) {
  const ranks = new Map((player.ranks || []).map((rank) => [rank.gamemode, rank]));

  return PLAY_MODES.map((mode) => {
    return ranks.get(mode) || {
      gamemode: mode,
      gamemodeName: GAMEMODES[mode].name,
      tier: 'NT',
      points: 0,
      region: player.region || 'NA',
    };
  });
}

function makeTierPill(rank) {
  const rawTier = String(rank.tier || 'NT').toUpperCase();
  const gm = rank.gamemode;

  const isNotTested = rawTier === 'NT' || rawTier === 'N/A' || rawTier === 'NA';
  const tier = isNotTested ? 'NT' : rawTier;

  const kind = isNotTested ? 'nt' : isHT(tier) ? 'ht' : 'lt';
  const levelClass = isNotTested ? 'not-tested' : `tested t${tierNumber(tier)}`;
  const label = isNotTested ? 'NT' : tier;

  return `
    <div class="tier-pill ${kind} ${levelClass}">
      <img src="${modeIcon(gm)}" alt="${escapeHtml(gm)}" />
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}
  return `
    <div class="tier-pill ${kind}">
      <img src="${modeIcon(gm)}" alt="${escapeHtml(gm)}" />
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function playerTierSummary(player) {
  return fullRanks(player)
    .map((rank) => `${rank.gamemodeName || GAMEMODES[rank.gamemode]?.name || rank.gamemode}: ${rank.tier}`)
    .join(', ');
}

function updateNavActive(page) {
  document.querySelectorAll('[data-go]').forEach((link) => {
    link.classList.toggle('active', link.dataset.go === page);
  });
}

function setPanelTitle(page) {
  if (page === 'home') {
    el.panelTop.classList.add('hidden');
    el.panel.classList.add('home-panel');
    el.tabs.classList.add('hidden');
    return;
  }

  el.panelTop.classList.remove('hidden');
  el.panel.classList.remove('home-panel');
  el.tabs.classList.remove('hidden');

  const meta = GAMEMODES[page] || GAMEMODES.overall;

  el.panelTitle.innerHTML = `
    <img src="${meta.icon}" alt="" />
    <div>
      <h2>${escapeHtml(meta.name)} ${page === 'overall' ? 'Rankings' : 'Tierlist'}</h2>
      <p>${page === 'overall' ? 'Top 100 players by total points' : 'Tier 1 to Tier 5 players for this gamemode'}</p>
    </div>
  `;
}

function renderTabs(activeMode, animate = false) {
  el.tabs.classList.toggle('animate-tabs', animate);

  el.tabs.innerHTML = MODE_ORDER.map((mode) => `
    <button class="tab ${activeMode === mode ? 'active' : ''}" data-mode="${mode}">
      <img src="${GAMEMODES[mode].icon}" alt="" />
      <span>${escapeHtml(GAMEMODES[mode].name)}</span>
    </button>
  `).join('');

  el.tabs.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      loadPage(tab.dataset.mode, true);
    });
  });

  if (animate) {
    setTimeout(() => el.tabs.classList.remove('animate-tabs'), 900);
  }
}

async function loadPage(page, pushHash = false) {
  const previousPage = state.page;
  state.page = page;

  updateNavActive(page === 'home' ? 'home' : 'overall');
  setPanelTitle(page);

  if (page !== 'home') {
    renderTabs(page, previousPage === 'home');
  }

  if (pushHash) {
    history.replaceState(null, '', `#${page}`);
  }

  setLoading(true);
  await wait(260);

  try {
    if (page === 'home') {
      await renderHome();
    } else if (page === 'overall') {
      const data = await getRankingData('overall');
      renderOverall(data.players || []);
    } else {
      const data = await getRankingData(page);
      renderGamemode(page, data.entries || []);
    }
  } catch (error) {
    console.error(error);
    el.content.innerHTML = `<div class="empty-state">Could not load data. Check MongoDB and server console.</div>`;
  } finally {
    setLoading(false);
  }
}

async function getRankingData(mode) {
  if (state.cache.has(mode)) return state.cache.get(mode);

  const data = await fetchJson(`/api/rankings?gamemode=${encodeURIComponent(mode)}&limit=100`);
  state.cache.set(mode, data);
  return data;
}

async function renderHome() {
  const data = await getRankingData('overall');
  const players = data.players || [];
  const topThree = players.slice(0, 3);
  const nextSeven = players.slice(3, 10);

  el.content.innerHTML = `
    <section class="home-hero">
      <div class="home-copy">
        <div class="home-eyebrow">Official ZeusPvP Rankings</div>

        <h1 class="home-title">
          <span class="blue">ZeusPvP</span>
          <span class="white"> The #1 Tierlist !</span>
        </h1>

        <p class="home-desc">
          Track the best players, climb the leaderboard, and prove your peak across every PvP gamemode.
        </p>

        <p class="home-sub">
          Zeus PvP is a 1.8+ PvP server with an Elo system, clean tier testing, competitive queues, and official rankings.
          Join the server at <b>zeuspvp.net</b> and get tested to earn your place.
        </p>

        <div class="home-buttons">
          <a class="home-btn primary" href="https://discord.gg/zeuspvp" target="_blank">
            <img src="/assets/icons/discord.svg" alt="" />
            Get Tier Tested
          </a>

          <button class="home-btn secondary" id="homeViewTierlist">
            <img src="/assets/icons/overall.svg" alt="" />
            View Tierlist
          </button>
        </div>
      </div>

      <div class="home-logo-card">
        <img src="/assets/img/zeus-logo.png" alt="ZeusPvP" />
      </div>
    </section>

    <h2 class="home-section-title">Top 3 Players</h2>

    <section class="podium">
      ${podiumCard(topThree[1], 2, 'second')}
      ${podiumCard(topThree[0], 1, 'first')}
      ${podiumCard(topThree[2], 3, 'third')}
    </section>

    <h2 class="home-section-title">Next Top Players</h2>

    <section class="home-top-grid">
      ${nextSeven.map((player, index) => homeMiniRow(player, index + 4)).join('') || '<div class="empty-state">No more players yet.</div>'}
    </section>

    <div class="home-view-full">
      <button class="home-btn secondary" id="homeViewFull">
        <img src="/assets/icons/overall.svg" alt="" />
        View Full Tier List
      </button>
    </div>
  `;

  document.getElementById('homeViewTierlist')?.addEventListener('click', () => loadPage('overall', true));
  document.getElementById('homeViewFull')?.addEventListener('click', () => loadPage('overall', true));

  el.content.querySelectorAll('[data-player]').forEach((card) => {
    card.addEventListener('click', async () => {
      const ign = card.dataset.player;
      el.profileOverlay.classList.add('show');
      setProfileLoading(true);

      try {
        const player = await fetchJson(`/api/player/${encodeURIComponent(ign)}`);
        openProfile(player);
      } catch {
        const player = players.find((item) => item.ign === ign);
        openProfile(player);
      }
    });
  });
}

function podiumCard(player, place, cls) {
  if (!player) {
    return `
      <article class="podium-card ${cls}">
        <div class="empty-state">No player</div>
      </article>
    `;
  }

  const points = Number(player.totalPoints || 0);

  return `
    <article class="podium-card ${cls}" data-player="${escapeHtml(player.ign)}">
      <div class="podium-skin-wrap">
        <img class="podium-skin" src="${skinUrl(player.ign)}" alt="${escapeHtml(player.ign)}" />
        <div class="podium-badge">${place}</div>
      </div>

      <div class="podium-name">${escapeHtml(player.ign)}</div>
      <div class="podium-rank">${points} pts</div>

      <img class="podium-icon" src="/assets/icons/overall.svg" alt="" />
    </article>
  `;
}

function homeMiniRow(player, place) {
  const points = Number(player.totalPoints || 0);

  return `
    <article class="home-mini-row" data-player="${escapeHtml(player.ign)}">
      <div class="home-mini-place">${place}.</div>
      <img src="${skinUrl(player.ign)}" alt="${escapeHtml(player.ign)}" />
      <div>
        <div class="home-mini-name">${escapeHtml(player.ign)}</div>
        <div class="home-mini-points">${escapeHtml(rankTitle(points))}</div>
      </div>
      <div class="home-mini-points">${points} pts</div>
    </article>
  `;
}

function renderOverall(players) {
  if (!players.length) {
    el.content.innerHTML = `<div class="empty-state">No players found yet. Use <b>/rank</b> or <b>/results</b> in the bot to add players.</div>`;
    return;
  }

  el.content.innerHTML = `
    <div class="overall-head">
      <div>#</div>
      <div>PLAYER</div>
      <div>REGION</div>
      <div>TIERS</div>
    </div>

    <div class="ranking-list">
      ${players.slice(0, 100).map((player, index) => overallRow(player, index)).join('')}
    </div>
  `;

  el.content.querySelectorAll('.ranking-row').forEach((row) => {
    const ign = row.dataset.ign;
    const player = players.find((item) => item.ign === ign);

    row.addEventListener('click', () => openProfile(player));

    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      state.contextPlayer = player;
      showContextMenu(event.clientX, event.clientY);
    });
  });
}

function overallRow(player, index) {
  const points = Number(player.totalPoints || 0);
  const cls = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';

  return `
    <article class="ranking-row ${cls}" data-ign="${escapeHtml(player.ign)}">
      <div class="rank-plate">
        ${escapeHtml(player.position || index + 1)}.
        <img class="rank-skin" src="${skinUrl(player.ign)}" alt="${escapeHtml(player.ign)}" loading="lazy" />
      </div>

      <div class="player-cell">
        <div class="player-info">
          <div class="player-name">${escapeHtml(player.ign)}</div>
          <div class="player-rank">
            <img src="${rankIcon(points)}" alt="" />
            ${escapeHtml(rankTitle(points))}
            <span>(${points} points)</span>
          </div>
        </div>
      </div>

      <div>${regionBadge(player.region)}</div>

      <div class="tiers-cell">
        ${fullRanks(player).map(makeTierPill).join('')}
      </div>
    </article>
  `;
}

function renderGamemode(mode, entries) {
  const groups = new Map([1, 2, 3, 4, 5].map((num) => [num, []]));

  entries.forEach((entry) => {
    const num = tierNumber(entry.tier);
    if (groups.has(num)) groups.get(num).push(entry);
  });

  el.content.innerHTML = `
    <div class="mode-grid">
      ${[1, 2, 3, 4, 5].map((num) => `
        <section class="tier-column t${num}">
          <h3><img src="/assets/icons/overall.svg" alt="" /> Tier ${num}</h3>
          <div class="mode-list">
            ${(groups.get(num) || []).map((entry) => modePlayerRow(entry)).join('') || '<div class="empty-state">No players</div>'}
          </div>
        </section>
      `).join('')}
    </div>
  `;

  el.content.querySelectorAll('.mode-player').forEach((row) => {
    row.addEventListener('click', async () => {
      el.profileOverlay.classList.add('show');
      setProfileLoading(true);

      try {
        const player = await fetchJson(`/api/player/${encodeURIComponent(row.dataset.ign)}`);
        openProfile(player);
      } catch {
        const entry = entries.find((item) => item.ign === row.dataset.ign);
        openProfile({
          ign: entry.ign,
          region: entry.region,
          totalPoints: entry.points,
          position: '—',
          ranks: [entry],
        });
      }
    });

    row.addEventListener('contextmenu', async (event) => {
      event.preventDefault();

      try {
        state.contextPlayer = await fetchJson(`/api/player/${encodeURIComponent(row.dataset.ign)}`);
      } catch {
        state.contextPlayer = { ign: row.dataset.ign, ranks: [] };
      }

      showContextMenu(event.clientX, event.clientY);
    });
  });
}

function modePlayerRow(entry) {
  const ht = isHT(entry.tier);

  return `
    <article class="mode-player ${ht ? 'ht' : 'lt'}" data-ign="${escapeHtml(entry.ign)}">
      <img src="${skinUrl(entry.ign)}" alt="${escapeHtml(entry.ign)}" loading="lazy" />
      <strong>${escapeHtml(entry.ign)}</strong>
      <span class="tier-mark" aria-label="${escapeHtml(entry.tier)}"></span>
    </article>
  `;
}

function openProfile(player) {
  if (!player) return;

  const ranks = fullRanks(player);
  const points = Number(player.totalPoints || ranks.reduce((sum, rank) => sum + Number(rank.points || tierPoints(rank.tier)), 0));

  el.profileOverlay.classList.add('show');
  setProfileLoading(true);

  wait(160).then(() => {
    el.profileAvatar.src = skinUrl(player.ign);
    el.profileName.textContent = player.ign;
    el.profileRank.textContent = rankTitle(points);
    el.profileRankIcon.src = rankIcon(points);
    el.profileRegion.textContent = regionName(player.region);
    el.namemc.href = `https://namemc.com/profile/${encodeURIComponent(player.ign)}`;

    el.profilePosition.innerHTML = `
      <span class="rank-plate ${player.position === 1 ? 'first' : player.position === 2 ? 'second' : player.position === 3 ? 'third' : ''}">
        ${player.position && player.position !== '—' ? `${player.position}.` : '—'}
      </span>
      <span class="pos-text"><img src="/assets/icons/overall.svg" alt="" /> OVERALL (${points} points)</span>
    `;

    el.profileTiers.innerHTML = ranks.map(makeTierPill).join('');

    setProfileLoading(false);
  });
}

function closeProfile() {
  el.profileOverlay.classList.remove('show');
  setProfileLoading(false);
}

function showContextMenu(x, y) {
  el.contextMenu.style.left = `${Math.min(x, window.innerWidth - 210)}px`;
  el.contextMenu.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
  el.contextMenu.classList.add('show');
}

function hideContextMenu() {
  el.contextMenu.classList.remove('show');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function handleSearch() {
  const q = el.searchInput.value.trim();

  if (!q) {
    el.searchResults.classList.remove('show');
    el.searchResults.innerHTML = '';
    return;
  }

  try {
    const data = await fetchJson(`/api/search?q=${encodeURIComponent(q)}`);
    const results = data.results || [];

    el.searchResults.innerHTML = results.length
      ? results.map((player) => `
        <button class="search-result" data-ign="${escapeHtml(player.ign)}">
          <img src="${skinUrl(player.ign)}" alt="" />
          <span>
            <b>${escapeHtml(player.ign)}</b>
            <small>${escapeHtml(rankTitle(player.totalPoints))} • ${player.totalPoints} points</small>
          </span>
        </button>
      `).join('')
      : '<div class="empty-state" style="padding:14px;min-height:auto;font-size:15px;">No player found</div>';

    el.searchResults.classList.add('show');

    el.searchResults.querySelectorAll('.search-result').forEach((button) => {
      button.addEventListener('click', async () => {
        el.profileOverlay.classList.add('show');
        setProfileLoading(true);

        const player = await fetchJson(`/api/player/${encodeURIComponent(button.dataset.ign)}`);
        el.searchResults.classList.remove('show');
        openProfile(player);
      });
    });
  } catch (error) {
    console.error(error);
  }
}

function debounce(fn, delay) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function initEvents() {
  document.querySelectorAll('[data-go]').forEach((item) => {
    item.addEventListener('click', (event) => {
      const page = item.dataset.go;

      if (page) {
        event.preventDefault();
        loadPage(page, true);
      }
    });
  });

  el.profileClose.addEventListener('click', closeProfile);

  el.profileOverlay.addEventListener('click', (event) => {
    if (event.target === el.profileOverlay) closeProfile();
  });

  document.addEventListener('click', (event) => {
    if (!el.contextMenu.contains(event.target)) hideContextMenu();
    if (!event.target.closest('.search-wrap')) el.searchResults.classList.remove('show');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfile();
      el.docsModal.classList.remove('show');
      hideContextMenu();
    }

    if (event.key === '/' && document.activeElement !== el.searchInput) {
      event.preventDefault();
      el.searchInput.focus();
    }
  });

  el.contextMenu.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button || !state.contextPlayer) return;

    const action = button.dataset.action;

    if (action === 'profile') openProfile(state.contextPlayer);
    if (action === 'username') await copyText(state.contextPlayer.ign);
    if (action === 'tiers') await copyText(playerTierSummary(state.contextPlayer));

    hideContextMenu();
  });

  el.searchInput.addEventListener('input', debounce(handleSearch, 180));
  el.docsBtn.addEventListener('click', () => el.docsModal.classList.add('show'));
  el.infoBtn.addEventListener('click', () => el.docsModal.classList.add('show'));
  el.docsClose.addEventListener('click', () => el.docsModal.classList.remove('show'));

  el.docsModal.addEventListener('click', (event) => {
    if (event.target === el.docsModal) el.docsModal.classList.remove('show');
  });

  el.copyIpBtn.addEventListener('click', async () => copyText('zeuspvp.net'));
}

function initIntro() {
  setTimeout(() => {
    el.intro.classList.add('done');
  }, 1600);
}

async function init() {
  initIntro();
  initEvents();

  history.replaceState(null, '', '#home');
  await loadPage('home', false);
}

init();
