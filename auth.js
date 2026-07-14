(() => {
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  const accountButton = document.getElementById('accountButton');
  const dialog = document.getElementById('authDialog');
  const setupView = document.getElementById('authSetupView');
  const signedOutView = document.getElementById('authSignedOutView');
  const signedInView = document.getElementById('authSignedInView');
  const message = document.getElementById('authMessage');
  const profileDialog = document.getElementById('profileDialog');
  const profileMessage = document.getElementById('profileMessage');

  let client = null;
  let session = null;
  let myProfile = null;
  let saveTimer = null;
  let loadingCloud = false;

  window.getDandysSession = () => session;
  window.getDandysProfile = () => myProfile;
  window.getDandysSupabase = () => client;

  function showMessage(text = '', type = '') {
    message.textContent = window.I18N?.text?.(text) || text;
    message.className = `auth-message ${type}`.trim();
  }

  function showProfileMessage(text = '', type = '') {
    profileMessage.textContent = window.I18N?.text?.(text) || text;
    profileMessage.className = `auth-message ${type}`.trim();
  }

  function displayName(user) {
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || (window.I18N?.text?.('Пользователь') || 'Пользователь');
  }

  function sanitizeUsername(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
  }

  function setSaveLabel(text) {
    const el = document.getElementById('saveState');
    if (el) el.textContent = window.I18N?.text?.(text) || text;
  }

  function renderAuth() {
    setupView.hidden = configured;
    signedOutView.hidden = !configured || Boolean(session);
    signedInView.hidden = !configured || !session;
    window.I18N?.translate?.(dialog);

    if (!configured) {
      accountButton.textContent = 'Локально';
      accountButton.title = 'Облачные аккаунты ещё не подключены';
      return;
    }

    if (!session) {
      accountButton.textContent = 'Войти';
      accountButton.title = 'Войти или создать аккаунт';
      return;
    }

    const name = myProfile?.display_name || displayName(session.user);
    accountButton.textContent = name.length > 14 ? `${name.slice(0, 13)}…` : name;
    accountButton.title = session.user.email || name;
    document.getElementById('accountName').textContent = name;
    document.getElementById('accountEmail').textContent = session.user.email || '';
    const accountAvatar = document.getElementById('accountAvatar');
    const avatarUrl = window.normalizeProfileAvatarUrl?.(myProfile?.public_data?.avatarUrl) || '';
    if (avatarUrl) {
      accountAvatar.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${escapeHtml(name.slice(0, 1).toUpperCase())}'">`;
    } else {
      accountAvatar.textContent = name.slice(0, 1).toUpperCase();
    }
    window.I18N?.translate?.(dialog);
  }

  function defaultProfile() {
    const name = displayName(session?.user);
    const base = sanitizeUsername(name) || 'player';
    const suffix = session?.user?.id?.replace(/-/g, '').slice(-5) || Math.random().toString(36).slice(2, 7);
    return {
      user_id: session.user.id,
      username: `${base.slice(0, Math.max(3, 18 - suffix.length))}-${suffix}`,
      display_name: name.slice(0, 32),
      bio: '',
      avatar_toon: state.toons?.boxten?.owned ? 'boxten' : (TOON_DATA[0]?.id || 'boxten'),
      is_public: true,
      public_data: { ...(window.buildPublicSnapshot?.() || {}), avatarUrl: '' },
      updated_at: new Date().toISOString(),
    };
  }

  async function ensureProfile() {
    if (!configured || !session) return null;
    const { data, error } = await client
      .from('public_profiles')
      .select('user_id, username, display_name, bio, avatar_toon, is_public, public_data, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      showMessage(`Не удалось загрузить публичный профиль: ${error.message}`, 'error');
      return null;
    }

    if (data) {
      myProfile = data;
      renderAuth();
      return data;
    }

    const profile = defaultProfile();
    const { data: created, error: createError } = await client
      .from('public_profiles')
      .insert(profile)
      .select('user_id, username, display_name, bio, avatar_toon, is_public, public_data, updated_at')
      .single();

    if (createError) {
      console.error(createError);
      showMessage(`Не удалось создать публичный профиль: ${createError.message}`, 'error');
      return null;
    }

    myProfile = created;
    renderAuth();
    return created;
  }

  async function syncPublicSnapshot() {
    if (!configured || !session) return;
    if (!myProfile) await ensureProfile();
    if (!myProfile) return;
    const snapshot = {
      ...(window.buildPublicSnapshot?.() || {}),
      avatarUrl: window.normalizeProfileAvatarUrl?.(myProfile?.public_data?.avatarUrl) || '',
    };
    const updatedAt = new Date().toISOString();
    const { error } = await client
      .from('public_profiles')
      .update({ public_data: snapshot, updated_at: updatedAt })
      .eq('user_id', session.user.id);
    if (!error) {
      myProfile.public_data = snapshot;
      myProfile.updated_at = updatedAt;
    } else {
      console.error(error);
    }
  }

  async function uploadProgress(showToast = false) {
    if (!configured || !session || loadingCloud) return;
    setSaveLabel('Синхронизация…');
    const { error } = await client.from('user_progress').upsert({
      user_id: session.user.id,
      data: state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      setSaveLabel('Ошибка облака');
      showMessage(`Не удалось сохранить в облако: ${error.message}`, 'error');
      return;
    }

    await syncPublicSnapshot();
    setSaveLabel('Сохранено в облаке');
    document.getElementById('cloudStatusText').textContent = `Синхронизировано: ${new Date().toLocaleString(window.I18N?.locale?.() || 'ru-RU')}`;
    if (showToast) toast('Прогресс синхронизирован');
  }

  window.queueCloudSave = function queueCloudSave() {
    if (!configured || !session || loadingCloud) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => uploadProgress(false), 700);
  };

  async function loadProgress() {
    if (!session) return;
    loadingCloud = true;
    setSaveLabel('Загрузка облака…');

    const { data, error } = await client
      .from('user_progress')
      .select('data, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      loadingCloud = false;
      setSaveLabel('Ошибка облака');
      showMessage(`Не удалось загрузить прогресс: ${error.message}`, 'error');
      return;
    }

    if (data?.data) {
      state = mergeState(data.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      setSaveLabel('Загружено из облака');
      document.getElementById('cloudStatusText').textContent = `Последнее облачное сохранение: ${new Date(data.updated_at).toLocaleString(window.I18N?.locale?.() || 'ru-RU')}`;
    } else {
      await client.from('user_progress').upsert({
        user_id: session.user.id,
        data: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setSaveLabel('Сохранено в облаке');
      document.getElementById('cloudStatusText').textContent = 'Создано первое облачное сохранение с данными этого браузера.';
    }

    await ensureProfile();
    await syncPublicSnapshot();
    loadingCloud = false;
    renderAuth();
  }

  async function refreshCommunityProfiles() {
    if (!configured) {
      window.setCommunityState?.({ profiles: [], status: 'setup', error: '' });
      window.dispatchEvent(new CustomEvent('dandys-auth-change', { detail: { session: null } }));
      return;
    }
    window.setCommunityState?.({ status: 'loading', error: '' });
    const { data, error } = await client
      .from('public_profiles')
      .select('user_id, username, display_name, bio, avatar_toon, public_data, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      window.setCommunityState?.({ profiles: [], status: 'error', error: error.message });
      return;
    }
    window.setCommunityState?.({ profiles: data || [], status: 'ready', error: '' });
  }
  window.refreshCommunityProfiles = refreshCommunityProfiles;

  async function loadPublicProfileByUsername(username) {
    if (!configured || !username) return;
    const { data, error } = await client
      .from('public_profiles')
      .select('user_id, username, display_name, bio, avatar_toon, public_data, updated_at')
      .eq('username', String(username).toLowerCase())
      .maybeSingle();
    if (error || !data) return;
    const current = community?.profiles || [];
    const profiles = [data, ...current.filter(profile => profile.username !== data.username)];
    window.setCommunityState?.({ profiles, status: 'ready', error: '' });
  }
  window.loadPublicProfileByUsername = loadPublicProfileByUsername;

  function fillProfileForm(profile) {
    const toonSelect = document.getElementById('profileAvatarToon');
    toonSelect.innerHTML = TOON_DATA.map(t => `<option value="${t.id}">${escapeHtml(window.I18N?.entityName?.(t) || t.ru || t.name)}</option>`).join('');
    document.getElementById('profileUsername').value = profile.username || '';
    document.getElementById('profileDisplayName').value = profile.display_name || '';
    document.getElementById('profileBio').value = profile.bio || '';
    toonSelect.value = profile.avatar_toon || 'boxten';
    document.getElementById('profileAvatarUrl').value = profile.public_data?.avatarUrl || '';
    document.getElementById('profileIsPublic').checked = profile.is_public !== false;
    updateProfilePreview();
  }

  function updateProfilePreview() {
    const username = sanitizeUsername(document.getElementById('profileUsername').value) || 'player';
    const display = document.getElementById('profileDisplayName').value.trim() || username;
    const bio = document.getElementById('profileBio').value.trim() || (window.I18N?.text?.('Здесь появится короткое описание игрока.') || 'Здесь появится короткое описание игрока.');
    const toonId = document.getElementById('profileAvatarToon').value || 'boxten';
    const avatarUrl = window.normalizeProfileAvatarUrl?.(document.getElementById('profileAvatarUrl').value) || '';
    const snapshot = window.buildPublicSnapshot?.() || {};
    const previewProfile = { username, display_name: display, avatar_toon: toonId, public_data: { avatarUrl } };
    document.getElementById('profilePreview').innerHTML = `
      <span class="preview-label">Предпросмотр</span>
      <div class="preview-avatar">${window.profileAvatarMarkup?.(previewProfile) || ''}</div>
      <strong>${escapeHtml(display)}</strong>
      <small>@${escapeHtml(username)}</small>
      <p>${escapeHtml(bio)}</p>
      <div class="preview-stats"><span>${snapshot.stats?.owned || 0} тунов</span><span>${snapshot.stats?.mastered || 0} мастерств</span></div>`;
    window.I18N?.translate?.(document.getElementById('profilePreview'));
  }

  async function openMyPublicProfile() {
    showProfileMessage('');
    if (!configured) {
      dialog.showModal();
      renderAuth();
      showMessage('Сначала подключи Supabase по инструкции DEPLOY.md.', 'error');
      return;
    }
    if (!session) {
      dialog.showModal();
      renderAuth();
      showMessage('Войди или создай аккаунт, чтобы сделать публичную страницу.', 'error');
      return;
    }
    const profile = myProfile || await ensureProfile();
    if (!profile) return;
    fillProfileForm(profile);
    if (!profileDialog.open) profileDialog.showModal();
  }
  window.openMyPublicProfile = openMyPublicProfile;

  async function savePublicProfile() {
    if (!session) return;
    showProfileMessage('Сохраняем…');
    const username = sanitizeUsername(document.getElementById('profileUsername').value);
    const display_name = document.getElementById('profileDisplayName').value.trim().slice(0, 32);
    const bio = document.getElementById('profileBio').value.trim().slice(0, 180);
    const avatar_toon = document.getElementById('profileAvatarToon').value;
    const avatarUrlRaw = document.getElementById('profileAvatarUrl').value.trim();
    const avatarUrl = window.normalizeProfileAvatarUrl?.(avatarUrlRaw) || '';
    const is_public = document.getElementById('profileIsPublic').checked;

    if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
      showProfileMessage('Ник должен содержать 3–24 символа: латинские буквы, цифры, _ или -.', 'error');
      return;
    }
    if (!display_name) {
      showProfileMessage('Введи отображаемое имя.', 'error');
      return;
    }
    if (avatarUrlRaw && !avatarUrl) {
      showProfileMessage('Укажи HTTPS-ссылку или путь к картинке внутри сайта.', 'error');
      return;
    }

    const updated_at = new Date().toISOString();
    const payload = {
      username,
      display_name,
      bio,
      avatar_toon,
      is_public,
      public_data: { ...(window.buildPublicSnapshot?.() || {}), avatarUrl },
      updated_at,
    };

    const { data, error } = await client
      .from('public_profiles')
      .update(payload)
      .eq('user_id', session.user.id)
      .select('user_id, username, display_name, bio, avatar_toon, is_public, public_data, updated_at')
      .single();

    if (error) {
      const text = error.code === '23505' ? 'Этот ник уже занят. Выбери другой.' : error.message;
      showProfileMessage(text, 'error');
      return;
    }

    myProfile = data;
    renderAuth();
    window.dispatchEvent(new CustomEvent('dandys-profile-change', { detail: { profile: myProfile } }));
    showProfileMessage('Публичный профиль сохранён.', 'good');
    await refreshCommunityProfiles();
  }

  async function copyMyProfileLink() {
    const username = sanitizeUsername(document.getElementById('profileUsername').value) || myProfile?.username;
    if (!username) return;
    const base = location.protocol === 'file:' ? location.href.split('#')[0] : `${location.origin}${location.pathname}${location.search}`;
    const link = `${base}#player=${encodeURIComponent(username)}`;
    try {
      await navigator.clipboard.writeText(link);
      showProfileMessage('Ссылка скопирована.', 'good');
    } catch {
      prompt(window.I18N?.text?.('Скопируй ссылку:') || 'Скопируй ссылку:', link);
    }
  }

  async function signIn() {
    showMessage('Входим…');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return showMessage('Введи email и пароль.', 'error');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, 'error');
    else showMessage('Вход выполнен.', 'good');
  }

  async function signUp() {
    showMessage('Создаём аккаунт…');
    const display_name = document.getElementById('authDisplayName').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return showMessage('Введи email и пароль.', 'error');
    if (password.length < 6) return showMessage('Пароль должен содержать минимум 6 символов.', 'error');

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name },
        emailRedirectTo: location.origin + location.pathname,
      },
    });

    if (error) return showMessage(error.message, 'error');
    if (data.session) showMessage('Аккаунт создан, вход выполнен.', 'good');
    else showMessage('Аккаунт создан. Проверь письмо и подтверди email.', 'good');
  }

  async function signOut() {
    showMessage('Выходим…');
    await uploadProgress(false);
    const { error } = await client.auth.signOut();
    if (error) showMessage(error.message, 'error');
    else {
      myProfile = null;
      showMessage('Ты вышел. На этом устройстве остаётся локальная копия.', 'good');
      setSaveLabel('Сохранено локально');
    }
  }

  async function init() {
    renderAuth();
    if (!configured) {
      window.setCommunityState?.({ profiles: [], status: 'setup', error: '' });
      window.dispatchEvent(new CustomEvent('dandys-auth-change', { detail: { session: null } }));
      return;
    }

    client = window.supabase.createClient(config.url, config.anonKey);
    window.dandysSupabase = client;
    const { data } = await client.auth.getSession();
    session = data.session;
    renderAuth();
    window.dispatchEvent(new CustomEvent('dandys-auth-change', { detail: { session } }));
    if (session) await loadProgress();
    await refreshCommunityProfiles();

    client.auth.onAuthStateChange(async (_event, newSession) => {
      const changedUser = newSession?.user?.id !== session?.user?.id;
      session = newSession;
      if (!session) myProfile = null;
      renderAuth();
      window.dispatchEvent(new CustomEvent('dandys-auth-change', { detail: { session } }));
      if (session && changedUser) await loadProgress();
      await refreshCommunityProfiles();
    });
  }

  accountButton.addEventListener('click', () => {
    showMessage('');
    renderAuth();
  });
  document.getElementById('authLogin').addEventListener('click', signIn);
  document.getElementById('authRegister').addEventListener('click', signUp);
  document.getElementById('authLogout').addEventListener('click', signOut);
  document.getElementById('authSyncNow').addEventListener('click', () => uploadProgress(true));
  document.getElementById('authEditProfile').addEventListener('click', () => {
    dialog.close();
    openMyPublicProfile();
  });
  document.getElementById('savePublicProfile').addEventListener('click', savePublicProfile);
  document.getElementById('copyProfileLink').addEventListener('click', copyMyProfileLink);
  ['profileUsername','profileDisplayName','profileBio','profileAvatarToon','profileAvatarUrl'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'profileAvatarToon' ? 'change' : 'input', updateProfilePreview);
  });
  dialog.addEventListener('close', () => showMessage(''));
  profileDialog.addEventListener('close', () => showProfileMessage(''));

  init().catch(error => {
    console.error(error);
    showMessage(`Ошибка инициализации облака: ${error.message}`, 'error');
    window.setCommunityState?.({ profiles: [], status: 'error', error: error.message });
  });

  window.refreshAuthLanguage = function refreshAuthLanguage() {
    renderAuth();
    if (profileDialog?.open && session) {
      fillProfileForm(myProfile || defaultProfile());
    }
    window.I18N?.translate?.(dialog);
    window.I18N?.translate?.(profileDialog);
  };
})();
