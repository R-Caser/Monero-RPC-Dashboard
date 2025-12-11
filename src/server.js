require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const MoneroRPCClient = require('./moneroRPC');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// ==================== CONFIGURATION ROUTES ====================

/**
 * GET /api/config
 * Ottiene tutte le configurazioni RPC
 */
app.get('/api/config', async (req, res) => {
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
 * Ottiene una configurazione specifica
 */
app.get('/api/config/:id', async (req, res) => {
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
 * Crea una nuova configurazione RPC
 */
app.post('/api/config', async (req, res) => {
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
 * Aggiorna una configurazione esistente
 */
app.put('/api/config/:id', async (req, res) => {
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
 * Elimina una configurazione
 */
app.delete('/api/config/:id', async (req, res) => {
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
 * Testa una configurazione RPC senza salvarla
 */
app.post('/api/config/test', async (req, res) => {
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
  try {
    const info = await rpcClient.getInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
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
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
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

module.exports = app;
