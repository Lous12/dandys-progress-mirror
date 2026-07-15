const STORAGE_KEY = 'dandys-progress-v1';
const CURRENT_DATA_VERSION = 7;

const groupLabels = {
  regular: 'Обычный',
  main: 'Главный',
  event: 'Ивентовый',
  'main-event': 'Главный · Ивент',
  lethal: 'Летальный',
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value) || 0)); }
function initials(name) { return name.replace(/&/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function percent(current, target) { return target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0; }
function currentLocale() { return window.I18N?.locale?.() || 'ru-RU'; }
function tr(value) { return window.I18N?.text?.(value) || value; }
function entityName(entity) { return window.I18N?.entityName?.(entity) || entity?.ru || entity?.name || ''; }
function secondaryEntityName(entity) { return window.I18N?.secondaryEntityName?.(entity) || entity?.name || ''; }
function localizedTaskLabel(value) { return window.I18N?.task?.(value) || value; }
function localizedAchievement(value) { return window.I18N?.achievement?.(value) || value; }
function localizedTier(value) { return window.I18N?.tier?.(value) || value; }
function formatNumber(n) { return new Intl.NumberFormat(currentLocale()).format(Number(n) || 0); }
function fandomImageUrl(fileLabel) {
  const fileName = `${fileLabel} Render.png`;
  return `https://dandys-world-robloxhorror.fandom.com/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`;
}

function entityArtwork(label, fallback, twisted = false) {
  const src = fandomImageUrl(label);
  return `<div class="avatar entity-image ${twisted?'twisted':''}">
    <img loading="lazy" referrerpolicy="no-referrer" src="${src}" alt="${escapeHtml(label)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
    <span hidden>${escapeHtml(fallback)}</span>
  </div>`;
}


function seedState() {
  const toons = {};
  TOON_DATA.forEach(t => {
    toons[t.id] = {
      owned: false,
      mastery: false,
      vintage: false,
      notes: '',
      tasks: getMasteryTasks(t.id),
    };
  });

  ['boxten','brightney','rodger','tisha','shrimpo'].forEach(id => {
    toons[id].owned = true;
  });
  ['boxten','rodger','shrimpo','tisha'].forEach(id => {
    toons[id].mastery = true;
    toons[id].tasks.forEach(task => { task.current = task.target; });
  });

  const twisteds = {};
  TWISTED_DATA.forEach(t => twisteds[t.id] = { seen:false, research:0, trinket:false, notes:'' });
  twisteds['twisted-boxten'] = { seen:true, research:100, trinket:true, notes:'Тринкет получен' };
  twisteds['twisted-rodger'] = { seen:true, research:63, trinket:false, notes:'' };
  twisteds['twisted-dyle'] = { seen:true, research:13, trinket:false, notes:'' };

  const achievements = {};
  ACHIEVEMENT_DATA.forEach(a => achievements[a.id] = { current:0, done:false });

  return {
    version:CURRENT_DATA_VERSION,
    updatedAt:Date.now(),
    toons,
    twisteds,
    achievements,
    customAchievements:[],
    global: {
      highestFloor:0,
      floorsSurvived:0,
      totalDistance:0,
      totalMachines:0,
      blackouts:0,
      budsHelped:0,
      uniqueDandyGossip:0,
      dandyItemsPurchased:0,
      uniqueDyleGossip:0,
      dyleMapCompletions:0,
      giftsReceived:0,
      giftsSent:0,
      itemsPicked:0,
      earnedIchor:0,
      ichor:2829,
      skinsOwned:0,
      notes:''
    },
  };
}

function migrateMasteryTasks(toonId, savedTasks) {
  const templates = getMasteryTasks(toonId);
  if (!Array.isArray(savedTasks) || !savedTasks.length) return templates;

  const savedById = new Map(savedTasks.map(task => [task.id, task]));
  const oldSpecial = savedById.get('special');
  const specialIds = new Set([
    'active-ability','passive-ability','floor-reached','blackouts','twisted-encounters',
    'research-capsules','research-percent','dandy-purchases','ichor-spills','bonbons-used',
    'bookshelves-eaten','party-2-floors','party-3-floors','party-4-floors','party-7-floors',
    'looey-yatta-floors','tisha-floors','pebble-floors','yatta-floors','flutter-floors',
    'scraps-floors','main-floors','connie-floors','cosmo-floors','brightney-floors','looey-floors'
  ]);
  let specialWasUsed = false;

  return templates.map(template => {
    let old = savedById.get(template.id);
    if (!old && oldSpecial && !specialWasUsed && specialIds.has(template.id)) {
      old = oldSpecial;
      specialWasUsed = true;
    }
    return {
      ...template,
      current: old ? clamp(old.current, 0, template.target) : 0,
    };
  });
}

function completeMastery(toonState) {
  toonState.mastery = true;
  toonState.tasks.forEach(task => { task.current = task.target; });
}

function mergeState(saved) {
  const base = seedState();
  if (!saved || typeof saved !== 'object') return base;

  const out = { ...base, ...saved };
  out.toons = {};
  TOON_DATA.forEach(t => {
    const oldToon = saved.toons?.[t.id] || {};
    out.toons[t.id] = {
      ...base.toons[t.id],
      ...oldToon,
      owned: Boolean(oldToon.owned || oldToon.licensed || base.toons[t.id].owned),
      tasks: migrateMasteryTasks(t.id, oldToon.tasks),
    };
    delete out.toons[t.id].licensed;
  });
  out.twisteds = { ...base.twisteds, ...(saved.twisteds || {}) };
  out.achievements = { ...base.achievements, ...(saved.achievements || {}) };
  out.global = { ...base.global, ...(saved.global || {}) };
  out.customAchievements = Array.isArray(saved.customAchievements) ? saved.customAchievements : [];

  // Однократное обновление старой версии сайта: точные задания из вики
  // и известные завершённые мастерства пользователя.
  if ((Number(saved.version) || 1) < 2) {
    ['boxten','rodger','shrimpo','tisha'].forEach(id => completeMastery(out.toons[id]));
  }

  // В версии 7 объединены дублировавшие друг друга поля «Лицензия» и «Куплен».
  // Старые отметки автоматически переносятся в единый статус «Получен».
  if ((Number(saved.version) || 1) < 7) {
    TOON_DATA.forEach(t => {
      const oldToon = saved.toons?.[t.id] || {};
      out.toons[t.id].owned = Boolean(out.toons[t.id].owned || oldToon.licensed);
    });
  }

  out.version = CURRENT_DATA_VERSION;
  return out;
}

let state;
try { state = mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
catch { state = seedState(); }
// Сразу записываем миграцию, чтобы она не повторялась при каждом открытии.
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

let ui = { toonFilter:'all', toonSearch:'', twistedFilter:'all', twistedSearch:'', achievementFilter:'all', achievementSearch:'', communitySearch:'', communityView:'profiles', leaderboardMetric:'score', compareA:'', compareB:'', activeToon:null };
let community = { profiles:[], status:'loading', error:'' };

const pages = {
  dashboard: ['Мой прогресс','Личная коллекция, мастерства и исследования.'],
  community: ['Игроки Gardenview','Публичные профили, рейтинг и сравнение прогресса.'],
  friends: ['Друзья и сообщения','Заявки в друзья, личные сообщения и общение с игроками.'],
  toons: ['Туны','Отмечай полученных тунов, мастерства и винтажные скины.'],
  twisteds: ['Твистеды','Записывай встречи, проценты исследования и полученные тринкеты.'],
  achievements: ['Достижения','Официальные медали и любые собственные цели.'],
  data: ['Данные и резервная копия','Экспортируй прогресс, переноси его между устройствами и восстанавливай при необходимости.'],
  support: ['Поддержать проект','Добровольная поддержка развития Dandy’s Progress.'],
};

function save(render = true) {
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
  const saveState = document.getElementById('saveState');
  if (saveState) {
    saveState.textContent = 'Сохранено';
    setTimeout(()=> saveState.textContent = 'Сохранено', 400);
  }
  if (render) renderAll();
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = tr(message);
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2400);
}

function masteryPercent(toonState) {
  if (toonState.mastery) return 100;
  if (!toonState.tasks.length) return toonState.mastery ? 100 : 0;
  return Math.round(toonState.tasks.reduce((sum,t)=>sum+percent(t.current,t.target),0) / toonState.tasks.length);
}

function syncMastery(toonState) {
  const allDone = toonState.tasks.length > 0 && toonState.tasks.every(t => Number(t.current) >= Number(t.target));
  if (allDone) toonState.mastery = true;
}

function stats() {
  const toonValues = Object.values(state.toons);
  const twistedValues = Object.values(state.twisteds);
  const allAchievements = [
    ...ACHIEVEMENT_DATA.map(a=>({ ...a, ...(state.achievements[a.id] || {}) })),
    ...state.customAchievements,
  ];
  return {
    owned: toonValues.filter(x=>x.owned).length,
    mastered: toonValues.filter(x=>x.mastery).length,
    researched: twistedValues.filter(x=>x.research >= 100).length,
    trinkets: twistedValues.filter(x=>x.trinket).length,
    achievements: allAchievements.filter(x=>x.done || Number(x.current)>=Number(x.target)).length,
    achievementTotal: allAchievements.length,
  };
}

function navigate(page) {
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  document.getElementById('pageTitle').textContent = pages[page][0];
  document.getElementById('pageSubtitle').textContent = pages[page][1];
  document.getElementById('sidebar').classList.remove('open');
  window.I18N?.translate?.(document);
  if (page === 'friends') window.socialPageOpened?.();
}

function statCard(label,value,hint,spark) {
  return `<div class="stat-card"><span class="spark">${spark}</span><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
}

function renderDashboard() {
  const s = stats();
  const nearly = TOON_DATA.map(t=>({t, p:masteryPercent(state.toons[t.id])})).filter(x=>x.p>0 && x.p<100).sort((a,b)=>b.p-a.p).slice(0,5);
  const wanted = TWISTED_DATA.map(t=>({t,r:state.twisteds[t.id].research})).filter(x=>x.r>0 && x.r<100).sort((a,b)=>b.r-a.r).slice(0,5);
  const page = document.getElementById('page-dashboard');
  page.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Твой прогресс</p>
      <h2>Собери всех тунов, закрой исследования и не потеряй ни одного счётчика.</h2>
      <p>Личный журнал Gardenview: отмечай коллекцию, мастерства и исследования, а затем делись открытой страницей с друзьями.</p>
      <div class="hero-actions"><button class="primary-btn" data-go="community">Страницы игроков</button><button class="secondary-btn" data-go="toons">Продолжить мастерства</button></div>
    </div>
    <div class="stat-grid">
      ${statCard('Получено тунов',`${s.owned} / ${TOON_DATA.length}`,'Доступные персонажи в коллекции','☺')}
      ${statCard('Мастерства',`${s.mastered} / ${TOON_DATA.length}`,'Винтажные скины и требования','✦')}
      ${statCard('Исследовано на 100%',`${s.researched} / ${TWISTED_DATA.length}`,`${s.trinkets} тринкетов получено`,'◉')}
      ${statCard('Достижения',`${s.achievements} / ${s.achievementTotal}`,'Официальные и личные цели','◆')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><div><h3>Ближайшие мастерства</h3><div class="panel-sub">Туны, у которых уже есть прогресс</div></div><button class="secondary-btn" data-go="toons">Открыть тунов</button></div>
        <div class="list-mini">
          ${nearly.length ? nearly.map(({t,p})=>`<div class="mini-row"><div><strong>${escapeHtml(entityName(t))}</strong><small>${escapeHtml(secondaryEntityName(t))}</small></div><div style="min-width:170px"><div class="progress-meta"><span>${p}%</span><span>${state.toons[t.id].mastery?'готово':'в процессе'}</span></div><div class="progress"><span style="width:${p}%"></span></div></div></div>`).join('') : '<div class="empty">Пока нет начатых мастерств.</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Текущие исследования</h3><div class="panel-sub">Ближе всего к новому тринкету</div></div><button class="secondary-btn" data-go="twisteds">Открыть</button></div>
        <div class="list-mini">
          ${wanted.length ? wanted.map(({t,r})=>`<div class="mini-row"><div><strong>${escapeHtml(entityName(t))}</strong><small>${100-r}% осталось</small></div><div style="min-width:120px"><div class="progress-meta"><span>${r}%</span><span>100%</span></div><div class="progress"><span style="width:${r}%"></span></div></div></div>`).join('') : '<div class="empty">Нет незавершённых исследований.</div>'}
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Общая статистика</h3><div class="panel-sub">Можно переписывать значения из игрового журнала</div></div></div>
      <div class="form-grid" id="globalStats">
        ${globalField('highestFloor','Максимальный этаж')}
        ${globalField('floorsSurvived','Пережито этажей')}
        ${globalField('totalDistance','Всего пройдено метров')}
        ${globalField('totalMachines','Всего завершено машин')}
        ${globalField('blackouts','Пережито блэкаутов')}
        ${globalField('budsHelped','Помощь Bud')}
        ${globalField('uniqueDandyGossip','Уникальные сплетни Денди')}
        ${globalField('dandyItemsPurchased','Куплено предметов у Денди')}
        ${globalField('uniqueDyleGossip','Уникальные сплетни Дайла')}
        ${globalField('dyleMapCompletions','Прохождения карты Дайла')}
        ${globalField('giftsReceived','Получено подарков')}
        ${globalField('giftsSent','Отправлено подарков')}
        ${globalField('itemsPicked','Всего поднято предметов')}
        ${globalField('earnedIchor','Заработано ихора')}
        ${globalField('ichor','Текущий ихор')}
        ${globalField('skinsOwned','Получено скинов')}
        <label class="span-2">Заметка<textarea data-global="notes" rows="3" placeholder="Например: коплю на Тиган">${escapeHtml(state.global.notes || '')}</textarea></label>
      </div>
    </div>`;
}

function globalField(key,label) {
  return `<label>${label}<input data-global="${key}" type="number" min="0" value="${Number(state.global[key])||0}" /></label>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}


function buildPublicSnapshot() {
  const s = stats();
  return {
    version: 3,
    updatedAt: Date.now(),
    stats: {
      owned: s.owned,
      mastered: s.mastered,
      researched: s.researched,
      trinkets: s.trinkets,
      achievements: s.achievements,
      achievementTotal: s.achievementTotal,
    },
    global: {
      highestFloor: Number(state.global.highestFloor) || 0,
      floorsSurvived: Number(state.global.floorsSurvived) || 0,
      totalDistance: Number(state.global.totalDistance) || 0,
      totalMachines: Number(state.global.totalMachines) || 0,
      blackouts: Number(state.global.blackouts) || 0,
      budsHelped: Number(state.global.budsHelped) || 0,
      uniqueDandyGossip: Number(state.global.uniqueDandyGossip) || 0,
      dandyItemsPurchased: Number(state.global.dandyItemsPurchased) || 0,
      uniqueDyleGossip: Number(state.global.uniqueDyleGossip) || 0,
      dyleMapCompletions: Number(state.global.dyleMapCompletions) || 0,
      giftsReceived: Number(state.global.giftsReceived) || 0,
      giftsSent: Number(state.global.giftsSent) || 0,
      itemsPicked: Number(state.global.itemsPicked) || 0,
      earnedIchor: Number(state.global.earnedIchor) || 0,
      ichor: Number(state.global.ichor) || 0,
      skinsOwned: Number(state.global.skinsOwned) || 0,
    },
    ownedToons: TOON_DATA.filter(t => state.toons[t.id]?.owned).map(t => t.id),
    masteredToons: TOON_DATA.filter(t => state.toons[t.id]?.mastery).map(t => t.id),
    vintageToons: TOON_DATA.filter(t => state.toons[t.id]?.vintage).map(t => t.id),
    twisteds: TWISTED_DATA
      .filter(t => Number(state.twisteds[t.id]?.research) > 0 || state.twisteds[t.id]?.trinket)
      .map(t => ({
        id: t.id,
        research: clamp(state.twisteds[t.id]?.research, 0, 100),
        trinket: Boolean(state.twisteds[t.id]?.trinket),
      })),
  };
}
window.buildPublicSnapshot = buildPublicSnapshot;

function getProfileToon(profile) {
  return TOON_DATA.find(t => t.id === profile.avatar_toon) || TOON_DATA.find(t => t.id === 'boxten') || TOON_DATA[0];
}

function normalizeProfileAvatarUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, location.href);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return raw;
  } catch {
    return '';
  }
}

function profileAvatarMarkup(profile) {
  const toon = getProfileToon(profile || {});
  const customUrl = normalizeProfileAvatarUrl(profile?.public_data?.avatarUrl);
  if (!customUrl) return entityArtwork(toon.name, initials(toon.name));
  return `<div class="avatar entity-image custom-profile-image">
    <img loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(customUrl)}" alt="${escapeHtml(profile?.display_name || profile?.username || 'Avatar')}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
    <span hidden>${escapeHtml(initials(profile?.display_name || profile?.username || toon.name))}</span>
  </div>`;
}
window.normalizeProfileAvatarUrl = normalizeProfileAvatarUrl;
window.profileAvatarMarkup = profileAvatarMarkup;

function publicStats(profile) {
  const data = profile.public_data || {};
  const summary = data.stats || {};
  const result = {
    owned: Number(summary.owned) || (Array.isArray(data.ownedToons) ? data.ownedToons.length : 0),
    mastered: Number(summary.mastered) || (Array.isArray(data.masteredToons) ? data.masteredToons.length : 0),
    trinkets: Number(summary.trinkets) || (Array.isArray(data.twisteds) ? data.twisteds.filter(t => t.trinket).length : 0),
    researched: Number(summary.researched) || (Array.isArray(data.twisteds) ? data.twisteds.filter(t => Number(t.research) >= 100).length : 0),
    achievements: Number(summary.achievements) || 0,
    achievementTotal: Number(summary.achievementTotal) || 0,
    highestFloor: Number(data.global?.highestFloor) || 0,
    floorsSurvived: Number(data.global?.floorsSurvived) || 0,
    totalDistance: Number(data.global?.totalDistance) || 0,
    totalMachines: Number(data.global?.totalMachines) || 0,
    blackouts: Number(data.global?.blackouts) || 0,
    budsHelped: Number(data.global?.budsHelped) || 0,
    uniqueDandyGossip: Number(data.global?.uniqueDandyGossip) || 0,
    dandyItemsPurchased: Number(data.global?.dandyItemsPurchased) || 0,
    uniqueDyleGossip: Number(data.global?.uniqueDyleGossip) || 0,
    dyleMapCompletions: Number(data.global?.dyleMapCompletions) || 0,
    giftsReceived: Number(data.global?.giftsReceived) || 0,
    giftsSent: Number(data.global?.giftsSent) || 0,
    itemsPicked: Number(data.global?.itemsPicked) || 0,
    earnedIchor: Number(data.global?.earnedIchor) || 0,
    ichor: Number(data.global?.ichor) || 0,
    skinsOwned: Number(data.global?.skinsOwned) || 0,
  };
  result.score = calculateProfileScore(result);
  return result;
}

function calculateProfileScore(s) {
  // Неофициальный рейтинг трекера. Основу составляют коллекция и завершённые цели,
  // а вручную вводимая общая статистика даёт лишь умеренный бонус.
  return Math.round(
    s.mastered * 120 +
    s.researched * 75 +
    s.trinkets * 55 +
    s.owned * 25 +
    s.achievements * 20 +
    s.highestFloor * 8 +
    Math.sqrt(Math.max(0, s.floorsSurvived)) * 4 +
    Math.sqrt(Math.max(0, s.totalMachines)) * 9 +
    Math.sqrt(Math.max(0, s.totalDistance) / 100) * 5 +
    Math.sqrt(Math.max(0, s.blackouts)) * 2 +
    Math.sqrt(Math.max(0, s.budsHelped)) * 2 +
    Math.sqrt(Math.max(0, s.earnedIchor) / 10) * 2
  );
}

const leaderboardMetrics = {
  score: { label:'Общий рейтинг', short:'очков', get:s=>s.score, format:v=>formatNumber(v) },
  mastered: { label:'Закрытые мастерства', short:'мастерств', get:s=>s.mastered, format:v=>`${formatNumber(v)} / ${TOON_DATA.length}` },
  owned: { label:'Полученные туны', short:'тунов', get:s=>s.owned, format:v=>`${formatNumber(v)} / ${TOON_DATA.length}` },
  trinkets: { label:'Полученные тринкеты', short:'тринкетов', get:s=>s.trinkets, format:v=>`${formatNumber(v)} / ${TWISTED_DATA.length}` },
  researched: { label:'Исследования на 100%', short:'исследований', get:s=>s.researched, format:v=>`${formatNumber(v)} / ${TWISTED_DATA.length}` },
  highestFloor: { label:'Максимальный этаж', short:'этаж', get:s=>s.highestFloor, format:v=>formatNumber(v) },
  floorsSurvived: { label:'Пережито этажей', short:'этажей', get:s=>s.floorsSurvived, format:v=>formatNumber(v) },
  totalMachines: { label:'Выполнено машин', short:'машин', get:s=>s.totalMachines, format:v=>formatNumber(v) },
  totalDistance: { label:'Пройдено метров', short:'метров', get:s=>s.totalDistance, format:v=>formatNumber(v) },
  earnedIchor: { label:'Заработано ихора', short:'ихора', get:s=>s.earnedIchor, format:v=>formatNumber(v) },
  blackouts: { label:'Пережито блэкаутов', short:'блэкаутов', get:s=>s.blackouts, format:v=>formatNumber(v) },
  budsHelped: { label:'Помощь Bud', short:'раз', get:s=>s.budsHelped, format:v=>formatNumber(v) },
};

function profileBadgesMarkup(userId, limit = 4) {
  return window.DANDYS_BADGES?.renderBadges?.(userId, limit) || '';
}

function badgeAdminButtonMarkup(userId) {
  return window.DANDYS_BADGES?.adminButtonMarkup?.(userId) || '';
}

function publicProfileCard(profile) {
  const s = publicStats(profile);
  return `<article class="player-card" data-open-profile="${escapeHtml(profile.username)}" tabindex="0">
    <div class="player-card-cover"><span>GARDENVIEW PASS</span><b>${formatNumber(s.score)} очков</b></div>
    <div class="player-card-main">
      ${profileAvatarMarkup(profile)}
      <div class="player-identity">
        <strong>${escapeHtml(profile.display_name || profile.username)}</strong>
        <small>@${escapeHtml(profile.username)}</small>
      </div>
      <span class="online-pin" title="Публичный профиль"></span>
    </div>
    <p class="player-bio">${escapeHtml(profile.bio || 'Игрок пока ничего о себе не написал.')}</p>
    ${profileBadgesMarkup(profile.user_id, 3)}
    <div class="player-stats">
      <span><b>${s.owned}</b> получено</span>
      <span><b>${s.mastered}</b> мастерств</span>
      <span><b>${s.trinkets}</b> тринкетов</span>
      <span><b>${s.highestFloor}</b> этаж</span>
    </div>
    <div class="player-card-actions">
      <button class="secondary-btn view-player" type="button">Посмотреть</button>
      <button class="ghost-btn compare-player" data-compare-profile="${escapeHtml(profile.username)}" type="button">Сравнить</button>
      ${badgeAdminButtonMarkup(profile.user_id)}
    </div>
  </article>`;
}

function communityTabs() {
  return `<div class="community-tabs" role="tablist">
    <button class="community-tab ${ui.communityView==='profiles'?'active':''}" data-community-view="profiles">Профили</button>
    <button class="community-tab ${ui.communityView==='leaderboard'?'active':''}" data-community-view="leaderboard">Топ игроков</button>
    <button class="community-tab ${ui.communityView==='compare'?'active':''}" data-community-view="compare">Сравнение</button>
  </div>`;
}

function communityStateCard() {
  if (community.status === 'loading') return '<div class="community-state"><div class="loader-token">DW</div><strong>Загружаем страницы игроков…</strong><span>Это займёт несколько секунд.</span></div>';
  if (community.status === 'setup') return '<div class="community-state"><div class="loader-token">!</div><strong>Сначала подключи Supabase</strong><span>Публичные страницы используют ту же бесплатную базу, что и аккаунты. Инструкция находится в DEPLOY.md.</span><button class="primary-btn" id="communityAccountSetup">Открыть настройки аккаунта</button></div>';
  if (community.status === 'error') return `<div class="community-state"><div class="loader-token">×</div><strong>Не удалось загрузить игроков</strong><span>${escapeHtml(community.error || 'Неизвестная ошибка')}</span><button class="secondary-btn" id="communityRefresh">Попробовать снова</button></div>`;
  return '';
}

function renderProfileBrowser() {
  const q = ui.communitySearch.trim().toLowerCase();
  const filtered = community.profiles.filter(profile =>
    !q || `${profile.username} ${profile.display_name || ''} ${profile.bio || ''}`.toLowerCase().includes(q)
  );
  if (!filtered.length) {
    return `<div class="community-state"><div class="loader-token">☺</div><strong>${q ? 'Никого не нашли' : 'Пока нет открытых профилей'}</strong><span>${q ? 'Попробуй другой ник или имя.' : 'Первым создай публичную страницу и отправь ссылку друзьям.'}</span></div>`;
  }
  return `<div class="community-toolbar">
      <div class="search"><input id="communitySearch" placeholder="Найти игрока по нику или имени…" value="${escapeHtml(ui.communitySearch)}"></div>
      <span class="community-count">${filtered.length} ${filtered.length === 1 ? 'профиль' : 'профилей'}</span>
    </div>
    <div class="player-grid">${filtered.map(publicProfileCard).join('')}</div>`;
}

function leaderboardRow(profile, index, metric) {
  const s = publicStats(profile);
  const value = metric.get(s);
  return `<article class="leaderboard-row rank-${index+1}" data-open-profile="${escapeHtml(profile.username)}" tabindex="0">
    <div class="rank-number">${index + 1}</div>
    ${profileAvatarMarkup(profile)}
    <div class="leaderboard-person"><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username)} · ${s.mastered} мастерств · ${s.trinkets} тринкетов</small></div>
    <div class="leaderboard-value"><strong>${metric.format(value)}</strong><small>${escapeHtml(metric.short)}</small></div>
  </article>`;
}

function renderLeaderboard() {
  const metric = leaderboardMetrics[ui.leaderboardMetric] || leaderboardMetrics.score;
  const ranked = community.profiles
    .map(profile => ({ profile, stats: publicStats(profile) }))
    .sort((a,b) => metric.get(b.stats) - metric.get(a.stats) || b.stats.score - a.stats.score)
    .map(row => row.profile);
  if (!ranked.length) return '<div class="community-state"><div class="loader-token">▲</div><strong>Рейтинг пока пуст</strong><span>Он появится, когда пользователи создадут публичные профили.</span></div>';
  return `<div class="leaderboard-panel">
    <div class="leaderboard-head">
      <div><h3>Топ профилей</h3><p>Выбери категорию рейтинга. Общий рейтинг является неофициальным и считается внутри трекера.</p></div>
      <label>Категория<select id="leaderboardMetric">${Object.entries(leaderboardMetrics).map(([id,item])=>`<option value="${id}" ${ui.leaderboardMetric===id?'selected':''}>${item.label}</option>`).join('')}</select></label>
    </div>
    <div class="leaderboard-list">${ranked.map((profile,index)=>leaderboardRow(profile,index,metric)).join('')}</div>
    <details class="score-explainer"><summary>Как считается общий рейтинг?</summary><p>Больше всего очков дают закрытые мастерства, исследования на 100%, тринкеты и полученные туны. Максимальный этаж, машины, метры, достижения и использованные предметы дают дополнительный, но меньший бонус, чтобы огромные вручную введённые числа не перекрывали коллекционный прогресс.</p></details>
  </div>`;
}

function ensureCompareSelection() {
  const names = community.profiles.map(profile => profile.username);
  if (!names.includes(ui.compareA)) ui.compareA = names[0] || '';
  if (!names.includes(ui.compareB) || ui.compareB === ui.compareA) ui.compareB = names.find(name => name !== ui.compareA) || '';
}

function compareProfileHead(profile, side) {
  const s = publicStats(profile);
  return `<div class="compare-profile-head ${side}">${profileAvatarMarkup(profile)}<div><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username)}</small></div><span>${formatNumber(s.score)} очков</span></div>`;
}

function compareMetricRow(label, a, b, format = formatNumber) {
  const aWin = a > b;
  const bWin = b > a;
  return `<div class="compare-metric-row"><strong class="compare-number ${aWin?'winner':''}">${format(a)}</strong><span>${escapeHtml(label)}</span><strong class="compare-number ${bWin?'winner':''}">${format(b)}</strong></div>`;
}

function toonNameList(ids) {
  return ids.map(id => entityName(TOON_DATA.find(t=>t.id===id))).filter(Boolean);
}

function comparisonMasteryGroup(title, ids) {
  const names = toonNameList(ids);
  return `<div class="compare-mastery-group"><h4>${escapeHtml(title)}</h4>${names.length ? `<div class="compare-chips">${names.map(name=>`<span>${escapeHtml(name)}</span>`).join('')}</div>` : '<p>Нет</p>'}</div>`;
}

function renderComparison() {
  ensureCompareSelection();
  if (community.profiles.length < 2) return '<div class="community-state"><div class="loader-token">⇄</div><strong>Нужно хотя бы два профиля</strong><span>Попроси друга создать публичную страницу, после чего вы сможете сравнить прогресс.</span></div>';
  const a = community.profiles.find(profile => profile.username === ui.compareA) || community.profiles[0];
  const b = community.profiles.find(profile => profile.username === ui.compareB) || community.profiles.find(profile => profile.username !== a.username);
  if (!a || !b) return '';
  const sa = publicStats(a), sb = publicStats(b);
  const aMastered = new Set(a.public_data?.masteredToons || []);
  const bMastered = new Set(b.public_data?.masteredToons || []);
  const shared = [...aMastered].filter(id => bMastered.has(id));
  const onlyA = [...aMastered].filter(id => !bMastered.has(id));
  const onlyB = [...bMastered].filter(id => !aMastered.has(id));
  const options = selected => community.profiles.map(profile => `<option value="${escapeHtml(profile.username)}" ${profile.username===selected?'selected':''}>${escapeHtml(profile.display_name || profile.username)} (@${escapeHtml(profile.username)})</option>`).join('');
  return `<div class="compare-panel">
    <div class="compare-selectors">
      <label>Первый игрок<select id="compareA">${options(a.username)}</select></label>
      <button class="secondary-btn" id="swapCompare" title="Поменять игроков местами">⇄</button>
      <label>Второй игрок<select id="compareB">${options(b.username)}</select></label>
    </div>
    <div class="compare-board">
      ${compareProfileHead(a,'left')}
      <div class="compare-versus">VS</div>
      ${compareProfileHead(b,'right')}
      <div class="compare-metrics">
        ${compareMetricRow('Общий рейтинг', sa.score, sb.score)}
        ${compareMetricRow('Закрытые мастерства', sa.mastered, sb.mastered, v=>`${v}/${TOON_DATA.length}`)}
        ${compareMetricRow('Полученные туны', sa.owned, sb.owned, v=>`${v}/${TOON_DATA.length}`)}
        ${compareMetricRow('Тринкеты', sa.trinkets, sb.trinkets, v=>`${v}/${TWISTED_DATA.length}`)}
        ${compareMetricRow('Исследования на 100%', sa.researched, sb.researched, v=>`${v}/${TWISTED_DATA.length}`)}
        ${compareMetricRow('Максимальный этаж', sa.highestFloor, sb.highestFloor)}
        ${compareMetricRow('Пережито этажей', sa.floorsSurvived, sb.floorsSurvived)}
        ${compareMetricRow('Выполнено машин', sa.totalMachines, sb.totalMachines)}
        ${compareMetricRow('Пройдено метров', sa.totalDistance, sb.totalDistance)}
        ${compareMetricRow('Пережито блэкаутов', sa.blackouts, sb.blackouts)}
        ${compareMetricRow('Помощь Bud', sa.budsHelped, sb.budsHelped)}
        ${compareMetricRow('Заработано ихора', sa.earnedIchor, sb.earnedIchor)}
      </div>
    </div>
    <div class="compare-masteries">
      ${comparisonMasteryGroup(`Только у ${a.display_name || a.username}`, onlyA)}
      ${comparisonMasteryGroup('Общие мастерства', shared)}
      ${comparisonMasteryGroup(`Только у ${b.display_name || b.username}`, onlyB)}
    </div>
  </div>`;
}

function renderCommunity() {
  const page = document.getElementById('page-community');
  if (!page) return;
  let body = communityStateCard();
  if (!body) {
    if (ui.communityView === 'leaderboard') body = renderLeaderboard();
    else if (ui.communityView === 'compare') body = renderComparison();
    else body = renderProfileBrowser();
  }
  page.innerHTML = `
    <section class="community-hero">
      <div class="community-copy">
        <p class="eyebrow">Gardenview community board</p>
        <h2>Игроки, рейтинги и сравнение</h2>
        <p>Открывай страницы друзей, смотри общий рейтинг и сравнивай мастерства, коллекцию, исследования и игровую статистику.</p>
        <div class="community-actions">
          <button class="primary-btn" id="communityMyProfile">Моя страница</button>
          <button class="secondary-btn" id="communityRefreshTop">Обновить данные</button>
        </div>
      </div>
      <div class="community-mascots" aria-hidden="true">
        ${entityArtwork('Boxten', 'B')}
        ${entityArtwork('Tisha', 'T')}
        ${entityArtwork('Brightney', 'BR')}
      </div>
    </section>
    ${communityTabs()}
    ${body}`;
}

function publicToonTiles(ids, emptyText) {
  const rows = (ids || []).map(id => TOON_DATA.find(t => t.id === id)).filter(Boolean);
  if (!rows.length) return `<div class="empty compact-empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="public-entity-grid">${rows.map(t => `<div class="public-entity">${entityArtwork(t.name, initials(t.name))}<span><b>${escapeHtml(entityName(t))}</b><small>${escapeHtml(secondaryEntityName(t))}</small></span></div>`).join('')}</div>`;
}

function publicTwistedTiles(rows) {
  const sorted = (rows || []).slice().sort((a,b) => Number(b.research)-Number(a.research));
  if (!sorted.length) return '<div class="empty compact-empty">Исследования ещё не отмечены.</div>';
  return `<div class="public-research-list">${sorted.map(row => {
    const t = TWISTED_DATA.find(x => x.id === row.id);
    if (!t) return '';
    const research = clamp(row.research, 0, 100);
    return `<div class="public-research-row">${entityArtwork(t.name, initials(t.name.replace('Twisted ','')), true)}<div><b>${escapeHtml(entityName(t))}</b><small>${research}%${row.trinket ? ' · тринкет получен' : ''}</small><div class="progress"><span style="width:${research}%"></span></div></div></div>`;
  }).join('')}</div>`;
}

function publicProfileUrl(username) {
  const base = location.protocol === 'file:'
    ? location.href.split('#')[0]
    : `${location.origin}${location.pathname}${location.search}`;
  return `${base}#player=${encodeURIComponent(username)}`;
}

function setPublicProfileHash(username = '') {
  const target = username ? publicProfileUrl(username) : (location.protocol === 'file:' ? location.href.split('#')[0] : `${location.pathname}${location.search}`);
  try { history.replaceState(null, '', target); }
  catch { if (username) location.hash = `player=${encodeURIComponent(username)}`; }
}

function openPublicProfile(username) {
  const profile = community.profiles.find(p => p.username === username);
  if (!profile) return;
  const data = profile.public_data || {};
  const s = publicStats(profile);
  document.getElementById('publicProfileTitle').textContent = profile.display_name || profile.username;
  document.getElementById('publicProfileBody').innerHTML = `
    <div class="public-profile-head">
      <div class="public-profile-avatar">${profileAvatarMarkup(profile)}</div>
      <div class="public-profile-copy"><span>@${escapeHtml(profile.username)}</span><p>${escapeHtml(profile.bio || 'Игрок пока ничего о себе не написал.')}</p></div>
      <div class="public-profile-actions">
        <button class="secondary-btn" id="shareViewedProfile">Скопировать ссылку</button>
        <button class="primary-btn" id="friendViewedProfile">Добавить в друзья</button>
        ${badgeAdminButtonMarkup(profile.user_id)}
      </div>
    </div>
    ${profileBadgesMarkup(profile.user_id, 50)}
    <div class="stat-grid public-stat-grid">
      ${statCard('Общий рейтинг', formatNumber(s.score), 'Неофициальные очки трекера', '★')}
      ${statCard('Получено тунов', s.owned, `из ${TOON_DATA.length}`, '☺')}
      ${statCard('Мастерства', s.mastered, `из ${TOON_DATA.length}`, '✦')}
      ${statCard('Тринкеты', s.trinkets, `исследовано на 100%: ${s.researched}`, '◉')}
      ${statCard('Макс. этаж', s.highestFloor, `${formatNumber(data.global?.totalMachines || 0)} машин`, '▲')}
    </div>
    <div class="public-profile-section"><div class="panel-head"><div><h3>Общая статистика</h3><div class="panel-sub">Основные числа из игрового журнала</div></div></div><div class="player-stats"><span><b>${formatNumber(s.floorsSurvived)}</b> этажей пережито</span><span><b>${formatNumber(s.blackouts)}</b> блэкаутов</span><span><b>${formatNumber(s.earnedIchor)}</b> заработано ихора</span><span><b>${formatNumber(s.budsHelped)}</b> Bud помог</span><span><b>${formatNumber(s.dyleMapCompletions)}</b> карт Дайла</span><span><b>${formatNumber(s.skinsOwned)}</b> скинов</span></div></div>
    <div class="public-profile-section"><div class="panel-head"><div><h3>Закрытые мастерства</h3><div class="panel-sub">Туны с полученным мастерством</div></div></div>${publicToonTiles(data.masteredToons, 'Мастерства пока не отмечены.')}</div>
    <div class="public-profile-section"><div class="panel-head"><div><h3>Полученные туны</h3><div class="panel-sub">Коллекция игрока</div></div></div>${publicToonTiles(data.ownedToons, 'Полученные туны пока не отмечены.')}</div>
    <div class="public-profile-section"><div class="panel-head"><div><h3>Исследования твистедов</h3><div class="panel-sub">Сначала показаны самые заполненные</div></div></div>${publicTwistedTiles(data.twisteds)}</div>
    <p class="public-updated">Обновлено: ${profile.updated_at ? new Date(profile.updated_at).toLocaleString(currentLocale()) : 'неизвестно'}</p>`;
  window.I18N?.translate?.(document.getElementById('publicProfileDialog'));
  const dialog = document.getElementById('publicProfileDialog');
  if (!dialog.open) dialog.showModal();
  setPublicProfileHash(profile.username);
  document.getElementById('shareViewedProfile').onclick = () => copyPublicLink(profile.username);
  const friendButton = document.getElementById('friendViewedProfile');
  if (friendButton) {
    const ownId = window.getDandysSession?.()?.user?.id;
    if (ownId && ownId === profile.user_id) friendButton.hidden = true;
    else {
      friendButton.textContent = window.socialProfileActionLabel?.(profile.user_id) || 'Добавить в друзья';
      friendButton.onclick = () => window.socialHandleProfile?.(profile);
    }
  }
}

async function copyPublicLink(username) {
  const link = publicProfileUrl(username);
  try { await navigator.clipboard.writeText(link); toast('Ссылка на профиль скопирована'); }
  catch { prompt(tr('Скопируй ссылку:'), link); }
}

window.upsertCommunityProfile = function upsertCommunityProfile(profile) {
  if (!profile?.user_id) return;
  community.profiles = [profile, ...community.profiles.filter(item => item.user_id !== profile.user_id)];
};

window.getDandysCommunityProfiles = () => community.profiles.slice();

window.setCommunityState = function setCommunityState(next) {
  community = { ...community, ...next };
  renderCommunity();
  bindDynamic();
  const hash = new URLSearchParams(location.hash.replace(/^#/, '')).get('player');
  if (hash && community.profiles.some(p => p.username === hash)) openPublicProfile(hash);
  else if (hash && community.status === 'ready') window.loadPublicProfileByUsername?.(hash);
};
window.openPublicProfile = openPublicProfile;

function toonCard(t) {
  const st = state.toons[t.id];
  const p = masteryPercent(st);
  return `<article class="entity-card" data-toon-card="${t.id}">
    <div class="entity-top">
      ${entityArtwork(t.name, initials(t.name))}
      <div class="entity-name"><strong>${escapeHtml(entityName(t))}</strong><small>${escapeHtml(secondaryEntityName(t))}</small></div>
      <div class="badges"><span class="badge ${st.mastery?'good':''}">${tr(groupLabels[t.group])}</span></div>
    </div>
    <div class="check-row">
      ${checkChip('owned','Получен',t.id,st.owned)}
      ${checkChip('mastery','Мастерство',t.id,st.mastery)}
      ${checkChip('vintage','Винтаж',t.id,st.vintage)}
    </div>
    <div class="progress-wrap"><div class="progress-meta"><span>Задания мастерства</span><strong>${p}%</strong></div><div class="progress"><span style="width:${p}%"></span></div></div>
    <div class="card-actions"><button class="secondary-btn open-toon" data-id="${t.id}">Счётчики</button></div>
  </article>`;
}

function checkChip(field,label,id,checked) {
  return `<label class="check-chip"><input type="checkbox" data-toon-field="${field}" data-id="${id}" ${checked?'checked':''}><span>${label}</span></label>`;
}

function renderToons() {
  const q = ui.toonSearch.toLowerCase();
  const list = TOON_DATA.filter(t => {
    const st = state.toons[t.id];
    const searchOk = !q || `${t.name} ${t.ru}`.toLowerCase().includes(q);
    let filterOk = true;
    if (ui.toonFilter==='owned') filterOk=st.owned;
    if (ui.toonFilter==='mastery') filterOk=st.mastery;
    if (ui.toonFilter==='vintage') filterOk=st.vintage;
    if (ui.toonFilter==='unfinished') filterOk=st.owned && !st.mastery;
    if (ui.toonFilter==='event') filterOk=t.group.includes('event');
    return searchOk && filterOk;
  });
  document.getElementById('page-toons').innerHTML = `
    <div class="toolbar">
      <div class="search"><input id="toonSearch" placeholder="Найти туна..." value="${escapeHtml(ui.toonSearch)}" /></div>
      <div class="filter-tabs">${filterButtons('toon', [['all','Все'],['owned','Получены'],['unfinished','В процессе'],['mastery','Мастерство'],['vintage','Винтаж'],['event','Ивентовые']], ui.toonFilter)}</div>
    </div>
    <div class="card-grid">${list.length?list.map(toonCard).join(''):'<div class="empty">По этому фильтру ничего не найдено.</div>'}</div>`;
}

function filterButtons(prefix,items,active) {
  return items.map(([id,label])=>`<button class="filter-btn ${active===id?'active':''}" data-${prefix}-filter="${id}">${label}</button>`).join('');
}

function twistedCard(t) {
  const st = state.twisteds[t.id];
  return `<article class="entity-card">
    <div class="entity-top">
      ${entityArtwork(t.name, initials(t.name.replace('Twisted ','')), true)}
      <div class="entity-name"><strong>${escapeHtml(entityName(t))}</strong><small>${escapeHtml(secondaryEntityName(t))}</small></div>
      <div class="badges"><span class="badge ${st.research>=100?'good':''}">${tr(groupLabels[t.group])}</span></div>
    </div>
    <div class="check-row" style="grid-template-columns:1fr 1fr">
      <label class="check-chip"><input type="checkbox" data-twisted-field="seen" data-id="${t.id}" ${st.seen?'checked':''}><span>Встречен</span></label>
      <label class="check-chip"><input type="checkbox" data-twisted-field="trinket" data-id="${t.id}" ${st.trinket?'checked':''}><span>Тринкет</span></label>
    </div>
    <div class="research-row"><input type="range" min="0" max="100" value="${st.research}" data-research-range="${t.id}"><input type="number" min="0" max="100" value="${st.research}" data-research-number="${t.id}"><span>%</span></div>
    <div class="progress"><span style="width:${st.research}%"></span></div>
    <textarea rows="2" data-twisted-notes="${t.id}" placeholder="Заметка: где встретил, сколько осталось...">${escapeHtml(st.notes === 'Тринкет получен' ? tr(st.notes) : st.notes)}</textarea>
  </article>`;
}

function renderTwisteds() {
  const q = ui.twistedSearch.toLowerCase();
  const list = TWISTED_DATA.filter(t=>{
    const st=state.twisteds[t.id];
    const searchOk=!q||`${t.name} ${t.ru}`.toLowerCase().includes(q);
    let filterOk=true;
    if(ui.twistedFilter==='seen') filterOk=st.seen;
    if(ui.twistedFilter==='researching') filterOk=st.research>0&&st.research<100;
    if(ui.twistedFilter==='complete') filterOk=st.research>=100;
    if(ui.twistedFilter==='trinket') filterOk=st.trinket;
    if(ui.twistedFilter==='event') filterOk=t.group==='event';
    if(ui.twistedFilter==='lethal') filterOk=t.group==='lethal';
    return searchOk&&filterOk;
  });
  document.getElementById('page-twisteds').innerHTML = `
    <div class="toolbar">
      <div class="search"><input id="twistedSearch" placeholder="Найти твистеда..." value="${escapeHtml(ui.twistedSearch)}" /></div>
      <div class="filter-tabs">${filterButtons('twisted',[['all','Все'],['seen','Встречены'],['researching','В процессе'],['complete','100%'],['trinket','Тринкет'],['event','Ивентовые'],['lethal','Летальные']],ui.twistedFilter)}</div>
    </div>
    <div class="card-grid">${list.length?list.map(twistedCard).join(''):'<div class="empty">По этому фильтру ничего не найдено.</div>'}</div>`;
}

function getAllAchievements() {
  return [
    ...ACHIEVEMENT_DATA.map(a=>({ ...a, ...(state.achievements[a.id]||{}), custom:false })),
    ...state.customAchievements.map(a=>({ ...a, custom:true })),
  ];
}

function achievementRow(a) {
  const done = a.done || Number(a.current)>=Number(a.target);
  return `<article class="achievement ${done?'done':''}">
    <input class="achievement-check" type="checkbox" data-achievement-done="${a.id}" data-custom="${a.custom?'1':'0'}" ${done?'checked':''}>
    <div><h4>${escapeHtml(a.name)}</h4><p>${escapeHtml(a.custom ? a.description : localizedAchievement(a.description))}</p></div>
    <div class="achievement-progress">
      <div class="inline-progress"><input type="number" min="0" value="${Number(a.current)||0}" data-achievement-current="${a.id}" data-custom="${a.custom?'1':'0'}"><span>/ ${formatNumber(a.target)}</span></div>
      <div class="progress"><span style="width:${percent(a.current,a.target)}%"></span></div>
    </div>
    <div><span class="tier">${escapeHtml(a.custom ? a.tier : localizedTier(a.tier))}</span>${a.custom?`<button class="icon-btn delete-achievement" data-id="${a.id}" title="Удалить" style="margin-left:8px;width:30px;height:30px;font-size:16px">×</button>`:''}</div>
  </article>`;
}

function renderAchievements() {
  const q=ui.achievementSearch.toLowerCase();
  const list=getAllAchievements().filter(a=>{
    const done=a.done||Number(a.current)>=Number(a.target);
    const searchOk=!q||`${a.name} ${a.description} ${localizedAchievement(a.description)}`.toLowerCase().includes(q);
    let filterOk=true;
    if(ui.achievementFilter==='done') filterOk=done;
    if(ui.achievementFilter==='todo') filterOk=!done;
    if(['Бронза','Серебро','Золото','Радужное','Оникс','Личное'].includes(ui.achievementFilter)) filterOk=a.tier===ui.achievementFilter;
    return searchOk&&filterOk;
  });
  document.getElementById('page-achievements').innerHTML=`
    <div class="toolbar">
      <div class="search"><input id="achievementSearch" placeholder="Найти достижение..." value="${escapeHtml(ui.achievementSearch)}"></div>
      <button class="primary-btn" id="addAchievement">+ Своя цель</button>
      <div class="filter-tabs">${filterButtons('achievement',[['all','Все'],['todo','Не выполнены'],['done','Выполнены'],['Бронза','Бронза'],['Серебро','Серебро'],['Золото','Золото'],['Радужное','Радужные'],['Оникс','Оникс'],['Личное','Личные']],ui.achievementFilter)}</div>
    </div>
    <div class="achievement-list">${list.length?list.map(achievementRow).join(''):'<div class="empty">По этому фильтру ничего не найдено.</div>'}</div>`;
}

function renderData() {
  const s=stats();
  document.getElementById('page-data').innerHTML=`
    <div class="panel">
      <div class="panel-head"><div><h3>Резервная копия</h3><div class="panel-sub">Последнее сохранение: ${new Date(state.updatedAt).toLocaleString(currentLocale())}</div></div></div>
      <div class="data-actions">
        <div class="data-card"><h4>Экспорт JSON</h4><p>Скачает весь прогресс одним файлом. Храни его как резервную копию или перенеси на другое устройство.</p><button class="primary-btn" id="exportData">Скачать данные</button></div>
        <div class="data-card"><h4>Импорт JSON</h4><p>Заменит текущий прогресс данными из ранее скачанного файла.</p><button class="secondary-btn" id="importData">Выбрать файл</button></div>
        <div class="data-card"><h4>Полный сброс</h4><p>Удалит все изменения и вернёт первоначальные значения, включая предзаполненный известный прогресс.</p><button class="danger-btn" id="resetData">Сбросить сайт</button></div>
      </div>
      <p class="note" style="margin-top:18px">В базе: ${TOON_DATA.length} тунов, ${TWISTED_DATA.length} твистед и ${ACHIEVEMENT_DATA.length} официальных достижений. Список основан на актуальном составе игры на момент создания версии; новые цели можно добавлять вручную.</p>
    </div>
    <div class="panel cloud-panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Аккаунт и облачное сохранение</h3><div class="panel-sub">Каждый пользователь получает отдельный прогресс</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secondary-btn" id="managePublicProfileData">Публичный профиль</button><button class="secondary-btn" id="manageAccountData">Открыть аккаунт</button></div></div>
      <p class="note">Без входа данные остаются только в этом браузере. После подключения Supabase и входа они сохраняются в личной строке пользователя и доступны на другом устройстве.</p>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h3>Изображения и источники</h3><div class="panel-sub">Рендеры загружаются с Dandy’s World Wiki</div></div></div>
      <p class="note">Dandy’s Progress — неофициальный фанатский трекер. Названия и изображения персонажей принадлежат их правообладателям. Если внешний источник недоступен, вместо картинки показываются инициалы.</p>
    </div>
    <div class="panel" style="margin-top:18px"><h3>Краткая сводка</h3><div class="stat-grid" style="margin-bottom:0">${statCard('Туны',s.owned,`из ${TOON_DATA.length} получено`,'☺')}${statCard('Мастерства',s.mastered,`из ${TOON_DATA.length} завершено`,'✦')}${statCard('Тринкеты',s.trinkets,`из ${TWISTED_DATA.length} получено`,'◉')}${statCard('Достижения',s.achievements,`из ${s.achievementTotal} выполнено`,'◆')}</div></div>`;
}


function renderSupport() {
  document.getElementById('page-support').innerHTML = `
    <div class="support-wrap">
      <div class="panel support-panel">
        <div class="support-heart" aria-hidden="true">♡</div>
        <p class="eyebrow">Добровольная поддержка</p>
        <h2>Помочь развитию Dandy’s Progress</h2>
        <p>Сайт остаётся бесплатным для всех. Поддержка помогает обновлять данные после обновлений игры, исправлять ошибки и добавлять новые функции.</p>
        <p class="note">Оплата проходит на стороне Boosty. Dandy’s Progress не получает и не хранит данные банковской карты.</p>
        <a class="primary-btn support-link" href="https://boosty.to/dandysprogress1/donate" target="_blank" rel="noopener noreferrer">Перейти на Boosty</a>
        <small class="support-footnote">Поддерживать проект необязательно. Все основные функции трекера останутся бесплатными.</small>
      </div>
    </div>`;
}

function renderAll() {
  renderDashboard(); renderCommunity(); renderToons(); renderTwisteds(); renderAchievements(); renderData(); renderSupport(); window.renderSocialPage?.(); bindDynamic();
  window.I18N?.translate?.(document);
}

function bindDynamic() {
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));
  document.querySelectorAll('[data-community-view]').forEach(button=>button.onclick=()=>{ui.communityView=button.dataset.communityView;renderCommunity();bindDynamic();});
  const communitySearch=document.getElementById('communitySearch'); if(communitySearch) communitySearch.oninput=e=>{ui.communitySearch=e.target.value;renderCommunity();bindDynamic();};
  document.querySelectorAll('[data-open-profile]').forEach(card=>{const open=e=>{if(e?.target?.closest?.('[data-compare-profile]'))return;openPublicProfile(card.dataset.openProfile);};card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}};});
  document.querySelectorAll('[data-compare-profile]').forEach(button=>button.onclick=e=>{e.stopPropagation();const name=button.dataset.compareProfile;ensureCompareSelection();if(ui.compareA===name){}else if(ui.compareB===name){const old=ui.compareA;ui.compareA=name;ui.compareB=old;}else{ui.compareB=name;}ui.communityView='compare';renderCommunity();bindDynamic();});
  document.querySelectorAll('[data-award-badge]').forEach(button=>button.onclick=e=>{e.stopPropagation();window.DANDYS_BADGES?.openAdmin?.(button.dataset.awardBadge);});
  const leaderboardMetric=document.getElementById('leaderboardMetric'); if(leaderboardMetric) leaderboardMetric.onchange=e=>{ui.leaderboardMetric=e.target.value;renderCommunity();bindDynamic();};
  const compareA=document.getElementById('compareA'); if(compareA) compareA.onchange=e=>{ui.compareA=e.target.value;if(ui.compareA===ui.compareB)ui.compareB=community.profiles.find(p=>p.username!==ui.compareA)?.username||'';renderCommunity();bindDynamic();};
  const compareB=document.getElementById('compareB'); if(compareB) compareB.onchange=e=>{ui.compareB=e.target.value;if(ui.compareA===ui.compareB)ui.compareA=community.profiles.find(p=>p.username!==ui.compareB)?.username||'';renderCommunity();bindDynamic();};
  const swapCompare=document.getElementById('swapCompare'); if(swapCompare) swapCompare.onclick=()=>{[ui.compareA,ui.compareB]=[ui.compareB,ui.compareA];renderCommunity();bindDynamic();};
  const communityMy=document.getElementById('communityMyProfile'); if(communityMy) communityMy.onclick=()=>{if(typeof window.openMyPublicProfile==='function')window.openMyPublicProfile();else document.getElementById('authDialog').showModal();};
  const refreshTop=document.getElementById('communityRefreshTop'); if(refreshTop) refreshTop.onclick=()=>window.refreshCommunityProfiles?.();
  const refresh=document.getElementById('communityRefresh'); if(refresh) refresh.onclick=()=>window.refreshCommunityProfiles?.();
  const communitySetup=document.getElementById('communityAccountSetup'); if(communitySetup) communitySetup.onclick=()=>document.getElementById('authDialog').showModal();
  document.querySelectorAll('[data-global]').forEach(el=>el.onchange=()=>{ state.global[el.dataset.global]=el.type==='number'?Number(el.value):el.value; save(false); });

  const toonSearch=document.getElementById('toonSearch'); if(toonSearch) toonSearch.oninput=e=>{ui.toonSearch=e.target.value;renderToons();bindDynamic();};
  document.querySelectorAll('[data-toon-filter]').forEach(b=>b.onclick=()=>{ui.toonFilter=b.dataset.toonFilter;renderToons();bindDynamic();});
  document.querySelectorAll('[data-toon-field]').forEach(el=>el.onchange=()=>{const st=state.toons[el.dataset.id];st[el.dataset.toonField]=el.checked;save();});
  document.querySelectorAll('.open-toon').forEach(b=>b.onclick=()=>openToonDialog(b.dataset.id));

  const twistedSearch=document.getElementById('twistedSearch'); if(twistedSearch) twistedSearch.oninput=e=>{ui.twistedSearch=e.target.value;renderTwisteds();bindDynamic();};
  document.querySelectorAll('[data-twisted-filter]').forEach(b=>b.onclick=()=>{ui.twistedFilter=b.dataset.twistedFilter;renderTwisteds();bindDynamic();});
  document.querySelectorAll('[data-twisted-field]').forEach(el=>el.onchange=()=>{state.twisteds[el.dataset.id][el.dataset.twistedField]=el.checked;save();});
  document.querySelectorAll('[data-research-range]').forEach(el=>el.oninput=()=>updateResearch(el.dataset.researchRange,el.value));
  document.querySelectorAll('[data-research-number]').forEach(el=>el.onchange=()=>updateResearch(el.dataset.researchNumber,el.value));
  document.querySelectorAll('[data-twisted-notes]').forEach(el=>el.onchange=()=>{state.twisteds[el.dataset.twistedNotes].notes=el.value;save(false);});

  const achievementSearch=document.getElementById('achievementSearch'); if(achievementSearch) achievementSearch.oninput=e=>{ui.achievementSearch=e.target.value;renderAchievements();bindDynamic();};
  document.querySelectorAll('[data-achievement-filter]').forEach(b=>b.onclick=()=>{ui.achievementFilter=b.dataset.achievementFilter;renderAchievements();bindDynamic();});
  document.querySelectorAll('[data-achievement-current]').forEach(el=>el.onchange=()=>updateAchievement(el.dataset.achievementCurrent,el.dataset.custom==='1','current',Number(el.value)));
  document.querySelectorAll('[data-achievement-done]').forEach(el=>el.onchange=()=>updateAchievement(el.dataset.achievementDone,el.dataset.custom==='1','done',el.checked));
  document.querySelectorAll('.delete-achievement').forEach(b=>b.onclick=()=>{state.customAchievements=state.customAchievements.filter(a=>a.id!==b.dataset.id);save();toast('Личная цель удалена');});
  const add=document.getElementById('addAchievement'); if(add) add.onclick=()=>document.getElementById('achievementDialog').showModal();

  const exp=document.getElementById('exportData'); if(exp) exp.onclick=exportData;
  const imp=document.getElementById('importData'); if(imp) imp.onclick=()=>document.getElementById('importFile').click();
  const reset=document.getElementById('resetData'); if(reset) reset.onclick=resetAll;
  const manageAccount=document.getElementById('manageAccountData'); if(manageAccount) manageAccount.onclick=()=>document.getElementById('authDialog').showModal();
  const managePublic=document.getElementById('managePublicProfileData'); if(managePublic) managePublic.onclick=()=>window.openMyPublicProfile?.();
  window.I18N?.translate?.(document);
}

function updateResearch(id,value) {
  const n=clamp(value,0,100); const st=state.twisteds[id]; st.research=n; if(n>0)st.seen=true; if(n>=100)st.trinket=true; save();
}

function updateAchievement(id,isCustom,field,value) {
  if(isCustom){const a=state.customAchievements.find(x=>x.id===id);if(a)a[field]=value;}
  else { state.achievements[id] ||= {current:0,done:false}; state.achievements[id][field]=value; }
  save();
}

function openToonDialog(id) {
  ui.activeToon=id;
  const t=TOON_DATA.find(x=>x.id===id), st=state.toons[id];
  document.getElementById('toonDialogTitle').textContent = window.I18N?.language === 'en' ? t.name : `${t.ru} · ${t.name}`;
  document.getElementById('toonDialogBody').innerHTML=`
    <div class="mastery-head">
      <label class="check-chip"><input type="checkbox" id="dialogOwned" ${st.owned?'checked':''}><span>Тун получен</span></label>
      <label class="check-chip"><input type="checkbox" id="dialogMastery" ${st.mastery?'checked':''}><span>Мастерство</span></label>
      <label class="check-chip"><input type="checkbox" id="dialogVintage" ${st.vintage?'checked':''}><span>Винтажный скин</span></label>
    </div>
    <div class="panel-head"><div><h3>Задания мастерства</h3><div class="panel-sub">Точные требования из вики игры; значения прогресса вводятся вручную</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="secondary-btn" id="restoreWikiTasks">Из вики</button><button type="button" class="secondary-btn" id="addTask">+ Задание</button></div></div>
    <div class="task-list" id="taskList">${st.tasks.map((task,i)=>taskRow(task,i)).join('')}</div>
    <label style="display:grid;gap:7px;margin-top:16px;color:var(--muted);font-size:12px">Заметки<textarea id="toonNotes" rows="3" placeholder="Билд, оставшиеся задания, план фарма...">${escapeHtml(st.notes)}</textarea></label>`;
  bindToonDialog();
  window.I18N?.translate?.(document.getElementById('toonDialog'));
  const dialog = document.getElementById('toonDialog');
  if (!dialog.open) dialog.showModal();
}

function taskRow(task,index) {
  return `<div class="task-row" data-task-index="${index}">
    <input class="task-label" data-task-field="label" value="${escapeHtml(localizedTaskLabel(task.label))}">
    <input data-task-field="current" type="number" min="0" value="${Number(task.current)||0}">
    <span class="slash">/</span>
    <input data-task-field="target" type="number" min="1" value="${Number(task.target)||1}">
    <button type="button" class="icon-btn remove-task" title="Удалить">×</button>
  </div>`;
}

function bindToonDialog() {
  const id=ui.activeToon, st=state.toons[id];
  document.getElementById('dialogOwned').onchange=e=>{st.owned=e.target.checked;save(false);};
  document.getElementById('dialogMastery').onchange=e=>{st.mastery=e.target.checked;if(e.target.checked)st.tasks.forEach(task=>task.current=task.target);save(false);openToonDialog(id);};
  document.getElementById('dialogVintage').onchange=e=>{st.vintage=e.target.checked;save(false);};
  document.getElementById('toonNotes').onchange=e=>{st.notes=e.target.value;save(false);};
  document.querySelectorAll('#taskList [data-task-field]').forEach(el=>el.onchange=()=>{
    const index=Number(el.closest('.task-row').dataset.taskIndex); const field=el.dataset.taskField;
    st.tasks[index][field]=field==='label'?el.value:Number(el.value); syncMastery(st); save(false);
  });
  document.querySelectorAll('#taskList .remove-task').forEach(btn=>btn.onclick=()=>{const i=Number(btn.closest('.task-row').dataset.taskIndex);st.tasks.splice(i,1);save(false);openToonDialog(id);});
  document.getElementById('restoreWikiTasks').onclick=()=>{st.tasks=migrateMasteryTasks(id,st.tasks);syncMastery(st);save(false);openToonDialog(id);toast('Задания восстановлены из вики');};
  document.getElementById('addTask').onclick=()=>{st.tasks.push({id:`custom-${Date.now()}`,label:'Новое задание',current:0,target:1});save(false);openToonDialog(id);};
}

function exportData() {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`dandys-progress-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); toast('Резервная копия скачана');
}

function resetAll() {
  if(!confirm(tr('Точно сбросить весь прогресс? Это действие нельзя отменить без резервной копии.')))return;
  state=seedState(); save(); toast('Прогресс сброшен');
}

function importData(file) {
  const reader=new FileReader();
  reader.onload=()=>{try{state=mergeState(JSON.parse(reader.result));save();toast('Данные импортированы');}catch{alert(tr('Файл повреждён или имеет неверный формат.'));}};
  reader.readAsText(file);
}

// Static listeners
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.add('open');
document.getElementById('mobileClose').onclick=()=>document.getElementById('sidebar').classList.remove('open');
document.getElementById('quickExport').onclick=exportData;
document.getElementById('accountButton').onclick=()=>document.getElementById('authDialog').showModal();
document.getElementById('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value='';};
document.getElementById('resetToon').onclick=()=>{if(!ui.activeToon)return;if(confirm(tr('Сбросить прогресс этого туна?'))){state.toons[ui.activeToon]={owned:false,mastery:false,vintage:false,notes:'',tasks:getMasteryTasks(ui.activeToon)};save(false);document.getElementById('toonDialog').close();renderAll();toast('Прогресс туна сброшен');}};
document.getElementById('toonDialog').addEventListener('close',()=>renderAll());
document.getElementById('closePublicProfile').onclick=()=>{document.getElementById('publicProfileDialog').close();setPublicProfileHash();};
document.getElementById('publicProfileDialog').addEventListener('cancel',()=>setPublicProfileHash());
document.getElementById('languageToggle').onclick = () => window.I18N?.toggle?.();
window.addEventListener('dandys-language-change', () => {
  const activePage = document.querySelector('.nav-btn.active')?.dataset.page || 'dashboard';
  const toonWasOpen = document.getElementById('toonDialog')?.open && ui.activeToon;
  const publicWasOpen = document.getElementById('publicProfileDialog')?.open;
  const publicUsername = new URLSearchParams(location.hash.replace(/^#/, '')).get('player');
  renderAll();
  navigate(activePage);
  if (toonWasOpen) openToonDialog(ui.activeToon);
  if (publicWasOpen && publicUsername) openPublicProfile(publicUsername);
  window.refreshAuthLanguage?.();
  window.refreshSocialLanguage?.();
  window.DANDYS_BADGES?.refreshLanguage?.();
});
window.addEventListener('dandys-badges-change', () => {
  const publicUsername = new URLSearchParams(location.hash.replace(/^#/, '')).get('player');
  renderCommunity();
  bindDynamic();
  if (document.getElementById('publicProfileDialog')?.open && publicUsername) openPublicProfile(publicUsername);
});
document.getElementById('achievementForm').addEventListener('submit',e=>{
  const fd=new FormData(e.target); const name=String(fd.get('name')||'').trim(); if(!name)return;
  state.customAchievements.push({id:`custom-${Date.now()}`,name,tier:String(fd.get('tier')),description:String(fd.get('description')),current:Number(fd.get('current'))||0,target:Math.max(1,Number(fd.get('target'))||1),done:false});
  e.target.reset(); save(); toast('Личная цель добавлена');
});

renderAll();
navigate('dashboard');
