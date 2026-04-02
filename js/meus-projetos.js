// ========================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ========================================

// Chave para armazenamento local dos projetos
const MY_PROJECTS_KEY = 'myProjects';
const SESSION_KEY = 'openTeamworkSession';

// ID do projeto em edição (null quando criando novo projeto)
let editingProjectId = null;

// ========================================
// FUNÇÕES DE SEGURANÇA / SANITIZAÇÃO
// ========================================

/**
 * Escapa caracteres perigosos de HTML para evitar injeção (XSS)
 * @param {string} str - Texto potencialmente controlado pelo usuário
 * @returns {string} Texto seguro para ser inserido via innerHTML
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normaliza URLs e bloqueia protocolos inseguros (ex.: javascript:)
 * Retorna '' (string vazia) quando a URL é inválida ou usa protocolo não permitido
 * @param {string} url
 * @returns {string}
 */
function sanitizeURL(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    const protocol = u.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return u.href;
    }
  } catch (_) {
    // segue para retorno vazio
  }
  return '';
}

// ========================================
// FUNÇÕES DE PERSISTÊNCIA DE DADOS
// ========================================

/**
 * Recupera todos os projetos do localStorage
 * @returns {Array} Lista de projetos do usuário
 */
function getMyProjects() {
  try {
    return JSON.parse(localStorage.getItem(MY_PROJECTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Salva a lista de projetos no localStorage
 * @param {Array} projects - Lista de projetos a ser salva
 */
function saveMyProjects(projects) {
  localStorage.setItem(MY_PROJECTS_KEY, JSON.stringify(projects));
}

/**
 * Gera um ID único para novo projeto
 * @returns {number} Próximo ID disponível
 */
function generateProjectId() {
  const projects = getMyProjects();
  const maxId = projects.reduce((max, p) => Math.max(max, p.id || 0), 0);
  return maxId + 1;
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
 * Envia o usuário para a tela de login/perfil.
 */
function redirectToLogin() {
  window.location.href = './perfil.html';
}

/**
 * Atualiza estado do botão "Novo Projeto" quando usuário não está autenticado.
 * @param {boolean} isAuthenticated
 */
function updateCreateButtonState(isAuthenticated) {
  if (!btnNewProject) return;

  btnNewProject.classList.toggle('is-disabled', !isAuthenticated);
  btnNewProject.setAttribute('aria-disabled', String(!isAuthenticated));
  btnNewProject.title = isAuthenticated
    ? ''
    : 'Faça login para criar um novo projeto.';
}

/**
 * Renderiza estado de acesso bloqueado para visitantes não autenticados.
 */
function renderUnauthenticatedState() {
  const container = document.getElementById('projects-list');
  updateCreateButtonState(false);

  container.innerHTML = `
    <div class="empty-state">
      <p>Faça login para visualizar e gerenciar seus projetos.</p>
      <p class="hint">Clique em "Novo Projeto" para ir para a tela de login.</p>
    </div>
  `;
}

// ========================================
// FUNÇÕES DE RENDERIZAÇÃO
// ========================================

/**
 * Renderiza a lista completa de projetos na página
 * Exibe mensagem de estado vazio caso não haja projetos
 */
function renderProjects() {
  if (!isUserAuthenticated()) {
    renderUnauthenticatedState();
    return;
  }

  updateCreateButtonState(true);
  const projects = getMyProjects();
  const container = document.getElementById('projects-list');

  // Exibe mensagem quando não há projetos
  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Você ainda não criou nenhum projeto.</p>
        <p class="hint">Clique em "Novo Projeto" para começar!</p>
      </div>
    `;
    return;
  }

  // Renderiza cada projeto como um card (com valores sanitizados)
  container.innerHTML = projects.map(project => {
    const safeName = escapeHTML(project.name);
    const safeOwner = escapeHTML(project.owner);
    const safeDesc = escapeHTML(project.description);
    const safeUrl = sanitizeURL(project.url);
    const qualsHTML = (project.qualifications || []).map(q => `
          <div class="qualification-item-card">
            <svg viewBox="0 0 16 16" width="14" height="14" class="person-icon">
              <path fill-rule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"></path>
            </svg>
            <span class="qualification-name">${escapeHTML(q.name)}</span>
            <span class="qualification-count">${Number(q.filled) || 0}/${Number(q.total) || 0}</span>
          </div>
        `).join('');
    const tagsHTML = (project.tags || []).map(tag => `<span class="topic-tag">${escapeHTML(tag)}</span>`).join('');
    const urlHTML = (safeUrl)
      ? `<a href="${safeUrl}" class="project-card-url" target="_blank" rel="noopener noreferrer">
                 <svg viewBox="0 0 16 16" width="12" height="12">
                   <path fill-rule="evenodd" d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"></path>
                 </svg>
                 ${escapeHTML(safeUrl)}
               </a>`
      : `<span class="project-card-url-na">URL: N/A</span>`;

    return `
    <div class="project-card" data-project-id="${Number(project.id) || ''}">
      <div class="project-card-header">
        <div>
          <h3 class="project-card-title">${safeName}</h3>
          <p class="project-card-owner">Host: ${safeOwner}</p>
          ${urlHTML}
        </div>
        <div class="project-card-actions">
          <button class="btn-edit-project" data-id="${Number(project.id) || ''}" aria-label="Editar projeto">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path fill-rule="evenodd" d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"></path>
            </svg>
          </button>
          <button class="btn-delete-project" data-id="${Number(project.id) || ''}" aria-label="Excluir projeto">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path fill-rule="evenodd" d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"></path>
            </svg>
          </button>
        </div>
      </div>
      <p class="project-card-description">${safeDesc}</p>
      <div class="project-card-qualifications">
        ${qualsHTML}
      </div>
      <div class="project-card-tags">
        ${tagsHTML}
      </div>
    </div>`;
  }).join('');

  // Adiciona eventos aos botões de edição
  container.querySelectorAll('.btn-edit-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      openEditModal(id);
    });
  });

  // Adiciona eventos aos botões de exclusão
  container.querySelectorAll('.btn-delete-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      if (confirm('Tem certeza que deseja excluir este projeto?')) {
        deleteProject(id);
      }
    });
  });
}

// ========================================
// FUNÇÕES DE MANIPULAÇÃO DE PROJETOS
// ========================================

/**
 * Exclui um projeto da lista
 * @param {number} id - ID do projeto a ser excluído
 */
function deleteProject(id) {
  const projects = getMyProjects();
  const filtered = projects.filter(p => p.id !== id);
  saveMyProjects(filtered);
  renderProjects();
}

// ========================================
// ELEMENTOS DO MODAL
// ========================================

// Elementos DOM do modal de criação/edição
const modal = document.getElementById('create-project-modal');
const modalTitle = document.getElementById('create-project-title');
const btnNewProject = document.getElementById('btn-new-project');
const btnClose = document.getElementById('close-create-project');
const btnCancel = document.getElementById('cancel-create-project');
const btnSave = document.getElementById('save-project');
const form = document.getElementById('project-form');

// ========================================
// FUNÇÕES DE CONTROLE DO MODAL
// ========================================

/**
 * Abre o modal para criar um novo projeto
 * Reseta o formulário e configurações
 */
function openCreateModal() {
  editingProjectId = null;
  modalTitle.textContent = 'Criar Novo Projeto';
  btnSave.textContent = 'Criar Projeto';
  form.reset();
  // Reseta as qualificações para apenas uma linha
  const container = document.getElementById('qualifications-inputs');
  container.innerHTML = `
    <div class="qualification-input-row">
      <input type="text" class="qual-name" placeholder="Ex: Frontend Developer" required />
      <input type="number" class="qual-total" placeholder="Total" min="1" value="1" required />
      <button type="button" class="btn-remove-qual" disabled>−</button>
    </div>
  `;
  modal.classList.remove('hidden');
}

/**
 * Abre o modal para editar um projeto existente
 * @param {number} projectId - ID do projeto a ser editado
 */
function openEditModal(projectId) {
  editingProjectId = projectId;
  const projects = getMyProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  modalTitle.textContent = 'Editar Projeto';
  btnSave.textContent = 'Salvar Alterações';

  // Preenche o formulário
  document.getElementById('project-name').value = project.name;
  document.getElementById('project-owner').value = project.owner;
  document.getElementById('project-description').value = project.description;
  document.getElementById('project-url').value = project.url || '';
  document.getElementById('project-tags').value = project.tags.join(', ');

  // Preenche qualificações (criando elementos para evitar injeção)
  const container = document.getElementById('qualifications-inputs');
  container.innerHTML = '';
  (project.qualifications || []).forEach(q => {
    const row = document.createElement('div');
    row.className = 'qualification-input-row';

    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.className = 'qual-name';
    inputName.placeholder = 'Ex: Frontend Developer';
    inputName.required = true;
    inputName.value = q.name || '';

    const inputTotal = document.createElement('input');
    inputTotal.type = 'number';
    inputTotal.className = 'qual-total';
    inputTotal.placeholder = 'Total';
    inputTotal.min = '1';
    inputTotal.required = true;
    inputTotal.value = String(q.total || 1);

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove-qual';
    btnRemove.textContent = '−';

    row.appendChild(inputName);
    row.appendChild(inputTotal);
    row.appendChild(btnRemove);
    container.appendChild(row);
  });
  updateRemoveButtons();

  modal.classList.remove('hidden');
}

/**
 * Fecha o modal de criação/edição
 */
function closeCreateModal() {
  modal.classList.add('hidden');
}

/**
 * Atualiza o estado dos botões de remover qualificação
 * Desabilita o botão quando há apenas uma qualificação
 */
function updateRemoveButtons() {
  const rows = document.querySelectorAll('.qualification-input-row');
  rows.forEach((row, index) => {
    const btn = row.querySelector('.btn-remove-qual');
    btn.disabled = rows.length === 1;
  });
}

// ========================================
// EVENT LISTENERS DO MODAL
// ========================================

// Abre modal ao clicar em "Novo Projeto"
btnNewProject.addEventListener('click', () => {
  if (!isUserAuthenticated()) {
    redirectToLogin();
    return;
  }

  openCreateModal();
});

// Fecha modal ao clicar no botão de fechar
btnClose.addEventListener('click', closeCreateModal);

// Fecha modal ao clicar em "Cancelar"
btnCancel.addEventListener('click', closeCreateModal);

// Fecha modal ao clicar fora dele
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeCreateModal();
});

// ========================================
// GERENCIAMENTO DE QUALIFICAÇÕES
// ========================================

// Adiciona nova linha de qualificação
document.getElementById('btn-add-qual').addEventListener('click', () => {
  const container = document.getElementById('qualifications-inputs');
  const newRow = document.createElement('div');
  newRow.className = 'qualification-input-row';
  newRow.innerHTML = `
    <input type="text" class="qual-name" placeholder="Ex: Backend Developer" required />
    <input type="number" class="qual-total" placeholder="Total" min="1" value="1" required />
    <button type="button" class="btn-remove-qual">−</button>
  `;
  container.appendChild(newRow);
  updateRemoveButtons();
});

// Remove linha de qualificação ao clicar no botão "-"
document.getElementById('qualifications-inputs').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-qual')) {
    e.target.parentElement.remove();
    updateRemoveButtons();
  }
});

// ========================================
// SALVAMENTO DE PROJETOS
// ========================================

/**
 * Salva ou atualiza um projeto
 * Valida os dados e atualiza o localStorage
 */
btnSave.addEventListener('click', () => {
  // Valida o formulário antes de continuar
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Coleta os dados básicos do formulário
  const name = document.getElementById('project-name').value.trim();
  const owner = document.getElementById('project-owner').value.trim();
  const description = document.getElementById('project-description').value.trim();
  const url = document.getElementById('project-url').value.trim() || '';
  const tagsInput = document.getElementById('project-tags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  // Valida e coleta as qualificações
  const qualRows = document.querySelectorAll('.qualification-input-row');
  const qualifications = [];
  let valid = true;

  qualRows.forEach(row => {
    const qName = row.querySelector('.qual-name').value.trim();
    const qTotal = parseInt(row.querySelector('.qual-total').value);
    if (qName && qTotal > 0) {
      qualifications.push({
        name: qName,
        filled: 0,
        total: qTotal
      });
    } else {
      valid = false;
    }
  });

  if (!valid || qualifications.length === 0) {
    alert('Preencha todas as qualificações corretamente.');
    return;
  }

  const projects = getMyProjects();

  if (editingProjectId) {
    // Modo edição: atualiza projeto existente
    const index = projects.findIndex(p => p.id === editingProjectId);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        name,
        owner,
        description,
        url,
        qualifications,
        tags
      };
    }
  } else {
    // Modo criação: adiciona novo projeto
    const newProject = {
      id: generateProjectId(),
      name,
      owner,
      description,
      url,
      qualifications,
      tags
    };
    projects.push(newProject);
  }

  saveMyProjects(projects);
  closeCreateModal();
  renderProjects();
});

// ========================================
// INICIALIZAÇÃO
// ========================================

// Carrega e renderiza os projetos quando a página é carregada
document.addEventListener('DOMContentLoaded', renderProjects);
