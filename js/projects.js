// ========================================
// CONSTANTES E CONFIGURAÇÃO
// ========================================

// Configuração: Defina quantos cards você quer exibir
const CONFIG = {
  maxCards: null // null = sem limite, exibe todos os projetos
};

// ========================================
// ESTADO E PERSISTÊNCIA
// ========================================

let projectsData = [];
const STORAGE_KEY = 'appliedQualifications';
const SESSION_KEY = 'openTeamworkSession';

/**
 * Recupera o mapa de qualificações aplicadas por repositório do localStorage
 * @returns {Record<string, string[]>} Mapa repoId -> lista de qualificações aplicadas
 */
function getAppliedMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/**
 * Persiste o mapa de qualificações aplicadas por repositório
 * @param {Record<string, string[]>} map
 */
function setAppliedMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Obtém a lista de qualificações aplicadas para um repositório específico
 * @param {number|string} repoId
 * @returns {string[]}
 */
function getAppliedForRepo(repoId) {
  const map = getAppliedMap();
  return map[String(repoId)] || [];
}

/**
 * Define a lista de qualificações aplicadas para um repositório
 * (garante unicidade das qualificações)
 * @param {number|string} repoId
 * @param {string[]} qualifications
 */
function setAppliedForRepo(repoId, qualifications) {
  const map = getAppliedMap();
  map[String(repoId)] = Array.from(new Set(qualifications));
  setAppliedMap(map);
}

/**
 * Verifica se existe uma sessão autenticada ativa.
 * @returns {boolean}
 */
function isUserAuthenticated() {
  const session = localStorage.getItem(SESSION_KEY);
  return Boolean(session && String(session).trim());
}

/**
 * Redireciona o usuário para a tela de login/perfil.
 */
function redirectToLogin() {
  window.location.href = './pages/perfil.html';
}

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Formata números grandes (ex: 1200 -> 1.2k)
 */
function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

/**
 * Ordena as qualificações: disponíveis primeiro, aplicadas em penúltimo e cheias por último
 * @param {{name:string, filled:number, total:number}[]} qualifications
 * @param {Set<string>} appliedSet
 * @returns {Array}
 */
function sortQualifications(qualifications, appliedSet) {
  return [...qualifications].sort((a, b) => {
    const aFull = a.filled >= a.total;
    const bFull = b.filled >= b.total;
    const aApplied = appliedSet.has(a.name);
    const bApplied = appliedSet.has(b.name);

    const getPriority = (isFull, isApplied) => {
      if (isFull) return 2;
      if (isApplied) return 1;
      return 0;
    };

    return getPriority(aFull, aApplied) - getPriority(bFull, bApplied);
  });
}

// ========================================
// RENDERIZAÇÃO DE CARDS
// ========================================

/**
 * Cria o HTML de um card de projeto
 * @param {{id:number,name:string,owner:string,description:string,url:string,qualifications:Array,tags?:Array}} repo
 * @returns {string}
 */
function createRepoCard(repo) {
  const applied = new Set(getAppliedForRepo(repo.id));
  const hasApplied = applied.size > 0;
  const isAuthenticated = isUserAuthenticated();

  const sortedQualifications = sortQualifications(repo.qualifications, applied);

  return `
    <div class="repo-card" data-repo-id="${repo.id}">
      <div class="repo-header">
        <svg class="repo-icon" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path>
        </svg>
        <a href="${repo.url}" class="repo-name">${repo.name}</a>
      </div>
      <div class="repo-owner">Host: ${repo.owner}</div>
      <div class="repo-description">
        ${repo.description}
      </div>
      <div class="repo-bottom">
        <div class="repo-qualifications">
          ${sortedQualifications.map(q => {
            const disabledClass = applied.has(q.name) ? ' disabled' : '';
            const isFull = q.filled >= q.total;
            const fullClass = isFull ? ' full' : '';
            return `
              <div class="qualification-item-card${disabledClass}${fullClass}">
                <svg viewBox="0 0 16 16" width="14" height="14" class="person-icon">
                  <path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"></path>
                </svg>
                <span class="qualification-name">${q.name}</span>
                <span class="qualification-count">${q.filled}/${q.total}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="repo-footer">
          <button class="saiba-mais-button" data-action="details">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"></path>
            </svg>
            Saiba mais
          </button>
          <button class="apply-button${hasApplied && isAuthenticated ? ' applied' : ''}${isAuthenticated ? '' : ' is-disabled'}" data-action="apply" aria-disabled="${String(!isAuthenticated)}" title="${isAuthenticated ? '' : 'Faça login para se candidatar.'}">
            ${isAuthenticated && hasApplied
              ? `<svg viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.25 0 00.108-.064l6.286-6.286z"></path></svg> Modificar Candidatura`
              : `<svg viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"></path></svg> Candidatar-se`}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ========================================
// ESTADO E MODAIS
// ========================================

let currentRepoId = null;
let currentDetailsRepoId = null;

/**
 * Abre o modal de detalhes de um projeto
 * @param {number} repoId
 */
function openDetailsModal(repoId) {
  currentDetailsRepoId = repoId;
  const repo = projectsData.find(r => r.id === repoId);
  if (!repo) return;

  const modal = document.getElementById('details-modal');
  const modalTitle = document.getElementById('details-modal-title');
  const detailsContent = document.getElementById('details-content');
  const applyBtn = document.getElementById('details-apply');

  modalTitle.textContent = repo.name;

  const applied = new Set(getAppliedForRepo(repo.id));
  const hasApplied = applied.size > 0;
  const sortedQualifications = sortQualifications(repo.qualifications, applied);

  detailsContent.innerHTML = `
    <div class="details-header">
      <div class="details-owner">
        <svg class="repo-icon" height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path>
        </svg>
        <span>${repo.owner}</span>
      </div>
      <a href="${repo.url}" class="details-link" target="_blank">
        URL
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path fill-rule="evenodd" d="M10.604 1h4.146a.25.25 0 01.25.25v4.146a.25.25 0 01-.427.177L13.03 4.03 9.28 7.78a.75.75 0 01-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0110.604 1zM3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"></path>
        </svg>
      </a>
    </div>

    <div class="details-section">
      <h3>Descrição</h3>
      <p class="details-description">${repo.description}</p>
    </div>

    <div class="details-section">
      <h3>Qualificações Necessárias</h3>
      <div class="details-qualifications">
        ${sortedQualifications.map(q => {
          const disabledClass = applied.has(q.name) ? ' disabled' : '';
          const isFull = q.filled >= q.total;
          const fullClass = isFull ? ' full' : '';
          return `
            <div class="qualification-item-card${disabledClass}${fullClass}">
              <svg viewBox="0 0 16 16" width="14" height="14" class="person-icon">
                <path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"></path>
              </svg>
              <span class="qualification-name">${q.name}</span>
              <span class="qualification-count">${q.filled}/${q.total}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="details-section">
      <h3>Tags</h3>
      <div class="details-qualifications">
        ${repo.tags.map(tag => `<span class="topic-tag">${tag}</span>`).join('')}
      </div>
    </div>
  `;

  applyBtn.onclick = () => {
    closeDetailsModal();
    openApplyModal(repoId);
  };

  if (hasApplied && isUserAuthenticated()) {
    applyBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path fill-rule="evenodd" d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"></path>
      </svg>
      Modificar Candidatura
    `;
    applyBtn.classList.add('applied');
  } else {
    applyBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"></path>
      </svg>
      Candidatar-se
    `;
    applyBtn.classList.remove('applied');
  }

  document.getElementById('close-details').onclick = closeDetailsModal;
  modal.onclick = (e) => { if (e.target === modal) closeDetailsModal(); };
  document.addEventListener('keydown', escCloseDetailsHandler);

  modal.classList.remove('hidden');
}

/**
 * Fecha modal de detalhes ao pressionar ESC
 * @param {KeyboardEvent} e
 */
function escCloseDetailsHandler(e) {
  if (e.key === 'Escape') closeDetailsModal();
}

/**
 * Fecha o modal de detalhes e limpa handlers/estado
 */
function closeDetailsModal() {
  const modal = document.getElementById('details-modal');
  modal.classList.add('hidden');
  document.removeEventListener('keydown', escCloseDetailsHandler);
  currentDetailsRepoId = null;
}

// ========================================
// MODAL DE CANDIDATURA
// ========================================

/**
 * Abre o modal de candidatura para um repositório
 * @param {number} repoId
 */
function openApplyModal(repoId) {
  if (!isUserAuthenticated()) {
    redirectToLogin();
    return;
  }

  currentRepoId = repoId;
  const repo = projectsData.find(r => r.id === repoId);
  if (!repo) return;

  const modal = document.getElementById('apply-modal');
  const repoTitle = document.getElementById('apply-modal-repo');
  const container = document.getElementById('qualifications-container');
  const confirmBtn = document.getElementById('confirm-apply');

  repoTitle.textContent = `${repo.owner} / ${repo.name}`;

  const alreadyApplied = new Set(getAppliedForRepo(repoId));
  container.innerHTML = repo.qualifications.map(q => {
    const checkedAttr = alreadyApplied.has(q.name) ? 'checked' : '';
    const isFull = q.filled >= q.total;
    const disabledAttr = isFull ? 'disabled' : '';
    return `
      <label class="qualification-item${isFull ? ' full' : ''}">
        <input type="checkbox" name="qualification" value="${q.name}" ${checkedAttr} ${disabledAttr} />
        <svg viewBox="0 0 16 16" width="14" height="14" class="person-icon">
          <path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"></path>
        </svg>
        <span class="qualification-name">${q.name}</span>
        <span class="qualification-count">${q.filled}/${q.total}</span>
      </label>
    `;
  }).join('');

  confirmBtn.disabled = false;
  confirmBtn.onclick = confirmApply;
  document.getElementById('cancel-apply').onclick = closeApplyModal;
  modal.onclick = (e) => { if (e.target === modal) closeApplyModal(); };
  document.addEventListener('keydown', escCloseHandler);

  modal.classList.remove('hidden');
}

/**
 * Fecha modal de candidatura ao pressionar ESC
 * @param {KeyboardEvent} e
 */
function escCloseHandler(e) {
  if (e.key === 'Escape') closeApplyModal();
}

/**
 * Fecha o modal de candidatura e limpa handlers/estado
 */
function closeApplyModal() {
  const modal = document.getElementById('apply-modal');
  modal.classList.add('hidden');
  document.removeEventListener('keydown', escCloseHandler);
  currentRepoId = null;
}

/**
 * Confirma a candidatura: persiste seleções e atualiza UI/contadores
 */
function confirmApply() {
  if (currentRepoId == null) return;
  const container = document.getElementById('qualifications-container');
  const selected = [...container.querySelectorAll('input[type="checkbox"]')]
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  setAppliedForRepo(currentRepoId, selected);

  const repo = projectsData.find(r => r.id === currentRepoId);
  const card = document.querySelector(`.repo-card[data-repo-id="${currentRepoId}"]`);
  if (card && repo) {
    const newCardHTML = createRepoCard(repo);
    card.outerHTML = newCardHTML;
  }

  closeApplyModal();
}

// ========================================
// CARREGAMENTO E INICIALIZAÇÃO
// ========================================

/**
 * Carrega e renderiza os projetos
 */
async function loadProjects() {
  try {
    const response = await fetch('./data/projects.json');
    const projects = await response.json();
    projectsData = projects;

    const projectsToShow = CONFIG.maxCards ? projects.slice(0, CONFIG.maxCards) : projects;

    const projGrid = document.getElementById('repo-grid');
    projGrid.innerHTML = projectsToShow.map(repo => createRepoCard(repo)).join('');

    projGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('button.saiba-mais-button, button.apply-button');
      if (!btn) return;
      const card = e.target.closest('.repo-card');
      if (!card) return;
      const repoId = parseInt(card.getAttribute('data-repo-id'), 10);

      if (btn.classList.contains('saiba-mais-button')) {
        openDetailsModal(repoId);
      } else if (btn.classList.contains('apply-button')) {
        if (!isUserAuthenticated()) {
          redirectToLogin();
          return;
        }
        openApplyModal(repoId);
      }
    });

    const counter = document.getElementById('repo-counter');
    if (counter) {
      counter.textContent = `Exibindo ${projectsToShow.length} de ${projects.length} projetos`;
    }

    console.log(`✅ ${projectsToShow.length} projetos carregados com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao carregar projetos:', error);
    const repoGrid = document.getElementById('repo-grid');
    repoGrid.innerHTML = `
      <div class="empty-state error grid-span-all">
        <h3>Erro ao carregar projetos</h3>
        <p>Por favor, tente novamente mais tarde.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
