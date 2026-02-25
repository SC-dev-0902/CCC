/* ============================================
   CCC — Claude Command Center
   Stage 06: Project Versioning
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

// Terminal instances: projectId -> { terminal, fitAddon, ws, container, state, claudeStatus, degraded }
const terminalInstances = new Map();

// Version state: projectId -> { activeVersion, versions: [...], hasFlatDocs }
const projectVersions = new Map();
// "projectId:version" strings for expanded version rows
const expandedVersions = new Set();
// "projectId" strings for expanded Versions header
const expandedVersionHeaders = new Set();

// --- API ---

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

let suppressRender = false;

async function loadProjects() {
  const data = await api('GET', '/api/projects');
  groups = (data.groups || []).sort((a, b) => a.order - b.order);
  projectsList = data.projects || [];
  if (!suppressRender) render();
}

async function loadSettings() {
  settings = await api('GET', '/api/settings');
}

// --- Version Loading ---

async function loadProjectVersions(projectId) {
  const data = await api('GET', `/api/projects/${projectId}/versions`);
  projectVersions.set(projectId, data);
  return data;
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

/**
 * Get the display status for a project's status dot.
 * Maps parser state → CSS class for the dot colour.
 *
 * Claude Code sessions: uses claudeStatus from parser
 * Shell sessions: active = running, exited = completed
 * No session: unknown
 */
function getProjectStatus(projectId) {
  const instance = terminalInstances.get(projectId);
  if (!instance) return 'unknown';

  // Exited sessions are grey regardless
  if (instance.state === 'exited') return 'unknown';

  // If degraded, all dots fall back to unknown (grey)
  if (instance.degraded) return 'unknown';

  // Claude Code session with parser status
  if (instance.claudeStatus) {
    return instance.claudeStatus; // waiting, running, completed, error, unknown
  }

  // Plain shell session
  if (instance.state === 'active') return 'running';

  return 'unknown';
}

/**
 * Show degraded state warning banner in the UI.
 */
function showDegradedBanner() {
  // Don't show multiple banners
  if (document.getElementById('degradedBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'degradedBanner';
  banner.className = 'degraded-banner';
  banner.innerHTML = `
    <span>Status detection is degraded. Claude Code output format may have changed.</span>
    <a href="https://github.com/Phet/CCC/issues" target="_blank" rel="noopener">View issues</a>
    <button class="degraded-dismiss" title="Dismiss warning">&times;</button>
  `;
  banner.querySelector('.degraded-dismiss').addEventListener('click', () => {
    banner.remove();
  });

  const mainPanel = document.querySelector('.main-panel');
  mainPanel.insertBefore(banner, mainPanel.firstChild);
}

// --- Terminal Management ---

function createTerminal(projectId) {
  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Consolas, monospace',
    theme: {
      background: '#0d1117',
      foreground: '#e6edf3',
      cursor: '#58a6ff',
      cursorAccent: '#0d1117',
      selectionBackground: 'rgba(88, 166, 255, 0.3)',
      black: '#484f58',
      red: '#f85149',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39d2c0',
      white: '#e6edf3',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#ffffff'
    },
    scrollback: 10000,
    allowProposedApi: true
  });

  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);

  // Create a persistent container div
  const container = document.createElement('div');
  container.className = 'terminal-container';
  container.style.display = 'none';

  const instance = {
    terminal,
    fitAddon,
    ws: null,
    container,
    state: 'none',       // none, active, exited
    claudeStatus: null,  // null (shell), or: waiting, running, completed, error, unknown
    degraded: false
  };

  terminalInstances.set(projectId, instance);
  return instance;
}

function connectTerminal(projectId) {
  const instance = terminalInstances.get(projectId);
  if (!instance) return;

  // Close existing WebSocket if any
  if (instance.ws) {
    instance.ws.close();
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws?projectId=${projectId}`);

  ws.onopen = () => {
    // Sync terminal size
    const { cols, rows } = instance.terminal;
    ws.send(JSON.stringify({ type: 'resize', cols, rows }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'output') {
        instance.terminal.write(msg.data);
      } else if (msg.type === 'state') {
        instance.state = msg.state;
        renderTreeView();
        renderTabBar();
      } else if (msg.type === 'claudeStatus') {
        instance.claudeStatus = msg.status;
        renderTreeView();
        renderTabBar();
      } else if (msg.type === 'degraded') {
        instance.degraded = true;
        renderTreeView();
        renderTabBar();
        showDegradedBanner();
      } else if (msg.type === 'exit') {
        instance.state = 'exited';
        instance.claudeStatus = null;
        instance.degraded = false;
        renderTreeView();
        renderTabBar();
        renderTabContent();
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  ws.onclose = () => {
    instance.ws = null;
  };

  instance.ws = ws;

  // Forward terminal input to WebSocket
  instance.terminal.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });

  // Forward resize events
  instance.terminal.onResize(({ cols, rows }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  });
}

async function startSession(projectId, command) {
  try {
    // Create terminal instance if it doesn't exist
    let instance = terminalInstances.get(projectId);
    if (!instance) {
      instance = createTerminal(projectId);
    }

    // Reset terminal for new session
    instance.terminal.reset();
    instance.state = 'active';

    // Start session on server
    const result = await api('POST', `/api/sessions/${projectId}`, { command });
    if (result.error) {
      console.error('Session start failed:', result.error);
      alert('Failed to start session: ' + result.error);
      return;
    }

    // Connect WebSocket
    connectTerminal(projectId);

    // Render to show terminal
    renderTabContent();
  } catch (err) {
    console.error('startSession error:', err);
    alert('Error starting session: ' + err.message);
  }
}

function showTerminal(projectId) {
  const contentEl = document.getElementById('tabContent');

  // Hide all terminal containers
  terminalInstances.forEach((inst) => {
    inst.container.style.display = 'none';
  });

  const instance = terminalInstances.get(projectId);
  if (!instance) return;

  // Ensure container is in the DOM
  if (!instance.container.parentNode) {
    contentEl.appendChild(instance.container);
    instance.terminal.open(instance.container);
  }

  instance.container.style.display = 'flex';

  // Fit terminal to container after a brief layout delay
  requestAnimationFrame(() => {
    try {
      instance.fitAddon.fit();
    } catch (e) {
      // Ignore fit errors during initial render
    }
  });
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

      // Get status for dot colour
      const status = getProjectStatus(project.id);

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

      // Project children (versioned or flat)
      const filesEl = document.createElement('div');
      filesEl.className = 'tree-project-files';

      if (project.activeVersion) {
        // --- Versioned project ---
        // CLAUDE.md always at project level
        if (project.coreFiles && project.coreFiles.claude) {
          const claudeEl = document.createElement('div');
          claudeEl.className = 'tree-file';
          claudeEl.innerHTML = `<span class="tree-file-icon">&#x1F4C4;</span><span class="tree-file-name">${escapeHtml(project.coreFiles.claude)}</span>`;
          claudeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openFileTab(project.id, project.name, project.coreFiles.claude);
          });
          filesEl.appendChild(claudeEl);
        }

        // Versions header
        const versionsHeaderExpanded = expandedVersionHeaders.has(project.id);
        const versionsHeader = document.createElement('div');
        versionsHeader.className = 'tree-versions-header' + (versionsHeaderExpanded ? ' expanded' : '');
        versionsHeader.innerHTML = `
          <span class="tree-versions-chevron">&#x25B8;</span>
          <span>Versions</span>
          <button class="add-version-btn" title="New version">+</button>
        `;

        versionsHeader.addEventListener('click', async (e) => {
          if (e.target.closest('.add-version-btn')) {
            e.stopPropagation();
            showNewVersionModal(project);
            return;
          }
          e.stopPropagation();
          if (expandedVersionHeaders.has(project.id)) {
            expandedVersionHeaders.delete(project.id);
          } else {
            expandedVersionHeaders.add(project.id);
            // Lazy load versions on first expand
            if (!projectVersions.has(project.id)) {
              await loadProjectVersions(project.id);
            }
          }
          renderTreeView();
        });

        filesEl.appendChild(versionsHeader);

        // Version rows (if expanded)
        const versionsChildren = document.createElement('div');
        versionsChildren.className = 'tree-versions-children' + (versionsHeaderExpanded ? ' expanded' : '');

        const vData = projectVersions.get(project.id);
        if (vData && vData.versions) {
          for (const ver of vData.versions) {
            renderVersionRow(versionsChildren, project, ver, vData.activeVersion);
          }
        }

        filesEl.appendChild(versionsChildren);

      } else {
        // --- Non-versioned project: show flat coreFiles ---
        const files = getProjectFiles(project);
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

        // Check for flat docs and show migration prompt
        if (expandedProjects.has(project.id) && !projectVersions.has(project.id)) {
          loadProjectVersions(project.id).then(data => {
            if (data.hasFlatDocs) {
              renderMigrationHint(filesEl, project);
            }
          });
        } else if (projectVersions.has(project.id)) {
          const vData = projectVersions.get(project.id);
          if (vData.hasFlatDocs) {
            renderMigrationHint(filesEl, project);
          }
        }
      }

      projectEl.appendChild(filesEl);

      children.appendChild(projectEl);
    });

    groupEl.appendChild(children);
    container.appendChild(groupEl);
  });
}

function clearDropIndicators() {
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// --- Version Tree Helpers ---

function renderVersionRow(container, project, ver, activeVersion) {
  const isActive = ver.version === activeVersion;
  const expandKey = project.id + ':' + ver.version;
  const isExpanded = expandedVersions.has(expandKey);

  const row = document.createElement('div');
  row.className = 'tree-version-row' + (isActive ? ' active-version' : '') + (isExpanded ? ' expanded' : '');

  const hasChildren = ver.files.length > 0 || ver.patches.length > 0;

  row.innerHTML = `
    ${hasChildren ? '<span class="tree-version-chevron">&#x25B8;</span>' : '<span class="tree-version-chevron" style="visibility:hidden">&#x25B8;</span>'}
    <span class="version-active-dot"></span>
    <span class="tree-version-name">v${escapeHtml(ver.version)}</span>
    <span class="tree-version-actions">
      ${isActive ? '<span class="action-btn mark-complete-btn" title="Mark complete (git tag)">&#x2713;</span>' : ''}
      ${!isActive ? '<span class="action-btn set-active-btn" title="Set as active version">&#x25C9;</span>' : ''}
    </span>
  `;

  // Chevron: toggle expand
  if (hasChildren) {
    row.querySelector('.tree-version-chevron').addEventListener('click', (e) => {
      e.stopPropagation();
      if (expandedVersions.has(expandKey)) {
        expandedVersions.delete(expandKey);
      } else {
        expandedVersions.add(expandKey);
      }
      renderTreeView();
    });
  }

  // Row click: if active → toggle expand; if not active → set as active
  row.addEventListener('click', async (e) => {
    if (e.target.closest('.action-btn')) return;
    if (e.target.closest('.tree-version-chevron')) {
      // Chevron always toggles expand
      e.stopPropagation();
      if (expandedVersions.has(expandKey)) {
        expandedVersions.delete(expandKey);
      } else {
        expandedVersions.add(expandKey);
      }
      renderTreeView();
      return;
    }
    e.stopPropagation();
    if (isActive) {
      // Already active — toggle expand
      if (hasChildren) {
        if (expandedVersions.has(expandKey)) {
          expandedVersions.delete(expandKey);
        } else {
          expandedVersions.add(expandKey);
        }
        renderTreeView();
      }
    } else {
      // Not active — set as active
      await api('PUT', `/api/projects/${project.id}/active-version`, { version: ver.version });
      suppressRender = true;
      await loadProjects();
      suppressRender = false;
      await loadProjectVersions(project.id);
      render();
      showToast('Active version changed to v' + ver.version + '. Remember to update CLAUDE.md to reflect the new active version.');
    }
  });

  // Mark complete button
  const markCompleteBtn = row.querySelector('.mark-complete-btn');
  if (markCompleteBtn) {
    markCompleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showMarkCompleteModal(project, ver.version);
    });
  }

  container.appendChild(row);

  // Version files (if expanded)
  if (isExpanded) {
    const versionFiles = document.createElement('div');
    versionFiles.className = 'tree-version-files expanded';

    for (const fileName of ver.files) {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file';
      const filePath = ver.folder + '/' + fileName;
      fileEl.innerHTML = `<span class="tree-file-icon">&#x1F4C4;</span><span class="tree-file-name">${escapeHtml(fileName)}</span>`;
      fileEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openFileTab(project.id, project.name, filePath);
      });
      versionFiles.appendChild(fileEl);
    }

    container.appendChild(versionFiles);

    // Render patch versions nested under this version
    for (const patch of ver.patches) {
      renderPatchRow(container, project, patch, activeVersion);
    }
  }
}

function renderPatchRow(container, project, patch, activeVersion) {
  const isActive = patch.version === activeVersion;
  const expandKey = project.id + ':' + patch.version;
  const isExpanded = expandedVersions.has(expandKey);

  const row = document.createElement('div');
  row.className = 'tree-version-row tree-patch-row' + (isActive ? ' active-version' : '') + (isExpanded ? ' expanded' : '');

  const hasFiles = patch.files.length > 0;

  row.innerHTML = `
    ${hasFiles ? '<span class="tree-version-chevron">&#x25B8;</span>' : '<span class="tree-version-chevron" style="visibility:hidden">&#x25B8;</span>'}
    <span class="version-active-dot"></span>
    <span class="tree-version-name">v${escapeHtml(patch.version)}</span>
    <span class="tree-version-actions">
      ${isActive ? '<span class="action-btn mark-complete-btn" title="Mark complete (git tag)">&#x2713;</span>' : ''}
      ${!isActive ? '<span class="action-btn set-active-btn" title="Set as active version">&#x25C9;</span>' : ''}
    </span>
  `;

  // Mark complete button
  const markCompleteBtn = row.querySelector('.mark-complete-btn');
  if (markCompleteBtn) {
    markCompleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showMarkCompleteModal(project, patch.version);
    });
  }

  // Row click: if active → toggle expand; if not active → set as active
  row.addEventListener('click', async (e) => {
    if (e.target.closest('.action-btn')) return;
    if (e.target.closest('.tree-version-chevron')) {
      e.stopPropagation();
      if (expandedVersions.has(expandKey)) {
        expandedVersions.delete(expandKey);
      } else {
        expandedVersions.add(expandKey);
      }
      renderTreeView();
      return;
    }
    e.stopPropagation();
    if (isActive) {
      if (hasFiles) {
        if (expandedVersions.has(expandKey)) {
          expandedVersions.delete(expandKey);
        } else {
          expandedVersions.add(expandKey);
        }
        renderTreeView();
      }
    } else {
      await api('PUT', `/api/projects/${project.id}/active-version`, { version: patch.version });
      suppressRender = true;
      await loadProjects();
      suppressRender = false;
      await loadProjectVersions(project.id);
      render();
      showToast('Active version changed to v' + patch.version + '. Remember to update CLAUDE.md to reflect the new active version.');
    }
  });

  container.appendChild(row);

  if (isExpanded) {
    const patchFiles = document.createElement('div');
    patchFiles.className = 'tree-patch-files expanded';

    for (const fileName of patch.files) {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file';
      const filePath = patch.folder + '/' + fileName;
      fileEl.innerHTML = `<span class="tree-file-icon">&#x1F4C4;</span><span class="tree-file-name">${escapeHtml(fileName)}</span>`;
      fileEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openFileTab(project.id, project.name, filePath);
      });
      patchFiles.appendChild(fileEl);
    }

    container.appendChild(patchFiles);
  }
}

function renderMigrationHint(container, project) {
  // Don't add duplicates
  if (container.querySelector('.tree-migration-prompt')) return;

  const hint = document.createElement('div');
  hint.className = 'tree-migration-prompt';
  hint.innerHTML = `<button class="btn" title="Migrate flat docs into a versioned folder structure">Migrate to versioned</button>`;
  hint.querySelector('.btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showMigrationPrompt(project);
  });
  container.appendChild(hint);
}

// --- Toast Notification ---

function showToast(message, duration) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `<span>${escapeHtml(message)}</span><span class="toast-close">&times;</span>`;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, duration || 6000);
}

// --- Drag & Drop Handler ---

async function handleDrop(targetGroup, beforeProjectId) {
  if (!dragState) return;
  const draggedId = dragState.projectId;
  const dragged = findProject(draggedId);
  if (!dragged) return;

  let groupProjects = projectsInGroup(targetGroup).filter(p => p.id !== draggedId);

  if (beforeProjectId) {
    const idx = groupProjects.findIndex(p => p.id === beforeProjectId);
    if (idx >= 0) {
      groupProjects.splice(idx, 0, dragged);
    } else {
      groupProjects.push(dragged);
    }
  } else {
    groupProjects.push(dragged);
  }

  const orderedIds = [];
  groupProjects.forEach((p, i) => {
    orderedIds.push({ id: p.id, group: targetGroup, order: i });
  });

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
    const [projectId, ...rest] = tabId.split(':');
    const filePath = rest.join(':');
    const project = findProject(projectId);
    // Show just the filename in the tab, not the full path
    const displayName = filePath.split('/').pop() || filePath;
    return project ? { name: displayName, status: 'unknown' } : null;
  }
  const project = findProject(tabId);
  if (!project) return null;

  return { name: project.name, status: getProjectStatus(tabId) };
}

// --- Tab Content ---

function renderTabContent() {
  const container = document.getElementById('tabContent');

  // Hide all terminal containers (but keep them in DOM)
  terminalInstances.forEach((inst) => {
    inst.container.style.display = 'none';
  });

  // Remove everything except terminal containers
  Array.from(container.children).forEach(child => {
    if (!child.classList.contains('terminal-container')) {
      child.remove();
    }
  });

  if (!activeTab) {
    container.innerHTML = '<div class="no-session"><span class="no-session-text">Select a project from the tree view</span></div>';
    return;
  }

  if (activeTab === 'settings') {
    renderSettings(container);
    return;
  }

  if (activeTab.includes(':')) {
    const [projectId, ...rest] = activeTab.split(':');
    const fileName = rest.join(':');
    const project = findProject(projectId);
    renderReadPanel(container, project, fileName);
    return;
  }

  const project = findProject(activeTab);
  if (!project) {
    container.innerHTML = '<div class="no-session"><span class="no-session-text">Project not found</span></div>';
    return;
  }

  const instance = terminalInstances.get(activeTab);

  if (instance && instance.state === 'active') {
    // Show the existing terminal
    showTerminal(activeTab);
  } else {
    // Clean up exited terminal
    if (instance && instance.state === 'exited') {
      if (instance.ws) instance.ws.close();
      instance.terminal.dispose();
      if (instance.container.parentNode) instance.container.remove();
      terminalInstances.delete(activeTab);
    }

    // No session — show start prompt
    const prompt = document.createElement('div');
    prompt.className = 'no-session';
    prompt.innerHTML = `
      <span class="no-session-text">No active session. Start Claude Code in this project?</span>
      <div class="no-session-actions">
        <button class="btn btn-primary" title="Launch Claude Code in this project directory">Start Claude Code</button>
        <button class="btn" title="Open a plain shell in this project directory">Open Shell</button>
      </div>
      <div class="no-session-path">${escapeHtml(project.path)}</div>
    `;
    prompt.querySelector('.btn-primary').addEventListener('click', () => startSession(activeTab, 'claude'));
    prompt.querySelector('.btn:not(.btn-primary)').addEventListener('click', () => startSession(activeTab, 'shell'));
    container.appendChild(prompt);
  }
}

function renderSettings(container) {
  const panel = document.createElement('div');
  panel.innerHTML = `
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
  container.appendChild(panel);

  panel.querySelector('#settingsRootBrowse').addEventListener('click', () => {
    const input = panel.querySelector('#settingsProjectRoot');
    showBrowseModal(input.value || '/', (selected) => {
      input.value = selected;
    });
  });
}

async function renderReadPanel(container, project, fileName) {
  const name = project ? project.name : 'Unknown';
  const panel = document.createElement('div');
  panel.className = 'read-panel';
  panel.innerHTML = `
    <div class="read-panel-header">
      <div class="read-panel-title">
        <h1>${escapeHtml(fileName)}</h1>
        <span class="read-panel-project">${escapeHtml(name)}</span>
      </div>
      <button class="btn open-editor-btn" title="Open this file in the configured external editor">Open in Editor</button>
    </div>
    <div class="read-panel-content">
      <div class="read-panel-loading">Loading...</div>
    </div>
  `;
  container.appendChild(panel);

  // Load file content from server
  try {
    const data = await api('GET', `/api/file/${project.id}?filePath=${encodeURIComponent(fileName)}`);
    const contentEl = panel.querySelector('.read-panel-content');

    if (data.error) {
      contentEl.innerHTML = `<div class="read-panel-error">${escapeHtml(data.error)}</div>`;
      return;
    }

    // Render Markdown using marked.js
    const rendered = marked.parse(data.content, {
      gfm: true,
      breaks: false
    });
    contentEl.innerHTML = rendered;

    // Wire "Open in Editor" button
    panel.querySelector('.open-editor-btn').addEventListener('click', async () => {
      await api('POST', '/api/open-editor', { filePath: data.fullPath });
    });
  } catch (err) {
    const contentEl = panel.querySelector('.read-panel-content');
    contentEl.innerHTML = `<div class="read-panel-error">Failed to load file</div>`;
  }
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

    openTabs = openTabs.filter(t => t !== project.id && !t.startsWith(project.id + ':'));
    if (activeTab === project.id || activeTab?.startsWith(project.id + ':')) {
      activeTab = openTabs.length > 0 ? openTabs[openTabs.length - 1] : null;
    }

    // Clean up terminal instance
    const instance = terminalInstances.get(project.id);
    if (instance) {
      if (instance.ws) instance.ws.close();
      instance.terminal.dispose();
      if (instance.container.parentNode) instance.container.remove();
      terminalInstances.delete(project.id);
    }

    await loadProjects();
  });
}

// --- Version Modals ---

function showNewVersionModal(project) {
  // Determine smart default for next version
  const vData = projectVersions.get(project.id);
  let defaultVersion = '1.0';
  if (vData && vData.versions && vData.versions.length > 0) {
    const last = vData.versions[vData.versions.length - 1];
    const parts = last.version.split('.').map(Number);
    // Default to next minor
    defaultVersion = parts[0] + '.' + (parts[1] + 1);
  }

  const body = `
    <div class="settings-group">
      <label>Version Number</label>
      <input type="text" id="newVersionNumber" value="${escapeHtml(defaultVersion)}" placeholder="e.g. 1.1, 2.0, 1.1.1">
    </div>
    <div class="settings-group">
      <label>Type</label>
      <div style="display:flex; gap:16px; margin-top:4px;">
        <label style="display:flex; align-items:center; gap:4px; text-transform:none; font-weight:normal; font-size:13px;">
          <input type="radio" name="versionType" value="major"> Major (X.0)
        </label>
        <label style="display:flex; align-items:center; gap:4px; text-transform:none; font-weight:normal; font-size:13px;">
          <input type="radio" name="versionType" value="minor" checked> Minor (x.Y)
        </label>
        <label style="display:flex; align-items:center; gap:4px; text-transform:none; font-weight:normal; font-size:13px;">
          <input type="radio" name="versionType" value="patch"> Patch (x.y.Z)
        </label>
      </div>
      <span class="settings-hint" id="versionTypeHint">Gets its own concept doc and tasklist.</span>
    </div>
  `;

  showModal('New Version', body, async (overlay) => {
    const version = overlay.querySelector('#newVersionNumber').value.trim();
    const type = overlay.querySelector('input[name="versionType"]:checked').value;
    if (!version) return;

    const result = await api('POST', `/api/projects/${project.id}/versions`, { version, type });
    if (result.error) {
      alert(result.error);
      return;
    }

    // Reload project and version data
    await loadProjects();
    await loadProjectVersions(project.id);
    expandedVersionHeaders.add(project.id);
    showToast('Version v' + version + ' created and set as active. Remember to update CLAUDE.md.');
    renderTreeView();
  });

  // Update hint based on type selection
  const overlay = document.getElementById('modal');
  overlay.querySelectorAll('input[name="versionType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const hint = overlay.querySelector('#versionTypeHint');
      if (radio.value === 'patch') {
        hint.textContent = 'Inherits parent minor version\'s concept doc. Gets its own tasklist.';
      } else {
        hint.textContent = 'Gets its own concept doc and tasklist.';
      }
    });
  });
}

function showMarkCompleteModal(project, version) {
  const defaultTag = 'v' + version;

  const body = `
    <div class="settings-group">
      <label>Git Tag Name</label>
      <input type="text" id="tagName" value="${escapeHtml(defaultTag)}" placeholder="e.g. v1.0.0">
    </div>
    <p style="margin-top:8px;">This will create a Git tag in the project directory.</p>
  `;

  showModal('Mark Version Complete', body, async (overlay) => {
    const tagName = overlay.querySelector('#tagName').value.trim();
    if (!tagName) return;

    const result = await api('POST', `/api/projects/${project.id}/versions/${version}/complete`, { tagName });
    if (result.error) {
      alert(result.error);
      return;
    }

    showToast('Git tag \'' + tagName + '\' created successfully.');
  });
}

function showMigrationPrompt(project) {
  const body = `
    <p>This project has concept/tasklist files directly in <code>docs/</code>. Migrate them into a versioned folder structure?</p>
    <div class="settings-group" style="margin-top:16px;">
      <label>Initial Version</label>
      <input type="text" id="migrateVersion" value="1.0" placeholder="e.g. 1.0">
    </div>
    <p style="margin-top:8px; font-size:12px; color:var(--text-muted);">Files will be moved to <code>docs/v1.0/</code>. This cannot be undone from the UI.</p>
  `;

  showModal('Migrate to Versioned Structure', body, async (overlay) => {
    const version = overlay.querySelector('#migrateVersion').value.trim();
    if (!version) return;

    const result = await api('POST', `/api/projects/${project.id}/migrate-versions`, { version });
    if (result.error) {
      alert(result.error);
      return;
    }

    // Reload everything
    await loadProjects();
    await loadProjectVersions(project.id);
    expandedVersionHeaders.add(project.id);
    showToast('Migrated to versioned structure (v' + version + '). Remember to update CLAUDE.md.');
    renderTreeView();
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

// --- Window Resize ---

function initWindowResize() {
  window.addEventListener('resize', () => {
    // Fit the active terminal on window resize
    if (activeTab && !activeTab.includes(':') && activeTab !== 'settings') {
      const instance = terminalInstances.get(activeTab);
      if (instance && instance.container.style.display !== 'none') {
        try {
          instance.fitAddon.fit();
        } catch (e) {
          // Ignore
        }
      }
    }
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
initWindowResize();
loadSettings().then(() => loadProjects());
