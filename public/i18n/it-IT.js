// Italian Translation
registerTranslation('it-IT', {
  _meta: {
    code: 'it-IT',
    name: 'Italiano',
    flag: '🇮🇹'
  },
  
  // Common
  'common.unlimited': 'Illimitato',
  
  // Header
  'app.title': 'Monero RPC Dashboard',
  'header.status.connecting': 'Connessione...',
  'header.status.connected': 'Connesso',
  'header.status.disconnected': 'Disconnesso',
  'header.status.error': 'Errore',
  'header.config': 'Configurazione',
  
  // Configuration Panel
  'config.title': 'Configurazione Nodo RPC',
  'config.host': 'Host / IP:',
  'config.port': 'Porta:',
  'config.https': 'Usa HTTPS',
  'config.auth': 'Richiede Autenticazione',
  'config.username': 'Username:',
  'config.password': 'Password:',
  'config.test': 'Testa Connessione',
  'config.save': 'Salva e Attiva',
  'config.saved': 'Configurazioni Salvate',
  'config.loading': 'Caricamento...',
  'config.none': 'Nessuna configurazione salvata.',
  'config.active': 'ATTIVA',
  'config.id': 'ID:',
  'config.auth.yes': 'Sì',
  'config.auth.no': 'No',
  'config.created': 'Creata:',
  'config.activate': 'Attiva',
  'config.edit': 'Modifica',
  'config.delete': 'Elimina',
  'config.test.running': 'Test connessione in corso...',
  'config.test.success': 'Connessione riuscita!',
  'config.test.network': 'Network:',
  'config.test.height': 'Altezza:',
  'config.test.error': 'Errore:',
  'config.test.required': 'Host e porta sono obbligatori',
  'config.save.success': 'Configurazione salvata e attivata con successo!',
  'config.activate.confirm': 'Vuoi attivare questa configurazione?',
  'config.activate.success': 'Configurazione attivata!',
  'config.delete.confirm': 'Sei sicuro di voler eliminare questa configurazione?',
  'config.delete.success': 'Configurazione eliminata!',
  
  // Settings
  'settings.title': 'Impostazioni Generali',
  'settings.autorefresh': 'Abilita auto-refresh Network Information',
  'settings.interval': 'Intervallo (secondi):',
  'settings.intervalhelp': 'Tra 5 e 300 secondi',
  
  // Network Info Section
  'network.title': 'Informazioni Rete',
  'network.height': 'Altezza Blockchain:',
  'network.blockcount': 'Numero Blocchi:',
  'network.connections': 'Connessioni:',
  'network.difficulty': 'Difficoltà:',
  'network.version': 'Versione:',
  'network.sync': 'Stato Sync:',
  'network.sync.synced': '✅ Sincronizzato',
  'network.sync.syncing': '⏳ Sincronizzazione...',
  'network.refresh': 'Aggiorna',
  
  // Details Section
  'details.title': 'Altre Informazioni',
  'details.freespace': 'Spazio Libero:',
  'details.dbsize': 'Dimensione Database:',
  'details.txcount': 'Totale Transazioni:',
  'details.txpool': 'TX in Pool:',
  'details.uptime': 'Uptime Nodo:',
  'details.update': 'Aggiornamento:',
  'details.update.available': '⚠️ Disponibile',
  'details.update.uptodate': '✅ Aggiornato',
  
  // Block Visualization Section
  'blockvis.title': 'Visualizzazione Blocco',
  'blockvis.height': 'Altezza Blockchain:',
  'blockvis.txpool': 'TX in Attesa:',
  
  // Block Search Section
  'block.title': 'Ricerca Blocco',
  'block.search.placeholder': 'Inserisci altezza blocco o hash...',
  'block.search.button': 'Cerca',
  'block.found': 'Blocco Trovato',
  'block.error': 'Errore nella ricerca del blocco',
  'block.error.input': 'Inserisci un hash o un\'altezza del blocco',
  'block.height': 'Altezza:',
  'block.hash': 'Hash:',
  'block.timestamp': 'Timestamp:',
  'block.size': 'Dimensione:',
  'block.transactions': 'Transazioni:',
  'block.reward': 'Ricompensa:',
  
  // Fee Estimate Section
  'fee.title': '💰 Stima Fee',
  'fee.button': 'Ottieni Stima Fee',
  'fee.result': 'Stima Fee',
  'fee.error': 'Errore nel caricamento della stima fee',
  
  // Transaction Pool Section
  'txpool.title': 'Transaction Pool',
  'txpool.load': 'Carica Transazioni in Attesa',
  'txpool.result': 'Transaction Pool',
  'txpool.pending': 'Transazioni in attesa:',
  'txpool.count': 'Transazioni in pool:',
  'txpool.size': 'Dimensione totale:',
  'txpool.error': 'Errore nel caricamento del transaction pool',
  
  // Custom RPC Section
  'rpc.title': 'Chiamata RPC Personalizzata',
  'rpc.method': 'Metodo:',
  'rpc.method.placeholder': 'es: get_block_count',
  'rpc.params': 'Parametri (JSON):',
  'rpc.execute': 'Esegui',
  'rpc.result': 'Risultato RPC',
  'rpc.error.method': 'Inserisci un metodo RPC',
  'rpc.error.params': 'Parametri JSON non validi',
  'rpc.error.execution': 'Errore nell\'esecuzione della chiamata RPC',
  
  // Charts & Real-Time Stats
  'charts.title': 'Statistiche Real-Time',
  'charts.height': 'Altezza',
  'charts.hashrate': 'Hashrate',
  'charts.difficulty': 'Difficoltà',
  'charts.txpool': 'TX Pool',
  'charts.incoming': 'In Entrata',
  'charts.outgoing': 'In Uscita',
  'charts.hashrate_history': 'Network Hashrate',
  'charts.connections_history': 'Connessioni',
  'charts.difficulty_history': 'Difficoltà Rete',
  'charts.txpool_history': 'Transaction Pool',
  
  // Common
  'common.error': 'Errore:',
  'common.error.generic': '❌ Errore:',
  'common.loading': 'Caricamento...',
  'common.bytes': 'byte',
  'common.authentication': 'Autenticazione:',
});
