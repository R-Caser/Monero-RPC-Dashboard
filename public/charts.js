// ==================== CHART.JS CONFIGURATION ====================

let charts = {
  hashrate: null,
  connections: null,
  difficulty: null,
  txpool: null
};

// Dati storici per i grafici
const chartData = {
  hashrate: {
    labels: [],
    data: []
  },
  connections: {
    labels: [],
    incoming: [],
    outgoing: []
  },
  difficulty: {
    labels: [],
    data: []
  },
  txpool: {
    labels: [],
    data: []
  }
};

const MAX_DATA_POINTS = 60; // Mantieni ultimi 60 punti (5 minuti a 5 secondi)

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
        datasets: [{
          label: 'Network Hashrate (MH/s)',
          data: chartData.hashrate.data,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0, 212, 170, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
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
        datasets: [{
          label: 'Network Difficulty',
          data: chartData.difficulty.data,
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
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
        datasets: [{
          label: 'Transazioni in Pool',
          data: chartData.txpool.data,
          backgroundColor: '#9C27B0',
          borderColor: '#7B1FA2',
          borderWidth: 1
        }]
      },
      options: commonOptions
    });
  }

  console.log('📊 Grafici inizializzati');
}

// Aggiorna i grafici con nuovi dati
function updateCharts(stats) {
  if (!stats) return;

  const timestamp = new Date(stats.timestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Aggiorna Hashrate
  if (charts.hashrate) {
    chartData.hashrate.labels.push(timestamp);
    chartData.hashrate.data.push((stats.hashrate / 1000000).toFixed(2)); // Converti in MH/s

    if (chartData.hashrate.labels.length > MAX_DATA_POINTS) {
      chartData.hashrate.labels.shift();
      chartData.hashrate.data.shift();
    }

    charts.hashrate.update('none');
  }

  // Aggiorna Connessioni
  if (charts.connections) {
    chartData.connections.labels.push(timestamp);
    chartData.connections.incoming.push(stats.incomingConnections);
    chartData.connections.outgoing.push(stats.outgoingConnections);

    if (chartData.connections.labels.length > MAX_DATA_POINTS) {
      chartData.connections.labels.shift();
      chartData.connections.incoming.shift();
      chartData.connections.outgoing.shift();
    }

    charts.connections.update('none');
  }

  // Aggiorna Difficoltà
  if (charts.difficulty) {
    chartData.difficulty.labels.push(timestamp);
    chartData.difficulty.data.push(stats.difficulty);

    if (chartData.difficulty.labels.length > MAX_DATA_POINTS) {
      chartData.difficulty.labels.shift();
      chartData.difficulty.data.shift();
    }

    charts.difficulty.update('none');
  }

  // Aggiorna Transaction Pool
  if (charts.txpool) {
    chartData.txpool.labels.push(timestamp);
    chartData.txpool.data.push(stats.txPoolSize);

    if (chartData.txpool.labels.length > MAX_DATA_POINTS) {
      chartData.txpool.labels.shift();
      chartData.txpool.data.shift();
    }

    charts.txpool.update('none');
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
