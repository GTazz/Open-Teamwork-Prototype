// ========================================
// CONSTANTES E REFERÊNCIAS
// ========================================

const STORAGE_KEYS = {
  accounts: 'openTeamworkAccounts',
  session: 'openTeamworkSession',
};

const profileApp = document.querySelector('[data-profile-app]');
const authPanel = document.querySelector('[data-auth-panel]');
const profilePanel = document.querySelector('[data-profile-panel]');
const authMessage = document.querySelector('[data-auth-message]');
const profileMessage = document.querySelector('[data-profile-message]');
const loginHero = document.querySelector('[data-login-hero]');
const profileHero = document.querySelector('[data-profile-hero]');
const profileNameDisplay = document.querySelector('[data-profile-name-display]');
const profileEmailDisplay = document.querySelector('[data-profile-email-display]');
const avatarPreview = document.querySelector('[data-avatar-preview]');
const logoutButton = document.querySelector('[data-logout-button]');
const avatarRemoveButton = document.querySelector('[data-avatar-remove]');
const avatarUploadButton = document.querySelector('[data-avatar-upload]');
const profileResetButton = document.querySelector('[data-profile-reset]');
const profileForm = document.querySelector('[data-profile-form]');
const profileActions = document.querySelector('[data-profile-actions]');
const authTabs = [...document.querySelectorAll('[data-auth-tab]')];
const authForms = [...document.querySelectorAll('[data-auth-form]')];
const loginForm = document.querySelector('[data-auth-form="login"]');
const signupForm = document.querySelector('[data-auth-form="signup"]');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const signupNameInput = document.getElementById('signup-name');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
const profileAvatarInput = document.getElementById('profile-avatar');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profilePhoneInput = document.getElementById('profile-phone');
const profileLocationInput = document.getElementById('profile-location');
const profileBioInput = document.getElementById('profile-bio');
const profileGithubInput = document.getElementById('profile-github');
const profileLinkedinInput = document.getElementById('profile-linkedin');
const profileXInput = document.getElementById('profile-x');
const profileWebsiteInput = document.getElementById('profile-website');

const DEFAULT_PROFILE = {
  avatarUrl: '',
  bio: '',
  contact: {
    email: '',
    phone: '',
    location: '',
  },
  socials: {
    github: '',
    linkedin: '',
    x: '',
    website: '',
  },
};

const SOCIAL_PREFIXES = {
  github: 'https://github.com/',
  linkedin: 'https://www.linkedin.com/in/',
};

let activeAuthTab = 'login';
let activeAvatarDataUrl = '';
let activeSessionEmail = '';
let initialProfileFormState = null;

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Normaliza um e-mail para comparação e armazenamento.
 * @param {string} value
 * @returns {string}
 */
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Normaliza texto livre removendo espaços nas extremidades.
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * Sanitiza uma URL para permitir apenas protocolos http e https.
 * @param {string} value
 * @returns {string}
 */
function sanitizeUrl(value) {
  const rawValue = normalizeText(value);
  if (!rawValue) return '';

  try {
    const parsed = new URL(rawValue, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (_) {
    return '';
  }

  return '';
}

/**
 * Extrai o trecho editável de uma URL social (parte após o prefixo fixo).
 * @param {string} value
 * @param {string} prefix
 * @returns {string}
 */
function getSocialSuffix(value, prefix) {
  const rawValue = normalizeText(value);
  if (!rawValue) return '';

  const normalizedPrefix = prefix.toLowerCase();
  if (rawValue.toLowerCase().startsWith(normalizedPrefix)) {
    return rawValue.slice(prefix.length).replace(/^\/+|\/+$/g, '');
  }

  try {
    const parsed = new URL(rawValue);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    if (prefix === SOCIAL_PREFIXES.linkedin) {
      const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
      if (pathname.toLowerCase().startsWith('in/')) {
        return pathname.slice(3).replace(/^\/+|\/+$/g, '');
      }
      return pathname;
    }

    return parsed.pathname.replace(/^\/+|\/+$/g, '');
  } catch (_) {
    return rawValue.replace(/^\/+|\/+$/g, '');
  }
}

/**
 * Monta uma URL social completa a partir do trecho editável.
 * @param {string} suffix
 * @param {string} prefix
 * @returns {string}
 */
function buildSocialUrl(suffix, prefix) {
  const normalizedSuffix = normalizeText(suffix).replace(/^\/+|\/+$/g, '');
  if (!normalizedSuffix) return '';
  return `${prefix}${normalizedSuffix}`;
}

/**
 * Monta um estado normalizado do formulário para detectar alterações.
 * @param {any} account
 * @returns {string}
 */
function getProfileFormState(account) {
  return JSON.stringify({
    name: normalizeText(profileNameInput?.value),
    contactEmail: normalizeEmail(profileEmailInput?.value),
    phone: normalizeText(profilePhoneInput?.value),
    // Campo removido da UI; mantém valor existente para não sinalizar alteração falsa.
    location: normalizeText(account?.profile?.contact?.location || ''),
    bio: normalizeText(profileBioInput?.value),
    github: buildSocialUrl(getSocialSuffix(profileGithubInput?.value || '', SOCIAL_PREFIXES.github), SOCIAL_PREFIXES.github),
    linkedin: buildSocialUrl(getSocialSuffix(profileLinkedinInput?.value || '', SOCIAL_PREFIXES.linkedin), SOCIAL_PREFIXES.linkedin),
    website: sanitizeUrl(profileWebsiteInput?.value || ''),
    avatarUrl: activeAvatarDataUrl,
  });
}

/**
 * Mostra/esconde ações de salvar/descartar conforme alterações no formulário.
 */
function updateProfileActionsVisibility() {
  if (!profileActions) return;

  const account = getAccount(activeSessionEmail);
  if (!account || !initialProfileFormState) {
    profileActions.classList.add('hidden');
    return;
  }

  const hasChanges = getProfileFormState(account) !== initialProfileFormState;
  profileActions.classList.toggle('hidden', !hasChanges);
}

/**
 * Recupera os perfis salvos no localStorage.
 * @returns {Record<string, any>}
 */
function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts)) || {};
  } catch (_) {
    return {};
  }
}

/**
 * Persiste os perfis no localStorage.
 * @param {Record<string, any>} accounts
 */
function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
}

/**
 * Recupera o e-mail autenticado atual.
 * @returns {string}
 */
function getSessionEmail() {
  return normalizeEmail(localStorage.getItem(STORAGE_KEYS.session));
}

/**
 * Salva a sessão atual.
 * @param {string} email
 */
function setSessionEmail(email) {
  localStorage.setItem(STORAGE_KEYS.session, normalizeEmail(email));
}

/**
 * Remove a sessão atual.
 */
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

/**
 * Cria uma estrutura de perfil vazia.
 * @returns {{avatarUrl: string, bio: string, contact: {phone: string, location: string}, socials: {github: string, linkedin: string, x: string, website: string}}}
 */
function createEmptyProfile() {
  return {
    avatarUrl: DEFAULT_PROFILE.avatarUrl,
    bio: DEFAULT_PROFILE.bio,
    contact: {
      email: DEFAULT_PROFILE.contact.email,
      phone: DEFAULT_PROFILE.contact.phone,
      location: DEFAULT_PROFILE.contact.location,
    },
    socials: {
      github: DEFAULT_PROFILE.socials.github,
      linkedin: DEFAULT_PROFILE.socials.linkedin,
      x: DEFAULT_PROFILE.socials.x,
      website: DEFAULT_PROFILE.socials.website,
    },
  };
}

/**
 * Cria uma conta local.
 * @param {{name: string, email: string, password: string}} payload
 * @returns {{name: string, email: string, password: string, profile: ReturnType<typeof createEmptyProfile>}}
 */
function createAccount(payload) {
  return {
    name: normalizeText(payload.name),
    email: normalizeEmail(payload.email),
    password: String(payload.password || ''),
    profile: createEmptyProfile(),
  };
}

/**
 * Recupera uma conta pelo e-mail.
 * @param {string} email
 * @returns {any}
 */
function getAccount(email) {
  const accounts = getAccounts();
  return accounts[normalizeEmail(email)] || null;
}

/**
 * Salva uma conta e atualiza o índice caso o e-mail tenha mudado.
 * @param {any} account
 * @param {string} previousEmail
 */
function saveAccount(account, previousEmail) {
  const accounts = getAccounts();
  const normalizedPrevious = normalizeEmail(previousEmail || account.email);
  const normalizedCurrent = normalizeEmail(account.email);

  if (normalizedPrevious && normalizedPrevious !== normalizedCurrent) {
    delete accounts[normalizedPrevious];
  }

  accounts[normalizedCurrent] = account;
  saveAccounts(accounts);

  if (getSessionEmail() === normalizedPrevious) {
    setSessionEmail(normalizedCurrent);
  }
}

/**
 * Retorna as iniciais para o avatar de fallback.
 * @param {string} name
 * @param {string} email
 * @returns {string}
 */
function getInitials(name, email) {
  const source = normalizeText(name) || normalizeEmail(email);
  if (!source) return 'OT';

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * Exibe uma mensagem de feedback.
 * @param {HTMLElement | null} element
 * @param {string} message
 * @param {'success' | 'error'} type
 */
function showMessage(element, message, type) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove('hidden', 'success', 'error');
  element.classList.add(type);
}

/**
 * Oculta e limpa uma mensagem de feedback.
 * @param {HTMLElement | null} element
 */
function clearMessage(element) {
  if (!element) return;

  element.textContent = '';
  element.classList.add('hidden');
  element.classList.remove('success', 'error');
}

/**
 * Alterna a hero entre login e perfil sem reescrever texto no JS.
 * @param {'login' | 'profile'} mode
 */
function setHeroMode(mode) {
  const isLoginMode = mode === 'login';
  document.title = `${isLoginMode ? 'Login' : 'Perfil'} · Open Teamwork`;

  loginHero?.classList.toggle('hidden', !isLoginMode);
  profileHero?.classList.toggle('hidden', isLoginMode);
}

/**
 * Alterna o formulário de login/cadastro exibido.
 * @param {'login' | 'signup'} mode
 */
function setAuthTab(mode) {
  activeAuthTab = mode;

  authTabs.forEach(tab => {
    const isActive = tab.dataset.authTab === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  authForms.forEach(form => {
    const isVisible = form.dataset.authForm === mode;
    form.classList.toggle('hidden', !isVisible);
  });

  clearMessage(authMessage);
}

/**
 * Atualiza o avatar de pré-visualização.
 * @param {string} dataUrl
 * @param {string} name
 * @param {string} email
 */
function renderAvatarPreview(dataUrl, name, email) {
  if (!avatarPreview) return;

  if (dataUrl) {
    avatarPreview.innerHTML = `
      <img src="${dataUrl}" alt="Foto de perfil atual" />
    `;
    avatarRemoveButton?.classList.remove('hidden');
    if (avatarUploadButton) {
      avatarUploadButton.textContent = 'Trocar imagem';
    }
    return;
  }

  avatarPreview.innerHTML = `
    <div class="avatar-fallback">
      <svg viewBox="0 0 16 16" width="14" height="14" class="person-icon" aria-hidden="true" focusable="false">
        <path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"></path>
      </svg>
      <span>Sem foto</span>
    </div>
  `;
  avatarRemoveButton?.classList.add('hidden');
  if (avatarUploadButton) {
    avatarUploadButton.textContent = 'Enviar imagem';
  }
}

/**
 * Preenche o formulário de perfil com os dados do usuário.
 * @param {any} account
 */
function populateProfileForm(account) {
  const profile = account.profile || createEmptyProfile();
  activeAvatarDataUrl = profile.avatarUrl || '';

  if (profileAvatarInput) profileAvatarInput.value = '';
  if (profileNameInput) profileNameInput.value = account.name || '';
  if (profileEmailInput) profileEmailInput.value = profile.contact?.email || '';
  if (profilePhoneInput) profilePhoneInput.value = profile.contact?.phone || '';
  if (profileLocationInput) profileLocationInput.value = profile.contact?.location || '';
  if (profileBioInput) profileBioInput.value = profile.bio || '';
  if (profileGithubInput) {
    profileGithubInput.value = getSocialSuffix(profile.socials?.github || '', SOCIAL_PREFIXES.github);
  }
  if (profileLinkedinInput) {
    profileLinkedinInput.value = getSocialSuffix(profile.socials?.linkedin || '', SOCIAL_PREFIXES.linkedin);
  }
  if (profileXInput) profileXInput.value = profile.socials?.x || '';
  if (profileWebsiteInput) profileWebsiteInput.value = profile.socials?.website || '';

  renderAvatarPreview(activeAvatarDataUrl, account.name, account.email);
  initialProfileFormState = getProfileFormState(account);
  updateProfileActionsVisibility();
}

/**
 * Atualiza o cabeçalho e o estado da tela de perfil.
 * @param {any} account
 */
function populateProfileSummary(account) {
  if (profileNameDisplay) profileNameDisplay.textContent = account.name || 'Perfil';
  if (profileEmailDisplay) profileEmailDisplay.textContent = account.email || '';
}

/**
 * Exibe a área de login.
 */
function showLoginView() {
  activeAuthTab = 'login';
  authPanel?.classList.remove('hidden');
  profilePanel?.classList.add('hidden');
  profileActions?.classList.add('hidden');
  initialProfileFormState = null;
  setHeroMode('login');
  setAuthTab('login');
}

/**
 * Exibe a área de perfil.
 * @param {any} account
 */
function showProfileView(account) {
  authPanel?.classList.add('hidden');
  profilePanel?.classList.remove('hidden');
  setHeroMode('profile');
  populateProfileSummary(account);
  populateProfileForm(account);
  clearMessage(profileMessage);
}

// ========================================
// HANDLERS DE AUTENTICAÇÃO
// ========================================

/**
 * Processa o envio do formulário de login.
 * @param {SubmitEvent} event
 */
function handleLoginSubmit(event) {
  event.preventDefault();
  clearMessage(authMessage);

  const email = normalizeEmail(loginEmailInput?.value);
  const password = String(loginPasswordInput?.value || '');

  if (!email || !password) {
    return;
  }

  const account = getAccount(email);
  if (!account || account.password !== password) {
    return;
  }

  activeSessionEmail = email;
  setSessionEmail(email);
  loginForm?.reset();
  renderApp();
}

/**
 * Processa o envio do formulário de cadastro.
 * @param {SubmitEvent} event
 */
function handleSignupSubmit(event) {
  event.preventDefault();
  clearMessage(authMessage);

  const name = normalizeText(signupNameInput?.value);
  const email = normalizeEmail(signupEmailInput?.value);
  const password = String(signupPasswordInput?.value || '');
  const confirmPassword = String(signupConfirmPasswordInput?.value || '');

  if (!name || !email || !password || !confirmPassword) {
    return;
  }

  if (password.length < 6) {
    return;
  }

  if (password !== confirmPassword) {
    return;
  }

  const accounts = getAccounts();
  if (accounts[email]) {
    return;
  }

  const account = createAccount({ name, email, password });
  accounts[email] = account;
  saveAccounts(accounts);

  activeSessionEmail = email;
  setSessionEmail(email);
  signupForm?.reset();
  renderApp();
}

// ========================================
// HANDLERS DO PERFIL
// ========================================

/**
 * Atualiza a foto de perfil a partir do arquivo selecionado.
 * @param {Event} event
 */
function handleAvatarChange(event) {
  const input = /** @type {HTMLInputElement | null} */ (event.target);
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    activeAvatarDataUrl = String(reader.result || '');
    renderAvatarPreview(
      activeAvatarDataUrl,
      profileNameInput?.value || '',
      profileEmailInput?.value || '',
    );
    updateProfileActionsVisibility();
  };
  reader.readAsDataURL(file);
}

/**
 * Remove a foto de perfil atual.
 */
function handleAvatarRemove() {
  activeAvatarDataUrl = '';
  if (profileAvatarInput) profileAvatarInput.value = '';
  renderAvatarPreview(
    activeAvatarDataUrl,
    profileNameInput?.value || '',
    profileEmailInput?.value || '',
  );
  updateProfileActionsVisibility();
}

/**
 * Restaura o formulário de perfil a partir da conta atual.
 */
function handleProfileReset() {
  const account = getAccount(activeSessionEmail);
  if (!account) {
    renderApp();
    return;
  }

  populateProfileSummary(account);
  populateProfileForm(account);
  clearMessage(profileMessage);
}

/**
 * Faz logout do usuário atual.
 */
function handleLogout() {
  clearSession();
  activeSessionEmail = '';
  activeAvatarDataUrl = '';
  activeAuthTab = 'login';
  if (profileForm) profileForm.reset();
  clearMessage(profileMessage);
  renderApp();
}

/**
 * Salva as alterações do perfil.
 * @param {SubmitEvent} event
 */
function handleProfileSubmit(event) {
  event.preventDefault();
  clearMessage(profileMessage);

  const currentAccount = getAccount(activeSessionEmail);
  if (!currentAccount) {
    handleLogout();
    return;
  }

  const name = normalizeText(profileNameInput?.value);
  const contactEmail = normalizeEmail(profileEmailInput?.value);
  const phone = normalizeText(profilePhoneInput?.value);
  const location = normalizeText(profileLocationInput?.value || currentAccount.profile?.contact?.location || '');
  const bio = normalizeText(profileBioInput?.value);
  const githubSuffix = getSocialSuffix(profileGithubInput?.value || '', SOCIAL_PREFIXES.github);
  const linkedinSuffix = getSocialSuffix(profileLinkedinInput?.value || '', SOCIAL_PREFIXES.linkedin);
  const github = buildSocialUrl(githubSuffix, SOCIAL_PREFIXES.github);
  const linkedin = buildSocialUrl(linkedinSuffix, SOCIAL_PREFIXES.linkedin);
  const x = sanitizeUrl(profileXInput?.value || '');
  const website = sanitizeUrl(profileWebsiteInput?.value || '');

  if (!name || !contactEmail) {
    return;
  }

  const updatedAccount = {
    ...currentAccount,
    name,
    email: currentAccount.email,
    profile: {
      avatarUrl: activeAvatarDataUrl,
      bio,
      contact: {
        email: contactEmail,
        phone,
        location,
      },
      socials: {
        github,
        linkedin,
        x,
        website,
      },
    },
  };

  saveAccount(updatedAccount, currentAccount.email);
  activeSessionEmail = currentAccount.email;
  setSessionEmail(currentAccount.email);
  renderApp();
}

// ========================================
// INICIALIZAÇÃO
// ========================================

/**
 * Renderiza a tela correta com base na sessão atual.
 */
function renderApp() {
  const sessionEmail = getSessionEmail();
  activeSessionEmail = sessionEmail;

  if (!sessionEmail) {
    showLoginView();
    return;
  }

  const account = getAccount(sessionEmail);
  if (!account) {
    clearSession();
    activeSessionEmail = '';
    showLoginView();
    return;
  }

  showProfileView(account);
}

/**
 * Registra eventos da tela de perfil.
 */
function bindEvents() {
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setAuthTab(/** @type {'login' | 'signup'} */ (tab.dataset.authTab || 'login'));
    });
  });

  loginForm?.addEventListener('submit', handleLoginSubmit);
  signupForm?.addEventListener('submit', handleSignupSubmit);
  profileForm?.addEventListener('submit', handleProfileSubmit);
  logoutButton?.addEventListener('click', handleLogout);
  avatarRemoveButton?.addEventListener('click', handleAvatarRemove);
  profileResetButton?.addEventListener('click', handleProfileReset);
  profileAvatarInput?.addEventListener('change', handleAvatarChange);
  profileForm?.addEventListener('input', updateProfileActionsVisibility);
  profileForm?.addEventListener('change', updateProfileActionsVisibility);

  profileNameInput?.addEventListener('input', () => {
    renderAvatarPreview(activeAvatarDataUrl, profileNameInput.value, profileEmailInput?.value || '');
    if (profileNameDisplay) profileNameDisplay.textContent = normalizeText(profileNameInput.value) || 'Perfil';
  });

  profileEmailInput?.addEventListener('input', () => {
    renderAvatarPreview(activeAvatarDataUrl, profileNameInput?.value || '', profileEmailInput.value);
    if (profileEmailDisplay) {
      const account = getAccount(activeSessionEmail);
      profileEmailDisplay.textContent = account?.email || '';
    }
  });
}

if (profileApp) {
  bindEvents();
  renderApp();
}
