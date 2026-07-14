(() => {
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  const page = document.getElementById('page-friends');
  const badge = document.getElementById('socialUnreadBadge');
  if (!page || !badge) return;

  let client = null;
  let session = null;
  let channel = null;
  let pollTimer = null;
  let refreshTimer = null;
  let searchTimer = null;
  let busy = false;

  const social = {
    status: configured ? 'signed-out' : 'setup',
    error: '',
    tab: 'friends',
    friendships: [],
    profiles: new Map(),
    messages: [],
    unread: new Map(),
    blocked: new Set(),
    activeFriendId: '',
    search: '',
    searchResults: [],
    searchStatus: 'idle',
  };

  const t = value => window.I18N?.text?.(value) || value;
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const dateTime = value => value ? new Date(value).toLocaleString(window.I18N?.locale?.() || 'ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const timeOnly = value => value ? new Date(value).toLocaleTimeString(window.I18N?.locale?.() || 'ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

  function me() { return session?.user?.id || ''; }
  function otherId(friendship) { return friendship.requester_id === me() ? friendship.addressee_id : friendship.requester_id; }
  function profileFor(userId) {
    return social.profiles.get(userId) || { user_id: userId, username: 'player', display_name: t('Игрок'), bio: '', avatar_toon: 'boxten', public_data: {} };
  }
  function avatar(profile) {
    return window.profileAvatarMarkup?.(profile) || `<div class="avatar social-fallback-avatar">${esc((profile.display_name || profile.username || '?').slice(0, 1).toUpperCase())}</div>`;
  }
  function relationWith(userId) {
    return social.friendships.find(row => otherId(row) === userId) || null;
  }
  function acceptedFriends() { return social.friendships.filter(row => row.status === 'accepted'); }
  function incomingRequests() { return social.friendships.filter(row => row.status === 'pending' && row.addressee_id === me()); }
  function outgoingRequests() { return social.friendships.filter(row => row.status === 'pending' && row.requester_id === me()); }
  function totalUnread() { return [...social.unread.values()].reduce((sum, value) => sum + value, 0); }

  function updateBadge() {
    const count = totalUnread();
    badge.hidden = count <= 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.title = `${t('Непрочитанные сообщения')}: ${count}`;
  }

  function setupState(kind, message = '') {
    social.status = kind;
    social.error = message;
    render();
  }

  async function getClientAndSession() {
    client = window.getDandysSupabase?.() || window.dandysSupabase || client;
    session = window.getDandysSession?.() || session;
    if (!configured) return setupState('setup');
    if (!client) return false;
    if (!session) {
      const result = await client.auth.getSession();
      session = result.data.session;
    }
    if (!session) {
      setupState('signed-out');
      clearRealtime();
      return false;
    }
    return true;
  }

  async function fetchProfiles(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return;
    const { data, error } = await client
      .from('public_profiles')
      .select('user_id, username, display_name, bio, avatar_toon, is_public, public_data, updated_at')
      .in('user_id', unique);
    if (error) throw error;
    (data || []).forEach(profile => social.profiles.set(profile.user_id, profile));
  }

  async function refreshSocial(options = {}) {
    if (busy && !options.force) return;
    const ready = await getClientAndSession();
    if (!ready) return;
    busy = true;
    social.status = 'loading';
    if (!options.quiet) render();
    try {
      const [friendResult, unreadResult, blockResult] = await Promise.all([
        client.from('friendships').select('id, requester_id, addressee_id, status, created_at, updated_at').order('updated_at', { ascending: false }),
        client.from('direct_messages').select('sender_id').eq('recipient_id', me()).is('read_at', null).limit(1000),
        client.from('user_blocks').select('blocked_id').eq('blocker_id', me()),
      ]);
      if (friendResult.error) throw friendResult.error;
      if (unreadResult.error) throw unreadResult.error;
      if (blockResult.error) throw blockResult.error;

      social.friendships = friendResult.data || [];
      social.blocked = new Set((blockResult.data || []).map(row => row.blocked_id));
      social.unread = new Map();
      (unreadResult.data || []).forEach(row => social.unread.set(row.sender_id, (social.unread.get(row.sender_id) || 0) + 1));
      await fetchProfiles(social.friendships.map(otherId));

      const friends = acceptedFriends();
      if (social.activeFriendId && !friends.some(row => otherId(row) === social.activeFriendId)) {
        social.activeFriendId = '';
        social.messages = [];
      }
      if (!social.activeFriendId && friends.length) social.activeFriendId = otherId(friends[0]);
      social.status = 'ready';
      social.error = '';
      updateBadge();
      if (social.activeFriendId && options.loadMessages !== false) await loadMessages(social.activeFriendId, false);
      render();
      subscribeRealtime();
    } catch (error) {
      console.error(error);
      social.status = 'error';
      social.error = error.message || String(error);
      render();
    } finally {
      busy = false;
    }
  }

  async function loadMessages(friendId, shouldRender = true) {
    if (!client || !session || !friendId) return;
    const { data, error } = await client
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .in('sender_id', [me(), friendId])
      .in('recipient_id', [me(), friendId])
      .order('created_at', { ascending: true })
      .limit(120);
    if (error) {
      social.error = error.message;
      if (shouldRender) render();
      return;
    }
    social.messages = data || [];
    await markRead(friendId);
    social.unread.delete(friendId);
    updateBadge();
    if (shouldRender) render();
  }

  async function markRead(friendId) {
    if (!friendId || !client || !session) return;
    await client.from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', friendId)
      .eq('recipient_id', me())
      .is('read_at', null);
  }

  async function sendMessage(body) {
    const friendId = social.activeFriendId;
    const text = String(body || '').trim().slice(0, 500);
    if (!text || !friendId || !session) return;
    const tempId = `temp-${Date.now()}`;
    social.messages.push({ id: tempId, sender_id: me(), recipient_id: friendId, body: text, created_at: new Date().toISOString(), read_at: null });
    render();
    const { data, error } = await client.from('direct_messages')
      .insert({ sender_id: me(), recipient_id: friendId, body: text })
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .single();
    if (error) {
      social.messages = social.messages.filter(message => message.id !== tempId);
      social.error = error.message;
      render();
      return;
    }
    social.messages = social.messages.map(message => message.id === tempId ? data : message);
    render();
  }

  async function sendFriendRequest(userId) {
    if (!session || !userId || userId === me()) return;
    const { error } = await client.from('friendships').insert({ requester_id: me(), addressee_id: userId, status: 'pending' });
    if (error) {
      social.error = error.code === '23505' ? t('Заявка уже существует.') : error.message;
      render();
      return;
    }
    window.toast?.('Заявка в друзья отправлена');
    await refreshSocial({ force: true, quiet: true });
  }

  async function acceptRequest(id) {
    const { error } = await client.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return showError(error);
    await refreshSocial({ force: true, quiet: true });
    const relation = social.friendships.find(row => row.id === Number(id));
    if (relation) {
      social.activeFriendId = otherId(relation);
      social.tab = 'friends';
    }
    render();
  }

  async function deleteFriendship(id, confirmation = '') {
    if (confirmation && !confirm(t(confirmation))) return;
    const { error } = await client.from('friendships').delete().eq('id', id);
    if (error) return showError(error);
    await refreshSocial({ force: true, quiet: true });
  }

  async function blockUser(userId) {
    if (!confirm(t('Заблокировать этого игрока? Он не сможет отправлять вам заявки и сообщения.'))) return;
    const relation = relationWith(userId);
    const { error } = await client.from('user_blocks').upsert({ blocker_id: me(), blocked_id: userId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) return showError(error);
    if (relation) await client.from('friendships').delete().eq('id', relation.id);
    social.activeFriendId = '';
    social.messages = [];
    await refreshSocial({ force: true, quiet: true });
  }

  async function unblockUser(userId) {
    const { error } = await client.from('user_blocks').delete().eq('blocker_id', me()).eq('blocked_id', userId);
    if (error) return showError(error);
    await refreshSocial({ force: true, quiet: true });
  }

  function showError(error) {
    social.error = error?.message || String(error);
    render();
  }

  async function searchProfiles(term) {
    const query = String(term || '').trim().replace(/[%_(),]/g, '').slice(0, 32);
    social.search = term;
    if (query.length < 2 || !client || !session) {
      social.searchStatus = 'idle';
      social.searchResults = [];
      render();
      return;
    }
    social.searchStatus = 'loading';
    render();
    const [byUsername, byDisplay] = await Promise.all([
      client.from('public_profiles').select('user_id, username, display_name, bio, avatar_toon, public_data, updated_at').eq('is_public', true).neq('user_id', me()).ilike('username', `%${query}%`).limit(12),
      client.from('public_profiles').select('user_id, username, display_name, bio, avatar_toon, public_data, updated_at').eq('is_public', true).neq('user_id', me()).ilike('display_name', `%${query}%`).limit(12),
    ]);
    if (byUsername.error || byDisplay.error) {
      social.searchStatus = 'error';
      social.error = byUsername.error?.message || byDisplay.error?.message || '';
      render();
      return;
    }
    const merged = new Map();
    [...(byUsername.data || []), ...(byDisplay.data || [])].forEach(profile => {
      merged.set(profile.user_id, profile);
      social.profiles.set(profile.user_id, profile);
    });
    social.searchResults = [...merged.values()];
    social.searchStatus = 'ready';
    render();
  }

  function relationLabel(userId) {
    if (userId === me()) return 'Это вы';
    if (social.blocked.has(userId)) return 'Заблокирован';
    const relation = relationWith(userId);
    if (!relation) return 'Добавить в друзья';
    if (relation.status === 'accepted') return 'Написать сообщение';
    if (relation.requester_id === me()) return 'Заявка отправлена';
    return 'Принять заявку';
  }
  window.socialProfileActionLabel = relationLabel;

  async function handleProfile(profile) {
    if (!configured || !session) {
      document.getElementById('publicProfileDialog')?.close();
      document.getElementById('authDialog')?.showModal();
      return;
    }
    if (!profile?.user_id || profile.user_id === me()) return;
    const relation = relationWith(profile.user_id);
    if (relation?.status === 'accepted') {
      social.activeFriendId = profile.user_id;
      social.tab = 'friends';
      document.getElementById('publicProfileDialog')?.close();
      window.navigate?.('friends');
      document.querySelector('.nav-btn[data-page="friends"]')?.click();
      await loadMessages(profile.user_id);
      return;
    }
    if (relation?.status === 'pending' && relation.addressee_id === me()) {
      await acceptRequest(relation.id);
      return;
    }
    if (relation?.status === 'pending') {
      window.toast?.('Заявка уже отправлена');
      return;
    }
    await sendFriendRequest(profile.user_id);
    const button = document.getElementById('friendViewedProfile');
    if (button) button.textContent = t(relationLabel(profile.user_id));
  }
  window.socialHandleProfile = handleProfile;

  function profileRow(profile, rightHtml = '') {
    return `<div class="social-person-row">
      <button class="social-person-open" data-action="open-profile" data-username="${esc(profile.username)}" type="button">
        ${avatar(profile)}
        <span><strong>${esc(profile.display_name || profile.username)}</strong><small>@${esc(profile.username)}</small></span>
      </button>
      <div class="social-row-actions">${rightHtml}</div>
    </div>`;
  }

  function renderGate(icon, title, description, button = '') {
    return `<div class="social-gate panel"><div class="social-gate-icon">${icon}</div><h2>${title}</h2><p>${description}</p>${button}</div>`;
  }

  function renderHero() {
    return `<section class="social-hero">
      <div><p class="eyebrow">Gardenview mail room</p><h2>Друзья и сообщения</h2><p>Добавляй знакомых игроков, принимай заявки и общайся прямо в Dandy’s Progress.</p></div>
      <div class="social-hero-stats"><span><b>${acceptedFriends().length}</b> друзей</span><span><b>${incomingRequests().length}</b> заявок</span><span><b>${totalUnread()}</b> новых</span></div>
    </section>`;
  }

  function renderTabs() {
    return `<div class="social-tabs" role="tablist">
      <button class="social-tab ${social.tab === 'friends' ? 'active' : ''}" data-action="set-tab" data-tab="friends">Друзья <span>${acceptedFriends().length}</span></button>
      <button class="social-tab ${social.tab === 'requests' ? 'active' : ''}" data-action="set-tab" data-tab="requests">Заявки <span>${incomingRequests().length}</span></button>
      <button class="social-tab ${social.tab === 'search' ? 'active' : ''}" data-action="set-tab" data-tab="search">Найти игроков</button>
    </div>`;
  }

  function renderFriendList() {
    const rows = acceptedFriends();
    if (!rows.length) return `<div class="social-empty"><b>Список друзей пока пуст</b><span>Найди игрока по нику или открой его публичный профиль.</span><button class="primary-btn" data-action="set-tab" data-tab="search">Найти игроков</button></div>`;
    return rows.map(row => {
      const userId = otherId(row);
      const profile = profileFor(userId);
      const unread = social.unread.get(userId) || 0;
      return `<button class="social-contact ${social.activeFriendId === userId ? 'active' : ''}" data-action="select-friend" data-user-id="${userId}" type="button">
        ${avatar(profile)}
        <span><strong>${esc(profile.display_name || profile.username)}</strong><small>@${esc(profile.username)}</small></span>
        ${unread ? `<b class="message-count">${unread > 99 ? '99+' : unread}</b>` : '<i class="contact-dot"></i>'}
      </button>`;
    }).join('');
  }

  function renderMessages(friendId) {
    const rows = social.messages.filter(message => [message.sender_id, message.recipient_id].includes(friendId));
    if (!rows.length) return `<div class="chat-empty"><span>✉</span><b>Начните разговор</b><p>Напишите первое сообщение. Не отправляйте пароли, email и другие личные данные.</p></div>`;
    let lastDay = '';
    return rows.map(message => {
      const mine = message.sender_id === me();
      const day = new Date(message.created_at).toLocaleDateString(window.I18N?.locale?.() || 'ru-RU', { day: 'numeric', month: 'long' });
      const divider = day !== lastDay ? `<div class="chat-day"><span>${esc(day)}</span></div>` : '';
      lastDay = day;
      return `${divider}<div class="chat-line ${mine ? 'mine' : 'theirs'}"><div class="chat-bubble"><p>${esc(message.body).replace(/\n/g, '<br>')}</p><small>${esc(timeOnly(message.created_at))}${mine ? (message.read_at ? ' · ✓✓' : ' · ✓') : ''}</small></div></div>`;
    }).join('');
  }

  function renderChat() {
    const friendId = social.activeFriendId;
    if (!friendId) return `<div class="social-chat social-chat-placeholder"><div><span>✉</span><h3>Выбери друга</h3><p>Здесь появится история сообщений.</p></div></div>`;
    const relation = relationWith(friendId);
    if (!relation || relation.status !== 'accepted') return '';
    const profile = profileFor(friendId);
    return `<div class="social-chat">
      <header class="chat-head">
        <button class="chat-profile" data-action="open-profile" data-username="${esc(profile.username)}" type="button">${avatar(profile)}<span><strong>${esc(profile.display_name || profile.username)}</strong><small>@${esc(profile.username)}</small></span></button>
        <div class="chat-actions"><button class="ghost-btn" data-action="remove-friend" data-id="${relation.id}" type="button">Удалить</button><button class="danger-btn compact" data-action="block-user" data-user-id="${friendId}" type="button">Заблокировать</button></div>
      </header>
      <div class="chat-scroll" id="chatScroll">${renderMessages(friendId)}</div>
      <form class="chat-composer" id="chatComposer"><textarea id="chatInput" rows="1" maxlength="500" placeholder="Написать сообщение…"></textarea><button class="primary-btn" type="submit">Отправить</button></form>
      <p class="chat-privacy">Сообщения видны только участникам переписки, но не имеют сквозного шифрования.</p>
    </div>`;
  }

  function renderFriends() {
    return `<div class="social-layout"><aside class="social-contacts"><div class="social-contacts-head"><b>Ваши друзья</b><button class="icon-btn" data-action="refresh" title="Обновить">↻</button></div>${renderFriendList()}</aside>${renderChat()}</div>`;
  }

  function renderRequests() {
    const incoming = incomingRequests();
    const outgoing = outgoingRequests();
    const blocked = [...social.blocked];
    const incomingHtml = incoming.length ? incoming.map(row => {
      const profile = profileFor(otherId(row));
      return profileRow(profile, `<button class="primary-btn compact" data-action="accept" data-id="${row.id}">Принять</button><button class="ghost-btn compact" data-action="decline" data-id="${row.id}">Отклонить</button>`);
    }).join('') : `<div class="social-empty compact"><b>Новых заявок нет</b><span>Входящие заявки появятся здесь.</span></div>`;
    const outgoingHtml = outgoing.length ? outgoing.map(row => {
      const profile = profileFor(otherId(row));
      return profileRow(profile, `<button class="ghost-btn compact" data-action="cancel" data-id="${row.id}">Отменить</button>`);
    }).join('') : `<div class="social-empty compact"><b>Нет отправленных заявок</b><span>Найдите игрока во вкладке поиска.</span></div>`;
    const blockedHtml = blocked.length ? blocked.map(userId => {
      const profile = profileFor(userId);
      return profileRow(profile, `<button class="ghost-btn compact" data-action="unblock" data-user-id="${userId}">Разблокировать</button>`);
    }).join('') : `<p class="panel-sub">Список заблокированных пуст.</p>`;
    return `<div class="request-grid"><section class="panel"><div class="panel-head"><div><h3>Входящие заявки</h3><div class="panel-sub">Игроки, которые хотят добавить вас</div></div></div><div class="social-row-list">${incomingHtml}</div></section><section class="panel"><div class="panel-head"><div><h3>Отправленные заявки</h3><div class="panel-sub">Ожидают ответа другого игрока</div></div></div><div class="social-row-list">${outgoingHtml}</div></section><section class="panel span-2"><div class="panel-head"><div><h3>Заблокированные игроки</h3><div class="panel-sub">Они не могут отправлять вам заявки и сообщения</div></div></div><div class="social-row-list">${blockedHtml}</div></section></div>`;
  }

  function searchAction(profile) {
    const relation = relationWith(profile.user_id);
    if (social.blocked.has(profile.user_id)) return `<button class="ghost-btn compact" disabled>Заблокирован</button>`;
    if (!relation) return `<button class="primary-btn compact" data-action="send-request" data-user-id="${profile.user_id}">Добавить</button>`;
    if (relation.status === 'accepted') return `<button class="secondary-btn compact" data-action="select-friend" data-user-id="${profile.user_id}">Написать</button>`;
    if (relation.requester_id === me()) return `<button class="ghost-btn compact" disabled>Заявка отправлена</button>`;
    return `<button class="primary-btn compact" data-action="accept" data-id="${relation.id}">Принять</button>`;
  }

  function renderSearch() {
    let results = '';
    if (social.searchStatus === 'loading') results = `<div class="social-empty compact"><b>Ищем игроков…</b><span>Подождите несколько секунд.</span></div>`;
    else if (social.searchStatus === 'error') results = `<div class="social-empty compact"><b>Не удалось выполнить поиск</b><span>${esc(social.error)}</span></div>`;
    else if (social.search.trim().length < 2) results = `<div class="social-empty"><span class="search-mascot">⌕</span><b>Введите хотя бы два символа</b><span>Искать можно по нику или отображаемому имени.</span></div>`;
    else if (!social.searchResults.length) results = `<div class="social-empty"><b>Игроки не найдены</b><span>Проверьте ник или попробуйте другую часть имени.</span></div>`;
    else results = social.searchResults.map(profile => profileRow(profile, searchAction(profile))).join('');
    return `<section class="panel social-search-panel"><div class="panel-head"><div><h3>Найти друзей</h3><div class="panel-sub">В поиске показываются только открытые профили</div></div></div><label class="social-search"><span>⌕</span><input id="socialSearchInput" value="${esc(social.search)}" placeholder="Ник или имя игрока…" autocomplete="off"></label><div class="social-row-list search-results">${results}</div></section>`;
  }

  function render() {
    if (!configured || social.status === 'setup') {
      page.innerHTML = renderGate('⚙', t('Сначала подключите Supabase'), t('Друзья и сообщения используют облачную базу сайта.'), `<button class="primary-btn" data-action="open-account">${t('Открыть настройки аккаунта')}</button>`);
      bind();
      return;
    }
    if (!session || social.status === 'signed-out') {
      page.innerHTML = renderGate('✉', t('Войдите в аккаунт'), t('Друзья и сообщения доступны после входа в Dandy’s Progress.'), `<button class="primary-btn" data-action="open-account">${t('Войти')}</button>`);
      bind();
      return;
    }
    if (social.status === 'loading' && !social.friendships.length) {
      page.innerHTML = `${renderHero()}${renderGate('DW', t('Загружаем друзей…'), t('Это займёт несколько секунд.'))}`;
      bind();
      return;
    }
    if (social.status === 'error' && !social.friendships.length) {
      page.innerHTML = `${renderHero()}${renderGate('×', t('Не удалось загрузить друзей'), esc(social.error || t('Неизвестная ошибка')), `<button class="secondary-btn" data-action="refresh">${t('Попробовать снова')}</button>`)}`;
      bind();
      return;
    }
    let content = social.tab === 'requests' ? renderRequests() : social.tab === 'search' ? renderSearch() : renderFriends();
    page.innerHTML = `${renderHero()}${renderTabs()}${social.error ? `<div class="social-error">${esc(social.error)}<button class="icon-btn" data-action="clear-error">×</button></div>` : ''}${content}`;
    window.I18N?.translate?.(page);
    bind();
    requestAnimationFrame(() => {
      const scroller = document.getElementById('chatScroll');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
  }
  window.renderSocialPage = render;

  function bind() {
    window.I18N?.translate?.(page);
  }

  page.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'set-tab') { social.tab = button.dataset.tab; social.error = ''; render(); }
    else if (action === 'select-friend') { social.activeFriendId = button.dataset.userId; social.tab = 'friends'; await loadMessages(social.activeFriendId); }
    else if (action === 'accept') await acceptRequest(Number(button.dataset.id));
    else if (action === 'decline') await deleteFriendship(Number(button.dataset.id));
    else if (action === 'cancel') await deleteFriendship(Number(button.dataset.id));
    else if (action === 'remove-friend') await deleteFriendship(Number(button.dataset.id), 'Удалить этого игрока из друзей? История сообщений останется в базе, но переписка станет недоступна до повторного добавления.');
    else if (action === 'send-request') await sendFriendRequest(button.dataset.userId);
    else if (action === 'block-user') await blockUser(button.dataset.userId);
    else if (action === 'unblock') await unblockUser(button.dataset.userId);
    else if (action === 'refresh') await refreshSocial({ force: true });
    else if (action === 'open-account') document.getElementById('authDialog')?.showModal();
    else if (action === 'open-profile') {
      const profile = [...social.profiles.values()].find(item => item.username === button.dataset.username);
      if (profile) window.upsertCommunityProfile?.(profile);
      window.openPublicProfile?.(button.dataset.username);
    }
    else if (action === 'clear-error') { social.error = ''; render(); }
  });

  page.addEventListener('submit', async event => {
    if (event.target.id !== 'chatComposer') return;
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input?.value || '';
    if (input) input.value = '';
    await sendMessage(text);
  });

  page.addEventListener('keydown', event => {
    if (event.target.id === 'chatInput' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.target.form?.requestSubmit();
    }
  });

  page.addEventListener('input', event => {
    if (event.target.id !== 'socialSearchInput') return;
    social.search = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchProfiles(event.target.value), 350);
  });

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refreshSocial({ force: true, quiet: true }), 300);
  }

  function subscribeRealtime() {
    if (!client || !session || channel) return;
    channel = client.channel(`dandys-social-${me()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${me()}` }, payload => {
        const senderId = payload.new.sender_id;
        if (senderId === social.activeFriendId && document.querySelector('.nav-btn.active')?.dataset.page === 'friends') {
          loadMessages(senderId);
        } else {
          social.unread.set(senderId, (social.unread.get(senderId) || 0) + 1);
          updateBadge();
          render();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${me()}` }, () => {
        if (social.activeFriendId) loadMessages(social.activeFriendId);
      })
      .subscribe();
  }

  function clearRealtime() {
    if (client && channel) client.removeChannel(channel);
    channel = null;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    updateBadge();
  }

  window.socialPageOpened = async function socialPageOpened() {
    if (!session) await getClientAndSession();
    if (session && social.status !== 'ready') await refreshSocial({ force: true });
    else if (session && social.activeFriendId) await loadMessages(social.activeFriendId);
  };

  window.refreshSocialLanguage = function refreshSocialLanguage() { render(); };

  window.addEventListener('dandys-auth-change', async event => {
    session = event.detail?.session || null;
    social.friendships = [];
    social.messages = [];
    social.unread = new Map();
    social.profiles = new Map();
    social.activeFriendId = '';
    clearRealtime();
    if (session) {
      social.status = 'loading';
      await refreshSocial({ force: true });
      pollTimer = setInterval(() => refreshSocial({ force: true, quiet: true, loadMessages: false }), 30000);
    } else {
      social.status = configured ? 'signed-out' : 'setup';
      render();
    }
  });

  window.addEventListener('dandys-profile-change', event => {
    const profile = event.detail?.profile;
    if (profile?.user_id) social.profiles.set(profile.user_id, profile);
    render();
  });

  (async function initSocial() {
    render();
    const ready = await getClientAndSession();
    if (ready) {
      await refreshSocial({ force: true });
      pollTimer = setInterval(() => refreshSocial({ force: true, quiet: true, loadMessages: false }), 30000);
    }
  })().catch(error => setupState('error', error.message || String(error)));
})();
