// ==================== CHART.JS CONFIGURATION ====================

let charts = {
  hashrate: null,
  connections: null,
  difficulty: null,
  txpool: null
};

let currentPeriod = 'realtime'; // Periodo corrente selezionato

// Dati storici per i grafici
const chartData = {
  hashrate: {
    labels: [],
    data: [],
    movingAvg: [] // Media ponderata
  },
  connections: {
    labels: [],
    incoming: [],
    outgoing: []
  },
  difficulty: {
    labels: [],
    data: [],
    movingAvg: [] // Media ponderata
  },
  txpool: {
    labels: [],
    data: [],
    movingAvg: [] // Media ponderata
  }
};

const MAX_DATA_POINTS = 60; // Mantieni ultimi 60 punti (5 minuti a 5 secondi)
const MOVING_AVG_WINDOW = 10; // Finestra per media mobile

// Mappa dei tipi di aggregazione per periodo
const PERIOD_TO_AGGREGATION = {
  '30days': 'daily',
  '3months': '3days',
  '6months': 'weekly',
  '1year': 'weekly',
  '5years': 'monthly',
  'max': 'monthly'
};

// Funzione per cambiare il periodo di visualizzazione
async function changePeriod(period) {
  currentPeriod = period;
  console.log(`📅 Cambio periodo a: ${period}`);
  
  const periodInfo = document.getElementById('periodInfo');
  
  if (period === 'realtime') {
    // Modalità real-time: carica dati storici recenti
    periodInfo.textContent = 'Last 60 validated blocks';
    await loadHistoricalChartData();
  } else {
    // Modalità aggregata: carica medie aggregate
    const aggregationType = PERIOD_TO_AGGREGATION[period];
    
    // Calcola il limite basato sul periodo
    let limit = 60;
    let infoText = '';
    
    switch(period) {
      case '30days':
        limit = 60; // Ultimi 60 giorni
        infoText = 'Daily averages for last 60 days';
        break;
      case '3months':
        limit = 60; // Ultimi 60 record (180 giorni)
        infoText = '3-day averages for last 180 days';
        break;
      case '6months':
        limit = 60; // Ultimi 60 record (420 giorni)
        infoText = 'Weekly averages for last 60 weeks';
        break;
      case '1year':
        limit = 60; // Ultimi 60 record (420 giorni)
        infoText = 'Weekly averages for last year';
        break;
      case '5years':
        limit = 60; // Ultimi 60 mesi (5 anni)
        infoText = 'Monthly averages for last 5 years';
        break;
      case 'max':
        limit = 1000; // Tutto lo storico mensile
        infoText = 'Monthly averages since blockchain start';
        break;
    }
    
    periodInfo.textContent = infoText;
    await loadAggregatedChartData(aggregationType, limit);
  }
}

// Funzione per caricare dati aggregati
async function loadAggregatedChartData(aggregationType, limit = 60) {
  try {
    const response = await fetch(`/api/aggregated-stats/${aggregationType}?limit=${limit}`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      console.log(`📊 Caricati ${result.data.length} punti aggregati (${aggregationType})`);
      
      // Inverti l'ordine per avere i più vecchi prima
      const aggregatedData = result.data.reverse();
      
      // Pulisci i dati esistenti
      chartData.hashrate.labels = [];
      chartData.hashrate.data = [];
      chartData.hashrate.movingAvg = [];
      
      chartData.difficulty.labels = [];
      chartData.difficulty.data = [];
      chartData.difficulty.movingAvg = [];
      
      chartData.txpool.labels = [];
      chartData.txpool.data = [];
      chartData.txpool.movingAvg = [];
      
      // Popola con dati aggregati
      aggregatedData.forEach(record => {
        const label = formatAggregatedLabel(record, aggregationType);
        
        // Hashrate
        chartData.hashrate.labels.push(label);
        chartData.hashrate.data.push(record.avg_hashrate || 0);
        
        // Difficulty
        chartData.difficulty.labels.push(label);
        chartData.difficulty.data.push(record.avg_difficulty || 0);
        
        // TX Pool (non disponibile nello storico aggregato)
        chartData.txpool.labels.push(label);
        chartData.txpool.data.push(record.avg_tx_pool_size || 0);
      });
      
      // Per i dati aggregati, la media mobile è uguale ai dati (già mediati)
      chartData.hashrate.movingAvg = [...chartData.hashrate.data];
      chartData.difficulty.movingAvg = [...chartData.difficulty.data];
      chartData.txpool.movingAvg = [...chartData.txpool.data];
      
      // Aggiorna i grafici
      updateAllCharts();
      
      console.log('✅ Grafici aggiornati con dati aggregati');
      return true;
    } else {
      console.warn('⚠️  Nessun dato aggregato disponibile');
      return false;
    }
  } catch (error) {
    console.error('❌ Errore caricamento dati aggregati:', error);
    return false;
  }
}

// Formatta le label per i dati aggregati
function formatAggregatedLabel(record, aggregationType) {
  if (aggregationType === 'daily' || aggregationType === '3days') {
    // Usa il range di blocchi
    return `#${record.period_start}-${record.period_end}`;
  } else if (aggregationType === 'weekly') {
    // Usa il range di blocchi
    return `#${record.period_start}-${record.period_end}`;
  } else if (aggregationType === 'monthly') {
    // Usa solo il blocco iniziale per mesi
    return `#${record.period_start}`;
  }
  return `#${record.period_start}`;
}

// Funzione per aggiornare tutti i grafici
function updateAllCharts() {
  if (charts.hashrate) {
    charts.hashrate.data.labels = chartData.hashrate.labels;
    charts.hashrate.data.datasets[0].data = chartData.hashrate.data;
    charts.hashrate.data.datasets[1].data = chartData.hashrate.movingAvg;
    charts.hashrate.update('none');
  }
  
  if (charts.difficulty) {
    charts.difficulty.data.labels = chartData.difficulty.labels;
    charts.difficulty.data.datasets[0].data = chartData.difficulty.data;
    charts.difficulty.data.datasets[1].data = chartData.difficulty.movingAvg;
    charts.difficulty.update('none');
  }
  
  if (charts.txpool) {
    charts.txpool.data.labels = chartData.txpool.labels;
    charts.txpool.data.datasets[0].data = chartData.txpool.data;
    charts.txpool.data.datasets[1].data = chartData.txpool.movingAvg;
    charts.txpool.update('none');
  }
  
  if (charts.connections) {
    charts.connections.data.labels = chartData.connections.labels;
    charts.connections.data.datasets[0].data = chartData.connections.incoming;
    charts.connections.data.datasets[1].data = chartData.connections.outgoing;
    charts.connections.update('none');
  }
}

// Funzione per caricare e mostrare il progresso della scansione blockchain
async function loadScanProgress() {
  try {
    const response = await fetch('/api/scan-progress');
    const result = await response.json();
    
    if (result.success && result.progress) {
      const progress = result.progress;
      const container = document.getElementById('scanProgressContainer');
      const lastBlock = document.getElementById('scanLastBlock');
      const totalBlocks = document.getElementById('scanTotalBlocks');
      const statusBadge = document.getElementById('scanStatusBadge');
      const statusText = document.getElementById('scanStatusText');
      const progressFill = document.getElementById('scanProgressFill');
      
      // Mostra il container
      if (container) container.style.display = 'block';
      
      // Aggiorna i valori
      if (lastBlock) lastBlock.textContent = `#${progress.last_scanned_height.toLocaleString()}`;
      if (totalBlocks) totalBlocks.textContent = progress.total_blocks_scanned.toLocaleString();
      
      // Ottieni l'altezza corrente per calcolare la percentuale
      const infoResponse = await fetch('/api/info');
      const infoResult = await infoResponse.json();
      
      if (infoResult.success && infoResult.data && infoResult.data.height) {
        const currentHeight = infoResult.data.height;
        const percentage = Math.min(100, (progress.last_scanned_height / currentHeight) * 100);
        
        if (progressFill) {
          progressFill.style.width = `${percentage.toFixed(1)}%`;
        }
        
        // Aggiorna lo stato
        if (progress.is_initial_scan_complete) {
          if (statusBadge) statusBadge.textContent = '✅';
          if (statusText) statusText.textContent = getCurrentTranslation('charts.scan_completed') || 'Scan completed';
          if (container) container.classList.add('completed');
        } else {
          if (statusBadge) statusBadge.textContent = '⏳';
          if (statusText) {
            statusText.textContent = (getCurrentTranslation('charts.scan_in_progress') || 'Scanning...') + 
              ` (${percentage.toFixed(1)}%)`;
          }
          if (container) container.classList.remove('completed');
        }
      }
    }
  } catch (error) {
    console.error('❌ Errore caricamento progresso scansione:', error);
  }
}

// Funzione helper per ottenere la traduzione corrente
function getCurrentTranslation(key) {
  if (typeof i18n !== 'undefined' && i18n.t) {
    return i18n.t(key);
  }
  return null;
}

// Funzione per calcolare la media ponderata (weighted moving average)
function calculateWeightedMovingAverage(data, windowSize = MOVING_AVG_WINDOW) {
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    
    // Calcola media ponderata (pesi maggiori per i valori più recenti)
    let weightedSum = 0;
    let weightTotal = 0;
    
    window.forEach((value, index) => {
      const weight = index + 1; // Peso crescente
      weightedSum += value * weight;
      weightTotal += weight;
    });
    
    result.push(weightedSum / weightTotal);
  }
  
  return result;
}

// Funzione per caricare i dati storici dal database
async function loadHistoricalChartData() {
  try {
    const response = await fetch('/api/historical-data/recent?limit=120'); // Carica più dati per filtrare
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      console.log(`📊 Caricati ${result.data.length} punti dati storici dal database`);
      
      // Aggrega i dati per blocco (prendi il valore massimo per ogni blocco)
      const blockMap = new Map();
      
      result.data.forEach(record => {
        const height = record.height;
        
        if (!blockMap.has(height)) {
          blockMap.set(height, {
            height: height,
            hashrate: record.hashrate,
            difficulty: record.difficulty,
            tx_pool_size: record.tx_pool_size || 0,
            incoming_connections: record.incoming_connections || 0,
            outgoing_connections: record.outgoing_connections || 0
          });
        } else {
          // Prendi il valore massimo
          const existing = blockMap.get(height);
          existing.hashrate = Math.max(existing.hashrate, record.hashrate);
          existing.difficulty = Math.max(existing.difficulty, record.difficulty);
          existing.tx_pool_size = Math.max(existing.tx_pool_size, record.tx_pool_size || 0);
          existing.incoming_connections = Math.max(existing.incoming_connections, record.incoming_connections || 0);
          existing.outgoing_connections = Math.max(existing.outgoing_connections, record.outgoing_connections || 0);
        }
      });
      
      // Converti la mappa in array e prendi solo gli ultimi MAX_DATA_POINTS
      const uniqueBlocks = Array.from(blockMap.values())
        .sort((a, b) => a.height - b.height)
        .slice(-MAX_DATA_POINTS);
      
      console.log(`📊 Blocchi univoci: ${uniqueBlocks.length} (da ${result.data.length} record)`);
      
      // Popola i dati dei grafici
      uniqueBlocks.forEach(block => {
        const label = `#${block.height}`;
        
        // Aggiungi dati hashrate
        chartData.hashrate.labels.push(label);
        chartData.hashrate.data.push(block.hashrate);
        
        // Aggiungi dati connessioni
        chartData.connections.labels.push(label);
        chartData.connections.incoming.push(block.incoming_connections);
        chartData.connections.outgoing.push(block.outgoing_connections);
        
        // Aggiungi dati difficoltà
        chartData.difficulty.labels.push(label);
        chartData.difficulty.data.push(block.difficulty);
        
        // Aggiungi dati TX pool
        chartData.txpool.labels.push(label);
        chartData.txpool.data.push(block.tx_pool_size);
      });
      
      // Calcola le medie ponderate e aggiorna gli array esistenti
      const hashrateAvg = calculateWeightedMovingAverage(chartData.hashrate.data);
      const difficultyAvg = calculateWeightedMovingAverage(chartData.difficulty.data);
      const txpoolAvg = calculateWeightedMovingAverage(chartData.txpool.data);
      
      chartData.hashrate.movingAvg.length = 0;
      chartData.hashrate.movingAvg.push(...hashrateAvg);
      
      chartData.difficulty.movingAvg.length = 0;
      chartData.difficulty.movingAvg.push(...difficultyAvg);
      
      chartData.txpool.movingAvg.length = 0;
      chartData.txpool.movingAvg.push(...txpoolAvg);
      
      // Aggiorna i grafici se sono già inizializzati
      if (charts.hashrate) {
        charts.hashrate.update('none');
        charts.connections.update('none');
        charts.difficulty.update('none');
        charts.txpool.update('none');
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Errore caricamento dati storici:', error);
    return false;
  }
}

// Funzione per ottenere i colori del tema corrente
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    textPrimary: style.getPropertyValue('--text-primary').trim() || '#e0e0e0',
    textSecondary: style.getPropertyValue('--text-secondary').trim() || '#9e9e9e',
    cardBg: style.getPropertyValue('--card-bg').trim() || '#1e1e1e',
    borderColor: style.getPropertyValue('--border-color').trim() || '#333'
  };
}

// Funzione per generare le opzioni comuni per i grafici
function getCommonChartOptions() {
  const colors = getThemeColors();
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: colors.textPrimary,
          font: {
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: colors.cardBg,
        titleColor: colors.textPrimary,
        bodyColor: colors.textSecondary,
        borderColor: colors.borderColor,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: colors.borderColor
        },
        ticks: {
          color: colors.textSecondary,
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: colors.borderColor
        },
        ticks: {
          color: colors.textSecondary
        }
      }
    }
  };
}

// Inizializza tutti i grafici
function initCharts() {
  const commonOptions = getCommonChartOptions();
  
  // Grafico Hashrate
  const hashrateCtx = document.getElementById('hashrateChart');
  if (hashrateCtx) {
    charts.hashrate = new Chart(hashrateCtx, {
      type: 'line',
      data: {
        labels: chartData.hashrate.labels,
        datasets: [
          {
            label: 'Network Hashrate (MH/s)',
            data: chartData.hashrate.data,
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            order: 2
          },
          {
            label: 'Media Ponderata',
            data: chartData.hashrate.movingAvg,
            borderColor: '#ff6b6b',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            order: 1
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: function(value) {
                return formatHashrate(value * 1000000); // Converti MH/s in H/s
              }
            }
          }
        }
      }
    });
  }

  // Grafico Connessioni
  const connectionsCtx = document.getElementById('connectionsChart');
  if (connectionsCtx) {
    charts.connections = new Chart(connectionsCtx, {
      type: 'line',
      data: {
        labels: chartData.connections.labels,
        datasets: [
          {
            label: 'Connessioni in Entrata',
            data: chartData.connections.incoming,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2
          },
          {
            label: 'Connessioni in Uscita',
            data: chartData.connections.outgoing,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              stepSize: 1
            }
          }
        }
      }
    });
  }

  // Grafico Difficoltà
  const difficultyCtx = document.getElementById('difficultyChart');
  if (difficultyCtx) {
    charts.difficulty = new Chart(difficultyCtx, {
      type: 'line',
      data: {
        labels: chartData.difficulty.labels,
        datasets: [
          {
            label: 'Network Difficulty',
            data: chartData.difficulty.data,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            order: 2
          },
          {
            label: 'Media Ponderata',
            data: chartData.difficulty.movingAvg,
            borderColor: '#ff6b6b',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            order: 1
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: function(value) {
                return (value / 1e9).toFixed(2) + 'G';
              }
            }
          }
        }
      }
    });
  }

  // Grafico Transaction Pool
  const txpoolCtx = document.getElementById('txpoolChart');
  if (txpoolCtx) {
    charts.txpool = new Chart(txpoolCtx, {
      type: 'bar',
      data: {
        labels: chartData.txpool.labels,
        datasets: [
          {
            label: 'Transazioni in Pool',
            data: chartData.txpool.data,
            backgroundColor: '#9C27B0',
            borderColor: '#7B1FA2',
            borderWidth: 1,
            order: 2
          },
          {
            label: 'Media Ponderata',
            type: 'line',
            data: chartData.txpool.movingAvg,
            borderColor: '#ff6b6b',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            order: 1
          }
        ]
      },
      options: commonOptions
    });
  }

  console.log('📊 Grafici inizializzati');
}

// Aggiorna i grafici con nuovi dati
function updateCharts(stats) {
  if (!stats) return;
  
  // Aggiorna i grafici SOLO in modalità real-time e quando viene rilevato un nuovo blocco
  if (currentPeriod !== 'realtime') return;
  if (!stats.isNewBlock) return;

  // Usa il numero di blocco come etichetta
  const label = `#${stats.height}`;

  // Aggiorna Hashrate
  if (charts.hashrate) {
    const hashrateValue = parseFloat((stats.hashrate / 1000000).toFixed(2)); // Converti in MH/s
    chartData.hashrate.labels.push(label);
    chartData.hashrate.data.push(hashrateValue);

    if (chartData.hashrate.labels.length > MAX_DATA_POINTS) {
      chartData.hashrate.labels.shift();
      chartData.hashrate.data.shift();
      chartData.hashrate.movingAvg.shift();
    }
    
    // Ricalcola la media ponderata e aggiorna l'array esistente
    const newAvg = calculateWeightedMovingAverage(chartData.hashrate.data);
    chartData.hashrate.movingAvg.length = 0;
    chartData.hashrate.movingAvg.push(...newAvg);

    charts.hashrate.update('active');
  }

  // Aggiorna Connessioni
  if (charts.connections) {
    chartData.connections.labels.push(label);
    chartData.connections.incoming.push(stats.incomingConnections);
    chartData.connections.outgoing.push(stats.outgoingConnections);

    if (chartData.connections.labels.length > MAX_DATA_POINTS) {
      chartData.connections.labels.shift();
      chartData.connections.incoming.shift();
      chartData.connections.outgoing.shift();
    }

    charts.connections.update('active');
  }

  // Aggiorna Difficoltà
  if (charts.difficulty) {
    chartData.difficulty.labels.push(label);
    chartData.difficulty.data.push(stats.difficulty);

    if (chartData.difficulty.labels.length > MAX_DATA_POINTS) {
      chartData.difficulty.labels.shift();
      chartData.difficulty.data.shift();
      chartData.difficulty.movingAvg.shift();
    }
    
    // Ricalcola la media ponderata e aggiorna l'array esistente
    const newDiffAvg = calculateWeightedMovingAverage(chartData.difficulty.data);
    chartData.difficulty.movingAvg.length = 0;
    chartData.difficulty.movingAvg.push(...newDiffAvg);

    charts.difficulty.update('active');
  }

  // Aggiorna Transaction Pool
  if (charts.txpool) {
    chartData.txpool.labels.push(label);
    chartData.txpool.data.push(stats.txPoolSize);

    if (chartData.txpool.labels.length > MAX_DATA_POINTS) {
      chartData.txpool.labels.shift();
      chartData.txpool.data.shift();
      chartData.txpool.movingAvg.shift();
    }
    
    // Ricalcola la media ponderata e aggiorna l'array esistente
    const newTxAvg = calculateWeightedMovingAverage(chartData.txpool.data);
    chartData.txpool.movingAvg.length = 0;
    chartData.txpool.movingAvg.push(...newTxAvg);

    charts.txpool.update('active');
  }
  
  // Mostra notifica toast per nuovo blocco
  if (typeof showToast === 'function') {
    showToast(`🆕 Blocco ${stats.height} | TX: ${stats.txPoolSize}`, 'info');
  }
}

// Formatta l'hashrate in formato leggibile
function formatHashrate(hashrate) {
  if (hashrate >= 1e12) {
    return (hashrate / 1e12).toFixed(2) + ' TH/s';
  } else if (hashrate >= 1e9) {
    return (hashrate / 1e9).toFixed(2) + ' GH/s';
  } else if (hashrate >= 1e6) {
    return (hashrate / 1e6).toFixed(2) + ' MH/s';
  } else if (hashrate >= 1e3) {
    return (hashrate / 1e3).toFixed(2) + ' KH/s';
  }
  return hashrate.toFixed(2) + ' H/s';
}

// Aggiorna i colori dei grafici quando cambia il tema
function updateChartTheme() {
  const colors = getThemeColors();

  Object.values(charts).forEach(chart => {
    if (chart) {
      // Aggiorna i colori della legenda
      if (chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = colors.textPrimary;
      }
      
      // Aggiorna i colori del tooltip
      if (chart.options.plugins.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = colors.cardBg;
        chart.options.plugins.tooltip.titleColor = colors.textPrimary;
        chart.options.plugins.tooltip.bodyColor = colors.textSecondary;
        chart.options.plugins.tooltip.borderColor = colors.borderColor;
      }
      
      // Aggiorna i colori delle scale
      if (chart.options.scales) {
        if (chart.options.scales.x) {
          chart.options.scales.x.grid.color = colors.borderColor;
          chart.options.scales.x.ticks.color = colors.textSecondary;
        }
        if (chart.options.scales.y) {
          chart.options.scales.y.grid.color = colors.borderColor;
          chart.options.scales.y.ticks.color = colors.textSecondary;
        }
      }
      
      chart.update('none');
    }
  });
}
