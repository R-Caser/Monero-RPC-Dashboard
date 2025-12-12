const { parentPort, workerData } = require('worker_threads');
const MoneroRPCClient = require('./moneroRPC');
const Database = require('./database');

// Inizializza database e RPC client nel worker
const db = new Database();
let rpcClient;
let isScanning = false;

/**
 * Inizializza il client RPC nel worker
 */
async function initRPCClient(config) {
  try {
    if (config) {
      rpcClient = new MoneroRPCClient({
        host: config.host,
        port: config.port,
        user: config.requires_auth ? config.username : null,
        password: config.requires_auth ? config.password : null,
        useHttps: config.use_https === 1 || config.use_https === true,
      });
      console.log(`🧵 [Worker] RPC Client inizializzato: ${config.host}:${config.port}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('🧵 [Worker] Errore inizializzazione RPC:', error.message);
    return false;
  }
}

/**
 * Scansiona la blockchain per aggregare statistiche storiche
 */
async function scanBlockchainForAggregation() {
  if (isScanning) {
    console.log('🧵 [Worker] Scansione già in corso, skip');
    return;
  }

  isScanning = true;
  
  try {
    const progress = await db.getScanProgress();
    
    if (progress.is_initial_scan_complete) {
      console.log('🧵 [Worker] Scansione iniziale già completata');
      isScanning = false;
      parentPort.postMessage({ type: 'scan_complete', data: progress });
      return;
    }

    console.log('🧵 [Worker] Avvio scansione blockchain...');
    parentPort.postMessage({ type: 'scan_started' });
    
    // Ottieni l'altezza corrente della blockchain
    const info = await rpcClient.getInfo();
    if (!info || !info.height) {
      console.error('🧵 [Worker] Impossibile ottenere altezza blockchain');
      isScanning = false;
      return;
    }

    const currentHeight = info.height;
    let startHeight = progress.last_scanned_height > 0 ? progress.last_scanned_height + 1 : 1;
    
    console.log(`🧵 [Worker] Scansione da blocco ${startHeight} a ${currentHeight}`);

    // Scansiona a batch di 10 blocchi
    const batchSize = 10;
    
    while (startHeight <= currentHeight && isScanning) {
      const endHeight = Math.min(startHeight + batchSize - 1, currentHeight);
      
      try {
        // Ottieni informazioni per ogni blocco nel batch SEQUENZIALMENTE
        const blocks = [];
        for (let h = startHeight; h <= endHeight; h++) {
          if (!isScanning) break; // Controllo per stop
          
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
            console.error(`🧵 [Worker] Errore blocco ${h}:`, err.message);
          }
          // Pausa di 50ms tra ogni richiesta
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Calcola hashrate per ogni blocco
        const blocksWithStats = blocks.map(b => ({
          height: b.height,
          difficulty: b.difficulty,
          hashrate: b.difficulty / 120,
          timestamp: b.timestamp
        }));

        // Aggrega i dati
        if (blocksWithStats.length > 0) {
          await aggregateAndSaveStats(blocksWithStats);
        }

        // Aggiorna il progresso
        await db.updateScanProgress(endHeight, progress.total_blocks_scanned + blocks.length, 0);
        
        // Invia aggiornamento al thread principale
        const newProgress = await db.getScanProgress();
        parentPort.postMessage({ 
          type: 'progress_update', 
          data: {
            current: endHeight,
            total: currentHeight,
            blocks_scanned: blocks.length,
            progress: newProgress
          }
        });
        
        console.log(`🧵 [Worker] Scansionati blocchi ${startHeight}-${endHeight}`);
        
        startHeight = endHeight + 1;

        // Pausa di 500ms tra i batch per non bloccare
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`🧵 [Worker] Errore batch ${startHeight}-${endHeight}:`, error.message);
        startHeight = endHeight + 1;
      }
    }

    if (isScanning) {
      // Marca la scansione come completata
      await db.updateScanProgress(currentHeight, currentHeight, 1);
      console.log('🧵 [Worker] ✅ Scansione iniziale completata!');
      
      const finalProgress = await db.getScanProgress();
      parentPort.postMessage({ type: 'scan_complete', data: finalProgress });
    } else {
      console.log('🧵 [Worker] Scansione interrotta');
      parentPort.postMessage({ type: 'scan_stopped' });
    }

  } catch (error) {
    console.error('🧵 [Worker] Errore scanner:', error.message);
    parentPort.postMessage({ type: 'error', error: error.message });
  } finally {
    isScanning = false;
  }
}

/**
 * Aggrega e salva statistiche per diversi periodi
 */
async function aggregateAndSaveStats(blocks) {
  if (!blocks || blocks.length === 0) return;

  // Ordina per timestamp
  blocks.sort((a, b) => a.timestamp - b.timestamp);

  // Aggrega per diversi periodi
  await aggregateByPeriod(blocks, 'daily', 86400);
  await aggregateByPeriod(blocks, '3days', 259200);
  await aggregateByPeriod(blocks, 'weekly', 604800);
  await aggregateByPeriod(blocks, 'monthly', 2592000);
}

/**
 * Aggrega blocchi per un periodo specifico
 */
async function aggregateByPeriod(blocks, aggregationType, periodSeconds) {
  const periods = new Map();

  for (const block of blocks) {
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

/**
 * Aggiorna aggregazioni con nuovi blocchi
 */
async function updateAggregations() {
  try {
    const progress = await db.getScanProgress();
    
    if (!progress.is_initial_scan_complete) {
      console.log('🧵 [Worker] Scansione iniziale non completata, skip update');
      return;
    }

    const info = await rpcClient.getInfo();
    if (!info || !info.height) return;

    const currentHeight = info.height;
    const lastScanned = progress.last_scanned_height;

    if (currentHeight <= lastScanned) {
      return;
    }

    console.log(`🧵 [Worker] Aggiornamento aggregazioni ${lastScanned + 1} → ${currentHeight}`);

    // Ottieni i nuovi blocchi sequenzialmente
    const newBlocks = [];
    for (let h = lastScanned + 1; h <= currentHeight; h++) {
      try {
        const block = await rpcClient.getBlockByHeight(h);
        if (block && block.block_header) {
          newBlocks.push({
            height: h,
            difficulty: block.block_header.difficulty || 0,
            hashrate: (block.block_header.difficulty || 0) / 120,
            timestamp: block.block_header.timestamp || 0
          });
        }
      } catch (err) {
        console.error(`🧵 [Worker] Errore blocco ${h}:`, err.message);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (newBlocks.length > 0) {
      await aggregateAndSaveStats(newBlocks);
      await db.updateScanProgress(currentHeight, progress.total_blocks_scanned + newBlocks.length, 1);
      console.log(`🧵 [Worker] ✅ Aggregati ${newBlocks.length} nuovi blocchi`);
      
      parentPort.postMessage({ 
        type: 'aggregation_update', 
        data: { blocks_added: newBlocks.length, current_height: currentHeight }
      });
    }

    // Pulizia dati vecchi
    await cleanupAggregatedData();

  } catch (error) {
    console.error('🧵 [Worker] Errore aggiornamento:', error.message);
  }
}

/**
 * Pulizia dati aggregati secondo retention policy
 */
async function cleanupAggregatedData() {
  try {
    await db.cleanOldAggregatedStats('daily', 60);
    await db.cleanOldAggregatedStats('3days', 60);
    await db.cleanOldAggregatedStats('weekly', 60);
    // Mensili mantenuti infinitamente
  } catch (error) {
    console.error('🧵 [Worker] Errore cleanup:', error.message);
  }
}

/**
 * Stop della scansione
 */
function stopScan() {
  console.log('🧵 [Worker] Richiesta di stop scansione');
  isScanning = false;
}

// Listener per messaggi dal thread principale
parentPort.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'init':
        const success = await initRPCClient(message.config);
        parentPort.postMessage({ type: 'init_response', success });
        break;
        
      case 'start_scan':
        await scanBlockchainForAggregation();
        break;
        
      case 'update_aggregations':
        await updateAggregations();
        break;
        
      case 'stop_scan':
        stopScan();
        break;
        
      case 'get_progress':
        const progress = await db.getScanProgress();
        parentPort.postMessage({ type: 'progress', data: progress });
        break;
        
      default:
        console.log('🧵 [Worker] Messaggio sconosciuto:', message.type);
    }
  } catch (error) {
    console.error('🧵 [Worker] Errore gestione messaggio:', error.message);
    parentPort.postMessage({ type: 'error', error: error.message });
  }
});

console.log('🧵 [Worker] Blockchain Worker Thread avviato');
