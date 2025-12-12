require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MoneroRPCClient = require('./moneroRPC');
const Database = require('./database');
const { requireAuth, requireAdmin, verifyPassword } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'xmr-dashboard-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));
app.use(express.static(path.join(__dirname, '../public')));

// Middleware di logging per debug
app.use((req, res, next) => {
  console.log(`📞 ${req.method} ${req.path}`);
  next();
});

// Assicurati che la directory data esista
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inizializza il database
const db = new Database();
let rpcClient;

// Funzione per inizializzare/aggiornare il client RPC
async function initRPCClient() {
  try {
    const config = await db.getActiveConfig();
    if (config) {
      const protocol = config.use_https ? 'https' : 'http';
      console.log(`🔄 Configurazione RPC caricata: ${protocol}://${config.host}:${config.port}`);
      
      rpcClient = new MoneroRPCClient({
        host: config.host,
        port: config.port,
        user: config.requires_auth ? config.username : null,
        password: config.requires_auth ? config.password : null,
        useHttps: config.use_https === 1 || config.use_https === true,
      });
    } else {
      console.warn('⚠️  Nessuna configurazione RPC attiva trovata');
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione RPC client:', error.message);
  }
}

// Inizializza il client RPC al avvio
setTimeout(() => initRPCClient(), 1000);

// ==================== AUTHENTICATION ROUTES ====================

/**
 * POST /api/auth/login
 * Login utente
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username e password sono obbligatori'
      });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenziali non valide'
      });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenziali non valide'
      });
    }

    // Aggiorna ultimo login
    await db.updateUserLastLogin(user.id);

    // Crea sessione
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.must_change_password === 1
      },
      message: 'Login effettuato con successo'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout utente
 */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Errore durante il logout'
      });
    }
    res.json({
      success: true,
      message: 'Logout effettuato con successo'
    });
  });
});

/**
 * POST /api/auth/change-password
 * Cambia la password dell'utente
 */
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password attuale e nuova password sono obbligatorie'
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'La nuova password deve essere di almeno 4 caratteri'
      });
    }

    // Ottieni l'utente corrente
    const user = await db.getUserByUsername(req.session.username);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    // Verifica password attuale
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Password attuale non corretta'
      });
    }

    // Hash della nuova password e aggiorna
    const hashedPassword = await hashPassword(newPassword);
    await db.updateUserPassword(user.id, hashedPassword);

    // Aggiorna sessione
    req.session.mustChangePassword = false;

    res.json({
      success: true,
      message: 'Password cambiata con successo'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/session
 * Verifica sessione corrente
 */
app.get('/api/auth/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      data: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role,
        mustChangePassword: req.session.mustChangePassword || false
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Nessuna sessione attiva'
    });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

/**
 * GET /api/notifications
 * Ottiene le notifiche
 */
app.get('/api/notifications', async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = parseInt(req.query.limit) || 50;
    
    const notifications = await db.getNotifications(unreadOnly, limit);
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marca una notifica come letta
 */
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await db.markNotificationAsRead(req.params.id);
    res.json({
      success: true,
      message: 'Notifica marcata come letta'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/read-all
 * Marca tutte le notifiche come lette
 */
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const result = await db.markAllNotificationsAsRead();
    res.json({
      success: true,
      data: result,
      message: 'Tutte le notifiche marcate come lette'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Elimina una notifica
 */
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await db.deleteNotification(req.params.id);
    res.json({
      success: true,
      message: 'Notifica eliminata'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== HISTORICAL DATA ROUTES ====================

/**
 * GET /api/historical
 * Ottiene i dati storici
 */
app.get('/api/historical', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const data = await db.getHistoricalData(limit);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/historical/range
 * Ottiene i dati storici per un range temporale
 */
app.get('/api/historical/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Parametri start e end sono obbligatori'
      });
    }
    
    const data = await db.getHistoricalDataByTimeRange(start, end);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/historical-data/clear
 * Cancella tutti i dati storici (solo admin)
 */
app.delete('/api/historical-data/clear', requireAdmin, async (req, res) => {
  try {
    const result = await db.clearHistoricalData();
    res.json({
      success: true,
      deleted: result.changes || 0,
      message: 'Dati storici cancellati con successo'
    });
  } catch (error) {
    console.error('Errore cancellazione dati storici:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CONFIGURATION ROUTES ====================

/**
 * GET /api/config
 * Ottiene tutte le configurazioni RPC (solo admin)
 */
app.get('/api/config', requireAdmin, async (req, res) => {
  try {
    const configs = await db.getAllConfigs();
    res.json({
      success: true,
      data: configs.map(c => ({
        ...c,
        // Nascondi la password nella risposta
        password: c.password ? '********' : null
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/config/active
 * Ottiene la configurazione RPC attiva
 */
app.get('/api/config/active', async (req, res) => {
  try {
    const config = await db.getActiveConfig();
    if (config) {
      res.json({
        success: true,
        data: {
          ...config,
          password: config.password ? '********' : null
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Nessuna configurazione attiva trovata',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/config/:id
 * Ottiene una configurazione specifica (solo admin)
 */
app.get('/api/config/:id', requireAdmin, async (req, res) => {
  try {
    const config = await db.getConfigById(req.params.id);
    if (config) {
      res.json({
        success: true,
        data: {
          ...config,
          password: config.password ? '********' : null
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Configurazione non trovata',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/config
 * Crea una nuova configurazione RPC (solo admin)
 */
app.post('/api/config', requireAdmin, async (req, res) => {
  try {
    const { host, port, use_https, requires_auth, username, password, is_active } = req.body;
    
    // Validazione
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host e porta sono obbligatori',
      });
    }

    if (requires_auth && (!username || !password)) {
      return res.status(400).json({
        success: false,
        error: 'Username e password sono obbligatori quando richiesta autenticazione',
      });
    }

    const config = await db.createConfig({
      host,
      port: parseInt(port),
      use_https: use_https || false,
      requires_auth: requires_auth || false,
      username: requires_auth ? username : null,
      password: requires_auth ? password : null,
      is_active: is_active || false,
    });

    // Se la nuova configurazione è attiva, reinizializza il client RPC
    if (is_active) {
      await db.setActiveConfig(config.id);
      await initRPCClient();
    }

    res.status(201).json({
      success: true,
      data: config,
      message: 'Configurazione creata con successo',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/config/:id
 * Aggiorna una configurazione esistente (solo admin)
 */
app.put('/api/config/:id', requireAdmin, async (req, res) => {
  try {
    const { host, port, use_https, requires_auth, username, password, is_active } = req.body;
    const configId = req.params.id;

    // Validazione
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host e porta sono obbligatori',
      });
    }

    const existingConfig = await db.getConfigById(configId);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        error: 'Configurazione non trovata',
      });
    }

    // Se la password è '********', mantieni quella esistente
    const finalPassword = password === '********' ? existingConfig.password : password;

    await db.updateConfig(configId, {
      host,
      port: parseInt(port),
      use_https: use_https || false,
      requires_auth: requires_auth || false,
      username: requires_auth ? username : null,
      password: requires_auth ? finalPassword : null,
      is_active: is_active || false,
    });

    // Se la configurazione aggiornata è attiva, reinizializza il client RPC
    if (is_active) {
      await db.setActiveConfig(configId);
      await initRPCClient();
    }

    res.json({
      success: true,
      message: 'Configurazione aggiornata con successo',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/config/:id/activate
 * Imposta una configurazione come attiva
 */
app.post('/api/config/:id/activate', async (req, res) => {
  try {
    const configId = req.params.id;
    const config = await db.getConfigById(configId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configurazione non trovata',
      });
    }

    await db.setActiveConfig(configId);
    await initRPCClient();

    res.json({
      success: true,
      message: 'Configurazione attivata con successo',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/config/:id
 * Elimina una configurazione (solo admin)
 */
app.delete('/api/config/:id', requireAdmin, async (req, res) => {
  try {
    const configId = req.params.id;
    const config = await db.getConfigById(configId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configurazione non trovata',
      });
    }

    if (config.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Non puoi eliminare la configurazione attiva',
      });
    }

    await db.deleteConfig(configId);

    res.json({
      success: true,
      message: 'Configurazione eliminata con successo',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/config/test
 * Testa una configurazione RPC senza salvarla (solo admin)
 */
app.post('/api/config/test', requireAdmin, async (req, res) => {
  try {
    const { host, port, use_https, requires_auth, username, password } = req.body;
    
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host e porta sono obbligatori',
      });
    }

    const testClient = new MoneroRPCClient({
      host,
      port: parseInt(port),
      user: requires_auth ? username : null,
      password: requires_auth ? password : null,
    });

    const isHealthy = await testClient.isHealthy();
    
    if (isHealthy) {
      const info = await testClient.getInfo();
      res.json({
        success: true,
        message: 'Connessione riuscita',
        data: {
          connected: true,
          network: info.nettype || 'unknown',
          height: info.height || 0,
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Impossibile connettersi al nodo RPC',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Errore di connessione: ${error.message}`,
    });
  }
});

// ==================== I18N ROUTES ====================

/**
 * GET /api/i18n/languages
 * Ottiene la lista delle lingue disponibili
 */
app.get('/api/i18n/languages', async (req, res) => {
  try {
    const i18nDir = path.join(__dirname, '../public/i18n');
    const files = fs.readdirSync(i18nDir);
    
    const languages = files
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const code = file.replace('.js', '');
        // Lettura dei metadati dal file
        const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');
        const metaMatch = content.match(/_meta:\s*{([^}]+)}/);
        
        if (metaMatch) {
          const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
          const flagMatch = content.match(/flag:\s*['"]([^'"]+)['"]/);
          
          return {
            code,
            name: nameMatch ? nameMatch[1] : code,
            flag: flagMatch ? flagMatch[1] : '🌐'
          };
        }
        
        return { code, name: code, flag: '🌐' };
      });
    
    res.json(languages);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SETTINGS ROUTES ====================

/**
 * GET /api/settings
 * Ottiene le impostazioni dell'applicazione
 */
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Aggiorna le impostazioni dell'applicazione
 */
app.put('/api/settings', async (req, res) => {
  try {
    const { auto_refresh_enabled, auto_refresh_interval } = req.body;
    
    if (typeof auto_refresh_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'auto_refresh_enabled deve essere un booleano'
      });
    }
    
    if (auto_refresh_interval !== undefined) {
      const interval = parseInt(auto_refresh_interval);
      if (isNaN(interval) || interval < 5 || interval > 300) {
        return res.status(400).json({
          success: false,
          error: 'auto_refresh_interval deve essere tra 5 e 300 secondi'
        });
      }
    }
    
    await db.updateSettings({
      auto_refresh_enabled: auto_refresh_enabled ? 1 : 0,
      auto_refresh_interval: auto_refresh_interval || 30
    });
    
    const updatedSettings = await db.getSettings();
    res.json({
      success: true,
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== MONERO RPC ROUTES ====================

/**
 * GET /api/health
 * Verifica lo stato del server e della connessione RPC
 */
app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await rpcClient.isHealthy();
    res.json({
      status: 'ok',
      rpcConnected: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      rpcConnected: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/info
 * Ottiene informazioni generali sul daemon Monero
 */
app.get('/api/info', async (req, res) => {
  console.log('📞 Richiesta ricevuta su /api/info');
  try {
    if (!rpcClient) {
      throw new Error('RPC client non inizializzato');
    }
    console.log('🔗 Chiamata getInfo() sul client RPC...');
    const info = await rpcClient.getInfo();
    console.log('✅ Informazioni ricevute dal nodo, invio risposta');
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('❌ Errore in /api/info:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/height
 * Ottiene l'altezza corrente della blockchain
 */
app.get('/api/height', async (req, res) => {
  try {
    const height = await rpcClient.getHeight();
    res.json({
      success: true,
      data: height,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/block-count
 * Ottiene il numero totale di blocchi
 */
app.get('/api/block-count', async (req, res) => {
  try {
    const count = await rpcClient.getBlockCount();
    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/block/:identifier
 * Ottiene informazioni su un blocco (tramite hash o altezza)
 */
app.get('/api/block/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let block;

    // Verifica se è un numero (altezza) o un hash
    if (/^\d+$/.test(identifier)) {
      block = await rpcClient.getBlockByHeight(parseInt(identifier));
    } else {
      block = await rpcClient.getBlock(identifier);
    }

    res.json({
      success: true,
      data: block,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/transaction-pool
 * Ottiene le transazioni nel pool (mempool)
 */
app.get('/api/transaction-pool', async (req, res) => {
  try {
    const pool = await rpcClient.getTransactionPool();
    res.json({
      success: true,
      data: pool,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions
 * Ottiene informazioni su transazioni specifiche
 * Body: { txHashes: string[], decodeAsJson: boolean }
 */
app.post('/api/transactions', async (req, res) => {
  try {
    const { txHashes, decodeAsJson = true } = req.body;

    if (!txHashes || !Array.isArray(txHashes)) {
      return res.status(400).json({
        success: false,
        error: 'txHashes array is required',
      });
    }

    const transactions = await rpcClient.getTransactions(txHashes, decodeAsJson);
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/connections
 * Ottiene le connessioni peer attive
 */
app.get('/api/connections', async (req, res) => {
  try {
    const connections = await rpcClient.getConnections();
    res.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/difficulty
 * Ottiene informazioni sulla difficoltà della rete
 */
app.get('/api/difficulty', async (req, res) => {
  try {
    const difficulty = await rpcClient.getDifficulty();
    res.json({
      success: true,
      data: difficulty,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/version
 * Ottiene la versione del daemon Monero
 */
app.get('/api/version', async (req, res) => {
  try {
    const version = await rpcClient.getVersion();
    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/fee-estimate
 * Ottiene la stima dei fee di transazione
 */
app.get('/api/fee-estimate', async (req, res) => {
  try {
    const feeEstimate = await rpcClient.getFeeEstimate();
    res.json({
      success: true,
      data: feeEstimate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync-info
 * Ottiene lo stato di sincronizzazione del nodo
 */
app.get('/api/sync-info', async (req, res) => {
  try {
    const syncInfo = await rpcClient.syncInfo();
    res.json({
      success: true,
      data: syncInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rpc
 * Endpoint generico per chiamate RPC personalizzate
 * Body: { method: string, params: object }
 */
app.post('/api/rpc', async (req, res) => {
  try {
    const { method, params = {} } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'method is required',
      });
    }

    const result = await rpcClient.call(method, params);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/historical-data/recent
 * Ottiene gli ultimi dati storici per popolare i grafici
 */
app.get('/api/historical-data/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60; // Ultimi 60 punti
    
    const data = await db.getHistoricalData(limit);
    
    // Inverti l'ordine per avere dal più vecchio al più recente
    const reversedData = data.reverse();
    
    res.json({
      success: true,
      data: reversedData
    });
  } catch (error) {
    console.error('❌ Errore recupero dati storici recenti:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/historical-data
 * Ottiene i dati storici per periodo specificato
 */
app.get('/api/historical-data', async (req, res) => {
  try {
    const { period = '1h', metric = 'all' } = req.query;
    
    let timeRange;
    const now = new Date();
    
    switch (period) {
      case '1h':
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timeRange = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
    }
    
    const data = await db.getHistoricalDataByTimeRange(
      timeRange.toISOString(),
      now.toISOString()
    );
    
    res.json({
      success: true,
      data: data,
      period: period,
      metric: metric
    });
  } catch (error) {
    console.error('❌ Errore recupero dati storici:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AGGREGATED STATISTICS ENDPOINTS ====================

// Ottieni statistiche aggregate per un tipo specifico
app.get('/api/aggregated-stats/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 60;
    
    // Valida il tipo di aggregazione
    const validTypes = ['daily', '3days', 'weekly', 'monthly'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid aggregation type. Valid types: daily, 3days, weekly, monthly'
      });
    }
    
    const data = await db.getAggregatedStats(type, limit);
    
    res.json({
      success: true,
      type: type,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('❌ Errore recupero statistiche aggregate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ottieni progresso scansione blockchain
app.get('/api/scan-progress', async (req, res) => {
  try {
    const progress = await db.getScanProgress();
    
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    console.error('❌ Errore recupero progresso scansione:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forza riscansione blockchain (solo admin)
app.post('/api/rescan-blockchain', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Reset progresso scansione
    await db.updateScanProgress(0, 0, 0);
    
    // Avvia scansione in background
    setTimeout(() => scanBlockchainForAggregation(), 1000);
    
    res.json({
      success: true,
      message: 'Blockchain rescan started'
    });
  } catch (error) {
    console.error('❌ Errore avvio riscansione:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== END AGGREGATED STATISTICS ====================

// Serve il frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Avvia il server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  
  try {
    const activeConfig = await db.getActiveConfig();
    if (activeConfig) {
      const protocol = activeConfig.use_https ? 'https' : 'http';
      console.log(`📡 RPC endpoint: ${protocol}://${activeConfig.host}:${activeConfig.port}`);
    } else {
      console.log(`📡 RPC endpoint: Non configurato`);
    }
  } catch (err) {
    console.log(`📡 RPC endpoint: Errore caricamento configurazione`);
  }
  
  console.log(`\nConfiguration endpoints:`);
  console.log(`  GET    /api/config`);
  console.log(`  GET    /api/config/active`);
  console.log(`  GET    /api/config/:id`);
  console.log(`  POST   /api/config`);
  console.log(`  PUT    /api/config/:id`);
  console.log(`  POST   /api/config/:id/activate`);
  console.log(`  DELETE /api/config/:id`);
  console.log(`  POST   /api/config/test`);
  console.log(`\nMonero RPC endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/info`);
  console.log(`  GET  /api/height`);
  console.log(`  GET  /api/block-count`);
  console.log(`  GET  /api/block/:identifier`);
  console.log(`  GET  /api/transaction-pool`);
  console.log(`  POST /api/transactions`);
  console.log(`  GET  /api/connections`);
  console.log(`  GET  /api/difficulty`);
  console.log(`  GET  /api/version`);
  console.log(`  GET  /api/fee-estimate`);
  console.log(`  GET  /api/sync-info`);
  console.log(`  POST /api/rpc`);
});

// ==================== WEBSOCKET SETUP ====================

io.on('connection', (socket) => {
  console.log(`🔌 Client connesso: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnesso: ${socket.id}`);
  });
  
  socket.on('subscribe', (channel) => {
    socket.join(channel);
    console.log(`📡 Client ${socket.id} iscritto al canale: ${channel}`);
  });
  
  socket.on('unsubscribe', (channel) => {
    socket.leave(channel);
    console.log(`📡 Client ${socket.id} disiscritto dal canale: ${channel}`);
  });
});

// Variabili per monitorare nuovi blocchi
let lastKnownHeight = 0;
let lastTxPoolSize = 0;

// Funzione per inviare aggiornamenti real-time
async function broadcastNetworkStats() {
  try {
    if (!rpcClient) return;
    
    const [info, connections] = await Promise.all([
      rpcClient.getInfo(),
      rpcClient.getConnections().catch(() => ({ connections: [] }))
    ]);
    
    // Calcola la percentuale di sync
    const syncPercentage = info.target_height && info.target_height > 0 
      ? ((info.height / info.target_height) * 100).toFixed(2) 
      : 100;

    // Rileva nuovo blocco
    const isNewBlock = info.height > lastKnownHeight && lastKnownHeight > 0;
    
    // Se è un nuovo blocco, usa il tx_pool_size precedente (transazioni che erano nel blocco minato)
    const txPoolForStats = isNewBlock ? lastTxPoolSize : (info.tx_pool_size || 0);
    
    const stats = {
      timestamp: Date.now(),
      height: info.height,
      difficulty: info.difficulty,
      hashrate: info.difficulty / 120, // Hashrate stimato (difficulty / block time)
      txPoolSize: txPoolForStats,
      incomingConnections: connections.connections?.filter(c => c.incoming).length || 0,
      outgoingConnections: connections.connections?.filter(c => !c.incoming).length || 0,
      networkHashrate: info.difficulty / 120,
      blockReward: info.block_size_limit,
      syncPercentage: syncPercentage,
      isNewBlock: isNewBlock
    };
    
    // Salva i dati storici SOLO quando viene rilevato un nuovo blocco validato
    // Questo assicura che i grafici mostrino solo dati definitivi di blocchi già minati
    if (isNewBlock) {
      console.log(`🆕 Nuovo blocco rilevato! Altezza: ${info.height} | TX nel blocco: ${lastTxPoolSize}`);
      
      // Salva immediatamente i dati storici per il nuovo blocco validato
      await db.saveHistoricalData({
        height: stats.height,
        difficulty: stats.difficulty,
        hashrate: stats.hashrate,
        tx_pool_size: txPoolForStats,
        incoming_connections: stats.incomingConnections,
        outgoing_connections: stats.outgoingConnections
      }).catch(err => console.error('❌ Errore salvataggio dati storici:', err.message));
    }
    // NON salvare dati intermedi di blocchi non ancora validati
    // per mantenere solo valori definitivi nel database
    
    // Aggiorna i valori per il prossimo check
    lastKnownHeight = info.height;
    lastTxPoolSize = info.tx_pool_size || 0;
    
    io.to('network-stats').emit('network-stats', stats);
  } catch (error) {
    console.error('❌ Errore broadcast stats:', error.message);
  }
}

// Avvia broadcast ogni 5 secondi
setInterval(broadcastNetworkStats, 5000);

// Pulizia dati storici ogni giorno (mantieni ultimi 30 giorni)
setInterval(async () => {
  try {
    const result = await db.cleanOldHistoricalData(30);
    if (result.deleted > 0) {
      console.log(`🗑️  Eliminati ${result.deleted} record storici obsoleti`);
    }
  } catch (error) {
    console.error('❌ Errore pulizia dati storici:', error.message);
  }
}, 24 * 60 * 60 * 1000); // Ogni 24 ore

// Pulizia notifiche vecchie ogni giorno (mantieni ultime 7 giorni se lette)
setInterval(async () => {
  try {
    const result = await db.cleanOldNotifications(7);
    if (result.deleted > 0) {
      console.log(`🗑️  Eliminate ${result.deleted} notifiche obsolete`);
    }
  } catch (error) {
    console.error('❌ Errore pulizia notifiche:', error.message);
  }
}, 24 * 60 * 60 * 1000); // Ogni 24 ore

// ==================== BLOCKCHAIN SCANNER & AGGREGATION ====================

// Funzione per aggregare blocchi in medie ponderate
async function aggregateBlockData(blocks, aggregationType) {
  if (!blocks || blocks.length === 0) return null;

  let totalHashrate = 0;
  let totalDifficulty = 0;
  let totalTxPool = 0;
  let count = 0;

  for (const block of blocks) {
    if (block.avg_hashrate) totalHashrate += block.avg_hashrate;
    if (block.avg_difficulty) totalDifficulty += block.avg_difficulty;
    if (block.avg_tx_pool_size) totalTxPool += block.avg_tx_pool_size;
    count++;
  }

  return {
    avg_hashrate: count > 0 ? totalHashrate / count : 0,
    avg_difficulty: count > 0 ? totalDifficulty / count : 0,
    avg_tx_pool_size: count > 0 ? totalTxPool / count : 0,
    block_count: count
  };
}

// Scanner della blockchain per aggregazione storica
async function scanBlockchainForAggregation() {
  try {
    const progress = await db.getScanProgress();
    
    if (progress.is_initial_scan_complete) {
      console.log('✅ Scansione iniziale già completata');
      return;
    }

    console.log('🔍 Avvio scansione blockchain per aggregazione statistiche...');
    
    // Ottieni l'altezza corrente della blockchain
    const info = await rpcClient.getInfo();
    if (!info || !info.height) {
      console.error('❌ Impossibile ottenere altezza blockchain');
      return;
    }

    const currentHeight = info.height;
    let startHeight = progress.last_scanned_height > 0 ? progress.last_scanned_height + 1 : 1;
    
    console.log(`📊 Scansione da blocco ${startHeight} a ${currentHeight}`);

    // Scansiona a batch di 10 blocchi (ridotto per evitare sovraccarico RPC)
    const batchSize = 10;
    
    while (startHeight <= currentHeight) {
      const endHeight = Math.min(startHeight + batchSize - 1, currentHeight);
      
      try {
        // Ottieni informazioni per ogni blocco nel batch SEQUENZIALMENTE (non in parallelo)
        const blocks = [];
        for (let h = startHeight; h <= endHeight; h++) {
          try {
            const block = await rpcClient.getBlockByHeight(h);
            if (block && block.block_header) {
              blocks.push({
                height: h,
                difficulty: block.block_header.difficulty || 0,
                timestamp: block.block_header.timestamp || 0
              });
            }
          } catch (err) {
            console.error(`⚠️  Errore lettura blocco ${h}:`, err.message);
          }
          // Pausa di 50ms tra ogni richiesta per non sovraccaricare
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Calcola hashrate per ogni blocco (difficoltà / 120 secondi target)
        const blocksWithStats = blocks.map(b => ({
          height: b.height,
          difficulty: b.difficulty,
          hashrate: b.difficulty / 120,
          timestamp: b.timestamp
        }));

        // Aggrega i dati in base al timestamp
        if (blocksWithStats.length > 0) {
          await aggregateAndSaveStats(blocksWithStats);
        }

        // Aggiorna il progresso
        await db.updateScanProgress(endHeight, progress.total_blocks_scanned + blocks.length, 0);
        
        console.log(`✅ Scansionati blocchi ${startHeight}-${endHeight} (${blocks.length} blocchi)`);
        
        startHeight = endHeight + 1;

        // Pausa di 500ms tra i batch
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Errore scansione batch ${startHeight}-${endHeight}:`, error.message);
        startHeight = endHeight + 1;
      }
    }

    // Marca la scansione iniziale come completata
    await db.updateScanProgress(currentHeight, currentHeight, 1);
    console.log('✅ Scansione iniziale completata!');

  } catch (error) {
    console.error('❌ Errore scanner blockchain:', error.message);
  }
}

// Funzione per aggregare e salvare statistiche per diversi periodi
async function aggregateAndSaveStats(blocks) {
  if (!blocks || blocks.length === 0) return;

  // Ordina per timestamp
  blocks.sort((a, b) => a.timestamp - b.timestamp);

  // Aggrega per giorno (86400 secondi)
  await aggregateByPeriod(blocks, 'daily', 86400);
  
  // Aggrega per 3 giorni (259200 secondi)
  await aggregateByPeriod(blocks, '3days', 259200);
  
  // Aggrega per settimana (604800 secondi)
  await aggregateByPeriod(blocks, 'weekly', 604800);
  
  // Aggrega per mese (2592000 secondi ~ 30 giorni)
  await aggregateByPeriod(blocks, 'monthly', 2592000);
}

// Aggrega blocchi per un periodo specifico
async function aggregateByPeriod(blocks, aggregationType, periodSeconds) {
  const periods = new Map();

  for (const block of blocks) {
    // Calcola l'inizio del periodo per questo blocco
    const periodStart = Math.floor(block.timestamp / periodSeconds) * periodSeconds;
    
    if (!periods.has(periodStart)) {
      periods.set(periodStart, []);
    }
    periods.get(periodStart).push(block);
  }

  // Salva le medie per ogni periodo
  for (const [periodStart, periodBlocks] of periods.entries()) {
    const periodEnd = periodStart + periodSeconds;
    
    let totalHashrate = 0;
    let totalDifficulty = 0;
    let count = periodBlocks.length;

    for (const block of periodBlocks) {
      totalHashrate += block.hashrate;
      totalDifficulty += block.difficulty;
    }

    const avgHashrate = count > 0 ? totalHashrate / count : 0;
    const avgDifficulty = count > 0 ? totalDifficulty / count : 0;

    // Converti timestamp in altezza blocco (approssimazione)
    const periodStartHeight = periodBlocks[0].height;
    const periodEndHeight = periodBlocks[periodBlocks.length - 1].height;

    await db.saveAggregatedStat(
      aggregationType,
      periodStartHeight,
      periodEndHeight,
      avgHashrate,
      avgDifficulty,
      0, // tx_pool non disponibile nello storico
      count
    );
  }
}

// Aggiorna aggregazioni con nuovi blocchi (ogni 10 minuti)
async function updateAggregations() {
  try {
    const progress = await db.getScanProgress();
    
    if (!progress.is_initial_scan_complete) {
      console.log('⏳ Scansione iniziale non ancora completata');
      return;
    }

    const info = await rpcClient.getInfo();
    if (!info || !info.height) return;

    const currentHeight = info.height;
    const lastScanned = progress.last_scanned_height;

    if (currentHeight <= lastScanned) {
      console.log('✅ Aggregazioni già aggiornate');
      return;
    }

    console.log(`🔄 Aggiornamento aggregazioni da blocco ${lastScanned + 1} a ${currentHeight}`);

    // Ottieni i nuovi blocchi
    const blockPromises = [];
    for (let h = lastScanned + 1; h <= currentHeight; h++) {
      blockPromises.push(
        rpcClient.getBlockByHeight(h)
          .then(block => {
            if (block && block.block_header) {
              return {
                height: h,
                difficulty: block.block_header.difficulty || 0,
                hashrate: (block.block_header.difficulty || 0) / 120,
                timestamp: block.block_header.timestamp || 0
              };
            }
            return null;
          })
          .catch(() => null)
      );
    }

    const newBlocks = (await Promise.all(blockPromises)).filter(b => b !== null);

    if (newBlocks.length > 0) {
      await aggregateAndSaveStats(newBlocks);
      await db.updateScanProgress(currentHeight, progress.total_blocks_scanned + newBlocks.length, 1);
      console.log(`✅ Aggregate ${newBlocks.length} nuovi blocchi`);
    }

    // Pulisci dati aggregati vecchi secondo le regole di retention
    await cleanupAggregatedData();

  } catch (error) {
    console.error('❌ Errore aggiornamento aggregazioni:', error.message);
  }
}

// Pulizia dati aggregati in base alle regole di retention
async function cleanupAggregatedData() {
  try {
    // Mantieni ultimi 60 record giornalieri (60 giorni)
    await db.cleanOldAggregatedStats('daily', 60);
    
    // Mantieni ultimi 60 record per 3 giorni (180 giorni)
    await db.cleanOldAggregatedStats('3days', 60);
    
    // Mantieni ultimi 60 record settimanali (420 giorni ~ 14 mesi)
    await db.cleanOldAggregatedStats('weekly', 60);
    
    // NON eliminare dati mensili (retention infinita per 5 anni e max)
    // await db.cleanOldAggregatedStats('monthly', 0); // 0 = non eliminare
    
  } catch (error) {
    console.error('❌ Errore pulizia aggregazioni:', error.message);
  }
}

// Avvia scanner al boot (dopo 5 secondi)
setTimeout(async () => {
  const progress = await db.getScanProgress();
  if (!progress.is_initial_scan_complete) {
    console.log('🚀 Avvio scansione iniziale blockchain...');
    scanBlockchainForAggregation();
  } else {
    console.log('✅ Sistema di aggregazione già inizializzato');
  }
}, 5000);

// Aggiorna aggregazioni ogni 10 minuti
setInterval(updateAggregations, 10 * 60 * 1000);

// ==================== END BLOCKCHAIN SCANNER ====================

module.exports = { app, server, io };
