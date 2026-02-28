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
// "projectId:version" strings for expanded Testing sub-header
const expandedTestingSections = new Set();

// Read panel auto-refresh timers: tabId -> intervalId
const readPanelTimers = new Map();

// --- API ---

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: `Server returned non-JSON (${res.status}): ${text.substring(0, 200)}` };
  }
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
  applyTheme(settings.theme || 'dark');
}

function applyTheme(theme) {
  document.documentElement.removeAttribute('data-theme');
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Listen for system theme changes when using 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (settings.theme === 'system') applyTheme('system');
});

// --- Version Loading ---

async function loadProjectVersions(projectId) {
  const data = await api('GET', `/api/projects/${projectId}/versions`);
  projectVersions.set(projectId, data);

  // Sync evaluated status back to project object (auto-clear detection)
  if (data.evaluated !== undefined) {
    const project = findProject(projectId);
    if (project) project.evaluated = data.evaluated;
  }

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
      instance.state = 'none';
      renderTabContent();
      showToast('Failed to start session: ' + result.error);
      return;
    }

    // Connect WebSocket
    connectTerminal(projectId);

    // Render to show terminal
    renderTabContent();
  } catch (err) {
    console.error('startSession error:', err);
    showToast('Error starting session: ' + err.message);
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
      const sessionTabId = project.id + '::session';
      row.className = 'tree-project-row' + (activeTab === sessionTabId ? ' active' : '');
      row.draggable = true;

      // Status dot: show on project row only for non-versioned projects
      const status = getProjectStatus(project.id);
      const showProjectDot = !project.activeVersion;

      row.innerHTML = `
        <span class="tree-project-chevron">&#x25B8;</span>
        <span class="tree-project-name">${escapeHtml(project.name)}</span>
        <span class="tree-project-actions">
          <span class="action-btn edit-btn" title="Edit project">&#x270E;</span>
          <span class="action-btn remove-btn" title="Remove project">&times;</span>
        </span>
        ${showProjectDot ? `<span class="status-dot ${status}"></span>` : ''}
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

      // Row click: expand/collapse
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        if (e.target.closest('.tree-project-chevron')) return; // chevron has its own handler
        if (expandedProjects.has(project.id)) {
          expandedProjects.delete(project.id);
        } else {
          expandedProjects.add(project.id);
        }
        renderTreeView();
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

        // Lazy-load version data (including test files) when project is expanded
        if (expandedProjects.has(project.id) && !projectVersions.has(project.id)) {
          loadProjectVersions(project.id).then(() => renderTreeView());
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

        // SHP file — single file per project: docs/{ProjectName}_shp.md
        const shpFileName = project.name + '_shp.md';
        const shpFilePath = 'docs/' + shpFileName;
        const shpEl = document.createElement('div');
        shpEl.className = 'tree-file';
        shpEl.innerHTML = `<span class="tree-file-icon">&#x1F4C4;</span><span class="tree-file-name">${escapeHtml(shpFileName)}</span>`;
        shpEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openFileTab(project.id, project.name, shpFilePath);
        });
        filesEl.appendChild(shpEl);

        // Flat test files (legacy — not inside version folders)
        const vData2 = projectVersions.get(project.id);
        if (vData2 && vData2.flatTestFiles) {
          for (const testFile of vData2.flatTestFiles) {
            const testFileName = testFile.name || testFile;
            const testFilePath = 'docs/' + testFileName;
            const badge = testFile.total ? ` <span class="test-progress-badge">[${testFile.checked}/${testFile.total}]</span>` : '';
            const testEl = document.createElement('div');
            testEl.className = 'tree-file';
            testEl.innerHTML = `<span class="tree-file-icon">&#x1F4CB;</span><span class="tree-file-name">${escapeHtml(testFileName)}${badge}</span>`;
            testEl.addEventListener('click', (e) => {
              e.stopPropagation();
              openFileTab(project.id, project.name, testFilePath);
            });
            filesEl.appendChild(testEl);
          }
        }

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

  const hasChildren = ver.files.length > 0 || (ver.testFiles && ver.testFiles.length > 0) || ver.patches.length > 0;

  const versionStatus = isActive ? getProjectStatus(project.id) : null;

  row.innerHTML = `
    ${hasChildren ? '<span class="tree-version-chevron">&#x25B8;</span>' : '<span class="tree-version-chevron" style="visibility:hidden">&#x25B8;</span>'}
    <span class="version-active-dot"></span>
    <span class="tree-version-name">v${escapeHtml(ver.version)}</span>
    <span class="tree-version-actions">
      ${isActive ? '<span class="action-btn mark-complete-btn" title="Mark complete (git tag)">&#x2713;</span>' : ''}
      ${!isActive ? '<span class="action-btn set-active-btn" title="Set as active version">&#x25C9;</span>' : ''}
      ${!isActive ? '<span class="action-btn remove-btn remove-version-btn" title="Remove version">&times;</span>' : ''}
    </span>
    ${isActive ? `<span class="status-dot version-status-dot ${versionStatus}"></span>` : ''}
  `;

  // Remove version button
  const removeVerBtn = row.querySelector('.remove-version-btn');
  if (removeVerBtn) {
    removeVerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRemoveVersionConfirm(project, ver.version);
    });
  }

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
      // Active version — open session tab
      openSessionTab(project.id);
    } else {
      // Not active — set as active and open session tab
      await api('PUT', `/api/projects/${project.id}/active-version`, { version: ver.version });
      suppressRender = true;
      await loadProjects();
      suppressRender = false;
      await loadProjectVersions(project.id);
      openSessionTab(project.id);
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

    // Testing sub-header (collapsible, nested under version)
    if (ver.testFiles && ver.testFiles.length > 0) {
      const testingKey = project.id + ':' + ver.version;
      const testingExpanded = expandedTestingSections.has(testingKey);

      const testingHeader = document.createElement('div');
      testingHeader.className = 'tree-testing-header' + (testingExpanded ? ' expanded' : '');
      testingHeader.innerHTML = `
        <span class="tree-testing-chevron">&#x25B8;</span>
        <span>Testing</span>
        <span class="tree-testing-count">${ver.testFiles.length}</span>
      `;
      testingHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        if (expandedTestingSections.has(testingKey)) {
          expandedTestingSections.delete(testingKey);
        } else {
          expandedTestingSections.add(testingKey);
        }
        renderTreeView();
      });
      container.appendChild(testingHeader);

      if (testingExpanded) {
        const testingFiles = document.createElement('div');
        testingFiles.className = 'tree-testing-files';
        for (const testFile of ver.testFiles) {
          const testFileName = testFile.name || testFile;
          const testFilePath = ver.folder + '/' + testFileName;
          const badge = testFile.total ? ` <span class="test-progress-badge">[${testFile.checked}/${testFile.total}]</span>` : '';
          const testEl = document.createElement('div');
          testEl.className = 'tree-file tree-testing-file';
          testEl.innerHTML = `<span class="tree-file-icon">&#x1F4CB;</span><span class="tree-file-name">${escapeHtml(testFileName)}${badge}</span>`;
          testEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openFileTab(project.id, project.name, testFilePath);
          });
          testingFiles.appendChild(testEl);
        }
        container.appendChild(testingFiles);
      }
    }

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

  const hasFiles = patch.files.length > 0 || (patch.testFiles && patch.testFiles.length > 0);
  const patchStatus = isActive ? getProjectStatus(project.id) : null;

  row.innerHTML = `
    ${hasFiles ? '<span class="tree-version-chevron">&#x25B8;</span>' : '<span class="tree-version-chevron" style="visibility:hidden">&#x25B8;</span>'}
    <span class="version-active-dot"></span>
    <span class="tree-version-name">v${escapeHtml(patch.version)}</span>
    <span class="tree-version-actions">
      ${isActive ? '<span class="action-btn mark-complete-btn" title="Mark complete (git tag)">&#x2713;</span>' : ''}
      ${!isActive ? '<span class="action-btn set-active-btn" title="Set as active version">&#x25C9;</span>' : ''}
      ${!isActive ? '<span class="action-btn remove-btn remove-version-btn" title="Remove version">&times;</span>' : ''}
    </span>
    ${isActive ? `<span class="status-dot version-status-dot ${patchStatus}"></span>` : ''}
  `;

  // Mark complete button
  const markCompleteBtn = row.querySelector('.mark-complete-btn');
  if (markCompleteBtn) {
    markCompleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showMarkCompleteModal(project, patch.version);
    });
  }

  // Remove version button
  const removePatchBtn = row.querySelector('.remove-version-btn');
  if (removePatchBtn) {
    removePatchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRemoveVersionConfirm(project, patch.version);
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
      // Active patch version — open session tab
      openSessionTab(project.id);
    } else {
      await api('PUT', `/api/projects/${project.id}/active-version`, { version: patch.version });
      suppressRender = true;
      await loadProjects();
      suppressRender = false;
      await loadProjectVersions(project.id);
      openSessionTab(project.id);
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

    // Testing sub-header for patch
    if (patch.testFiles && patch.testFiles.length > 0) {
      const testingKey = project.id + ':' + patch.version;
      const testingExpanded = expandedTestingSections.has(testingKey);

      const testingHeader = document.createElement('div');
      testingHeader.className = 'tree-testing-header tree-testing-header-patch' + (testingExpanded ? ' expanded' : '');
      testingHeader.innerHTML = `
        <span class="tree-testing-chevron">&#x25B8;</span>
        <span>Testing</span>
        <span class="tree-testing-count">${patch.testFiles.length}</span>
      `;
      testingHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        if (expandedTestingSections.has(testingKey)) {
          expandedTestingSections.delete(testingKey);
        } else {
          expandedTestingSections.add(testingKey);
        }
        renderTreeView();
      });
      container.appendChild(testingHeader);

      if (testingExpanded) {
        const testingFiles = document.createElement('div');
        testingFiles.className = 'tree-testing-files tree-testing-files-patch';
        for (const testFile of patch.testFiles) {
          const testFileName = testFile.name || testFile;
          const testFilePath = patch.folder + '/' + testFileName;
          const badge = testFile.total ? ` <span class="test-progress-badge">[${testFile.checked}/${testFile.total}]</span>` : '';
          const testEl = document.createElement('div');
          testEl.className = 'tree-file tree-testing-file-patch';
          testEl.innerHTML = `<span class="tree-file-icon">&#x1F4CB;</span><span class="tree-file-name">${escapeHtml(testFileName)}${badge}</span>`;
          testEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openFileTab(project.id, project.name, testFilePath);
          });
          testingFiles.appendChild(testEl);
        }
        container.appendChild(testingFiles);
      }
    }
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

function showLoadingOverlay(modalEl) {
  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="loading-spinner"></div>';
  const modal = modalEl.querySelector('.modal');
  if (modal) {
    modal.style.position = 'relative';
    modal.appendChild(loader);
  }
  return loader;
}

function hideLoadingOverlay(loader) {
  if (loader && loader.parentNode) loader.remove();
}

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
  // Session tab: "projectId::session"
  if (tabId.endsWith('::session')) {
    const projectId = tabId.replace('::session', '');
    const project = findProject(projectId);
    if (!project) return null;
    return { name: project.name, status: getProjectStatus(projectId) };
  }
  // File tab: "projectId:filePath"
  if (tabId.includes(':')) {
    const [projectId, ...rest] = tabId.split(':');
    const filePath = rest.join(':');
    const project = findProject(projectId);
    const displayName = filePath.split('/').pop() || filePath;
    return project ? { name: displayName, status: 'unknown' } : null;
  }
  // Legacy bare projectId tab — shouldn't happen after migration
  const project = findProject(tabId);
  if (!project) return null;
  return { name: project.name, status: getProjectStatus(tabId) };
}

// --- Test File Detection ---

function isTestFile(fileName) {
  return /_test_stage\d+\.md$/.test(fileName);
}

// --- Session Content Helper ---

function renderSessionContent(container, project, projectId) {
  const instance = terminalInstances.get(projectId);

  if (instance && instance.state === 'active') {
    // Show the active terminal
    showTerminal(projectId);
  } else {
    // Exited or no session — clean up old terminal and show start prompt
    if (instance && instance.state === 'exited') {
      if (instance.ws) instance.ws.close();
      instance.terminal.dispose();
      if (instance.container.parentNode) instance.container.remove();
      terminalInstances.delete(projectId);
    }

    const prompt = document.createElement('div');
    prompt.className = 'no-session';

    // Show evaluate-import notice for unevaluated projects
    const evalNotice = project.evaluated === false
      ? `<div class="evaluate-notice">This project has no CCC documentation yet. Run <code>/evaluate-import</code> in your Claude Code session before starting work.</div>`
      : '';

    prompt.innerHTML = `
      ${evalNotice}
      <span class="no-session-text">No active session. Start Claude Code in this project?</span>
      <div class="no-session-actions">
        <button class="btn btn-primary" title="Launch Claude Code in this project directory">Start Claude Code</button>
        <button class="btn" title="Open a plain shell in this project directory">Open Shell</button>
      </div>
      <div class="no-session-path">${escapeHtml(project.path)}</div>
    `;
    prompt.querySelector('.btn-primary').addEventListener('click', () => startSession(projectId, 'claude'));
    prompt.querySelector('.btn:not(.btn-primary)').addEventListener('click', () => startSession(projectId, 'shell'));
    container.appendChild(prompt);
  }
}

// --- Tab Content ---

function renderTabContent() {
  const container = document.getElementById('tabContent');

  // Hide all terminal containers (but keep them in DOM)
  terminalInstances.forEach((inst) => {
    inst.container.style.display = 'none';
  });

  // Clear read panel auto-refresh timers for tabs that are no longer active
  for (const [tabId, timerId] of readPanelTimers) {
    if (tabId !== activeTab) {
      clearInterval(timerId);
      readPanelTimers.delete(tabId);
    }
  }

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

  // Session tab: "projectId::session"
  if (activeTab.endsWith('::session')) {
    const projectId = activeTab.replace('::session', '');
    const project = findProject(projectId);
    if (!project) {
      container.innerHTML = '<div class="no-session"><span class="no-session-text">Project not found</span></div>';
      return;
    }
    renderSessionContent(container, project, projectId);
    return;
  }

  // File tab: "projectId:filePath"
  if (activeTab.includes(':')) {
    const [projectId, ...rest] = activeTab.split(':');
    const fileName = rest.join(':');
    const project = findProject(projectId);
    if (isTestFile(fileName)) {
      renderTestRunner(container, project, fileName);
    } else {
      renderReadPanel(container, project, fileName);
    }
    return;
  }

  // Legacy bare projectId tab — delegate to session renderer
  const project = findProject(activeTab);
  if (!project) {
    container.innerHTML = '<div class="no-session"><span class="no-session-text">Project not found</span></div>';
    return;
  }
  renderSessionContent(container, project, activeTab);
}

function renderSettings(container) {
  const themeOptions = ['dark', 'light', 'system'].map(t =>
    `<option value="${t}" ${(settings.theme || 'dark') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join('');

  const knownEditors = [
    { value: 'open', label: 'System Default' },
    { value: 'CotEditor', label: 'CotEditor' },
    { value: 'Visual Studio Code', label: 'VS Code' },
    { value: 'Cursor', label: 'Cursor' },
    { value: 'Sublime Text', label: 'Sublime Text' },
    { value: 'TextEdit', label: 'TextEdit' }
  ];
  const currentEditor = settings.editor || 'open';
  const isKnown = knownEditors.some(e => e.value === currentEditor);
  const editorOptions = knownEditors.map(e =>
    `<option value="${escapeHtml(e.value)}" ${currentEditor === e.value ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('') + `<option value="__custom__" ${!isKnown ? 'selected' : ''}>-- Custom --</option>`;

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
        <div class="input-with-btn">
          <div class="select-wrap"><select id="settingsEditorSelect">${editorOptions}</select><span class="select-arrow">&#9662;</span></div>
          <button class="btn browse-btn" id="settingsEditorTest" title="Test editor launch">Test</button>
        </div>
        <div class="new-group-input ${!isKnown ? 'visible' : ''}" id="settingsEditorCustomWrap">
          <input type="text" id="settingsEditorCustom" value="${!isKnown ? escapeHtml(currentEditor) : ''}" placeholder="App name or /path/to/binary">
        </div>
        <span class="settings-hint">Used by "Open in Editor" buttons throughout CCC.</span>
      </div>
      <div class="settings-group">
        <label>Default Shell</label>
        <input type="text" id="settingsShell" value="${escapeHtml(settings.shell || '')}" placeholder="e.g. /bin/zsh, /bin/bash">
        <span class="settings-hint">Shell used for new terminal sessions. Defaults to $SHELL if empty.</span>
      </div>
      <div class="settings-group">
        <label>Theme</label>
        <div class="select-wrap"><select id="settingsTheme">${themeOptions}</select><span class="select-arrow">&#9662;</span></div>
      </div>
      <div class="settings-group">
        <label>Concept File Pattern</label>
        <input type="text" id="settingsConceptPattern" value="${escapeHtml((settings.filePatterns || {}).concept || 'docs/{PROJECT}_concept.md')}" placeholder="docs/{PROJECT}_concept.md">
        <span class="settings-hint">{PROJECT} is replaced by the project folder name.</span>
      </div>
      <div class="settings-group">
        <label>Tasklist File Pattern</label>
        <input type="text" id="settingsTasklistPattern" value="${escapeHtml((settings.filePatterns || {}).tasklist || 'docs/{PROJECT}_tasklist.md')}" placeholder="docs/{PROJECT}_tasklist.md">
      </div>
      <div class="settings-group">
        <label>GitHub Token (optional)</label>
        <input type="password" id="settingsGithubToken" value="${escapeHtml(settings.githubToken || '')}" placeholder="For auto-issue filing on parser degradation">
        <span class="settings-hint">Personal access token. Used for automatic GitHub issue filing when parser degrades.</span>
      </div>
      <div class="settings-actions" style="margin-top:24px; display:flex; gap:8px; align-items:center;">
        <button class="btn btn-primary" id="settingsSave">Save</button>
        <span id="settingsSaveStatus" style="font-size:12px; color:var(--status-completed); display:none;">Saved</span>
      </div>
    </div>
  `;
  container.appendChild(panel);

  // Browse button for project root
  panel.querySelector('#settingsRootBrowse').addEventListener('click', () => {
    const input = panel.querySelector('#settingsProjectRoot');
    showBrowseModal(input.value || '/', (selected) => {
      input.value = selected;
    });
  });

  // Editor dropdown — show/hide custom input
  const editorSelect = panel.querySelector('#settingsEditorSelect');
  editorSelect.addEventListener('change', () => {
    const wrap = panel.querySelector('#settingsEditorCustomWrap');
    if (editorSelect.value === '__custom__') {
      wrap.classList.add('visible');
      panel.querySelector('#settingsEditorCustom').focus();
    } else {
      wrap.classList.remove('visible');
    }
  });

  // Test button for editor
  panel.querySelector('#settingsEditorTest').addEventListener('click', async () => {
    let editorVal = editorSelect.value;
    if (editorVal === '__custom__') {
      editorVal = panel.querySelector('#settingsEditorCustom').value.trim();
    }
    if (!editorVal) {
      showToast('No editor configured.');
      return;
    }
    // Save editor temporarily for the test, then open CLAUDE.md
    await api('PUT', '/api/settings', { editor: editorVal });
    const result = await api('POST', '/api/open-editor', { filePath: 'CLAUDE.md' });
    if (result.error) {
      showToast('Editor test failed: ' + result.error);
    } else {
      showToast('Editor launched — check if CLAUDE.md opened.');
    }
  });

  // Theme live preview
  panel.querySelector('#settingsTheme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Save button
  panel.querySelector('#settingsSave').addEventListener('click', async () => {
    const saveBtn = panel.querySelector('#settingsSave');
    saveBtn.disabled = true;

    let editorVal = editorSelect.value;
    if (editorVal === '__custom__') {
      editorVal = panel.querySelector('#settingsEditorCustom').value.trim();
    }

    const updated = {
      projectRoot: panel.querySelector('#settingsProjectRoot').value.trim(),
      editor: editorVal,
      shell: panel.querySelector('#settingsShell').value.trim(),
      theme: panel.querySelector('#settingsTheme').value,
      filePatterns: {
        concept: panel.querySelector('#settingsConceptPattern').value.trim(),
        tasklist: panel.querySelector('#settingsTasklistPattern').value.trim()
      },
      githubToken: panel.querySelector('#settingsGithubToken').value
    };

    const result = await api('PUT', '/api/settings', updated);
    saveBtn.disabled = false;

    if (result.error) {
      showToast('Failed to save settings: ' + result.error);
    } else {
      settings = result;
      const status = panel.querySelector('#settingsSaveStatus');
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    }
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

    // Auto-refresh every 10 minutes
    const tabId = project.id + ':' + fileName;
    if (readPanelTimers.has(tabId)) {
      clearInterval(readPanelTimers.get(tabId));
    }
    const timerId = setInterval(async () => {
      try {
        const fresh = await api('GET', `/api/file/${project.id}?filePath=${encodeURIComponent(fileName)}`);
        if (fresh.error || !fresh.content) return;
        const scrollTop = contentEl.scrollTop;
        contentEl.innerHTML = marked.parse(fresh.content, { gfm: true, breaks: false });
        contentEl.scrollTop = scrollTop;
      } catch (e) {
        // Silent — don't disrupt the UI on refresh failure
      }
    }, 10 * 60 * 1000);
    readPanelTimers.set(tabId, timerId);
  } catch (err) {
    const contentEl = panel.querySelector('.read-panel-content');
    contentEl.innerHTML = `<div class="read-panel-error">Failed to load file</div>`;
  }
}

// --- Interactive Test Runner ---

async function renderTestRunner(container, project, fileName) {
  const panel = document.createElement('div');
  panel.className = 'test-runner';

  panel.innerHTML = `
    <div class="test-runner-header">
      <div class="test-runner-title">
        <h1>${escapeHtml(fileName.split('/').pop())}</h1>
        <span class="test-runner-project">${escapeHtml(project.name)}</span>
      </div>
      <div class="test-runner-actions">
        <span class="test-runner-progress"></span>
        <button class="btn test-runner-save" disabled>Save</button>
        <button class="btn open-editor-btn" title="Open in external editor">Open in Editor</button>
      </div>
    </div>
    <div class="test-runner-content">
      <div class="read-panel-loading">Loading...</div>
    </div>
  `;
  container.appendChild(panel);

  // Load file
  let data;
  try {
    data = await api('GET', `/api/file/${project.id}?filePath=${encodeURIComponent(fileName)}`);
  } catch (err) {
    panel.querySelector('.test-runner-content').innerHTML = `<div class="read-panel-error">Failed to load file</div>`;
    return;
  }

  if (data.error) {
    panel.querySelector('.test-runner-content').innerHTML = `<div class="read-panel-error">${escapeHtml(data.error)}</div>`;
    return;
  }

  // Wire "Open in Editor" button
  panel.querySelector('.open-editor-btn').addEventListener('click', async () => {
    await api('POST', '/api/open-editor', { filePath: data.fullPath });
  });

  // Parse markdown into structured items
  const lines = data.content.split('\n');
  const parsed = parseTestFile(lines);
  // State tracking
  let dirty = false;
  const saveBtn = panel.querySelector('.test-runner-save');

  function markDirty() {
    dirty = true;
    saveBtn.disabled = false;
    saveBtn.classList.add('test-runner-dirty');
  }

  function markClean() {
    dirty = false;
    saveBtn.disabled = true;
    saveBtn.classList.remove('test-runner-dirty');
  }

  function updateProgress() {
    const total = parsed.items.filter(i => i.type === 'checkbox').length;
    const checked = parsed.items.filter(i => i.type === 'checkbox' && i.checked).length;
    panel.querySelector('.test-runner-progress').textContent = `${checked}/${total} passed`;
  }

  async function doSave() {
    const content = reconstructTestFile(parsed);
    const result = await api('PUT', `/api/file/${project.id}`, { filePath: fileName, content });
    if (result.error) {
      showToast('Save failed: ' + result.error);
    } else {
      markClean();
    }
  }

  saveBtn.addEventListener('click', () => doSave());

  // Render the content
  const contentEl = panel.querySelector('.test-runner-content');
  contentEl.innerHTML = '';
  renderTestItems(contentEl, parsed, markDirty, null, updateProgress);
  updateProgress();
}

/**
 * Parse a test file into structured items.
 * Each item is one of: { type: 'line', text } | { type: 'heading', text, level } |
 * { type: 'checkbox', text, checked, comment, boldLabel }
 */
function parseTestFile(lines) {
  const items = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Checkbox line: - [ ] or - [x]
    const cbMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
    if (cbMatch) {
      const checked = cbMatch[2].toLowerCase() === 'x';
      const text = cbMatch[3];

      // Check for bold label: **Label** rest
      let boldLabel = null;
      let afterLabel = text;
      const boldMatch = text.match(/^\*\*(.+?)\*\*\s*(.*)/);
      if (boldMatch) {
        boldLabel = boldMatch[1];
        afterLabel = boldMatch[2];
      }

      // Look ahead for comment lines: next lines starting with "  > "
      let comment = '';
      while (i + 1 < lines.length && lines[i + 1].match(/^\s*>\s/)) {
        i++;
        comment += (comment ? '\n' : '') + lines[i].replace(/^\s*>\s?/, '');
      }

      items.push({ type: 'checkbox', text: afterLabel, checked, comment, boldLabel, indent: cbMatch[1] });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      items.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Everything else
    items.push({ type: 'line', text: line });
    i++;
  }
  return { items };
}

/**
 * Reconstruct the test file from parsed items back to markdown.
 */
function reconstructTestFile(parsed) {
  const lines = [];
  for (const item of parsed.items) {
    if (item.type === 'heading') {
      lines.push('#'.repeat(item.level) + ' ' + item.text);
    } else if (item.type === 'checkbox') {
      const mark = item.checked ? 'x' : ' ';
      const indent = item.indent || '';
      const label = item.boldLabel ? `**${item.boldLabel}** ` : '';
      lines.push(`${indent}- [${mark}] ${label}${item.text}`);
      if (item.comment.trim()) {
        for (const commentLine of item.comment.split('\n')) {
          lines.push(`  > ${commentLine}`);
        }
      }
    } else {
      lines.push(item.text);
    }
  }
  return lines.join('\n');
}

/**
 * Render parsed test items into the container DOM.
 */
function renderTestItems(contentEl, parsed, markDirty, scheduleAutoSave, updateProgress) {
  for (let idx = 0; idx < parsed.items.length; idx++) {
    const item = parsed.items[idx];

    if (item.type === 'heading') {
      const el = document.createElement('div');
      el.className = 'test-section-heading test-section-h' + item.level;
      el.textContent = item.text;
      contentEl.appendChild(el);
      continue;
    }

    if (item.type === 'checkbox') {
      const row = document.createElement('div');
      row.className = 'test-item' + (item.checked ? ' test-item-checked' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'test-checkbox';
      checkbox.checked = item.checked;

      const labelEl = document.createElement('div');
      labelEl.className = 'test-item-label';
      if (item.boldLabel) {
        labelEl.innerHTML = `<strong>${escapeHtml(item.boldLabel)}</strong> ${escapeHtml(item.text)}`;
      } else {
        labelEl.textContent = item.text;
      }

      const commentInput = document.createElement('textarea');
      commentInput.className = 'test-comment';
      commentInput.placeholder = 'Add a comment...';
      commentInput.value = item.comment;
      commentInput.rows = 1;

      // Auto-resize textarea
      function autoResize() {
        commentInput.style.height = 'auto';
        commentInput.style.height = Math.max(commentInput.scrollHeight, 28) + 'px';
      }

      // Capture item reference for closures
      const capturedItem = item;

      checkbox.addEventListener('change', () => {
        capturedItem.checked = checkbox.checked;
        row.classList.toggle('test-item-checked', checkbox.checked);
        markDirty();
        updateProgress();
      });

      commentInput.addEventListener('input', () => {
        capturedItem.comment = commentInput.value;
        markDirty();
        autoResize();
      });

      row.appendChild(checkbox);
      row.appendChild(labelEl);
      row.appendChild(commentInput);
      contentEl.appendChild(row);

      // Initial auto-resize after DOM insertion
      requestAnimationFrame(autoResize);
      continue;
    }

    // Plain line — render as paragraph if non-empty
    if (item.text.trim()) {
      const el = document.createElement('div');
      el.className = 'test-line';
      el.innerHTML = marked.parse(item.text, { gfm: true, breaks: false });
      contentEl.appendChild(el);
    }
  }
}

// --- Tab Management ---

function openSessionTab(projectId) {
  const tabId = projectId + '::session';
  if (!openTabs.includes(tabId)) {
    openTabs.push(tabId);
  }
  activeTab = tabId;
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

// New Project Wizard

const WIZARD_TEMPLATE_OPTIONS = [
  { key: 'web-app', icon: '\uD83C\uDF10', name: 'Web App', desc: 'Frontend + server' },
  { key: 'api', icon: '\u26A1', name: 'API', desc: 'Backend service' },
  { key: 'script', icon: '\uD83D\uDCDC', name: 'Script', desc: 'CLI / automation' },
  { key: 'research', icon: '\uD83D\uDD2C', name: 'Research', desc: 'Investigation' },
  { key: 'blank', icon: '\uD83D\uDCC4', name: 'Blank', desc: 'Empty starter' }
];

function showNewProjectWizard() {
  const existing = document.getElementById('modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal';
  overlay.className = 'modal-overlay';

  // Build group options
  const groupOptions = groups.map(g =>
    `<option value="${escapeHtml(g.name)}" ${g.name === 'Parked' ? 'selected' : ''}>${escapeHtml(g.name)}</option>`
  ).join('');

  // Build template cards
  const templateCardsHtml = WIZARD_TEMPLATE_OPTIONS.map(t =>
    `<label class="template-card${t.key === 'blank' ? ' selected' : ''}" data-key="${t.key}">
      <input type="radio" name="wizardTemplate" value="${t.key}" ${t.key === 'blank' ? 'checked' : ''}>
      <span class="template-card-icon">${t.icon}</span>
      <span class="template-card-name">${t.name}</span>
      <span class="template-card-desc">${t.desc}</span>
    </label>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal modal-wizard">
      <div class="modal-header">
        <span class="modal-title">New Project</span>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="settings-group">
          <label>Project Name</label>
          <input type="text" id="wizardName" placeholder="MyProject">
        </div>
        <div class="settings-group">
          <label>Location</label>
          <div class="input-with-btn" style="max-width:100%;">
            <input type="text" id="wizardLocation" value="${escapeHtml(settings.projectRoot || '')}" placeholder="/path/to/parent/directory">
            <button class="btn browse-btn" id="wizardBrowse">Browse</button>
          </div>
        </div>
        <div class="settings-group">
          <label>Template</label>
          <div class="template-cards">${templateCardsHtml}</div>
        </div>
        <div class="settings-group">
          <label>Group</label>
          <div class="select-wrap"><select id="wizardGroup">
            ${groupOptions}
            <option value="__new__">-- Create New --</option>
          </select><span class="select-arrow">&#9662;</span></div>
          <div class="new-group-input" id="wizardNewGroupWrap">
            <input type="text" id="wizardNewGroup" placeholder="New group name">
          </div>
        </div>
        <div class="wizard-error" id="wizardError"></div>
        <div class="wizard-import-link">or <a id="wizardImportLink">Import Existing Project</a></div>
      </div>
      <div class="modal-footer">
        <button class="btn modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="wizardCreate">Create</button>
      </div>
    </div>
  `;

  // Close handlers
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Template card selection
  overlay.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      overlay.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input[type="radio"]').checked = true;
    });
  });

  // Group dropdown — show/hide new group input
  const groupSelect = overlay.querySelector('#wizardGroup');
  groupSelect.addEventListener('change', () => {
    const wrap = overlay.querySelector('#wizardNewGroupWrap');
    if (groupSelect.value === '__new__') {
      wrap.classList.add('visible');
      overlay.querySelector('#wizardNewGroup').focus();
    } else {
      wrap.classList.remove('visible');
    }
  });

  // Browse button
  overlay.querySelector('#wizardBrowse').addEventListener('click', (e) => {
    e.preventDefault();
    const locInput = overlay.querySelector('#wizardLocation');
    showBrowseModal(locInput.value || settings.projectRoot || '/', (selected) => {
      locInput.value = selected;
    });
  });

  // Import link
  overlay.querySelector('#wizardImportLink').addEventListener('click', () => {
    overlay.remove();
    showImportProjectModal();
  });

  // Create button
  overlay.querySelector('#wizardCreate').addEventListener('click', async () => {
    const errorEl = overlay.querySelector('#wizardError');
    errorEl.classList.remove('visible');
    errorEl.textContent = '';

    const nameVal = overlay.querySelector('#wizardName').value.trim();
    const locationVal = overlay.querySelector('#wizardLocation').value.trim();
    const templateVal = overlay.querySelector('input[name="wizardTemplate"]:checked')?.value || 'blank';

    let groupVal = groupSelect.value;
    if (groupVal === '__new__') {
      groupVal = overlay.querySelector('#wizardNewGroup').value.trim();
      if (!groupVal) {
        errorEl.textContent = 'Please enter a name for the new group.';
        errorEl.classList.add('visible');
        return;
      }
    }

    // Client-side validation
    if (!nameVal) {
      errorEl.textContent = 'Project name is required.';
      errorEl.classList.add('visible');
      return;
    }
    const unsafeChars = /[\/\\:*?"<>|]/;
    if (unsafeChars.test(nameVal)) {
      errorEl.textContent = 'Project name contains invalid characters: / \\ : * ? " < > |';
      errorEl.classList.add('visible');
      return;
    }
    if (!locationVal) {
      errorEl.textContent = 'Location is required.';
      errorEl.classList.add('visible');
      return;
    }

    // Show loading state
    const createBtn = overlay.querySelector('#wizardCreate');
    createBtn.disabled = true;
    const loader = showLoadingOverlay(overlay);

    try {
      const result = await api('POST', '/api/scaffold-project', {
        name: nameVal,
        parentDir: locationVal,
        template: templateVal,
        group: groupVal
      });

      if (result.error) {
        errorEl.textContent = result.error;
        errorEl.classList.add('visible');
        createBtn.disabled = false;
        hideLoadingOverlay(loader);
        return;
      }

      overlay.remove();
      await loadProjects();
      showToast(`Project "${nameVal}" created with ${result.scaffoldedFiles.length} files.`);
    } catch (err) {
      errorEl.textContent = 'Request failed: ' + (err.message || 'Unknown error');
      errorEl.classList.add('visible');
      createBtn.disabled = false;
      hideLoadingOverlay(loader);
    }
  });

  document.body.appendChild(overlay);
  overlay.querySelector('#wizardName').focus();
}

// Import Existing Project (two-phase modal)

function showImportProjectModal(prefillPath) {
  const existing = document.getElementById('modal');
  if (existing) existing.remove();
  const existingImport = document.getElementById('importModal');
  if (existingImport) existingImport.remove();

  const overlay = document.createElement('div');
  overlay.id = 'importModal';
  overlay.className = 'modal-overlay';

  // State across phases
  let scanResult = null;

  // --- Phase 1: Directory + Scan ---
  function renderPhase1() {
    overlay.innerHTML = `
      <div class="modal modal-wizard">
        <div class="modal-header">
          <span class="modal-title">Import Existing Project</span>
          <span class="modal-close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="settings-group">
            <label>Directory</label>
            <div class="input-with-btn" style="max-width:100%;">
              <input type="text" id="importPath" value="${escapeHtml(prefillPath || settings.projectRoot || '')}" placeholder="/path/to/project">
              <button class="btn browse-btn" id="importBrowse">Browse</button>
            </div>
          </div>
          <div class="wizard-error" id="importError"></div>
        </div>
        <div class="modal-footer">
          <button class="btn modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="importScan">Scan</button>
        </div>
      </div>
    `;

    // Close handlers — return to New Project wizard instead of closing
    const backToWizard = () => { overlay.remove(); showNewProjectWizard(); };
    overlay.querySelector('.modal-close').addEventListener('click', backToWizard);
    overlay.querySelector('.modal-cancel').addEventListener('click', backToWizard);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) backToWizard();
    });

    // Browse
    overlay.querySelector('#importBrowse').addEventListener('click', (e) => {
      e.preventDefault();
      const pathInput = overlay.querySelector('#importPath');
      showBrowseModal(pathInput.value || settings.projectRoot || '/', (selected) => {
        pathInput.value = selected;
      });
    });

    // Scan
    overlay.querySelector('#importScan').addEventListener('click', async () => {
      const errorEl = overlay.querySelector('#importError');
      errorEl.classList.remove('visible');
      errorEl.textContent = '';

      const dirVal = overlay.querySelector('#importPath').value.trim();
      if (!dirVal) {
        errorEl.textContent = 'Directory path is required.';
        errorEl.classList.add('visible');
        return;
      }

      const scanBtn = overlay.querySelector('#importScan');
      scanBtn.disabled = true;
      const loader = showLoadingOverlay(overlay);

      try {
        const result = await api('POST', '/api/scan-project', { dirPath: dirVal });

        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.classList.add('visible');
          scanBtn.disabled = false;
          hideLoadingOverlay(loader);
          return;
        }

        if (!result.valid) {
          errorEl.textContent = result.message || 'Scan failed.';
          errorEl.classList.add('visible');
          scanBtn.disabled = false;
          hideLoadingOverlay(loader);
          return;
        }

        // Success — move to Phase 2
        scanResult = result;
        hideLoadingOverlay(loader);
        renderPhase2();
      } catch (err) {
        errorEl.textContent = 'Request failed: ' + (err.message || 'Unknown error');
        errorEl.classList.add('visible');
        scanBtn.disabled = false;
        hideLoadingOverlay(loader);
      }
    });

    overlay.querySelector('#importPath').focus();
  }

  // --- Phase 2: Confirm & Import ---
  function renderPhase2() {
    const d = scanResult.detected;

    // Build detected files panel
    const claudeRow = d.claude.found
      ? `<div class="import-file-row"><span class="file-status found">&#10003;</span> CLAUDE.md</div>`
      : `<div class="import-file-row"><span class="file-status missing">&#10007;</span> CLAUDE.md — not found</div>`;

    let conceptRow;
    if (!d.concept.found) {
      conceptRow = `<div class="import-file-row"><span class="file-status missing">&#10007;</span> Concept — not found</div>`;
    } else if (d.concept.ambiguous) {
      const opts = d.concept.allMatches.map(m =>
        `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
      ).join('');
      conceptRow = `<div class="import-file-row"><span class="file-status found">&#10003;</span>
        Concept: <div class="select-wrap" style="display:inline-flex;width:auto;margin-left:4px;"><select id="importConceptSelect" style="background-color:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);font-size:12px;padding:2px 6px;">${opts}</select><span class="select-arrow">&#9662;</span></div>
      </div>`;
    } else {
      conceptRow = `<div class="import-file-row"><span class="file-status found">&#10003;</span> ${escapeHtml(d.concept.path)}</div>`;
    }

    let tasklistRow;
    if (!d.tasklist.found) {
      tasklistRow = `<div class="import-file-row"><span class="file-status missing">&#10007;</span> Tasklist — not found</div>`;
    } else if (d.tasklist.ambiguous) {
      const opts = d.tasklist.allMatches.map(m =>
        `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
      ).join('');
      tasklistRow = `<div class="import-file-row"><span class="file-status found">&#10003;</span>
        Tasklist: <div class="select-wrap" style="display:inline-flex;width:auto;margin-left:4px;"><select id="importTasklistSelect" style="background-color:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);font-size:12px;padding:2px 6px;">${opts}</select><span class="select-arrow">&#9662;</span></div>
      </div>`;
    } else {
      tasklistRow = `<div class="import-file-row"><span class="file-status found">&#10003;</span> ${escapeHtml(d.tasklist.path)}</div>`;
    }

    // Info notices
    const notices = [];
    if (!d.concept.found) {
      notices.push('No CCC documentation found. After importing, run <code>/evaluate-import</code> in your Claude Code session to generate project docs.');
    }
    if (d.concept.found && !d.claude.found) {
      notices.push('No CLAUDE.md detected. It will be generated when you run <code>/start-project</code>.');
    }
    if (d.concept.found && !d.tasklist.found) {
      notices.push('No tasklist detected. It will be generated when you run <code>/start-project</code>.');
    }
    if (scanResult.versioning.hasVersionedDocs && scanResult.versioning.suggestedActiveVersion) {
      notices.push(`Versioned structure detected. Active version will be set to v${escapeHtml(scanResult.versioning.suggestedActiveVersion)}.`);
    }

    const infoHtml = notices.length > 0
      ? `<div class="import-info-panel">${notices.map(n => `<p>${n}</p>`).join('')}</div>`
      : '';

    // Group options
    const groupOptions = [
      `<option value="" disabled selected>-- Select Group --</option>`,
      ...groups.map(g =>
        `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`
      ),
      `<option value="__new__">-- Create New --</option>`
    ].join('');

    overlay.innerHTML = `
      <div class="modal modal-wizard">
        <div class="modal-header">
          <span class="modal-title">Import Existing Project</span>
          <span class="modal-close">&times;</span>
        </div>
        <div class="modal-body">
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--accent);margin-bottom:12px;word-break:break-all;">${escapeHtml(scanResult.absPath)}</div>

          <div class="settings-group">
            <label>Detected Files</label>
            <div class="import-detected-files">
              ${claudeRow}
              ${conceptRow}
              ${tasklistRow}
            </div>
          </div>

          ${infoHtml}

          <div class="settings-group">
            <label>Project Name</label>
            <input type="text" id="importName" placeholder="${escapeHtml(scanResult.folderName)}">
          </div>
          <div class="settings-group">
            <label>Group</label>
            <div class="select-wrap"><select id="importGroup">
              ${groupOptions}
            </select><span class="select-arrow">&#9662;</span></div>
            <div class="new-group-input" id="importNewGroupWrap">
              <input type="text" id="importNewGroup" placeholder="New group name">
            </div>
          </div>
          <div class="wizard-error" id="importError"></div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="importBack">Back</button>
          <button class="btn btn-primary" id="importSubmit">Import</button>
        </div>
      </div>
    `;

    // Close handlers — return to New Project wizard
    const backToWizard2 = () => { overlay.remove(); showNewProjectWizard(); };
    overlay.querySelector('.modal-close').addEventListener('click', backToWizard2);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) backToWizard2();
    });

    // Back button — return to Phase 1, preserve path
    overlay.querySelector('#importBack').addEventListener('click', () => {
      prefillPath = scanResult.absPath;
      renderPhase1();
    });

    // Group dropdown — show/hide new group input
    const groupSelect = overlay.querySelector('#importGroup');
    groupSelect.addEventListener('change', () => {
      const wrap = overlay.querySelector('#importNewGroupWrap');
      if (groupSelect.value === '__new__') {
        wrap.classList.add('visible');
        overlay.querySelector('#importNewGroup').focus();
      } else {
        wrap.classList.remove('visible');
      }
    });

    // Import button
    overlay.querySelector('#importSubmit').addEventListener('click', async () => {
      const errorEl = overlay.querySelector('#importError');
      errorEl.classList.remove('visible');
      errorEl.textContent = '';

      const nameVal = overlay.querySelector('#importName').value.trim();
      if (!nameVal) {
        errorEl.textContent = 'Project name is required.';
        errorEl.classList.add('visible');
        return;
      }

      let groupVal = groupSelect.value;
      if (!groupVal) {
        errorEl.textContent = 'Please select a group.';
        errorEl.classList.add('visible');
        return;
      }
      if (groupVal === '__new__') {
        groupVal = overlay.querySelector('#importNewGroup').value.trim();
        if (!groupVal) {
          errorEl.textContent = 'Please enter a name for the new group.';
          errorEl.classList.add('visible');
          return;
        }
      }

      // Resolve selected concept/tasklist (from dropdowns if ambiguous)
      const conceptPath = d.concept.found
        ? (d.concept.ambiguous ? overlay.querySelector('#importConceptSelect').value : d.concept.path)
        : '';
      const tasklistPath = d.tasklist.found
        ? (d.tasklist.ambiguous ? (overlay.querySelector('#importTasklistSelect')?.value || null) : d.tasklist.path)
        : '';
      const needsEvaluation = !d.concept.found;

      const importBtn = overlay.querySelector('#importSubmit');
      importBtn.disabled = true;
      const loader = showLoadingOverlay(overlay);

      try {
        const result = await api('POST', '/api/projects', {
          name: nameVal,
          path: scanResult.registrationPath,
          group: groupVal,
          coreFiles: {
            claude: d.claude.found ? 'CLAUDE.md' : '',
            concept: conceptPath || '',
            tasklist: tasklistPath || ''
          }
        });

        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.classList.add('visible');
          importBtn.disabled = false;
          hideLoadingOverlay(loader);
          return;
        }

        // Set active version if versioned structure detected
        if (scanResult.versioning.suggestedActiveVersion && result.id) {
          await api('PUT', `/api/projects/${result.id}/active-version`, {
            version: scanResult.versioning.suggestedActiveVersion
          });
        }

        // Flag unevaluated imports (no concept doc found)
        if (needsEvaluation && result.id) {
          await api('PUT', `/api/projects/${result.id}`, { evaluated: false });
        }

        overlay.remove();
        await loadProjects();
        showToast(`Project "${nameVal}" imported.`);
      } catch (err) {
        errorEl.textContent = 'Import failed: ' + (err.message || 'Unknown error');
        errorEl.classList.add('visible');
        importBtn.disabled = false;
        hideLoadingOverlay(loader);
      }
    });

    overlay.querySelector('#importName').focus();
  }

  // Start with Phase 1
  document.body.appendChild(overlay);
  renderPhase1();
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
      <div class="select-wrap"><select id="editGroup">${groupOptions}</select><span class="select-arrow">&#9662;</span></div>
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
  const body = `
    <p>Remove <strong>${escapeHtml(project.name)}</strong> from CCC?</p>
    <label style="display:flex; align-items:center; gap:8px; margin-top:12px; font-size:13px; color:var(--text-secondary); text-transform:none; font-weight:normal; cursor:pointer;">
      <input type="checkbox" id="removeDeleteFiles">
      Also delete project folder from disk
    </label>
    <p id="removeDeleteWarning" style="display:none; margin-top:8px; font-size:12px; color:var(--status-waiting);">This will permanently delete all files in the project directory. This cannot be undone.</p>
  `;

  showModal('Remove Project', body, async (overlay) => {
    const deleteFiles = overlay.querySelector('#removeDeleteFiles').checked;

    if (deleteFiles) {
      const result = await api('DELETE', `/api/projects/${project.id}?deleteFiles=true`);
      if (result.error) {
        showToast(result.error);
        return;
      }
    } else {
      await api('DELETE', `/api/projects/${project.id}`);
    }

    openTabs = openTabs.filter(t => t !== project.id + '::session' && !t.startsWith(project.id + ':'));
    if (activeTab === project.id + '::session' || activeTab?.startsWith(project.id + ':')) {
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

  // Toggle warning when checkbox changes
  const modal = document.getElementById('modal');
  modal.querySelector('#removeDeleteFiles').addEventListener('change', (e) => {
    modal.querySelector('#removeDeleteWarning').style.display = e.target.checked ? 'block' : 'none';
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
      showToast(result.error);
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
      showToast(result.error);
      return;
    }

    showToast('Git tag \'' + tagName + '\' created successfully.');
  });
}

function showRemoveVersionConfirm(project, version) {
  const body = `
    <p>Delete version <strong>v${escapeHtml(version)}</strong> and all its files?</p>
    <p style="margin-top:8px; font-size:12px; color:var(--status-waiting);">This will permanently delete the version folder from disk. This cannot be undone.</p>
  `;

  showModal('Remove Version', body, async (overlay) => {
    const result = await api('DELETE', `/api/projects/${project.id}/versions/${version}`);
    if (result.error) {
      showToast(result.error);
      return;
    }

    await loadProjectVersions(project.id);
    renderTreeView();
    showToast('Version v' + version + ' deleted.');
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
      showToast(result.error);
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

  const saved = localStorage.getItem('ccc-sidebar-width');
  if (saved) sidebar.style.width = saved;

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
    localStorage.setItem('ccc-sidebar-width', sidebar.style.width);
  });
}

// --- Window Resize ---

function initWindowResize() {
  window.addEventListener('resize', () => {
    // Fit the active terminal on window resize
    if (activeTab && activeTab.endsWith('::session')) {
      const projectId = activeTab.replace('::session', '');
      const instance = terminalInstances.get(projectId);
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

// --- Onboarding ---

function showOnboardingScreen(referralUrl) {
  const app = document.querySelector('.app');
  app.style.display = 'none';

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="onboarding-card">
      <div class="onboarding-logo">&#x25B6; CCC</div>
      <h1>Claude Command Center</h1>
      <p>CCC requires <strong>Claude Code</strong> (the CLI) to be installed and authenticated on this machine.</p>
      <a href="${escapeHtml(referralUrl)}" target="_blank" rel="noopener" class="btn btn-primary onboarding-btn">Get Claude Code</a>
      <div class="onboarding-help">
        <p><strong>Already have Claude Code?</strong></p>
        <p>Make sure it's in your PATH and authenticated. Try running <code>claude --version</code> in a terminal.</p>
      </div>
      <button class="btn onboarding-retry">Retry</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.onboarding-retry').addEventListener('click', async () => {
    overlay.remove();
    await initApp();
  });
}

// --- Init ---

async function initApp() {
  const preflight = await api('GET', '/api/preflight');

  if (!preflight.claudeInstalled) {
    showOnboardingScreen(preflight.referralUrl || 'https://claude.ai');
    return;
  }

  // Remove onboarding overlay if it exists from a previous retry
  const existingOnboarding = document.querySelector('.onboarding-overlay');
  if (existingOnboarding) existingOnboarding.remove();

  const app = document.querySelector('.app');
  app.style.display = '';

  await loadSettings();
  await loadProjects();
}

document.getElementById('settingsEntry').addEventListener('click', openSettings);
document.getElementById('addProjectBtn').addEventListener('click', showNewProjectWizard);
document.getElementById('refreshBtn').addEventListener('click', async () => {
  // Clear cached version data so it re-scans from disk
  projectVersions.clear();
  await loadProjects();
  showToast('Tree refreshed.');
});
initResize();
initWindowResize();
initApp();

// Load version info
api('GET', '/api/version').then(data => {
  if (data.version) {
    const label = document.getElementById('versionLabel');
    if (label) {
      label.textContent = data.build ? `v${data.version} · Build ${data.build}` : `v${data.version}`;
    }
  }
});
