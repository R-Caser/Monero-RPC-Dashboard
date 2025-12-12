// ==================== WEBSOCKET CLIENT ====================

let socket = null;
let isConnected = false;

// Inizializza la connessione WebSocket
function initWebSocket() {
  // Usa la stessa origin del server
  const socketURL = window.location.origin;
  
  socket = io(socketURL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connesso');
    isConnected = true;
    updateWebSocketStatus(true);
    
    // Carica i dati storici per popolare i grafici
    if (typeof loadHistoricalChartData === 'function') {
      loadHistoricalChartData().then(loaded => {
        if (loaded) {
          console.log('✅ Grafici popolati con dati storici');
        }
      });
    }
    
    // Iscriviti al canale delle statistiche di rete
    socket.emit('subscribe', 'network-stats');
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnesso');
    isConnected = false;
    updateWebSocketStatus(false);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Errore connessione WebSocket:', error);
    isConnected = false;
    updateWebSocketStatus(false);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔌 Riconnesso dopo ${attemptNumber} tentativi`);
    isConnected = true;
    updateWebSocketStatus(true);
    socket.emit('subscribe', 'network-stats');
  });

  // Ascolta gli aggiornamenti delle statistiche di rete
  socket.on('network-stats', (stats) => {
    updateNetworkStatsRealtime(stats);
    updateCharts(stats);
  });
}

// Aggiorna l'indicatore di stato WebSocket
function updateWebSocketStatus(connected) {
  const indicator = document.getElementById('wsIndicator');
  const text = document.getElementById('wsStatusText');
  
  if (indicator) {
    if (connected) {
      indicator.classList.remove('disconnected');
      indicator.classList.add('connected');
      if (text) text.textContent = 'Live Updates';
    } else {
      indicator.classList.remove('connected');
      indicator.classList.add('disconnected');
      if (text) text.textContent = 'Offline';
    }
  }
}

// Aggiorna le statistiche di rete in tempo reale
function updateNetworkStatsRealtime(stats) {
  // Aggiorna altezza blocco
  const heightElement = document.getElementById('realtimeHeight');
  if (heightElement) {
    heightElement.textContent = stats.height.toLocaleString('it-IT');
  }

  // Aggiorna hashrate
  const hashrateElement = document.getElementById('realtimeHashrate');
  if (hashrateElement) {
    hashrateElement.textContent = formatHashrate(stats.hashrate);
  }

  // Aggiorna difficoltà
  const difficultyElement = document.getElementById('realtimeDifficulty');
  if (difficultyElement) {
    difficultyElement.textContent = (stats.difficulty / 1e9).toFixed(2) + ' G';
  }

  // Aggiorna TX Pool
  const txpoolElement = document.getElementById('realtimeTxPool');
  if (txpoolElement) {
    txpoolElement.textContent = stats.txPoolSize.toLocaleString('it-IT');
  }

  // Aggiorna connessioni
  const incomingElement = document.getElementById('realtimeIncoming');
  if (incomingElement) {
    incomingElement.textContent = stats.incomingConnections;
  }

  const outgoingElement = document.getElementById('realtimeOutgoing');
  if (outgoingElement) {
    outgoingElement.textContent = stats.outgoingConnections;
  }

  // Aggiorna percentuale sync
  const syncElement = document.getElementById('realtimeSyncPercentage');
  if (syncElement) {
    syncElement.textContent = stats.syncPercentage + '%';
  }

  // Aggiorna timestamp ultimo aggiornamento
  const timestampElement = document.getElementById('lastUpdateTime');
  if (timestampElement) {
    const updateTime = new Date(stats.timestamp);
    timestampElement.textContent = updateTime.toLocaleTimeString('it-IT');
  }
}

// Disconnetti WebSocket
function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Riconnetti WebSocket
function reconnectWebSocket() {
  disconnectWebSocket();
  setTimeout(() => {
    initWebSocket();
  }, 500);
}
