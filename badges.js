(() => {
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  const dialog = document.getElementById('badgeAdminDialog');
  const accountButton = document.getElementById('authManageBadges');
  if (!dialog || !accountButton) return;

  let client = null;
  let session = null;
  let isAdmin = false;
  let profiles = [];
  let channel = null;
  const badges = new Map();

  const t = value => window.I18N?.text?.(value) || value;
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const allowedColors = new Set(['gold','green','blue','purple','pink','red','ink']);

  function safeColor(value) { return allowedColors.has(value) ? value : 'gold'; }
  function listFor(userId) { return badges.get(String(userId)) || []; }

  function renderBadges(userId, limit = 4) {
    const rows = listFor(userId).slice(0, Math.max(0, Number(limit) || 0));
    if (!rows.length) return '';
    const hidden = Math.max(0, listFor(userId).length - rows.length);
    return `<div class="profile-badges" aria-label="${esc(t('Бейджи'))}">${rows.map(row =>
      `<span class="profile-badge badge-${safeColor(row.color)}" title="${esc(row.description || row.name)}"><span class="profile-badge-icon">${esc(row.icon || '★')}</span><span>${esc(row.name)}</span></span>`
    ).join('')}${hidden ? `<span class="profile-badge badge-more">+${hidden}</span>` : ''}</div>`;
  }

  function adminButtonMarkup(userId) {
    if (!isAdmin || !userId) return '';
    return `<button class="ghost-btn badge-admin-inline" data-award-badge="${esc(userId)}" type="button">${esc(t('Управлять бейджами'))}</button>`;
  }

  function emitChange() {
    window.dispatchEvent(new CustomEvent('dandys-badges-change'));
  }

  async function getContext() {
    client = window.getDandysSupabase?.() || window.dandysSupabase || client;
    session = window.getDandysSession?.() || session;
    if (!configured || !client) return false;
    if (!session) {
      const result = await client.auth.getSession();
      session = result.data.session;
    }
    return true;
  }

  async function loadBadges() {
    if (!(await getContext())) return;
    const { data, error } = await client
      .from('profile_badges')
      .select('id, user_id, name, icon, color, description, created_at')
      .order('created_at', { ascending: true });
    if (error) {
      // До установки SQL сайт продолжает работать без бейджей.
      console.warn('Badges are unavailable:', error.message);
      return;
    }
    badges.clear();
    (data || []).forEach(row => {
      const key = String(row.user_id);
      if (!badges.has(key)) badges.set(key, []);
      badges.get(key).push(row);
    });
    emitChange();
  }

  async function checkAdmin() {
    if (!(await getContext()) || !session) {
      isAdmin = false;
      accountButton.hidden = true;
      return;
    }
    const { data, error } = await client
      .from('site_admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    isAdmin = !error && Boolean(data);
    accountButton.hidden = !isAdmin;
    emitChange();
  }

  async function loadProfiles() {
    if (!client || !session || !isAdmin) return;
    const { data, error } = await client
      .from('public_profiles')
      .select('user_id, username, display_name, is_public')
      .order('display_name', { ascending: true });
    if (error) throw error;
    profiles = data || [];
    const select = document.getElementById('badgePlayerSelect');
    const current = select.value;
    select.innerHTML = profiles.map(profile =>
      `<option value="${esc(profile.user_id)}">${esc(profile.display_name || profile.username)} (@${esc(profile.username)})${profile.is_public ? '' : ` · ${esc(t('Закрытый профиль'))}`}</option>`
    ).join('');
    if (profiles.some(profile => profile.user_id === current)) select.value = current;
  }

  function setMessage(text = '', kind = '') {
    const element = document.getElementById('badgeAdminMessage');
    element.textContent = t(text);
    element.className = `auth-message ${kind}`.trim();
  }

  // A compact single badge renderer used in the admin list.
  function oneBadge(row) {
    return `<span class="profile-badge badge-${safeColor(row.color)}" title="${esc(row.description || row.name)}"><span class="profile-badge-icon">${esc(row.icon || '★')}</span><span>${esc(row.name)}</span></span>`;
  }

  function renderAdminListSafe() {
    const userId = document.getElementById('badgePlayerSelect').value;
    const rows = listFor(userId);
    const host = document.getElementById('badgeAdminList');
    if (!rows.length) {
      host.innerHTML = `<div class="empty compact-empty">${esc(t('У игрока пока нет бейджей.'))}</div>`;
      return;
    }
    host.innerHTML = `<div class="badge-admin-list">${rows.map(row => `
      <article class="badge-admin-row">
        <div>${oneBadge(row)}</div>
        <div class="badge-admin-copy"><strong>${esc(row.name)}</strong><small>${esc(row.description || '—')}</small></div>
        <button class="danger-btn compact" type="button" data-delete-badge="${row.id}">${esc(t('Удалить'))}</button>
      </article>`).join('')}</div>`;
    host.querySelectorAll('[data-delete-badge]').forEach(button => {
      button.onclick = () => removeBadge(Number(button.dataset.deleteBadge));
    });
  }

  async function openAdmin(userId = '') {
    setMessage('');
    if (!(await getContext()) || !session) return;
    await checkAdmin();
    if (!isAdmin) {
      alert(t('Нет доступа к панели бейджей.'));
      return;
    }
    try {
      await Promise.all([loadProfiles(), loadBadges()]);
      const select = document.getElementById('badgePlayerSelect');
      if (userId && profiles.some(profile => profile.user_id === userId)) select.value = userId;
      renderAdminListSafe();
      window.I18N?.translate?.(dialog);
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      console.error(error);
      setMessage(error.message || String(error), 'error');
      if (!dialog.open) dialog.showModal();
    }
  }

  async function awardBadge() {
    if (!isAdmin || !session || !client) return;
    const user_id = document.getElementById('badgePlayerSelect').value;
    const name = document.getElementById('badgeName').value.trim().slice(0, 32);
    const icon = document.getElementById('badgeIcon').value.trim().slice(0, 8);
    const color = safeColor(document.getElementById('badgeColor').value);
    const description = document.getElementById('badgeDescription').value.trim().slice(0, 160);
    if (!user_id) return setMessage('Выбери игрока.', 'error');
    if (!name) return setMessage('Введи название бейджа.', 'error');
    if (!icon) return setMessage('Укажи значок или эмодзи.', 'error');
    setMessage('Сохраняем…');
    const { error } = await client.from('profile_badges').insert({
      user_id, name, icon, color, description, awarded_by: session.user.id,
    });
    if (error) return setMessage(error.message, 'error');
    document.getElementById('badgeName').value = '';
    document.getElementById('badgeIcon').value = '';
    document.getElementById('badgeDescription').value = '';
    await loadBadges();
    renderAdminListSafe();
    setMessage('Бейдж выдан.', 'good');
  }

  async function removeBadge(id) {
    if (!isAdmin || !client || !id) return;
    if (!confirm(t('Удалить бейдж?'))) return;
    const { error } = await client.from('profile_badges').delete().eq('id', id);
    if (error) return setMessage(error.message, 'error');
    await loadBadges();
    renderAdminListSafe();
    setMessage('Бейдж удалён.', 'good');
  }

  function subscribe() {
    if (!client || channel) return;
    channel = client.channel('dandys-profile-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_badges' }, () => loadBadges())
      .subscribe();
  }

  function clearSubscription() {
    if (channel && client) client.removeChannel(channel);
    channel = null;
  }

  async function boot() {
    if (!(await getContext())) return;
    await Promise.all([loadBadges(), checkAdmin()]);
    subscribe();
  }

  accountButton.addEventListener('click', () => openAdmin());
  document.getElementById('closeBadgeAdmin').addEventListener('click', () => dialog.close());
  document.getElementById('awardBadge').addEventListener('click', awardBadge);
  document.getElementById('badgePlayerSelect').addEventListener('change', renderAdminListSafe);

  window.addEventListener('dandys-auth-change', async event => {
    session = event.detail?.session || null;
    isAdmin = false;
    accountButton.hidden = true;
    clearSubscription();
    if (session) await boot();
    else {
      await loadBadges();
      emitChange();
    }
  });

  window.DANDYS_BADGES = {
    renderBadges,
    adminButtonMarkup,
    openAdmin,
    isAdmin: () => isAdmin,
    refresh: loadBadges,
    refreshLanguage() {
      accountButton.textContent = t('Управление бейджами');
      if (dialog.open) {
        window.I18N?.translate?.(dialog);
        renderAdminListSafe();
      }
    },
  };

  setTimeout(() => boot().catch(console.error), 0);
})();
