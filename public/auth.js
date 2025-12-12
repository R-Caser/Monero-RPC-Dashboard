// ==================== AUTHENTICATION & RBAC ====================

let currentUser = null;

// Controlla se l'utente è loggato all'avvio
async function checkSession() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      currentUser = result.data;
      updateUIForUser();
      return true;
    } else {
      currentUser = null;
      updateUIForUser();
      return false;
    }
  } catch (error) {
    console.error('Errore verifica sessione:', error);
    currentUser = null;
    updateUIForUser();
    return false;
  }
}

// Login
async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    
    if (result.success) {
      currentUser = result.data;
      updateUIForUser();
      return { success: true, message: result.message };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Errore login:', error);
    return { success: false, error: 'Errore di connessione' };
  }
}

// Logout
async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      currentUser = null;
      updateUIForUser();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Errore logout:', error);
    return false;
  }
}

// Gestisce il logout con messaggio di conferma
async function handleLogout() {
  const result = await logout();
  if (result) {
    showToast('Logout effettuato con successo', 'success');
  } else {
    showToast('Errore durante il logout', 'error');
  }
}

// Aggiorna l'UI in base all'utente loggato
function updateUIForUser() {
  const configBtn = document.getElementById('configBtn');
  const configPanel = document.getElementById('configPanel');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  
  if (currentUser) {
    // Utente loggato
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (userInfo) {
      userInfo.style.display = 'inline-block';
      userInfo.textContent = `👤 ${currentUser.username} (${currentUser.role})`;
    }
    
    // Mostra configurazione solo per admin
    const isAdmin = currentUser.role === 'admin';
    if (configBtn) {
      configBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
    // Nascondi pannello configurazione se non admin o non loggato
    if (configPanel && !isAdmin) {
      configPanel.style.display = 'none';
    }
  } else {
    // Nessun utente loggato - mostra pulsante login
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';
    if (configBtn) configBtn.style.display = 'none';
    // Nascondi pannello configurazione
    if (configPanel) {
      configPanel.style.display = 'none';
    }
  }
}

// Mostra modal di login
function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('loginUsername').focus();
  }
}

// Nascondi modal di login
function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').textContent = '';
  }
}

// Gestisci submit del form di login
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!username || !password) {
    errorDiv.textContent = 'Inserisci username e password';
    return;
  }
  
  const result = await login(username, password);
  
  if (result.success) {
    hideLoginModal();
    showNotification('success', 'Login effettuato con successo');
  } else {
    errorDiv.textContent = result.error;
  }
}

// Gestisci logout
async function handleLogout() {
  const confirmed = confirm('Vuoi effettuare il logout?');
  if (confirmed) {
    const success = await logout();
    if (success) {
      showNotification('info', 'Logout effettuato');
      // Chiudi il pannello di configurazione se aperto
      const configPanel = document.getElementById('configPanel');
      if (configPanel && configPanel.style.display !== 'none') {
        toggleConfigPanel();
      }
    }
  }
}

// ==================== NOTIFICATIONS ====================

let notifications = [];

// Carica le notifiche
async function loadNotifications() {
  try {
    const response = await fetch('/api/notifications?limit=20');
    const result = await response.json();
    
    if (result.success) {
      notifications = result.data;
      updateNotificationBadge();
      return notifications;
    }
  } catch (error) {
    console.error('Errore caricamento notifiche:', error);
  }
  return [];
}

// Aggiorna il badge delle notifiche
function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  const unread = notifications.filter(n => !n.is_read).length;
  
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Mostra/nascondi pannello notifiche
function toggleNotificationsPanel() {
  const panel = document.getElementById('notificationsPanel');
  if (panel) {
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      renderNotifications();
    } else {
      panel.style.display = 'none';
    }
  }
}

// Renderizza le notifiche
function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;
  
  if (notifications.length === 0) {
    container.innerHTML = '<div class="notification-empty">Nessuna notifica</div>';
    return;
  }
  
  container.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.is_read ? 'read' : 'unread'} severity-${n.severity}">
      <div class="notification-header">
        <strong>${n.title}</strong>
        <span class="notification-time">${formatTimeAgo(n.created_at)}</span>
      </div>
      <div class="notification-message">${n.message}</div>
      <div class="notification-actions">
        ${!n.is_read ? `<button onclick="markNotificationAsRead(${n.id})" class="btn-small">Segna come letta</button>` : ''}
        <button onclick="deleteNotification(${n.id})" class="btn-small btn-danger">Elimina</button>
      </div>
    </div>
  `).join('');
}

// Marca notifica come letta
async function markNotificationAsRead(id) {
  try {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
    
    if (response.ok) {
      const notification = notifications.find(n => n.id === id);
      if (notification) {
        notification.is_read = 1;
        updateNotificationBadge();
        renderNotifications();
      }
    }
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
  }
}

// Elimina notifica
async function deleteNotification(id) {
  try {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      notifications = notifications.filter(n => n.id !== id);
      updateNotificationBadge();
      renderNotifications();
    }
  } catch (error) {
    console.error('Errore eliminazione notifica:', error);
  }
}

// Marca tutte le notifiche come lette
async function markAllNotificationsAsRead() {
  try {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PUT'
    });
    
    if (response.ok) {
      notifications.forEach(n => n.is_read = 1);
      updateNotificationBadge();
      renderNotifications();
    }
  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error);
  }
}

// Formatta il tempo relativo
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Adesso';
  if (diffMins < 60) return `${diffMins}m fa`;
  if (diffHours < 24) return `${diffHours}h fa`;
  return `${diffDays}g fa`;
}

// Mostra una notifica temporanea
function showNotification(severity, message) {
  const container = document.getElementById('toastNotifications');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast-notification severity-${severity}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}
