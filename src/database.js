const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = path.join(__dirname, '../data/config.db')) {
    this.db = null;
    this.dbPath = dbPath;
    this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Errore apertura database:', err.message);
          reject(err);
        } else {
          console.log('✅ Database SQLite connesso:', this.dbPath);
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createConfigTable = `
        CREATE TABLE IF NOT EXISTS rpc_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          host TEXT NOT NULL,
          port INTEGER NOT NULL,
          use_https INTEGER DEFAULT 0,
          requires_auth INTEGER DEFAULT 0,
          username TEXT,
          password TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createSettingsTable = `
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          auto_refresh_enabled INTEGER DEFAULT 0,
          auto_refresh_interval INTEGER DEFAULT 30,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createConfigTable, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella rpc_config:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella rpc_config creata/verificata');
          
          // Crea tabella settings
          this.db.run(createSettingsTable, (err) => {
            if (err) {
              console.error('❌ Errore creazione tabella app_settings:', err.message);
              reject(err);
            } else {
              console.log('✅ Tabella app_settings creata/verificata');
              // Inserisci configurazione di default se non esiste
              this.initDefaultConfig()
                .then(() => this.initDefaultSettings())
                .then(resolve)
                .catch(reject);
            }
          });
        }
      });
    });
  }

  initDefaultConfig() {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) as count FROM rpc_config';
      
      this.db.get(checkQuery, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Usa variabili d'ambiente come default se disponibili
          const defaultConfig = {
            host: process.env.MONERO_RPC_HOST || '127.0.0.1',
            port: parseInt(process.env.MONERO_RPC_PORT) || 18081,
            use_https: 0,
            requires_auth: process.env.MONERO_RPC_USER ? 1 : 0,
            username: process.env.MONERO_RPC_USER || null,
            password: process.env.MONERO_RPC_PASSWORD || null,
            is_active: 1
          };

          const insertQuery = `
            INSERT INTO rpc_config (host, port, use_https, requires_auth, username, password, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          this.db.run(
            insertQuery,
            [
              defaultConfig.host,
              defaultConfig.port,
              defaultConfig.use_https,
              defaultConfig.requires_auth,
              defaultConfig.username,
              defaultConfig.password,
              defaultConfig.is_active
            ],
            (err) => {
              if (err) {
                console.error('❌ Errore inserimento config default:', err.message);
                reject(err);
              } else {
                console.log('✅ Configurazione di default creata');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  initDefaultSettings() {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) as count FROM app_settings';
      
      this.db.get(checkQuery, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          const insertQuery = `
            INSERT INTO app_settings (auto_refresh_enabled, auto_refresh_interval)
            VALUES (0, 30)
          `;

          this.db.run(insertQuery, [], (err) => {
            if (err) {
              console.error('❌ Errore inserimento settings default:', err.message);
              reject(err);
            } else {
              console.log('✅ Impostazioni di default create');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Ottieni impostazioni applicazione
  getSettings() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM app_settings LIMIT 1';
      
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || { auto_refresh_enabled: 0, auto_refresh_interval: 30 });
        }
      });
    });
  }

  // Aggiorna impostazioni applicazione
  updateSettings(settings) {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) as count FROM app_settings';
      
      this.db.get(checkQuery, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Insert
          const insertQuery = `
            INSERT INTO app_settings (auto_refresh_enabled, auto_refresh_interval)
            VALUES (?, ?)
          `;
          
          this.db.run(
            insertQuery,
            [
              settings.auto_refresh_enabled ? 1 : 0,
              settings.auto_refresh_interval || 30
            ],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({ id: this.lastID, ...settings });
              }
            }
          );
        } else {
          // Update
          const updateQuery = `
            UPDATE app_settings 
            SET auto_refresh_enabled = ?, auto_refresh_interval = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM app_settings LIMIT 1)
          `;
          
          this.db.run(
            updateQuery,
            [
              settings.auto_refresh_enabled ? 1 : 0,
              settings.auto_refresh_interval || 30
            ],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({ changes: this.changes });
              }
            }
          );
        }
      });
    });
  }

  // Ottieni la configurazione attiva
  getActiveConfig() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM rpc_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1';
      
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Ottieni tutte le configurazioni
  getAllConfigs() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM rpc_config ORDER BY created_at DESC';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Ottieni una configurazione per ID
  getConfigById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM rpc_config WHERE id = ?';
      
      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Crea una nuova configurazione
  createConfig(config) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO rpc_config (host, port, use_https, requires_auth, username, password, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [
          config.host,
          config.port,
          config.use_https ? 1 : 0,
          config.requires_auth ? 1 : 0,
          config.username || null,
          config.password || null,
          config.is_active ? 1 : 0
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...config });
          }
        }
      );
    });
  }

  // Aggiorna una configurazione
  updateConfig(id, config) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE rpc_config 
        SET host = ?, port = ?, use_https = ?, requires_auth = ?, 
            username = ?, password = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      this.db.run(
        query,
        [
          config.host,
          config.port,
          config.use_https ? 1 : 0,
          config.requires_auth ? 1 : 0,
          config.username || null,
          config.password || null,
          config.is_active ? 1 : 0,
          id
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  // Imposta una configurazione come attiva (e disattiva le altre)
  setActiveConfig(id) {
    return new Promise((resolve, reject) => {
      // Prima disattiva tutte le configurazioni
      const deactivateQuery = 'UPDATE rpc_config SET is_active = 0';
      
      this.db.run(deactivateQuery, [], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Poi attiva quella richiesta
        const activateQuery = 'UPDATE rpc_config SET is_active = 1 WHERE id = ?';
        
        this.db.run(activateQuery, [id], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      });
    });
  }

  // Elimina una configurazione
  deleteConfig(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM rpc_config WHERE id = ?';
      
      this.db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Chiudi la connessione al database
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Connessione al database chiusa');
          resolve();
        }
      });
    });
  }
}

module.exports = Database;
