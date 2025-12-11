const axios = require('axios');

/**
 * Client RPC per Monero (monerod)
 * Gestisce le chiamate JSON-RPC 2.0 al daemon Monero
 */
class MoneroRPCClient {
  constructor(config = {}) {
    this.host = config.host || process.env.MONERO_RPC_HOST || '127.0.0.1';
    this.port = config.port || process.env.MONERO_RPC_PORT || 18081;
    this.user = config.user || process.env.MONERO_RPC_USER;
    this.password = config.password || process.env.MONERO_RPC_PASSWORD;
    
    this.baseURL = `http://${this.host}:${this.port}`;
    
    // Configurazione axios per JSON-RPC
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Aggiungi autenticazione se presente
    if (this.user && this.password) {
      this.client.defaults.auth = {
        username: this.user,
        password: this.password,
      };
    }
  }

  /**
   * Esegue una chiamata JSON-RPC generica
   * @param {string} method - Metodo RPC da chiamare
   * @param {object} params - Parametri del metodo
   * @returns {Promise<any>} Risultato della chiamata RPC
   */
  async call(method, params = {}) {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: '0',
        method: method,
        params: params,
      };

      const response = await this.client.post('/json_rpc', payload);
      
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      throw error;
    }
  }

  // ==================== METODI COMUNI ====================

  /**
   * Ottiene il conteggio dei blocchi nella blockchain
   * @returns {Promise<number>} Numero di blocchi
   */
  async getBlockCount() {
    const result = await this.call('get_block_count');
    return result.count;
  }

  /**
   * Ottiene informazioni su un blocco tramite hash
   * @param {string} hash - Hash del blocco
   * @returns {Promise<object>} Informazioni sul blocco
   */
  async getBlock(hash) {
    return await this.call('get_block', { hash });
  }

  /**
   * Ottiene informazioni sul blocco tramite altezza
   * @param {number} height - Altezza del blocco
   * @returns {Promise<object>} Informazioni sul blocco
   */
  async getBlockByHeight(height) {
    return await this.call('get_block', { height });
  }

  /**
   * Ottiene l'hash del blocco all'altezza specificata
   * @param {number} height - Altezza del blocco
   * @returns {Promise<string>} Hash del blocco
   */
  async getBlockHash(height) {
    const result = await this.call('on_get_block_hash', [height]);
    return result;
  }

  /**
   * Ottiene il template del blocco per il mining
   * @param {string} walletAddress - Indirizzo del wallet
   * @param {number} reserveSize - Dimensione riservata
   * @returns {Promise<object>} Template del blocco
   */
  async getBlockTemplate(walletAddress, reserveSize = 60) {
    return await this.call('get_block_template', {
      wallet_address: walletAddress,
      reserve_size: reserveSize,
    });
  }

  /**
   * Ottiene informazioni generali sul daemon
   * @returns {Promise<object>} Informazioni sul daemon
   */
  async getInfo() {
    try {
      const response = await this.client.get('/get_info');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get info: ${error.message}`);
    }
  }

  /**
   * Ottiene l'altezza della blockchain
   * @returns {Promise<object>} Informazioni sull'altezza
   */
  async getHeight() {
    try {
      const response = await this.client.get('/get_height');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get height: ${error.message}`);
    }
  }

  /**
   * Ottiene le transazioni dal pool
   * @returns {Promise<object>} Transazioni in sospeso
   */
  async getTransactionPool() {
    try {
      const response = await this.client.get('/get_transaction_pool');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get transaction pool: ${error.message}`);
    }
  }

  /**
   * Ottiene informazioni su una o più transazioni
   * @param {string[]} txHashes - Array di hash delle transazioni
   * @param {boolean} decodeAsJson - Se decodificare come JSON
   * @returns {Promise<object>} Informazioni sulle transazioni
   */
  async getTransactions(txHashes, decodeAsJson = true) {
    try {
      const params = {
        txs_hashes: txHashes,
        decode_as_json: decodeAsJson,
      };
      const response = await this.client.post('/get_transactions', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Ottiene statistiche sulla blockchain
   * @returns {Promise<object>} Statistiche
   */
  async getBlockchainStats() {
    return await this.call('get_block_stats');
  }

  /**
   * Ottiene le connessioni peer
   * @returns {Promise<object>} Lista delle connessioni
   */
  async getConnections() {
    return await this.call('get_connections');
  }

  /**
   * Ottiene il numero di connessioni
   * @returns {Promise<number>} Numero di connessioni
   */
  async getConnectionCount() {
    const result = await this.call('get_connection_count');
    return result.count;
  }

  /**
   * Ottiene informazioni sulla difficoltà
   * @returns {Promise<object>} Informazioni sulla difficoltà
   */
  async getDifficulty() {
    return await this.call('get_difficulty');
  }

  /**
   * Ottiene la versione del daemon
   * @returns {Promise<object>} Informazioni sulla versione
   */
  async getVersion() {
    return await this.call('get_version');
  }

  /**
   * Invia una transazione raw alla rete
   * @param {string} txAsHex - Transazione in formato esadecimale
   * @returns {Promise<object>} Risultato dell'invio
   */
  async sendRawTransaction(txAsHex) {
    try {
      const params = { tx_as_hex: txAsHex, do_not_relay: false };
      const response = await this.client.post('/send_raw_transaction', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send raw transaction: ${error.message}`);
    }
  }

  /**
   * Ottiene l'output histogram
   * @param {number[]} amounts - Array di importi
   * @returns {Promise<object>} Histogram degli output
   */
  async getOutputHistogram(amounts = []) {
    return await this.call('get_output_histogram', { amounts });
  }

  /**
   * Ottiene informazioni sul fee
   * @returns {Promise<object>} Stima del fee
   */
  async getFeeEstimate() {
    return await this.call('get_fee_estimate');
  }

  /**
   * Verifica lo stato di sincronizzazione
   * @returns {Promise<object>} Stato di sync
   */
  async syncInfo() {
    return await this.call('sync_info');
  }

  /**
   * Verifica la salute del nodo
   * @returns {Promise<boolean>} True se il nodo è raggiungibile
   */
  async isHealthy() {
    try {
      await this.getHeight();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = MoneroRPCClient;
