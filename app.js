(() => {
  'use strict';

  const STORAGE_KEY = 'omarTechLearn.v6';
  const LEGACY_STORAGE_KEYS = ['omarTechLearn.v5', 'omarTechLearn.v4', 'omarTechLearn.v3'];
  const DEFAULT_DAILY_GOAL = 30;
  const DEFAULT_LESSON_CAP = 18;
  const MAX_IMPORT_BYTES = 16 * 1024 * 1024;
  const ALLOWED_THEMES = new Set(['dark', 'light', 'auto']);
  let courseQuery = '';
  let courseFilter = 'all';
  let lessonStartedAt = 0;
  let reviewDueOnly = false;
  const AUTH_ITERATIONS = 120000;
  const SAMPLE_TEXT = `Biology Basics\n\nCell theory says all living things are made of cells. The cell is the basic unit of life. New cells come from pre-existing cells.\n\nPhotosynthesis lets plants convert light energy into chemical energy. Chlorophyll absorbs light. Carbon dioxide and water are used to make glucose and oxygen.\n\nMitosis is the process of cell division that produces two genetically identical daughter cells. The major stages are prophase, metaphase, anaphase, and telophase.\n\nName: Example Student\nTitle: Biology Notes\nDate: 2025-03-12\nPage 1`;

  const state = loadState();

  const els = {
    authGate: document.getElementById('authGate'),
    app: document.getElementById('app'),
    showLoginBtn: document.getElementById('showLoginBtn'),
    showSignupBtn: document.getElementById('showSignupBtn'),
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    signupName: document.getElementById('signupName'),
    signupEmail: document.getElementById('signupEmail'),
    signupPassword: document.getElementById('signupPassword'),
    userChipName: document.getElementById('userChipName'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsDialog: document.getElementById('settingsDialog'),
    settingsName: document.getElementById('settingsName'),
    settingsEmail: document.getElementById('settingsEmail'),
    settingsTheme: document.getElementById('settingsTheme'),
    dailyGoalInput: document.getElementById('dailyGoalInput'),
    lessonCapInput: document.getElementById('lessonCapInput'),
    unlockAllLessonsInput: document.getElementById('unlockAllLessonsInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    fileInput: document.getElementById('fileInput'),
    progressInput: document.getElementById('progressInput'),
    importProgressBtn: document.getElementById('importProgressBtn'),
    dropZone: document.getElementById('dropZone'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    pasteOpenBtn: document.getElementById('pasteOpenBtn'),
    pasteDialog: document.getElementById('pasteDialog'),
    pasteTitle: document.getElementById('pasteTitle'),
    pasteText: document.getElementById('pasteText'),
    savePasteBtn: document.getElementById('savePasteBtn'),
    cleanBtn: document.getElementById('cleanBtn'),
    beginBtn: document.getElementById('beginBtn'),
    fileList: document.getElementById('fileList'),
    unitList: document.getElementById('unitList'),
    courseSummary: document.getElementById('courseSummary'),
    courseTools: document.getElementById('courseTools'),
    lessonSearch: document.getElementById('lessonSearch'),
    lessonGrid: document.getElementById('lessonGrid'),
    lessonPlayer: document.getElementById('lessonPlayer'),
    reviewList: document.getElementById('reviewList'),
    reviewDueBtn: document.getElementById('reviewDueBtn'),
    clearReviewBtn: document.getElementById('clearReviewBtn'),
    exportBtn: document.getElementById('exportBtn'),
    resetBtn: document.getElementById('resetBtn'),
    toast: document.getElementById('toast'),
    statFiles: document.getElementById('statFiles'),
    statBlocks: document.getElementById('statBlocks'),
    statLessons: document.getElementById('statLessons'),
    statProgress: document.getElementById('statProgress'),
    statXp: document.getElementById('statXp'),
    statStreak: document.getElementById('statStreak'),
    statTodayXp: document.getElementById('statTodayXp'),
    statCleanup: document.getElementById('statCleanup'),
    statAccuracy: document.getElementById('statAccuracy'),
    statDueReview: document.getElementById('statDueReview'),
    statStudyTime: document.getElementById('statStudyTime')
  };

  applyTheme('dark');
  bindEvents();
  render();
  registerServiceWorker();

  function defaultWorkspace() {
    return {
      files: [],
      units: [],
      cleanupCount: 0,
      lessons: [],
      currentLessonId: null,
      progress: {},
      review: [],
      attempts: [],
      bookmarks: {},
      xp: 0,
      studySeconds: 0,
      preferences: defaultPreferences(),
      activity: defaultActivity()
    };
  }

  function defaultPreferences() {
    return { theme: 'dark', dailyGoal: DEFAULT_DAILY_GOAL, lessonCap: DEFAULT_LESSON_CAP, unlockAllLessons: false };
  }

  function defaultActivity() {
    return { streakCount: 0, lastStudyDate: null, dailyXp: {} };
  }

  function loadState() {
    try {
      const stored = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
        .map(key => ({ key, raw: localStorage.getItem(key) }))
        .find(item => item.raw);

      if (stored?.raw) {
        const parsed = migrateState(JSON.parse(stored.raw));
        if (stored.key !== STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load state', error);
    }

    return migrateState({ users: [], session: { currentUserId: null }, workspaces: {} });
  }

  function migrateState(parsed) {
    parsed.users = Array.isArray(parsed.users) ? parsed.users : [];
    parsed.session ||= { currentUserId: null };
    parsed.workspaces ||= {};

    parsed.users.forEach(user => {
      user.id ||= uid();
      user.name ||= 'Learner';
      user.email = String(user.email || '').trim().toLowerCase();
      if (!parsed.workspaces[user.id]) parsed.workspaces[user.id] = defaultWorkspace();
    });

    Object.keys(parsed.workspaces).forEach(userId => {
      parsed.workspaces[userId] = normalizeWorkspace(parsed.workspaces[userId]);
    });

    return parsed;
  }

  function normalizeWorkspace(workspace = {}) {
    const base = defaultWorkspace();
    return {
      ...base,
      ...workspace,
      files: Array.isArray(workspace.files) ? workspace.files : [],
      units: Array.isArray(workspace.units) ? workspace.units : [],
      lessons: Array.isArray(workspace.lessons) ? workspace.lessons : [],
      progress: workspace.progress && typeof workspace.progress === 'object' ? workspace.progress : {},
      review: normalizeReview(workspace.review),
      attempts: normalizeAttempts(workspace.attempts),
      bookmarks: workspace.bookmarks && typeof workspace.bookmarks === 'object' ? workspace.bookmarks : {},
      xp: Number(workspace.xp) || 0,
      studySeconds: Math.max(0, Number(workspace.studySeconds) || 0),
      cleanupCount: Number(workspace.cleanupCount) || 0,
      preferences: normalizePreferences(workspace.preferences),
      activity: normalizeActivity(workspace.activity)
    };
  }

  function normalizePreferences(preferences = {}) {
    const theme = ALLOWED_THEMES.has(preferences.theme) ? preferences.theme : 'dark';
    const dailyGoal = clampNumber(Number(preferences.dailyGoal) || DEFAULT_DAILY_GOAL, 10, 200);
    const lessonCap = clampNumber(Number(preferences.lessonCap) || DEFAULT_LESSON_CAP, 4, 40);
    const unlockAllLessons = Boolean(preferences.unlockAllLessons);
    return { theme, dailyGoal, lessonCap, unlockAllLessons };
  }

  function normalizeReview(review = []) {
    const now = Date.now();
    return Array.isArray(review) ? review.map(item => ({
      ...item,
      misses: Math.max(0, Number(item.misses) || 0),
      dueAt: Number(item.dueAt) || now,
      lastMissedAt: item.lastMissedAt || new Date(now).toISOString()
    })) : [];
  }

  function normalizeAttempts(attempts = []) {
    return Array.isArray(attempts) ? attempts.slice(-200).map(item => ({
      lessonId: item.lessonId,
      correct: Boolean(item.correct),
      quizType: item.quizType || 'quiz',
      answeredAt: item.answeredAt || new Date().toISOString(),
      seconds: Math.max(0, Number(item.seconds) || 0)
    })) : [];
  }

  function normalizeActivity(activity = {}) {
    const dailyXp = activity.dailyXp && typeof activity.dailyXp === 'object' ? activity.dailyXp : {};
    const cleanDailyXp = {};
    Object.entries(dailyXp).forEach(([key, value]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) cleanDailyXp[key] = Math.max(0, Number(value) || 0);
    });
    return {
      streakCount: Math.max(0, Number(activity.streakCount) || 0),
      lastStudyDate: /^\d{4}-\d{2}-\d{2}$/.test(activity.lastStudyDate || '') ? activity.lastStudyDate : null,
      dailyXp: cleanDailyXp
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn('Failed to save state', error);
      toast('Storage is full. Export progress, then reset old material.');
      return false;
    }
  }

  function getCurrentUser() {
    return state.users.find(user => user.id === state.session.currentUserId) || null;
  }

  function getWorkspace() {
    const user = getCurrentUser();
    if (!user) return defaultWorkspace();
    if (!state.workspaces[user.id]) state.workspaces[user.id] = defaultWorkspace();
    state.workspaces[user.id] = normalizeWorkspace(state.workspaces[user.id]);
    return state.workspaces[user.id];
  }

  function setAuthBusy(isBusy) {
    [...els.loginForm.elements, ...els.signupForm.elements].forEach(control => {
      control.disabled = isBusy;
    });
  }

  function clearAuthForms() {
    els.loginForm.reset();
    els.signupForm.reset();
  }

  async function hashPassword(password, existingSalt = randomSalt()) {
    if (window.crypto?.subtle && window.TextEncoder) {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode(existingSalt), iterations: AUTH_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        256
      );

      return { salt: existingSalt, hash: bufferToBase64(bits) };
    }

    return { salt: existingSalt, hash: fallbackHash(`${existingSalt}:${password}`) };
  }

  async function verifyPassword(user, password) {
    if (user.passwordHash && user.passwordSalt) {
      const credentials = await hashPassword(password, user.passwordSalt);
      return safeEqual(credentials.hash, user.passwordHash);
    }

    return Boolean(user.password && user.password === password);
  }

  function randomSalt() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint8Array(16);
      crypto.getRandomValues(values);
      return bufferToBase64(values);
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function bufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function safeEqual(left, right) {
    if (left.length !== right.length) return false;
    let diff = 0;
    for (let index = 0; index < left.length; index++) {
      diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return diff === 0;
  }

  function fallbackHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function uid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function openDialog(dialog) {
    if (dialog?.showModal) {
      dialog.showModal();
    } else if (dialog) {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (dialog?.close) {
      dialog.close();
    } else if (dialog) {
      dialog.removeAttribute('open');
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function bindEvents() {
    els.showLoginBtn.addEventListener('click', () => switchAuthMode('login'));
    els.showSignupBtn.addEventListener('click', () => switchAuthMode('signup'));

    els.loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      await login();
    });

    els.signupForm.addEventListener('submit', async event => {
      event.preventDefault();
      await signup();
    });

    els.settingsBtn.addEventListener('click', () => {
      syncSettingsForm();
      openDialog(els.settingsDialog);
    });
    document.getElementById('closeSettingsBtn').addEventListener('click', () => closeDialog(els.settingsDialog));
    els.saveSettingsBtn.addEventListener('click', savePreferences);
    els.settingsTheme.addEventListener('change', () => applyTheme(els.settingsTheme.value));
    els.logoutBtn.addEventListener('click', logout);
    els.importProgressBtn.addEventListener('click', () => els.progressInput.click());
    els.progressInput.addEventListener('change', async event => {
      const [file] = Array.from(event.target.files || []);
      if (file) await importProgressFile(file);
      event.target.value = '';
    });
    bindDropZone();

    els.fileInput.addEventListener('change', async event => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      await importFiles(files);
      event.target.value = '';
    });

    els.loadSampleBtn.addEventListener('click', () => {
      importTextAsFile('Sample Biology Notes', SAMPLE_TEXT);
      toast('Sample material loaded.');
    });

    els.pasteOpenBtn.addEventListener('click', () => openDialog(els.pasteDialog));
    document.getElementById('closePasteBtn').addEventListener('click', () => closeDialog(els.pasteDialog));
    els.savePasteBtn.addEventListener('click', () => {
      const title = (els.pasteTitle.value || 'Pasted material').trim();
      const text = (els.pasteText.value || '').trim();
      if (!text) return toast('Paste some text first.');
      importTextAsFile(title, text);
      closeDialog(els.pasteDialog);
      els.pasteText.value = '';
      toast('Text imported.');
    });

    els.cleanBtn.addEventListener('click', () => {
      recleanWorkspace();
      toast('Cleaner re-ran on your material.');
    });

    els.beginBtn.addEventListener('click', () => beginCourse());
    els.exportBtn.addEventListener('click', exportProgress);
    els.reviewDueBtn.addEventListener('click', () => {
      reviewDueOnly = !reviewDueOnly;
      renderReview(getWorkspace());
      setRoute('review');
    });
    els.clearReviewBtn.addEventListener('click', clearMasteredReview);
    els.resetBtn.addEventListener('click', resetWorkspace);

    els.lessonSearch.addEventListener('input', event => {
      courseQuery = event.target.value.trim();
      renderCourse(getWorkspace());
    });

    document.querySelectorAll('[data-lesson-filter]').forEach(button => {
      button.addEventListener('click', () => {
        courseFilter = button.dataset.lessonFilter || 'all';
        renderCourse(getWorkspace());
      });
    });

    window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
      const workspace = getWorkspace();
      if (workspace.preferences?.theme === 'auto') applyTheme('auto');
    });

    document.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => setRoute(btn.dataset.route));
    });
  }

  function bindDropZone() {
    const zone = els.dropZone;
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(type => {
      zone.addEventListener(type, event => {
        event.preventDefault();
        zone.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach(type => {
      zone.addEventListener(type, event => {
        event.preventDefault();
        zone.classList.remove('dragging');
      });
    });

    zone.addEventListener('drop', async event => {
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) await importFiles(files);
    });

    zone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        els.fileInput.click();
      }
    });

    zone.addEventListener('click', () => els.fileInput.click());
  }

  function switchAuthMode(mode) {
    const login = mode === 'login';
    els.showLoginBtn.classList.toggle('active', login);
    els.showSignupBtn.classList.toggle('active', !login);
    els.loginForm.classList.toggle('hidden', !login);
    els.signupForm.classList.toggle('hidden', login);
  }

  async function signup() {
    const name = els.signupName.value.trim();
    const email = els.signupEmail.value.trim().toLowerCase();
    const password = els.signupPassword.value;

    if (!name || !email || !password) return toast('Fill all sign up fields.');
    if (password.length < 6) return toast('Use at least 6 password characters.');
    if (state.users.some(user => user.email === email)) return toast('That email already exists.');

    setAuthBusy(true);
    try {
      const credentials = await hashPassword(password);
      const user = {
        id: uid(),
        name,
        email,
        passwordHash: credentials.hash,
        passwordSalt: credentials.salt,
        createdAt: new Date().toISOString()
      };

      state.users.push(user);
      state.session.currentUserId = user.id;
      state.workspaces[user.id] = defaultWorkspace();
      saveState();
      clearAuthForms();
      toast('Account created.');
      render();
    } finally {
      setAuthBusy(false);
    }
  }

  async function login() {
    const email = els.loginEmail.value.trim().toLowerCase();
    const password = els.loginPassword.value;
    const user = state.users.find(item => item.email === email);

    setAuthBusy(true);
    try {
      if (!user || !(await verifyPassword(user, password))) {
        return toast('Wrong email or password.');
      }

      if (user.password) {
        const credentials = await hashPassword(password);
        user.passwordHash = credentials.hash;
        user.passwordSalt = credentials.salt;
        delete user.password;
      }

      state.session.currentUserId = user.id;
      saveState();
      clearAuthForms();
      toast(`Welcome back, ${user.name}.`);
      render();
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    state.session.currentUserId = null;
    saveState();
    closeDialog(els.settingsDialog);
    render();
    toast('Logged out.');
  }

  function syncSettingsForm(workspace = getWorkspace()) {
    const preferences = normalizePreferences(workspace.preferences);
    els.settingsTheme.value = preferences.theme;
    els.dailyGoalInput.value = String(preferences.dailyGoal);
    els.lessonCapInput.value = String(preferences.lessonCap);
    els.unlockAllLessonsInput.checked = Boolean(preferences.unlockAllLessons);
  }

  function savePreferences() {
    const workspace = getWorkspace();
    const theme = ALLOWED_THEMES.has(els.settingsTheme.value) ? els.settingsTheme.value : 'dark';
    const dailyGoal = clampNumber(Number(els.dailyGoalInput.value) || DEFAULT_DAILY_GOAL, 10, 200);
    const lessonCap = clampNumber(Number(els.lessonCapInput.value) || DEFAULT_LESSON_CAP, 4, 40);
    const unlockAllLessons = Boolean(els.unlockAllLessonsInput.checked);
    workspace.preferences = { theme, dailyGoal, lessonCap, unlockAllLessons };
    applyTheme(theme);
    saveState();
    renderStats(workspace);
    toast('Preferences saved.');
  }

  function applyTheme(themeChoice) {
    const choice = ALLOWED_THEMES.has(themeChoice) ? themeChoice : 'dark';
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const resolved = choice === 'auto' ? (prefersLight ? 'light' : 'dark') : choice;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeChoice = choice;
  }

  function todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function offsetDateKey(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayKey(date);
  }

  function recordXp(workspace, amount) {
    workspace.xp += amount;
    workspace.activity = normalizeActivity(workspace.activity);

    const today = todayKey();
    const yesterday = offsetDateKey(-1);
    workspace.activity.dailyXp[today] = (workspace.activity.dailyXp[today] || 0) + amount;

    if (workspace.activity.lastStudyDate !== today) {
      workspace.activity.streakCount = workspace.activity.lastStudyDate === yesterday
        ? (workspace.activity.streakCount || 0) + 1
        : 1;
      workspace.activity.lastStudyDate = today;
    }

    trimDailyXp(workspace.activity.dailyXp);
  }

  function trimDailyXp(dailyXp) {
    const entries = Object.entries(dailyXp).sort(([left], [right]) => left.localeCompare(right));
    while (entries.length > 45) {
      const [oldest] = entries.shift();
      delete dailyXp[oldest];
    }
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  function render() {
    const user = getCurrentUser();
    const workspace = getWorkspace();

    if (!user) {
      applyTheme('dark');
      els.authGate.classList.remove('hidden');
      els.app.classList.add('hidden');
      switchAuthMode('login');
      return;
    }

    applyTheme(workspace.preferences?.theme || 'dark');
    syncSettingsForm(workspace);
    els.authGate.classList.add('hidden');
    els.app.classList.remove('hidden');
    els.userChipName.textContent = user.name;
    els.settingsName.textContent = user.name;
    els.settingsEmail.textContent = user.email;

    renderStats(workspace);
    renderFiles(workspace);
    renderUnits(workspace);
    renderCourse(workspace);
    renderLessonPlayer(workspace);
    renderReview(workspace);
    if (!document.querySelector('.nav-btn.active')) setRoute('upload');
  }
  function renderStats(workspace) {
    const progressCount = Object.values(workspace.progress).filter(item => item.completed).length;
    const totalLessons = workspace.lessons.length;
    const progressPercent = totalLessons ? Math.round((progressCount / totalLessons) * 100) : 0;
    const preferences = normalizePreferences(workspace.preferences);
    const activity = normalizeActivity(workspace.activity);
    const todayXp = activity.dailyXp[todayKey()] || 0;
    const accuracy = getAccuracy(workspace);
    const dueReview = getDueReviewItems(workspace).length;

    els.statFiles.textContent = String(workspace.files.length);
    els.statBlocks.textContent = String(workspace.units.filter(unit => !unit.ignored).length);
    els.statLessons.textContent = String(totalLessons);
    els.statProgress.textContent = progressPercent + '%';
    els.statXp.textContent = String(workspace.xp || 0);
    els.statStreak.textContent = String(activity.streakCount || 0);
    els.statTodayXp.textContent = todayXp + '/' + preferences.dailyGoal;
    els.statCleanup.textContent = String(workspace.cleanupCount || 0);
    els.statAccuracy.textContent = accuracy + '%';
    els.statDueReview.textContent = String(dueReview);
    els.statStudyTime.textContent = formatDuration(workspace.studySeconds || 0);
  }
  function getAccuracy(workspace) {
    const attempts = normalizeAttempts(workspace.attempts);
    if (!attempts.length) return 0;
    const correct = attempts.filter(item => item.correct).length;
    return Math.round((correct / attempts.length) * 100);
  }

  function getDueReviewItems(workspace) {
    const now = Date.now();
    return normalizeReview(workspace.review).filter(item => Number(item.dueAt) <= now);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (total < 60) return total + 's';
    const minutes = Math.round(total / 60);
    if (minutes < 90) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours + 'h' + (rest ? ' ' + rest + 'm' : '');
  }

  function renderFiles(workspace) {
    if (!workspace.files.length) {
      els.fileList.innerHTML = '<div class="file-pill"><strong>No files yet</strong><span>Upload or paste material to begin.</span></div>';
      return;
    }
    els.fileList.innerHTML = workspace.files.map(file => `
      <div class="file-pill" data-file-id="${escapeHtml(file.id)}">
        <strong>${escapeHtml(file.name)}</strong>
        <span>${escapeHtml(file.type.toUpperCase())} • ${file.blocks} blocks • ${formatFileSize(file.size)}</span>
        <button class="tiny-btn" type="button" data-action="remove-file">Remove</button>
      </div>
    `).join('');

    els.fileList.querySelectorAll('[data-action="remove-file"]').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-file-id]');
        removeFileFromWorkspace(card?.dataset.fileId);
      });
    });
  }

  function removeFileFromWorkspace(fileId) {
    const workspace = getWorkspace();
    const file = workspace.files.find(item => item.id === fileId);
    if (!file) return;
    if (!confirm(`Remove ${file.name} and its study blocks?`)) return;
    workspace.files = workspace.files.filter(item => item.id !== fileId);
    workspace.units = workspace.units.filter(unit => unit.source !== file.name);
    workspace.lessons = workspace.lessons.filter(lesson => lesson.source !== file.name);
    workspace.review = workspace.review.filter(item => workspace.lessons.some(lesson => lesson.id === item.lessonId));
    workspace.progress = Object.fromEntries(Object.entries(workspace.progress).filter(([lessonId]) => workspace.lessons.some(lesson => lesson.id === lessonId)));
    updateFileBlockCounts(workspace);
    saveState();
    render();
    toast('File removed.');
  }

  function formatFileSize(size) {
    const bytes = Math.max(0, Number(size) || 0);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderUnits(workspace) {
    const units = workspace.units;
    if (!units.length) {
      els.unitList.className = 'unit-list empty';
      els.unitList.textContent = 'No study material yet. Upload a file or load the sample.';
      return;
    }

    els.unitList.className = 'unit-list';
    els.unitList.innerHTML = units.map(unit => `
      <article class="unit-card" data-unit-id="${unit.id}">
        <div class="unit-head">
          <div>
            <div class="unit-title">${escapeHtml(unit.title || 'Study block')}</div>
            <div class="unit-meta">${escapeHtml(unit.source)} • ${unit.ignored ? 'Ignored' : 'Kept'}</div>
          </div>
          <button class="small-btn ${unit.ignored ? '' : 'active'}" data-action="toggle-ignore">${unit.ignored ? 'Restore' : 'Keep'}</button>
        </div>
        <textarea data-action="edit-text">${escapeHtml(unit.text)}</textarea>
        <div class="unit-actions">
          <button class="small-btn" data-action="retitle">Retitle</button>
          <button class="small-btn" data-action="split">Split</button>
          <button class="small-btn" data-action="duplicate">Duplicate</button>
          <button class="small-btn" data-action="move-up">↑</button>
          <button class="small-btn" data-action="move-down">↓</button>
          <button class="small-btn danger-lite" data-action="delete-unit">Delete</button>
        </div>
      </article>
    `).join('');

    els.unitList.querySelectorAll('.unit-card').forEach(card => {
      const unitId = card.dataset.unitId;
      card.querySelector('[data-action="toggle-ignore"]').addEventListener('click', () => {
        const item = workspace.units.find(unit => unit.id === unitId);
        if (!item) return;
        item.ignored = !item.ignored;
        saveState();
        render();
      });

      card.querySelector('[data-action="edit-text"]').addEventListener('input', event => {
        const item = workspace.units.find(unit => unit.id === unitId);
        if (!item) return;
        item.text = event.target.value;
        item.title = makeBlockTitle(item.text);
        saveState();
      });

      card.querySelector('[data-action="retitle"]').addEventListener('click', () => {
        const item = workspace.units.find(unit => unit.id === unitId);
        if (!item) return;
        const nextTitle = prompt('New title', item.title || 'Study block');
        if (nextTitle === null) return;
        item.title = nextTitle.trim() || makeBlockTitle(item.text);
        saveState();
        render();
      });

      card.querySelector('[data-action="split"]').addEventListener('click', () => {
        const item = workspace.units.find(unit => unit.id === unitId);
        if (!item) return;
        const parts = splitEditableText(item.text);
        if (parts.length < 2) return toast('This block is too short to split.');
        const index = workspace.units.findIndex(unit => unit.id === unitId);
        const created = parts.map((part, offset) => ({
          id: uid(),
          title: `${item.title || 'Study block'} ${offset + 1}`,
          text: part,
          source: item.source,
          ignored: false
        }));
        workspace.units.splice(index, 1, ...created);
        updateFileBlockCounts(workspace);
        saveState();
        render();
      });

      card.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
        const item = workspace.units.find(unit => unit.id === unitId);
        if (!item) return;
        const index = workspace.units.findIndex(unit => unit.id === unitId);
        workspace.units.splice(index + 1, 0, { ...item, id: uid(), title: `${item.title || 'Study block'} copy` });
        updateFileBlockCounts(workspace);
        saveState();
        render();
        toast('Block duplicated.');
      });

      card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveUnit(unitId, -1));
      card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveUnit(unitId, 1));

      card.querySelector('[data-action="delete-unit"]').addEventListener('click', () => {
        if (!confirm('Delete this study block?')) return;
        workspace.units = workspace.units.filter(unit => unit.id !== unitId);
        updateFileBlockCounts(workspace);
        saveState();
        render();
        toast('Block deleted.');
      });
    });
  }

  function moveUnit(unitId, direction) {
    const workspace = getWorkspace();
    const index = workspace.units.findIndex(unit => unit.id === unitId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= workspace.units.length) return;
    [workspace.units[index], workspace.units[next]] = [workspace.units[next], workspace.units[index]];
    saveState();
    renderUnits(workspace);
  }

  function renderCourse(workspace) {
    const lessons = workspace.lessons;
    els.courseTools.classList.toggle('hidden', !lessons.length);
    els.lessonSearch.value = courseQuery;
    document.querySelectorAll('[data-lesson-filter]').forEach(button => {
      button.classList.toggle('active', button.dataset.lessonFilter === courseFilter);
    });

    if (!lessons.length) {
      els.courseSummary.innerHTML = 'Press <strong>Begin</strong> after uploading and cleaning to create your lessons.';
      els.lessonGrid.innerHTML = '';
      return;
    }

    const completed = Object.values(workspace.progress).filter(item => item.completed).length;
    const reviewIds = new Set(workspace.review.map(item => item.lessonId));
    const preferences = normalizePreferences(workspace.preferences);
    const nextReady = lessons.find((lesson, index) => {
      const progress = workspace.progress[lesson.id] || { completed: false };
      const unlocked = preferences.unlockAllLessons || index === 0 || Boolean(workspace.progress[lessons[index - 1].id]?.completed);
      return unlocked && !progress.completed;
    });

    els.courseSummary.innerHTML =
      '<div>' +
      '<strong>' + lessons.length + ' lessons ready.</strong><br />' +
      completed + ' completed • ' + (lessons.length - completed) + ' left to do.' +
      (nextReady ? '<br /><span class="unit-meta">Next up: ' + escapeHtml(nextReady.title) + '</span>' : '<br /><span class="unit-meta">Course completed. Redo any lesson to practice.</span>') +
      '</div>';

    const query = normalizeText(courseQuery);
    const lessonViews = lessons.map((lesson, index) => {
      const progress = workspace.progress[lesson.id] || { completed: false, bestScore: 0 };
      const unlocked = preferences.unlockAllLessons || index === 0 || Boolean(workspace.progress[lessons[index - 1].id]?.completed);
      const needsReview = reviewIds.has(lesson.id);
      const bookmarked = Boolean(workspace.bookmarks?.[lesson.id]);
      const attempts = normalizeAttempts(workspace.attempts).filter(item => item.lessonId === lesson.id);
      const accuracy = attempts.length ? Math.round((attempts.filter(item => item.correct).length / attempts.length) * 100) : null;
      return { lesson, index, progress, unlocked, needsReview, bookmarked, attempts, accuracy };
    }).filter(view => {
      if (courseFilter === 'ready' && (!view.unlocked || view.progress.completed)) return false;
      if (courseFilter === 'done' && !view.progress.completed) return false;
      if (courseFilter === 'review' && !view.needsReview) return false;
      if (courseFilter === 'bookmarked' && !view.bookmarked) return false;
      if (!query) return true;
      const searchable = normalizeText([view.lesson.title, view.lesson.summary, view.lesson.source, ...view.lesson.keyPoints].join(' '));
      return searchable.includes(query);
    });

    if (!lessonViews.length) {
      els.lessonGrid.innerHTML = '<div class="empty-block">No lessons match that search or filter.</div>';
      return;
    }

    els.lessonGrid.innerHTML = lessonViews.map(({ lesson, index, progress, unlocked, needsReview, bookmarked, attempts, accuracy }) => {
      const status = needsReview ? 'Review' : progress.completed ? 'Done' : unlocked ? 'Ready' : 'Locked';
      return '<article class="lesson-card ' + (unlocked ? '' : 'locked') + (needsReview ? ' review-needed' : '') + '">' +
          '<div class="lesson-top">' +
            '<span class="lesson-index">' + (index + 1) + '</span>' +
            '<span class="lesson-status ' + (needsReview ? 'review-needed' : '') + '">' + status + '</span>' +
          '</div>' +
          '<h4>' + escapeHtml(lesson.title) + '</h4>' +
          '<p>' + escapeHtml(lesson.summary) + '</p>' +
          '<div class="lesson-tags">' +
            '<span>' + lesson.keyPoints.length + ' key points</span>' +
            '<span>' + escapeHtml(lesson.quiz.type) + '</span>' +
            (attempts.length ? '<span>' + accuracy + '% accuracy</span>' : '<span>new</span>') +
            (bookmarked ? '<span>bookmarked</span>' : '') +
            (needsReview ? '<span>weak point</span>' : '') +
          '</div>' +
          '<div class="lesson-card-actions">' +
            '<button class="' + (unlocked ? 'primary-btn' : 'ghost-btn') + ' wide" data-start-lesson="' + escapeHtml(lesson.id) + '" ' + (unlocked ? '' : 'disabled') + '>' + (progress.completed ? 'Redo lesson' : 'Start lesson') + '</button>' +
            '<button class="small-btn" type="button" data-bookmark-lesson="' + escapeHtml(lesson.id) + '">' + (bookmarked ? 'Unbookmark' : 'Bookmark') + '</button>' +
          '</div>' +
        '</article>';
    }).join('');

    els.lessonGrid.querySelectorAll('[data-bookmark-lesson]').forEach(button => {
      button.addEventListener('click', () => toggleBookmark(button.dataset.bookmarkLesson));
    });

    els.lessonGrid.querySelectorAll('[data-start-lesson]').forEach(button => {
      button.addEventListener('click', () => {
        startLesson(button.dataset.startLesson);
      });
    });
  }
  function toggleBookmark(lessonId) {
    const workspace = getWorkspace();
    workspace.bookmarks ||= {};
    if (workspace.bookmarks[lessonId]) {
      delete workspace.bookmarks[lessonId];
      toast('Bookmark removed.');
    } else {
      workspace.bookmarks[lessonId] = new Date().toISOString();
      toast('Lesson bookmarked.');
    }
    saveState();
    renderCourse(workspace);
  }

  function renderLessonPlayer(workspace) {
    const lesson = workspace.lessons.find(item => item.id === workspace.currentLessonId);
    if (!lesson) {
      els.lessonPlayer.className = 'lesson-player empty-block';
      els.lessonPlayer.textContent = 'Select a lesson from the course tab to start learning.';
      return;
    }

    const run = workspace.progress[lesson.id] || { stage: 'teach', completed: false, answerState: null, bestScore: 0 };
    const index = workspace.lessons.findIndex(item => item.id === lesson.id);
    const progressPercent = Math.round(((index + (run.completed ? 1 : 0)) / workspace.lessons.length) * 100);
    els.lessonPlayer.className = 'lesson-player';

    if (run.stage === 'teach') {
      els.lessonPlayer.innerHTML = `
        <div class="lesson-stage">
          <div class="lesson-badge">Lesson ${index + 1} of ${workspace.lessons.length}</div>
          <h4>${escapeHtml(lesson.title)}</h4>
          <div class="lesson-meta-row"><span>${escapeHtml(lesson.source || 'Study material')}</span><span>${estimateReadTime(lesson.teach)} read</span></div>
          <div class="teach-box">
            <p>${escapeHtml(lesson.teach)}</p>
            <ul class="key-points">${lesson.keyPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
          </div>
          <div class="lesson-footer">
            <button id="gotItBtn" class="primary-btn" type="button">Got it</button>
            <button id="bookmarkCurrentBtn" class="ghost-btn" type="button">${workspace.bookmarks?.[lesson.id] ? 'Unbookmark' : 'Bookmark'}</button>
            <button id="addReviewCurrentBtn" class="ghost-btn" type="button">Add to review</button>
            <button id="backToCourseBtn" class="ghost-btn" type="button">Back to course</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(progressPercent, 6)}%"></div></div>
        </div>
      `;
      document.getElementById('gotItBtn').addEventListener('click', () => {
        run.stage = 'quiz';
        run.startedAt = run.startedAt || Date.now();
        lessonStartedAt = run.startedAt;
        saveState();
        renderLessonPlayer(workspace);
      });
      document.getElementById('bookmarkCurrentBtn').addEventListener('click', () => toggleBookmark(lesson.id));
      document.getElementById('addReviewCurrentBtn').addEventListener('click', () => {
        addToReview(workspace, lesson, true);
        saveState();
        renderStats(workspace);
        renderReview(workspace);
        toast('Added to review.');
      });
      document.getElementById('backToCourseBtn').addEventListener('click', () => setRoute('course'));
      return;
    }

    if (run.stage === 'quiz') {
      els.lessonPlayer.innerHTML = renderQuizMarkup(lesson, index, workspace.lessons.length);
      bindQuizHandlers(workspace, lesson, run);
      return;
    }

    if (run.stage === 'result') {
      const correct = run.answerState?.correct;
      els.lessonPlayer.innerHTML = `
        <div class="lesson-stage">
          <div class="lesson-badge">Lesson ${index + 1} complete</div>
          <h4>${correct ? 'Nice work.' : 'Keep going.'}</h4>
          <div class="result-box">
            <p>${correct ? (run.answerState?.earnedXp ? 'Correct answer! You earned 10 XP.' : 'Correct answer! XP was already awarded for this lesson.') : 'That answer was not correct.'}</p>
            <p><strong>Attempt time:</strong> ${formatDuration(run.answerState?.seconds || 0)}</p>
            <p><strong>Right answer:</strong> ${escapeHtml(getCorrectAnswerLabel(lesson.quiz))}</p>
            <p><strong>Why:</strong> ${escapeHtml(lesson.quiz.explanation)}</p>
          </div>
          <div class="lesson-footer">
            <button id="nextLessonBtn" class="primary-btn" type="button">${index < workspace.lessons.length - 1 ? 'Next lesson' : 'Back to course'}</button>
            <button id="redoLessonBtn" class="ghost-btn" type="button">Redo lesson</button>
            <button id="reviewResultBtn" class="ghost-btn" type="button">Add to review</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(progressPercent, 6)}%"></div></div>
        </div>
      `;
      document.getElementById('reviewResultBtn').addEventListener('click', () => {
        addToReview(workspace, lesson, true);
        saveState();
        renderStats(workspace);
        renderReview(workspace);
        toast('Added to review.');
      });
      document.getElementById('redoLessonBtn').addEventListener('click', () => {
        run.stage = 'teach';
        run.answerState = null;
        run.startedAt = Date.now();
        lessonStartedAt = run.startedAt;
        saveState();
        renderLessonPlayer(workspace);
      });
      document.getElementById('nextLessonBtn').addEventListener('click', () => {
        if (index < workspace.lessons.length - 1) {
          startLesson(workspace.lessons[index + 1].id);
        } else {
          setRoute('course');
          renderLessonPlayer(workspace);
        }
      });
    }
  }

  function estimateReadTime(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 180)) + ' min';
  }

  function renderQuizMarkup(lesson, index, total) {
    const quiz = lesson.quiz;
    let body = '';
    if (quiz.type === 'multiple choice') {
      body = `
        <div class="answer-grid">
          ${quiz.choices.map((choice, choiceIndex) => `<button class="choice-btn" type="button" data-choice-index="${choiceIndex}">${escapeHtml(choice)}</button>`).join('')}
        </div>
      `;
    } else if (quiz.type === 'true / false') {
      body = `
        <div class="answer-grid">
          <button class="choice-btn" type="button" data-bool="true">True</button>
          <button class="choice-btn" type="button" data-bool="false">False</button>
        </div>
      `;
    } else {
      body = `
        <div class="answer-grid">
          <input id="typedAnswer" class="typed-input" type="text" placeholder="Type your answer" autocomplete="off" />
          <button id="submitTypedBtn" class="primary-btn" type="button">Submit answer</button>
        </div>
      `;
    }

    return `
      <div class="lesson-stage">
        <div class="lesson-badge">Lesson ${index + 1} of ${total}</div>
        <h4>${escapeHtml(lesson.title)}</h4>
        <div class="quiz-box">
          <p><strong>Question:</strong> ${escapeHtml(quiz.question)}</p>
          <p class="quiz-hint">Tip: use 1–4 for choices, T/F for true-false, or Enter for typed answers.</p>
          ${body}
        </div>
        <div class="lesson-footer">
          <button id="backTeachBtn" class="ghost-btn" type="button">Back</button>
        </div>
      </div>
    `;
  }

  function bindQuizHandlers(workspace, lesson, run) {
    document.getElementById('backTeachBtn').addEventListener('click', () => {
      run.stage = 'teach';
      saveState();
      renderLessonPlayer(workspace);
    });

    document.querySelectorAll('[data-choice-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        submitLessonAnswer(workspace, lesson, Number(btn.dataset.choiceIndex));
      });
    });

    document.querySelectorAll('[data-bool]').forEach(btn => {
      btn.addEventListener('click', () => {
        submitLessonAnswer(workspace, lesson, btn.dataset.bool === 'true');
      });
    });

    const typed = document.getElementById('submitTypedBtn');
    const typedInput = document.getElementById('typedAnswer');
    if (typed) {
      const submitTyped = () => {
        const value = (typedInput.value || '').trim();
        if (!value) return toast('Type an answer first.');
        submitLessonAnswer(workspace, lesson, value);
      };

      typed.addEventListener('click', submitTyped);
      typedInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') submitTyped();
      });
      typedInput.focus();
    }

    els.lessonPlayer.onkeydown = event => {
      if (event.target?.tagName === 'INPUT') return;
      const key = event.key.toLowerCase();
      const choiceButtons = [...document.querySelectorAll('[data-choice-index]')];
      if (choiceButtons.length && /^[1-4]$/.test(key)) {
        const button = choiceButtons[Number(key) - 1];
        if (button) {
          event.preventDefault();
          button.click();
        }
      }
      if (key === 't') document.querySelector('[data-bool="true"]')?.click();
      if (key === 'f') document.querySelector('[data-bool="false"]')?.click();
      if (key === 'escape') setRoute('course');
    };
    els.lessonPlayer.tabIndex = -1;
    els.lessonPlayer.focus({ preventScroll: true });
  }

  function submitLessonAnswer(workspace, lesson, value) {
    const run = workspace.progress[lesson.id] || { stage: 'quiz', completed: false, bestScore: 0 };
    const wasCompleted = Boolean(run.completed);
    const correct = isCorrectAnswer(lesson.quiz, value);
    const earnedXp = correct && !wasCompleted;
    const seconds = Math.max(1, Math.min(3600, Math.round((Date.now() - (run.startedAt || lessonStartedAt || Date.now())) / 1000)));

    run.answerState = { value, correct, earnedXp, seconds };
    run.completed = correct || run.completed;
    run.bestScore = Math.max(run.bestScore || 0, correct ? 100 : 0);
    run.stage = 'result';
    run.lastAnsweredAt = new Date().toISOString();
    delete run.startedAt;

    workspace.studySeconds = Math.max(0, Number(workspace.studySeconds) || 0) + seconds;
    workspace.attempts = normalizeAttempts([...(workspace.attempts || []), {
      lessonId: lesson.id,
      correct,
      quizType: lesson.quiz.type,
      answeredAt: new Date().toISOString(),
      seconds
    }]);

    if (earnedXp) {
      recordXp(workspace, 10);
    }

    if (correct) {
      removeFromReview(workspace, lesson.id);
    } else {
      addToReview(workspace, lesson);
    }

    workspace.progress[lesson.id] = run;
    saveState();
    renderStats(workspace);
    renderCourse(workspace);
    renderLessonPlayer(workspace);
    renderReview(workspace);
  }

  function addToReview(workspace, lesson, manual = false) {
    const now = Date.now();
    const existing = workspace.review.find(item => item.lessonId === lesson.id);
    if (existing) {
      existing.question = lesson.quiz.question;
      existing.answer = getCorrectAnswerLabel(lesson.quiz);
      existing.explanation = lesson.quiz.explanation;
      existing.misses = manual ? (existing.misses || 1) : (existing.misses || 1) + 1;
      existing.dueAt = now;
      existing.lastMissedAt = new Date(now).toISOString();
      return;
    }

    workspace.review.unshift({
      id: uid(),
      lessonId: lesson.id,
      title: lesson.title,
      question: lesson.quiz.question,
      answer: getCorrectAnswerLabel(lesson.quiz),
      explanation: lesson.quiz.explanation,
      misses: manual ? 0 : 1,
      dueAt: now,
      lastMissedAt: new Date(now).toISOString()
    });
  }

  function removeFromReview(workspace, lessonId) {
    workspace.review = workspace.review.filter(item => item.lessonId !== lessonId);
  }

  function clearMasteredReview() {
    const workspace = getWorkspace();
    const before = workspace.review.length;
    workspace.review = workspace.review.filter(item => !workspace.progress[item.lessonId]?.completed);
    const removed = before - workspace.review.length;
    saveState();
    renderStats(workspace);
    renderCourse(workspace);
    renderReview(workspace);
    toast(removed ? `${removed} mastered review item${removed === 1 ? '' : 's'} cleared.` : 'No mastered review items to clear.');
  }

  function renderReview(workspace) {
    const reviewItems = reviewDueOnly ? getDueReviewItems(workspace) : normalizeReview(workspace.review);
    els.reviewDueBtn.classList.toggle('active', reviewDueOnly);

    if (!reviewItems.length) {
      els.reviewList.className = 'review-list empty-block';
      els.reviewList.textContent = reviewDueOnly ? 'No review items are due right now.' : 'No weak points yet.';
      return;
    }

    els.reviewList.className = 'review-list';
    els.reviewList.innerHTML = reviewItems.map(item => `
      <article class="review-card">
        <div class="review-card-head">
          <h4>${escapeHtml(item.title)}</h4>
          <span>${item.misses || 0} miss${Number(item.misses || 0) === 1 ? '' : 'es'}</span>
        </div>
        <p><strong>Question:</strong> ${escapeHtml(item.question)}</p>
        <p><strong>Answer:</strong> ${escapeHtml(item.answer)}</p>
        <p>${escapeHtml(item.explanation)}</p>
        <p class="unit-meta">Due: ${escapeHtml(formatDue(item.dueAt))}</p>
        <button class="primary-btn" type="button" data-review-start="${item.lessonId}">Study again</button>
      </article>
    `).join('');

    els.reviewList.querySelectorAll('[data-review-start]').forEach(button => {
      button.addEventListener('click', () => startLesson(button.dataset.reviewStart));
    });
  }

  function formatDue(timestamp) {
    const dueAt = Number(timestamp) || Date.now();
    const delta = dueAt - Date.now();
    if (delta <= 0) return 'now';
    const minutes = Math.ceil(delta / 60000);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.ceil(minutes / 60);
    if (hours < 24) return `in ${hours}h`;
    return `in ${Math.ceil(hours / 24)}d`;
  }

  async function importFiles(files) {
    const user = getCurrentUser();
    if (!user) return toast('Please log in first.');
    const workspace = getWorkspace();
    let imported = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        if (file.size > MAX_IMPORT_BYTES) {
          skipped += 1;
          continue;
        }
        if (workspace.files.some(entry => entry.name === file.name && entry.size === file.size)) {
          skipped += 1;
          continue;
        }

        const extractedText = await readFileContent(file);
        const { blocks, removed } = cleanAndSplitText(extractedText, file.name);
        workspace.cleanupCount += removed;

        if (!blocks.length) {
          skipped += 1;
          continue;
        }

        const entry = { id: uid(), name: file.name, type: extensionOf(file.name), size: file.size, blocks: blocks.length };
        workspace.files.push(entry);
        blocks.forEach(block => {
          workspace.units.push({
            id: uid(),
            source: file.name,
            title: makeBlockTitle(block),
            text: block,
            ignored: false
          });
        });
        imported += 1;
      } catch (error) {
        console.error(error);
        skipped += 1;
      }
    }

    saveState();
    render();

    if (imported && skipped) return toast(`${imported} imported, ${skipped} skipped.`);
    if (imported) return toast(`${imported} file${imported === 1 ? '' : 's'} imported.`);
    toast('No useful new material found.');
  }

  function importTextAsFile(name, text) {
    const workspace = getWorkspace();
    const safeName = uniqueSourceName(name || 'Pasted material', workspace);
    const { blocks, removed } = cleanAndSplitText(text, safeName);
    workspace.cleanupCount += removed;

    if (!blocks.length) {
      render();
      return toast('No useful study blocks found in that text.');
    }

    workspace.files.push({ id: uid(), name: safeName, type: 'txt', size: String(text || '').length, blocks: blocks.length });
    blocks.forEach(block => {
      workspace.units.push({ id: uid(), source: safeName, title: makeBlockTitle(block), text: block, ignored: false });
    });
    saveState();
    render();
  }

  function recleanWorkspace() {
    const workspace = getWorkspace();
    const nextUnits = [];
    let removed = 0;
    for (const unit of workspace.units) {
      const result = cleanAndSplitText(unit.text, unit.source);
      if (!result.blocks.length) {
        removed += 1;
        continue;
      }
      const primary = result.blocks[0];
      nextUnits.push({ ...unit, text: primary, title: makeBlockTitle(primary) });
      if (result.blocks.length > 1) {
        result.blocks.slice(1).forEach(part => nextUnits.push({
          id: uid(),
          source: unit.source,
          title: makeBlockTitle(part),
          text: part,
          ignored: false
        }));
      }
      removed += result.removed;
    }
    workspace.units = nextUnits;
    workspace.cleanupCount += removed;
    updateFileBlockCounts(workspace);
    saveState();
    render();
  }

  function beginCourse() {
    const workspace = getWorkspace();
    const keptUnits = workspace.units.filter(unit => !unit.ignored && unit.text.trim().length > 60);
    if (!keptUnits.length) return toast('Upload and keep at least one useful block first.');
    const preferences = normalizePreferences(workspace.preferences);
    workspace.lessons = buildLessons(keptUnits, preferences.lessonCap);
    workspace.currentLessonId = workspace.lessons[0]?.id || null;
    const nextProgress = {};
    workspace.lessons.forEach(lesson => {
      nextProgress[lesson.id] = workspace.progress[lesson.id] || { stage: 'teach', completed: false, answerState: null, bestScore: 0 };
    });
    workspace.progress = nextProgress;
    courseFilter = 'all';
    courseQuery = '';
    saveState();
    render();
    setRoute('course');
    toast(`${workspace.lessons.length} lessons created.`);
  }

  function buildLessons(units, lessonCap = DEFAULT_LESSON_CAP) {
    const lessonSources = units.flatMap(unit => chunkUnitForLessons(unit));
    const limited = lessonSources.slice(0, clampNumber(lessonCap, 4, 40));

    return limited.map((source, index) => {
      const sentences = splitSentences(source.text).slice(0, 8);
      const summary = sentences[0] || source.text.slice(0, 120);
      const keyPoints = makeKeyPoints(source.text);
      const title = source.totalParts > 1 ? `${source.unit.title || 'Study block'} · Part ${source.part}` : (source.unit.title || `Lesson ${index + 1}`);

      return {
        id: `lesson:${source.unit.id}:${source.part}`,
        order: index + 1,
        title,
        source: source.unit.source,
        summary: shortText(summary, 120),
        teach: makeTeachText(source.text),
        keyPoints,
        quiz: makeQuiz(source.text, title, keyPoints)
      };
    });
  }

  function chunkUnitForLessons(unit) {
    const text = String(unit.text || '').trim();
    const sentences = splitSentences(text);

    if (text.length < 950 || sentences.length < 5) {
      return [{ unit, text, part: 1, totalParts: 1 }];
    }

    const chunks = [];
    let current = '';

    sentences.forEach(sentence => {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length > 850 && current.length > 260) {
        chunks.push(current);
        current = sentence;
      } else {
        current = candidate;
      }
    });

    if (current) chunks.push(current);

    return chunks.map((chunk, index) => ({
      unit,
      text: chunk,
      part: index + 1,
      totalParts: chunks.length
    }));
  }

  function makeTeachText(text) {
    const sentences = splitSentences(text).slice(0, 3);
    return shortText(sentences.join(' '), 420);
  }

  function makeKeyPoints(text) {
    const bullets = text.split(/\n+/).map(line => line.replace(/^[-•*]\s*/, '').trim()).filter(line => line.length > 20);
    const source = bullets.length ? bullets : splitSentences(text);
    return source.slice(0, 4).map(line => shortText(line, 120));
  }

  function makeQuiz(text, title, keyPoints) {
    const sentences = splitSentences(text).filter(sentence => sentence.length > 25);
    const pick = sentences[0] || text;
    const terms = uniqueValues(extractKeywords(text));
    const primaryTerm = terms[0] || title.split(/\s+/)[0] || 'concept';
    const clozeSentence = sentences.find(sentence => normalizeText(sentence).includes(normalizeText(primaryTerm))) || pick;

    if (terms.length >= 4) {
      const distractors = shuffle(terms.filter(term => normalizeText(term) !== normalizeText(primaryTerm))).slice(0, 3);
      const choices = shuffle([primaryTerm, ...distractors]);
      const correct = choices.findIndex(choice => normalizeText(choice) === normalizeText(primaryTerm));

      return {
        type: 'multiple choice',
        question: `Which term completes this idea: "${makeCloze(clozeSentence, primaryTerm)}"?`,
        choices,
        correct,
        explanation: `The missing term is ${primaryTerm}.`
      };
    }

    if (pick.length > 50 && terms.length >= 2) {
      const falseTerm = terms.find(term => normalizeText(term) !== normalizeText(primaryTerm));
      const falseStatement = falseTerm ? replaceTerm(clozeSentence, primaryTerm, falseTerm) : pick;

      return {
        type: 'true / false',
        question: shortText(falseStatement, 140),
        correct: false,
        explanation: `The original idea uses ${primaryTerm}, not ${falseTerm || 'that replacement term'}.`
      };
    }

    return {
      type: 'typed answer',
      question: `Type the main concept of this lesson.`,
      correctText: normalizeText(primaryTerm),
      displayAnswer: primaryTerm,
      explanation: `The main concept here is ${primaryTerm}.`
    };
  }

  function startLesson(lessonId) {
    const workspace = getWorkspace();
    const run = workspace.progress[lessonId];
    if (run) {
      run.stage = 'teach';
      run.answerState = null;
      run.startedAt = Date.now();
      lessonStartedAt = run.startedAt;
    }
    workspace.currentLessonId = lessonId;
    saveState();
    render();
    setRoute('learn');
  }

  function setRoute(route) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    document.querySelectorAll('.route').forEach(section => {
      section.classList.toggle('visible', section.id === `route-${route}`);
    });
  }

  async function readFileContent(file) {
    const ext = extensionOf(file.name);
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return file.text();
    if (ext === 'docx') {
      if (!window.mammoth) throw new Error('DOCX parser missing');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    }
    if (ext === 'pdf') return extractPdfText(file);
    if (ext === 'pptx') return extractPptxText(file);
    throw new Error(`Unsupported file type: ${ext}`);
  }

  async function extractPdfText(file) {
    if (!window.pdfjsLib) throw new Error('pdf.js missing');
    const pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
    let fullText = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n\nPage ${pageNumber}\n${pageText}`;
    }
    return fullText;
  }

  async function extractPptxText(file) {
    if (!window.JSZip) throw new Error('JSZip missing');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const textBlocks = [];
    for (const slideName of slideFiles) {
      const xml = await zip.file(slideName).async('string');
      const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map(match => decodeXml(match[1]));
      if (matches.length) textBlocks.push(matches.join(' '));
    }
    return textBlocks.join('\n\n');
  }

  function cleanAndSplitText(text, sourceName = '') {
    const sourceText = String(text || '')
      .replace(/\u00ad/g, '')
      .replace(/-\n(?=\p{L})/gu, '')
      .replace(/[\t\f\v]+/g, ' ')
      .replace(/\u2022/g, '•');
    const originalLines = sourceText.replace(/\r/g, '').split('\n');
    const normalized = originalLines.map(line => decodeEntities(line).replace(/\s+/g, ' ').trim());

    const lineCounts = new Map();
    normalized.forEach(line => {
      if (line && line.length < 90) lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    });

    let removed = 0;
    const keptLines = [];
    normalized.forEach((line, index) => {
      if (!line) {
        keptLines.push('');
        return;
      }
      if (shouldRemoveLine(line, index, normalized.length, sourceName, lineCounts)) {
        removed += 1;
        return;
      }
      keptLines.push(line);
    });

    const joined = keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const rawBlocks = joined.split(/\n{2,}/).map(block => block.trim()).filter(block => block.length > 40);
    const blocks = rawBlocks.map(block => block.replace(/\s+/g, ' ').trim()).filter(block => !looksLikeJunkBlock(block));
    return { blocks, removed };
  }

  function shouldRemoveLine(line, index, total, sourceName, lineCounts) {
    const lower = line.toLowerCase();
    const sourceLower = sourceName.toLowerCase();

    if (/^(name|student name|author|teacher|class|course|subject|titel|title|date)\s*:/i.test(line)) return true;
    if (/^(page|slide)\s*\d+(\s*of\s*\d+)?$/i.test(line)) return true;
    if (/^\d+\s*(of|\/|-)\s*\d+$/i.test(line) || /^\d+$/.test(line)) return true;
    if (/^(chapter|section)\s*\d+[.:]?$/i.test(line) && line.length < 18) return true;
    if (lineCounts.get(line) >= 3 && line.length < 90) return true;
    if (/[.]?(pdf|pptx|docx|txt|md)$/i.test(line) || line.toLowerCase() === sourceLower || stripExtension(lower) === stripExtension(sourceLower)) return true;
    if (/^(confidential|copyright|all rights reserved|generated by|downloaded from)$/i.test(line)) return true;
    if (/^(www\.|http|file:|image\s*\d+|object\s*\d+)$/i.test(lower)) return true;
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(line)) return true;
    if (/^(quot|nbsp|json|xml|pptx|docx|pdf|slide|image|object)$/i.test(lower)) return true;
    if (index < 4 && total > 6 && line.length < 26 && /^[A-Z0-9\s\-_:]+$/.test(line)) return true;
    if (index < 4 && total > 6 && line.split(/\s+/).length <= 4 && /^(lecture|notes|summary|worksheet)/i.test(lower)) return true;
    return false;
  }

  function stripExtension(value) {
    return String(value || '').replace(/\.(pdf|pptx|docx|txt|md|markdown)$/i, '').trim();
  }

  function looksLikeJunkBlock(block) {
    const words = block.split(/\s+/).length;
    if (words < 6) return true;
    if (/^(quot|nbsp|json|xml|pptx|docx|pdf|slide|image|object)(\s+(quot|nbsp|json|xml|pptx|docx|pdf|slide|image|object))*$/i.test(block)) return true;
    return false;
  }

  function splitSentences(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const byPunctuation = normalized
      .split(/(?<=[.!?؟。])\s+/u)
      .map(item => item.trim())
      .filter(Boolean);
    if (byPunctuation.length > 1) return byPunctuation;

    const chunks = normalized.match(/.{1,220}(?:\s|$)/g) || [normalized];
    return chunks.map(item => item.trim()).filter(Boolean);
  }

  function splitEditableText(text) {
    const paragraphs = String(text || '').split(/\n{2,}/).map(part => part.trim()).filter(part => part.length > 40);
    if (paragraphs.length > 1) return paragraphs;

    const sentences = splitSentences(text);
    if (sentences.length < 4) return [];

    const midpoint = Math.ceil(sentences.length / 2);
    return [
      sentences.slice(0, midpoint).join(' '),
      sentences.slice(midpoint).join(' ')
    ].filter(part => part.length > 40);
  }

  function extractKeywords(text) {
    const stop = new Set([
      'the','and','for','that','with','this','from','into','your','have','will','when','what','which','why','their','there','than','about','also','then','them','they','make','made','uses','used','using','only','each','more','most','like','page','slide','title','name','date','author','because','between','after','before','within','without','where','while','during','through','these','those','such','unit','lesson','notes','study','student','students','example','examples',
      'هذا','هذه','ذلك','التي','الذي','على','إلى','من','في','عن','مع','كان','كانت','يكون','كل','أو','ثم'
    ]);
    const counts = new Map();
    const words = String(text || '').toLowerCase().match(/[\p{L}][\p{L}\p{M}-]{3,}/gu) || [];

    words.forEach(word => {
      if (stop.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
      .map(entry => entry[0])
      .slice(0, 10);
  }

  function makeCloze(sentence, term) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    const replaced = String(sentence || '').replace(pattern, '_____');
    return shortText(replaced.includes('_____') ? replaced : `${sentence} _____`, 150);
  }

  function replaceTerm(sentence, term, replacement) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    return String(sentence || '').replace(pattern, replacement);
  }

  function uniqueValues(values) {
    const seen = new Set();
    return values.filter(value => {
      const key = normalizeText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function uniqueSourceName(name, workspace) {
    const base = String(name || 'Pasted material').trim();
    let candidate = base;
    let suffix = 2;
    while (workspace.files.some(file => file.name === candidate)) {
      candidate = `${base} ${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isCorrectAnswer(quiz, value) {
    if (quiz.type === 'multiple choice') return value === quiz.correct;
    if (quiz.type === 'true / false') return value === quiz.correct;

    const normalizedValue = normalizeText(value);
    const normalizedAnswer = normalizeText(quiz.correctText);
    if (!normalizedValue || !normalizedAnswer) return false;

    return normalizedValue === normalizedAnswer ||
      (normalizedAnswer.length > 4 && normalizedValue.includes(normalizedAnswer)) ||
      (normalizedValue.length > 4 && normalizedAnswer.includes(normalizedValue));
  }

  function getCorrectAnswerLabel(quiz) {
    if (quiz.type === 'multiple choice') return quiz.choices[quiz.correct];
    if (quiz.type === 'true / false') return String(quiz.correct);
    return quiz.displayAnswer || quiz.correctText;
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function updateFileBlockCounts(workspace) {
    workspace.files.forEach(file => {
      file.blocks = workspace.units.filter(unit => unit.source === file.name && !unit.ignored).length;
    });
  }

  function resetWorkspace() {
    if (!confirm('Reset all uploaded material, lessons, and progress for this account?')) return;
    const user = getCurrentUser();
    if (!user) return;
    state.workspaces[user.id] = defaultWorkspace();
    saveState();
    render();
    setRoute('upload');
    toast('Workspace reset.');
  }

  function exportProgress() {
    const user = getCurrentUser();
    const workspace = getWorkspace();
    const payload = {
      app: 'OmarTech Learn',
      version: 6,
      user: user ? { name: user.name, email: user.email } : null,
      exportedAt: new Date().toISOString(),
      stats: {
        files: workspace.files.length,
        lessons: workspace.lessons.length,
        xp: workspace.xp,
        cleanupCount: workspace.cleanupCount,
        streakCount: normalizeActivity(workspace.activity).streakCount,
        todayXp: normalizeActivity(workspace.activity).dailyXp[todayKey()] || 0,
        dailyGoal: normalizePreferences(workspace.preferences).dailyGoal,
        accuracy: getAccuracy(workspace),
        studySeconds: workspace.studySeconds || 0
      },
      workspace: normalizeWorkspace(workspace),
      progress: workspace.progress,
      review: workspace.review,
      lessons: workspace.lessons.map(({ id, title, summary, source }) => ({ id, title, summary, source }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omartech-learn-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Progress exported.');
  }

  async function importProgressFile(file) {
    const user = getCurrentUser();
    if (!user) return toast('Please log in first.');
    if (file.size > MAX_IMPORT_BYTES) return toast('That backup file is too large.');

    try {
      const payload = JSON.parse(await file.text());

      if (!payload.workspace) {
        if (!payload.progress && !payload.review) return toast('That JSON does not look like an OmarTech backup.');
        if (!confirm('Import saved progress into the current workspace?')) return;
        const workspace = getWorkspace();
        workspace.progress = payload.progress || workspace.progress;
        workspace.review = normalizeReview(payload.review || workspace.review);
        saveState();
        render();
        toast('Progress imported.');
        return;
      }

      const incoming = payload.workspace;
      if (!incoming || (!Array.isArray(incoming.lessons) && !Array.isArray(incoming.units))) {
        return toast('That JSON does not look like a full OmarTech backup.');
      }

      if (!confirm('Import this backup and replace the current workspace?')) return;
      state.workspaces[user.id] = normalizeWorkspace({
        ...defaultWorkspace(),
        ...incoming
      });
      saveState();
      render();
      toast('Workspace imported.');
    } catch (error) {
      console.warn('Import failed', error);
      toast('Could not import that backup file.');
    }
  }

  function makeBlockTitle(text) {
    const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const first = lines[0] || 'Study block';
    return shortText(first.replace(/^[-•*]\s*/, ''), 52);
  }

  function shortText(text, max) {
    const value = String(text || '').trim();
    return value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function extensionOf(name) {
    return String(name || '').toLowerCase().split('.').pop();
  }

  function decodeEntities(text) {
    return String(text || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function decodeXml(text) {
    return decodeEntities(text)
      .replace(/&apos;/g, "'")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }
})();
