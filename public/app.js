/* ============================================
   CCC — Claude Command Center
   Stage 02: Dynamic data from API
   ============================================ */

// --- State ---

let groups = [];
let projectsList = [];
let openTabs = [];
let activeTab = null;
let expandedProjects = new Set();
let collapsedGroups = new Set();
let dragState = null;
let settings = {};

// --- API ---

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

async function loadProjects() {
  const data = await api('GET', '/api/projects');
  groups = (data.groups || []).sort((a, b) => a.order - b.order);
  projectsList = data.projects || [];
  render();
}

async function loadSettings() {
  settings = await api('GET', '/api/settings');
}

// --- Helpers ---

function findProject(id) {
  return projectsList.find(p => p.id === id) || null;
}

function getProjectFiles(project) {
  if (!project.coreFiles) return [];
  const files = [];
  if (project.coreFiles.claude) files.push(project.coreFiles.claude);
  if (project.coreFiles.concept) files.push(project.coreFiles.concept);
  if (project.coreFiles.tasklist) files.push(project.coreFiles.tasklist);
  return files;
}

function projectsInGroup(groupName) {
  return projectsList
    .filter(p => p.group === groupName)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Tree View Rendering ---

function renderTreeView() {
  const container = document.getElementById('treeView');
  container.innerHTML = '';

  groups.forEach(group => {
    const isCollapsed = collapsedGroups.has(group.name);
    const groupProjects = projectsInGroup(group.name);

    const groupEl = document.createElement('div');
    groupEl.className = 'tree-group' + (isCollapsed ? ' collapsed' : '');
    groupEl.dataset.groupName = group.name;

    // Group header
    const header = document.createElement('div');
    header.className = 'tree-group-header';
    header.innerHTML = `<span class="tree-group-chevron">&#x25BE;</span> ${escapeHtml(group.name)}`;

    header.addEventListener('click', () => {
      if (isCollapsed) {
        collapsedGroups.delete(group.name);
      } else {
        collapsedGroups.add(group.name);
      }
      renderTreeView();
    });

    // Group is a drop target
    header.addEventListener('dragover', (e) => {
      e.preventDefault();
      header.classList.add('drag-over');
    });
    header.addEventListener('dragleave', () => {
      header.classList.remove('drag-over');
    });
    header.addEventListener('drop', (e) => {
      e.preventDefault();
      header.classList.remove('drag-over');
      handleDrop(group.name, null);
    });

    groupEl.appendChild(header);

    // Projects container
    const children = document.createElement('div');
    children.className = 'tree-group-children';

    groupProjects.forEach(project => {
      const projectEl = document.createElement('div');
      projectEl.className = 'tree-project' + (expandedProjects.has(project.id) ? ' expanded' : '');
      projectEl.dataset.projectId = project.id;

      // Project row
      const row = document.createElement('div');
      row.className = 'tree-project-row' + (activeTab === project.id ? ' active' : '');
      row.draggable = true;

      // Status — all projects start as unknown (no session) until Stage 04
      const status = 'unknown';

      row.innerHTML = `
        <span class="tree-project-chevron">&#x25B8;</span>
        <span class="tree-project-name">${escapeHtml(project.name)}</span>
        <span class="tree-project-actions">
          <span class="action-btn edit-btn" title="Edit project">&#x270E;</span>
          <span class="action-btn remove-btn" title="Remove project">&times;</span>
        </span>
        <span class="status-dot ${status}"></span>
      `;

      // Chevron: toggle expand
      const chevron = row.querySelector('.tree-project-chevron');
      chevron.addEventListener('click', (e) => {
        e.stopPropagation();
        if (expandedProjects.has(project.id)) {
          expandedProjects.delete(project.id);
        } else {
          expandedProjects.add(project.id);
        }
        projectEl.classList.toggle('expanded');
      });

      // Row click: open tab
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        openTab(project.id);
      });

      // Edit button
      row.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showEditModal(project);
      });

      // Remove button
      row.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showRemoveConfirm(project);
      });

      // Drag & drop
      row.addEventListener('dragstart', (e) => {
        dragState = { projectId: project.id };
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        dragState = null;
        clearDropIndicators();
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragState && dragState.projectId !== project.id) {
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (dragState && dragState.projectId !== project.id) {
          handleDrop(project.group, project.id);
        }
      });

      projectEl.appendChild(row);

      // Core files
      const files = getProjectFiles(project);
      if (files.length > 0) {
        const filesEl = document.createElement('div');
        filesEl.className = 'tree-project-files';
        files.forEach(file => {
          const fileEl = document.createElement('div');
          fileEl.className = 'tree-file';
          fileEl.innerHTML = `<span class="tree-file-icon">&#x1F4C4;</span><span class="tree-file-name">${escapeHtml(file)}</span>`;
          fileEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openFileTab(project.id, project.name, file);
          });
          filesEl.appendChild(fileEl);
        });
        projectEl.appendChild(filesEl);
      }

      children.appendChild(projectEl);
    });

    groupEl.appendChild(children);
    container.appendChild(groupEl);
  });
}

function clearDropIndicators() {
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// --- Drag & Drop Handler ---

async function handleDrop(targetGroup, beforeProjectId) {
  if (!dragState) return;
  const draggedId = dragState.projectId;
  const dragged = findProject(draggedId);
  if (!dragged) return;

  // Build new order for the target group
  let groupProjects = projectsInGroup(targetGroup).filter(p => p.id !== draggedId);

  if (beforeProjectId) {
    const idx = groupProjects.findIndex(p => p.id === beforeProjectId);
    if (idx >= 0) {
      groupProjects.splice(idx, 0, dragged);
    } else {
      groupProjects.push(dragged);
    }
  } else {
    // Dropped on group header — append to end
    groupProjects.push(dragged);
  }

  // Build reorder payload
  const orderedIds = [];

  // Re-index the target group
  groupProjects.forEach((p, i) => {
    orderedIds.push({ id: p.id, group: targetGroup, order: i });
  });

  // If the project moved from a different group, re-index the source group too
  if (dragged.group !== targetGroup) {
    const sourceProjects = projectsInGroup(dragged.group).filter(p => p.id !== draggedId);
    sourceProjects.forEach((p, i) => {
      orderedIds.push({ id: p.id, group: dragged.group, order: i });
    });
  }

  await api('PUT', '/api/projects-reorder', { orderedIds });
  await loadProjects();
}

// --- Tab Bar ---

function renderTabBar() {
  const container = document.getElementById('tabBar');
  container.innerHTML = '';

  openTabs.forEach(tabId => {
    const info = getTabInfo(tabId);
    if (!info) return;

    const tab = document.createElement('div');
    tab.className = 'tab' + (activeTab === tabId ? ' active' : '');
    tab.innerHTML = `
      <span class="status-dot ${info.status}"></span>
      <span class="tab-name">${escapeHtml(info.name)}</span>
      <span class="tab-close" title="Close tab">&times;</span>
    `;

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        closeTab(tabId);
        return;
      }
      switchTab(tabId);
    });

    container.appendChild(tab);
  });
}

function getTabInfo(tabId) {
  if (tabId === 'settings') {
    return { name: 'Settings', status: 'unknown' };
  }
  if (tabId.includes(':')) {
    const [projectId, fileName] = tabId.split(':');
    const project = findProject(projectId);
    return project ? { name: fileName, status: 'unknown' } : null;
  }
  const project = findProject(tabId);
  return project ? { name: project.name, status: 'unknown' } : null;
}

// --- Tab Content ---

function renderTabContent() {
  const container = document.getElementById('tabContent');
  container.innerHTML = '';

  if (!activeTab) {
    container.innerHTML = '<div class="no-session"><span class="no-session-text">Select a project from the tree view</span></div>';
    return;
  }

  if (activeTab === 'settings') {
    renderSettings(container);
    return;
  }

  if (activeTab.includes(':')) {
    const [projectId, fileName] = activeTab.split(':');
    const project = findProject(projectId);
    renderReadPanel(container, project, fileName);
    return;
  }

  const project = findProject(activeTab);
  if (!project) {
    container.innerHTML = '<div class="no-session"><span class="no-session-text">Project not found</span></div>';
    return;
  }

  // No session view — terminal sessions come in Stage 03
  container.innerHTML = `
    <div class="no-session">
      <span class="no-session-text">No active session. Start Claude Code in this project?</span>
      <div class="no-session-actions">
        <button class="btn btn-primary" title="Launch Claude Code in this project directory">Start Claude Code</button>
        <button class="btn" title="Open a plain shell in this project directory">Open Shell</button>
      </div>
      <div class="no-session-path">${escapeHtml(project.path)}</div>
    </div>
  `;
}

function renderSettings(container) {
  container.innerHTML = `
    <div class="settings-panel">
      <h2>Settings</h2>
      <div class="settings-group">
        <label>Project Root</label>
        <div class="input-with-btn">
          <input type="text" id="settingsProjectRoot" value="${escapeHtml(settings.projectRoot || '')}" placeholder="/absolute/path/to/projects">
          <button class="btn browse-btn" id="settingsRootBrowse" title="Browse filesystem to select project root">Browse</button>
        </div>
        <span class="settings-hint">Base path for all project paths. Project paths in projects.json are stored relative to this root.</span>
      </div>
      <div class="settings-group">
        <label>External Editor</label>
        <input type="text" value="CotEditor" placeholder="e.g. CotEditor, VS Code, Cursor">
      </div>
      <div class="settings-group">
        <label>Default Shell</label>
        <input type="text" value="/bin/zsh" placeholder="e.g. /bin/zsh, /bin/bash">
      </div>
      <div class="settings-group">
        <label>Theme</label>
        <select>
          <option>Dark</option>
          <option>Light</option>
        </select>
      </div>
      <div class="settings-group">
        <label>Concept File Pattern</label>
        <input type="text" value="docs/{PROJECT}_concept.md" placeholder="docs/{PROJECT}_concept.md">
      </div>
      <div class="settings-group">
        <label>Tasklist File Pattern</label>
        <input type="text" value="docs/{PROJECT}_tasklist.md" placeholder="docs/{PROJECT}_tasklist.md">
      </div>
      <div class="settings-group">
        <label>GitHub Token (optional)</label>
        <input type="password" value="" placeholder="For auto-issue filing on parser degradation">
      </div>
    </div>
  `;

  container.querySelector('#settingsRootBrowse').addEventListener('click', () => {
    const input = container.querySelector('#settingsProjectRoot');
    showBrowseModal(input.value || '/', (selected) => {
      input.value = selected;
    });
  });
}

function renderReadPanel(container, project, fileName) {
  const name = project ? project.name : 'Unknown';
  container.innerHTML = `
    <div class="read-panel">
      <button class="btn open-editor-btn">Open in Editor</button>
      <h1>${escapeHtml(fileName)}</h1>
      <p><em>${escapeHtml(name)}</em></p>
      <h2>Preview</h2>
      <p>This is a rendered Markdown preview of the file. In later stages, this will use marked.js to render the actual file contents with full Markdown support — headings, tables, code blocks, task lists.</p>
    </div>
  `;
}

// --- Tab Management ---

function openTab(projectId) {
  if (!openTabs.includes(projectId)) {
    openTabs.push(projectId);
  }
  activeTab = projectId;
  render();
}

function openFileTab(projectId, projectName, fileName) {
  const tabId = projectId + ':' + fileName;
  if (!openTabs.includes(tabId)) {
    openTabs.push(tabId);
  }
  activeTab = tabId;
  render();
}

function switchTab(tabId) {
  activeTab = tabId;
  render();
}

function closeTab(tabId) {
  openTabs = openTabs.filter(t => t !== tabId);
  if (activeTab === tabId) {
    activeTab = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
  }
  render();
}

function openSettings() {
  if (!openTabs.includes('settings')) {
    openTabs.push('settings');
  }
  activeTab = 'settings';
  render();
}

// --- Directory Browser ---

async function showBrowseModal(startPath, onSelect) {
  const existing = document.getElementById('modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-browse">
      <div class="modal-header">
        <span class="modal-title">Browse</span>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="browse-current" id="browseCurrent"></div>
        <div class="browse-list" id="browseList"></div>
      </div>
      <div class="modal-footer">
        <button class="btn modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-submit">Select</button>
      </div>
    </div>
  `;

  let currentPath = startPath || '/';

  async function loadDir(dirPath) {
    const data = await api('GET', `/api/browse?path=${encodeURIComponent(dirPath)}`);
    if (data.error) return;
    currentPath = data.current;

    overlay.querySelector('#browseCurrent').textContent = data.current;

    const list = overlay.querySelector('#browseList');
    list.innerHTML = '';

    // Parent directory entry
    if (data.parent !== data.current) {
      const parentEl = document.createElement('div');
      parentEl.className = 'browse-item browse-parent';
      parentEl.textContent = '..';
      parentEl.addEventListener('click', () => loadDir(data.parent));
      list.appendChild(parentEl);
    }

    data.directories.forEach(name => {
      const item = document.createElement('div');
      item.className = 'browse-item';
      item.textContent = name;
      item.addEventListener('click', () => loadDir(data.current + '/' + name));
      list.appendChild(item);
    });

    if (data.directories.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'browse-empty';
      empty.textContent = 'No subdirectories';
      list.appendChild(empty);
    }
  }

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.modal-submit').addEventListener('click', () => {
    onSelect(currentPath);
    overlay.remove();
  });

  document.body.appendChild(overlay);
  await loadDir(currentPath);
}

// --- Modals ---

function showModal(title, bodyHtml, onSubmit) {
  // Remove existing modal
  const existing = document.getElementById('modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${escapeHtml(title)}</span>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        <button class="btn modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-submit">Confirm</button>
      </div>
    </div>
  `;

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.modal-submit').addEventListener('click', () => {
    onSubmit(overlay);
    overlay.remove();
  });

  document.body.appendChild(overlay);

  // Focus first input
  const firstInput = overlay.querySelector('input, select');
  if (firstInput) firstInput.focus();
}

// Add Project

function showAddProjectModal() {
  const groupOptions = groups.map(g =>
    `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`
  ).join('');

  const body = `
    <div class="settings-group">
      <label>Project Name</label>
      <input type="text" id="addName" placeholder="My Project">
    </div>
    <div class="settings-group">
      <label>Path</label>
      <div class="input-with-btn">
        <input type="text" id="addPath" value="${escapeHtml(settings.projectRoot || '')}" placeholder="/path/to/project">
        <button class="btn browse-btn" id="addPathBrowse" title="Browse filesystem to select project path">Browse</button>
      </div>
    </div>
    <div class="settings-group">
      <label>Group</label>
      <select id="addGroup">${groupOptions}</select>
    </div>
  `;

  showModal('Add Project', body, async (overlay) => {
    const name = overlay.querySelector('#addName').value.trim();
    const path = overlay.querySelector('#addPath').value.trim();
    const group = overlay.querySelector('#addGroup').value;
    if (!name || !path) return;

    await api('POST', '/api/projects', {
      name,
      path,
      group,
      coreFiles: {
        claude: 'CLAUDE.md',
        concept: `docs/${name}_concept.md`,
        tasklist: `docs/${name}_tasklist.md`
      }
    });
    await loadProjects();
  });

  // Wire browse button after modal is in the DOM
  document.getElementById('addPathBrowse').addEventListener('click', (e) => {
    e.preventDefault();
    const pathInput = document.getElementById('addPath');
    showBrowseModal(pathInput.value || settings.projectRoot || '/', (selected) => {
      pathInput.value = selected;
    });
  });
}

// Edit Project

function showEditModal(project) {
  const groupOptions = groups.map(g =>
    `<option value="${escapeHtml(g.name)}" ${g.name === project.group ? 'selected' : ''}>${escapeHtml(g.name)}</option>`
  ).join('');

  const body = `
    <div class="settings-group">
      <label>Project Name</label>
      <input type="text" id="editName" value="${escapeHtml(project.name)}">
    </div>
    <div class="settings-group">
      <label>Group</label>
      <select id="editGroup">${groupOptions}</select>
    </div>
  `;

  showModal('Edit Project', body, async (overlay) => {
    const name = overlay.querySelector('#editName').value.trim();
    const group = overlay.querySelector('#editGroup').value;
    if (!name) return;

    await api('PUT', `/api/projects/${project.id}`, { name, group });
    await loadProjects();
  });
}

// Remove Project

function showRemoveConfirm(project) {
  const body = `<p>Remove <strong>${escapeHtml(project.name)}</strong> from CCC? This does not delete any files.</p>`;

  showModal('Remove Project', body, async () => {
    await api('DELETE', `/api/projects/${project.id}`);

    // Close any open tabs for this project
    openTabs = openTabs.filter(t => t !== project.id && !t.startsWith(project.id + ':'));
    if (activeTab === project.id || activeTab?.startsWith(project.id + ':')) {
      activeTab = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
    }

    await loadProjects();
  });
}

// --- Sidebar Resize ---

function initResize() {
  const handle = document.getElementById('resizeHandle');
  const sidebar = document.getElementById('sidebar');
  let isResizing = false;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.min(Math.max(e.clientX, 200), 400);
    sidebar.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    handle.classList.remove('active');
    document.body.style.cursor = '';
  });
}

// --- Full Render ---

function render() {
  renderTreeView();
  renderTabBar();
  renderTabContent();
}

// --- Init ---

document.getElementById('settingsEntry').addEventListener('click', openSettings);
document.getElementById('addProjectBtn').addEventListener('click', showAddProjectModal);
initResize();
loadSettings().then(() => loadProjects());
