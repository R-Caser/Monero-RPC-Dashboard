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

      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `;

      const createHistoricalDataTable = `
        CREATE TABLE IF NOT EXISTS historical_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          height INTEGER,
          difficulty INTEGER,
          hashrate REAL,
          tx_pool_size INTEGER,
          incoming_connections INTEGER,
          outgoing_connections INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          severity TEXT DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
              
              // Crea tabella utenti
              this.db.run(createUsersTable, (err) => {
                if (err) {
                  console.error('❌ Errore creazione tabella users:', err.message);
                  reject(err);
                } else {
                  console.log('✅ Tabella users creata/verificata');
                  
                  // Crea tabella dati storici
                  this.db.run(createHistoricalDataTable, (err) => {
                    if (err) {
                      console.error('❌ Errore creazione tabella historical_data:', err.message);
                      reject(err);
                    } else {
                      console.log('✅ Tabella historical_data creata/verificata');
                      
                      // Crea tabella notifiche
                      this.db.run(createNotificationsTable, (err) => {
                        if (err) {
                          console.error('❌ Errore creazione tabella notifications:', err.message);
                          reject(err);
                        } else {
                          console.log('✅ Tabella notifications creata/verificata');
                          // Inserisci configurazione di default se non esiste
                          this.initDefaultConfig()
                            .then(() => this.initDefaultSettings())
                            .then(() => this.initDefaultUser())
                            .then(resolve)
                            .catch(reject);
                        }
                      });
                    }
                  });
                }
              });
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

  // ==================== USER MANAGEMENT ====================

  initDefaultUser() {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) as count FROM users';
      
      this.db.get(checkQuery, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Crea utente admin di default
          const bcrypt = require('bcryptjs');
          const hashedPassword = bcrypt.hashSync('admin', 10);
          
          const insertQuery = `
            INSERT INTO users (username, password, role)
            VALUES (?, ?, ?)
          `;
          
          this.db.run(insertQuery, ['admin', hashedPassword, 'admin'], (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('👤 Utente admin creato (username: admin, password: admin)');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      this.db.get(query, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  updateUserLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(query, [userId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  createUser(username, password, role = 'viewer') {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      const query = `
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `;
      
      this.db.run(query, [username, hashedPassword, role], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, username, role });
      });
    });
  }

  getAllUsers() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id, username, role, created_at, last_login FROM users';
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ==================== HISTORICAL DATA ====================

  saveHistoricalData(data) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO historical_data 
        (height, difficulty, hashrate, tx_pool_size, incoming_connections, outgoing_connections)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        data.height,
        data.difficulty,
        data.hashrate,
        data.tx_pool_size,
        data.incoming_connections,
        data.outgoing_connections
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  getHistoricalData(limit = 100) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM historical_data 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      this.db.all(query, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getHistoricalDataByTimeRange(startTime, endTime) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM historical_data 
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
      `;
      this.db.all(query, [startTime, endTime], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  cleanOldHistoricalData(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM historical_data 
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `;
      this.db.run(query, [daysToKeep], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      });
    });
  }

  clearHistoricalData() {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM historical_data`;
      this.db.run(query, [], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // ==================== NOTIFICATIONS ====================

  createNotification(type, title, message, severity = 'info') {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO notifications (type, severity, title, message)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(query, [type, severity, title, message], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  getNotifications(unreadOnly = false, limit = 50) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT * FROM notifications 
        ${unreadOnly ? 'WHERE is_read = 0' : ''}
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      this.db.all(query, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  markNotificationAsRead(id) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
      this.db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  markAllNotificationsAsRead() {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE notifications SET is_read = 1 WHERE is_read = 0';
      this.db.run(query, [], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  deleteNotification(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM notifications WHERE id = ?';
      this.db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  cleanOldNotifications(daysToKeep = 7) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM notifications 
        WHERE is_read = 1 AND created_at < datetime('now', '-' || ? || ' days')
      `;
      this.db.run(query, [daysToKeep], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      });
    });
  }
}

module.exports = Database;
