// Configurazione base
const API_BASE = '/api';

// ==================== UTILITY FUNCTIONS ====================

// Formatta i byte in formato leggibile
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  // 2^64 - 1 è usato da Monero per indicare "illimitato" o "non disponibile"
  // Controlla se il valore è vicino a questo numero (considerando l'imprecisione di JS)
  if (bytes >= 18446744073709551000 || bytes < 0) {
    return t ? t('common.unlimited') : 'Unlimited';
  }
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Formatta l'uptime in formato leggibile
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

// ==================== SECTION TOGGLE FUNCTIONS ====================

// Toggle sezione collapsible
function toggleSection(sectionId) {
  const section = document.querySelector(`[data-section="${sectionId}"]`);
  const content = document.getElementById(`${sectionId}Content`);
  
  if (section) {
    section.classList.toggle('collapsed');
    
    // Mostra/nascondi il contenuto
    if (content) {
      const isCollapsed = section.classList.contains('collapsed');
      content.style.display = isCollapsed ? 'none' : 'block';
      
      // Salva stato in localStorage
      localStorage.setItem(`section_${sectionId}_collapsed`, isCollapsed);
    }
  }
}

// Inizializza stati delle sezioni da localStorage
function initSectionStates() {
  // Sezioni che devono essere chiuse di default
  const closedByDefault = ['blockvis', 'blocksearch', 'txpool', 'customrpc', 'feeestimate'];
  // Sezioni che devono essere aperte di default
  const openByDefault = ['network', 'details', 'charts'];
  
  const allSections = [...closedByDefault, ...openByDefault];
  
  allSections.forEach(sectionId => {
    const savedState = localStorage.getItem(`section_${sectionId}_collapsed`);
    const section = document.querySelector(`[data-section="${sectionId}"]`);
    const content = document.getElementById(`${sectionId}Content`);
    
    if (!section) return;
    
    // Se non c'è uno stato salvato, usa il default
    if (savedState === null) {
      if (closedByDefault.includes(sectionId)) {
        section.classList.add('collapsed');
        if (content) content.style.display = 'none';
      } else {
        section.classList.remove('collapsed');
        if (content) content.style.display = 'block';
      }
    } else {
      // Usa lo stato salvato
      const isCollapsed = savedState === 'true';
      if (isCollapsed) {
        section.classList.add('collapsed');
        if (content) content.style.display = 'none';
      } else {
        section.classList.remove('collapsed');
        if (content) content.style.display = 'block';
      }
    }
  });
}

// ==================== THEME FUNCTIONS ====================

// Funzione per inizializzare il tema
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

// Funzione per cambiare tema
function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  
  // Aggiorna i colori dei grafici se esistono
  if (typeof updateChartTheme === 'function') {
    setTimeout(() => updateChartTheme(), 100);
  }
}

// Aggiorna icona tema
function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

// ==================== LANGUAGE FUNCTIONS ====================

// Funzione per cambiare lingua
function changeLanguage(lang) {
  setLanguage(lang);
}

// ==================== API FUNCTIONS ====================

// Funzione per verificare lo stato della connessione
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (data.rpcConnected) {
      indicator.classList.add('connected');
      indicator.classList.remove('disconnected');
      statusText.textContent = t('header.status.connected');
    } else {
      indicator.classList.add('disconnected');
      indicator.classList.remove('connected');
      statusText.textContent = t('header.status.disconnected');
    }
  } catch (error) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    indicator.classList.add('disconnected');
    indicator.classList.remove('connected');
    statusText.textContent = t('header.status.error');
    console.error('Health check failed:', error);
  }
}

// Carica informazioni sulla rete
async function loadNetworkInfo() {
  try {
    // Ottieni info generali
    const infoResponse = await fetch(`${API_BASE}/info`);
    const infoData = await infoResponse.json();
    
    if (infoData.success) {
      const info = infoData.data;
      const height = info.height?.toLocaleString() || '-';
      const connections = (info.incoming_connections_count + info.outgoing_connections_count) || '-';
      
      document.getElementById('blockHeight').textContent = height;
      document.getElementById('connections').textContent = connections;
      document.getElementById('difficulty').textContent = 
        info.difficulty?.toLocaleString() || '-';
      
      // Stato sincronizzazione
      const isSynced = info.synchronized === true;
      const syncText = isSynced ? t('network.sync.synced') : t('network.sync.syncing');
      document.getElementById('syncStatus').textContent = syncText;
      
      // Altre informazioni
      const freeSpace = info.free_space ? formatBytes(info.free_space) : '-';
      const dbSize = info.database_size ? formatBytes(info.database_size) : '-';
      const txPoolSize = info.tx_pool_size || 0;
      
      document.getElementById('freeSpace').textContent = freeSpace;
      document.getElementById('dbSize').textContent = dbSize;
      document.getElementById('txCount').textContent = 
        info.tx_count?.toLocaleString() || '-';
      document.getElementById('txPoolSize').textContent = 
        txPoolSize.toLocaleString();
      
      // Uptime
      let uptimeText = '-';
      if (info.start_time) {
        const uptime = Date.now() / 1000 - info.start_time;
        uptimeText = formatUptime(uptime);
        document.getElementById('uptime').textContent = uptimeText;
      } else {
        document.getElementById('uptime').textContent = uptimeText;
      }
      
      // Stato aggiornamento
      document.getElementById('updateStatus').textContent = 
        info.update_available ? t('details.update.available') : t('details.update.uptodate');
      
      // Versione nel header
      if (info.version) {
        document.getElementById('versionText').textContent = `v${info.version}`;
        
        // Mostra icona aggiornamento se disponibile
        const updateIcon = document.getElementById('updateIcon');
        if (info.update_available) {
          updateIcon.style.display = 'inline';
          updateIcon.title = t('details.update.available');
        } else {
          updateIcon.style.display = 'none';
        }
      }
      
      // Aggiorna preview cards
      document.getElementById('previewHeight').textContent = height;
      document.getElementById('previewSync').textContent = isSynced ? '✅' : '⏳';
      document.getElementById('previewConnections').textContent = connections;
      document.getElementById('previewFreeSpace').textContent = freeSpace;
      document.getElementById('previewDbSize').textContent = dbSize;
      document.getElementById('previewUptime').textContent = uptimeText;
      document.getElementById('previewTxPending').textContent = txPoolSize;
      
      // Visualizzazione Blocco
      updateBlockVisualization(isSynced, info.height, txPoolSize);
    }

    // Ottieni conteggio blocchi
    const countResponse = await fetch(`${API_BASE}/block-count`);
    const countData = await countResponse.json();
    if (countData.success) {
      document.getElementById('blockCount').textContent = 
        countData.data.count?.toLocaleString() || '-';
    }

    // Ottieni versione
    const versionResponse = await fetch(`${API_BASE}/version`);
    const versionData = await versionResponse.json();
    if (versionData.success) {
      document.getElementById('version').textContent = 
        versionData.data.version || '-';
    }

  } catch (error) {
    console.error('Failed to load network info:', error);
    showError('Errore nel caricamento delle informazioni di rete');
  }
}

// Aggiorna visualizzazione blocco
function updateBlockVisualization(isSynced, height, txPoolSize) {
  const blockVisSection = document.getElementById('blockVisualization');
  
  if (!isSynced) {
    blockVisSection.style.display = 'none';
    return;
  }
  
  blockVisSection.style.display = 'block';
  
  // Aggiorna altezza blocco
  document.getElementById('blockVisHeight').textContent = height?.toLocaleString() || '-';
  document.getElementById('blockVisTxCount').textContent = txPoolSize || 0;
  
  // Genera blocchi TX
  const txContainer = document.getElementById('txContainer');
  txContainer.innerHTML = '';
  
  // Limita il numero di blocchi visualizzati (max 100 per performance)
  const maxTx = Math.min(txPoolSize || 0, 100);
  
  for (let i = 0; i < maxTx; i++) {
    const txBlock = document.createElement('div');
    txBlock.className = 'tx-block';
    txContainer.appendChild(txBlock);
  }
}

// Cerca un blocco
async function searchBlock() {
  const input = document.getElementById('blockInput').value.trim();
  const resultDiv = document.getElementById('blockResult');
  
  if (!input) {
    showError(t('block.error.input'), resultDiv);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/block/${input}`);
    const data = await response.json();
    
    if (data.success) {
      const block = data.data;
      resultDiv.innerHTML = `
        <div class="result-success">
          <h3>${t('block.found')}</h3>
          <pre>${JSON.stringify(block, null, 2)}</pre>
        </div>
      `;
    } else {
      showError(data.error, resultDiv);
    }
  } catch (error) {
    showError(t('block.error'), resultDiv);
    console.error(error);
  }
}

// Carica transaction pool
async function loadTransactionPool() {
  const resultDiv = document.getElementById('txPoolResult');
  
  try {
    const response = await fetch(`${API_BASE}/transaction-pool`);
    const data = await response.json();
    
    if (data.success) {
      const pool = data.data;
      const txCount = pool.transactions?.length || 0;
      
      resultDiv.innerHTML = `
        <div class="result-success">
          <h3>${t('txpool.result')}</h3>
          <p><strong>${t('txpool.pending')}</strong> ${txCount}</p>
          <pre>${JSON.stringify(pool, null, 2)}</pre>
        </div>
      `;
    } else {
      showError(data.error, resultDiv);
    }
  } catch (error) {
    showError(t('txpool.error'), resultDiv);
    console.error(error);
  }
}

// Esegui chiamata RPC personalizzata
async function executeRPC() {
  const method = document.getElementById('rpcMethod').value.trim();
  const paramsText = document.getElementById('rpcParams').value.trim();
  const resultDiv = document.getElementById('rpcResult');
  
  if (!method) {
    showError(t('rpc.error.method'), resultDiv);
    return;
  }

  let params = {};
  if (paramsText) {
    try {
      params = JSON.parse(paramsText);
    } catch (error) {
      showError(t('rpc.error.params'), resultDiv);
      return;
    }
  }

  try {
    const response = await fetch(`${API_BASE}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, params }),
    });

    const data = await response.json();
    
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="result-success">
          <h3>${t('rpc.result')}</h3>
          <pre>${JSON.stringify(data.data, null, 2)}</pre>
        </div>
      `;
    } else {
      showError(data.error, resultDiv);
    }
  } catch (error) {
    showError(t('rpc.error.execution'), resultDiv);
    console.error(error);
  }
}

// Carica stima fee
async function loadFeeEstimate() {
  const resultDiv = document.getElementById('feeResult');
  
  try {
    const response = await fetch(`${API_BASE}/fee-estimate`);
    const data = await response.json();
    
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="result-success">
          <h3>${t('fee.result')}</h3>
          <pre>${JSON.stringify(data.data, null, 2)}</pre>
        </div>
      `;
    } else {
      showError(data.error, resultDiv);
    }
  } catch (error) {
    showError(t('fee.error'), resultDiv);
    console.error(error);
  }
}

// Mostra messaggio di errore
function showError(message, container = null) {
  const errorHTML = `
    <div class="result-error">
      <strong>${t('common.error.generic')}</strong> ${message}
    </div>
  `;
  
  if (container) {
    container.innerHTML = errorHTML;
  } else {
    alert(message);
  }
}

// Event listener per Enter key
document.getElementById('blockInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBlock();
});

// ==================== CONFIGURATION FUNCTIONS ====================

// Toggle pannello configurazione
function toggleConfigPanel() {
  const panel = document.getElementById('configPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    loadSavedConfigs();
  } else {
    panel.style.display = 'none';
  }
}

// Toggle campi autenticazione
function toggleAuthFields() {
  const authFields = document.getElementById('authFields');
  const requiresAuth = document.getElementById('configAuth').checked;
  authFields.style.display = requiresAuth ? 'block' : 'none';
}

// Toggle info HTTPS
function toggleHttpsInfo() {
  // Placeholder per eventuali info aggiuntive HTTPS
}

// Carica configurazioni salvate
async function loadSavedConfigs() {
  const container = document.getElementById('savedConfigs');
  container.innerHTML = `<p>${t('config.loading')}</p>`;
  
  try {
    const response = await fetch(`${API_BASE}/config`);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      container.innerHTML = data.data.map(config => {
        const protocol = config.use_https ? 'https' : 'http';
        const authIcon = config.requires_auth ? '🔒' : '🔓';
        const activeClass = config.is_active ? 'active' : '';
        
        return `
          <div class="config-item ${activeClass}">
            <div class="config-item-header">
              <span class="config-item-title">
                ${authIcon} ${protocol}://${config.host}:${config.port}
              </span>
              ${config.is_active ? `<span class="config-item-badge">${t('config.active')}</span>` : ''}
            </div>
            <div class="config-item-details">
              <div>${t('config.id')} ${config.id}</div>
              <div>${t('common.authentication')} ${config.requires_auth ? t('config.auth.yes') : t('config.auth.no')}</div>
              ${config.requires_auth ? `<div>Username: ${config.username || '-'}</div>` : ''}
              <div>${t('config.created')} ${new Date(config.created_at).toLocaleString(getCurrentLanguage() === 'it' ? 'it-IT' : 'en-US')}</div>
            </div>
            <div class="config-item-actions">
              ${!config.is_active ? `
                <button class="btn btn-primary" onclick="activateConfig(${config.id})">
                  ✓ ${t('config.activate')}
                </button>
              ` : ''}
              <button class="btn btn-secondary" onclick="editConfig(${config.id})">
                ✏️ ${t('config.edit')}
              </button>
              ${!config.is_active ? `
                <button class="btn btn-danger" onclick="deleteConfig(${config.id})">
                  🗑️ ${t('config.delete')}
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = `<p>${t('config.none')}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p class="result-error">${t('common.error')} ${error.message}</p>`;
    console.error('Errore caricamento configurazioni:', error);
  }
}

// Testa connessione
async function testConnection() {
  const resultDiv = document.getElementById('configTestResult');
  resultDiv.innerHTML = `<p>${t('config.test.running')}</p>`;
  
  const host = document.getElementById('configHost').value;
  const port = document.getElementById('configPort').value;
  const use_https = document.getElementById('configHttps').checked;
  const requires_auth = document.getElementById('configAuth').checked;
  const username = document.getElementById('configUsername').value;
  const password = document.getElementById('configPassword').value;
  
  if (!host || !port) {
    resultDiv.innerHTML = `<div class="result-error">${t('config.test.required')}</div>`;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/config/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        port: parseInt(port),
        use_https,
        requires_auth,
        username: requires_auth ? username : null,
        password: requires_auth ? password : null,
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="result-success" style="background: rgba(76, 175, 80, 0.2); padding: 1rem; border-radius: 5px; border: 1px solid var(--success-color);">
          <strong>✅ ${t('config.test.success')}</strong><br>
          ${t('config.test.network')} ${data.data.network}<br>
          ${t('config.test.height')} ${data.data.height.toLocaleString()}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<div class="result-error">${t('config.test.error')} ${data.error}</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="result-error">${t('common.error')} ${error.message}</div>`;
  }
}

// Salva configurazione
async function saveConfiguration() {
  const host = document.getElementById('configHost').value;
  const port = document.getElementById('configPort').value;
  const use_https = document.getElementById('configHttps').checked;
  const requires_auth = document.getElementById('configAuth').checked;
  const username = document.getElementById('configUsername').value;
  const password = document.getElementById('configPassword').value;
  
  if (!host || !port) {
    alert(t('config.test.required'));
    return;
  }
  
  if (requires_auth && (!username || !password)) {
    alert(t('config.test.required'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        port: parseInt(port),
        use_https,
        requires_auth,
        username: requires_auth ? username : null,
        password: requires_auth ? password : null,
        is_active: true, // Nuove configurazioni sono sempre attive
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${t('config.save.success')}`);
      // Reset form
      document.getElementById('configHost').value = '';
      document.getElementById('configPort').value = '';
      document.getElementById('configHttps').checked = false;
      document.getElementById('configAuth').checked = false;
      document.getElementById('configUsername').value = '';
      document.getElementById('configPassword').value = '';
      document.getElementById('authFields').style.display = 'none';
      document.getElementById('configTestResult').innerHTML = '';
      
      // Ricarica configurazioni e aggiorna stato
      loadSavedConfigs();
      setTimeout(() => {
        checkHealth();
        loadNetworkInfo();
      }, 1000);
    } else {
      alert(`❌ ${t('common.error')} ${data.error}`);
    }
  } catch (error) {
    alert(`❌ ${t('common.error')} ${error.message}`);
  }
}

// Attiva configurazione
async function activateConfig(id) {
  if (!confirm(t('config.activate.confirm'))) return;
  
  try {
    const response = await fetch(`${API_BASE}/config/${id}/activate`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${t('config.activate.success')}`);
      loadSavedConfigs();
      setTimeout(() => {
        checkHealth();
        loadNetworkInfo();
      }, 1000);
    } else {
      alert(`❌ ${t('common.error')} ${data.error}`);
    }
  } catch (error) {
    alert(`❌ ${t('common.error')} ${error.message}`);
  }
}

// Modifica configurazione
async function editConfig(id) {
  try {
    const response = await fetch(`${API_BASE}/config/${id}`);
    const data = await response.json();
    
    if (data.success) {
      const config = data.data;
      document.getElementById('configHost').value = config.host;
      document.getElementById('configPort').value = config.port;
      document.getElementById('configHttps').checked = config.use_https === 1;
      document.getElementById('configAuth').checked = config.requires_auth === 1;
      document.getElementById('configUsername').value = config.username || '';
      document.getElementById('configPassword').value = config.password || '';
      
      if (config.requires_auth) {
        document.getElementById('authFields').style.display = 'block';
      }
      
      // Scroll al form
      document.getElementById('configPanel').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    alert(`${t('common.error.generic')} ${error.message}`);
  }
}

// Elimina configurazione
async function deleteConfig(id) {
  if (!confirm(t('config.delete.confirm'))) return;
  
  try {
    const response = await fetch(`${API_BASE}/config/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${t('config.delete.success')}`);
      loadSavedConfigs();
    } else {
      alert(`❌ ${t('common.error')} ${data.error}`);
    }
  } catch (error) {
    alert(`❌ ${t('common.error')} ${error.message}`);
  }
}

// ==================== SETTINGS FUNCTIONS ====================

let autoRefreshInterval = null;

// Carica le impostazioni dall'API
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    const data = await response.json();
    
    if (data.success) {
      const settings = data.data;
      document.getElementById('autoRefreshEnabled').checked = settings.auto_refresh_enabled === 1;
      document.getElementById('refreshInterval').value = settings.auto_refresh_interval || 30;
      
      // Applica le impostazioni auto-refresh
      applyAutoRefreshSettings(settings.auto_refresh_enabled === 1, settings.auto_refresh_interval);
    }
  } catch (error) {
    console.error('Errore caricamento impostazioni:', error);
  }
}

// Aggiorna le impostazioni
async function updateAutoRefreshSettings() {
  const enabled = document.getElementById('autoRefreshEnabled').checked;
  const interval = parseInt(document.getElementById('refreshInterval').value);
  
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_refresh_enabled: enabled,
        auto_refresh_interval: interval
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      applyAutoRefreshSettings(enabled, interval);
    } else {
      alert(`❌ ${t('common.error')} ${data.error}`);
    }
  } catch (error) {
    alert(`❌ ${t('common.error')} ${error.message}`);
  }
}

// Applica le impostazioni di auto-refresh
function applyAutoRefreshSettings(enabled, interval) {
  const refreshButton = document.querySelector('[onclick="loadNetworkInfo()"]');
  
  // Ferma l'intervallo esistente se presente
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  
  if (enabled) {
    // Nascondi il pulsante refresh
    if (refreshButton) {
      refreshButton.style.display = 'none';
    }
    
    // Avvia l'auto-refresh con l'intervallo specificato
    autoRefreshInterval = setInterval(() => {
      loadNetworkInfo();
    }, interval * 1000);
  } else {
    // Mostra il pulsante refresh
    if (refreshButton) {
      refreshButton.style.display = '';
    }
  }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
  // Inizializza tema
  initTheme();
  
  // Inizializza sistema i18n (carica lingue e traduzioni)
  await initI18n();
  
  // Inizializza stati sezioni collapsible
  initSectionStates();
  
  // Carica impostazioni
  loadSettings();
  
  // Carica dati
  checkHealth();
  loadNetworkInfo();
  
  // Aggiorna stato ogni 30 secondi
  setInterval(checkHealth, 30000);
});
