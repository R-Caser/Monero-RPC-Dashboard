# Sistema di Statistiche Aggregate

## Panoramica

Il sistema di statistiche aggregate permette di visualizzare e analizzare i dati storici della blockchain di Monero su diversi periodi temporali, dalle ultime 60 blocchi fino all'intera storia della blockchain.

## Caratteristiche Principali

### 1. Multi-Period Chart Views

Gli utenti possono selezionare tra 7 diverse viste temporali:

| Periodo | Tipo Aggregazione | Retention | Descrizione |
|---------|------------------|-----------|-------------|
| **Real-Time** | Nessuna | 30 giorni | Ultimi 60 blocchi validati con media mobile ponderata |
| **30 Giorni** | Giornaliera | 60 record (60 giorni) | Media giornaliera degli ultimi 30 giorni |
| **3 Mesi** | 3 giorni | 60 record (180 giorni) | Media ogni 3 giorni per gli ultimi 3 mesi |
| **6 Mesi** | Settimanale | 60 record (420 giorni) | Media settimanale per gli ultimi 6 mesi |
| **1 Anno** | Settimanale | 60 record (420 giorni) | Media settimanale per l'ultimo anno |
| **5 Anni** | Mensile | Infinita | Media mensile per gli ultimi 5 anni |
| **Max** | Mensile | Infinita | Media mensile dall'inizio della blockchain |

### 2. Blockchain Scanner

Il sistema include uno scanner automatico della blockchain che:

- **Scansione Iniziale**: Parte dal blocco 1 alla prima esecuzione
- **Progressivo**: Salva il progresso e riprende dall'ultimo blocco scansionato in caso di riavvio
- **Ottimizzato**: Batch di 10 blocchi con pause per evitare sovraccarico RPC
- **Background**: Funziona in background senza bloccare le operazioni normali
- **Update Automatico**: Ogni 10 minuti aggiorna le aggregazioni con i nuovi blocchi

### 3. Aggregazione Dati

Il sistema calcola automaticamente le medie per ogni periodo:

#### Dati Aggregati per Blocco
- **Hashrate**: Calcolato come `difficulty / 120` (target 120 secondi per blocco)
- **Difficulty**: Difficoltà di mining del network
- **Transaction Pool**: Numero di transazioni in attesa (non disponibile nello storico)

#### Periodi di Aggregazione
- **daily**: Aggregazione per giorno (86400 secondi)
- **3days**: Aggregazione per 3 giorni (259200 secondi)
- **weekly**: Aggregazione per settimana (604800 secondi)
- **monthly**: Aggregazione per mese (2592000 secondi ≈ 30 giorni)

### 4. Database Schema

#### Tabella `aggregated_statistics`
```sql
CREATE TABLE aggregated_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregation_type TEXT NOT NULL,        -- 'daily', '3days', 'weekly', 'monthly'
  period_start INTEGER NOT NULL,         -- Block height di inizio periodo
  period_end INTEGER NOT NULL,           -- Block height di fine periodo
  avg_hashrate REAL,                     -- Media hashrate in H/s
  avg_difficulty REAL,                   -- Media difficoltà
  avg_tx_pool_size REAL,                 -- Media TX pool (non disponibile)
  block_count INTEGER,                   -- Numero di blocchi nel periodo
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aggregation_type, period_start)
);
```

#### Tabella `scan_progress`
```sql
CREATE TABLE scan_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_scanned_height INTEGER NOT NULL DEFAULT 0,
  total_blocks_scanned INTEGER NOT NULL DEFAULT 0,
  last_scan_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_initial_scan_complete INTEGER DEFAULT 0
);
```

### 5. Retention Policy

Il sistema implementa una politica di retention automatica:

- **Giornaliero** (`daily`): Mantiene ultimi 60 record (60 giorni)
- **3 Giorni** (`3days`): Mantiene ultimi 60 record (180 giorni)
- **Settimanale** (`weekly`): Mantiene ultimi 60 record (420 giorni)
- **Mensile** (`monthly`): **Retention infinita** (per periodi 5 anni e Max)

**Importante**: La tabella `aggregated_statistics` **NON viene cancellata** dalla funzione "Gestione Storico Dati" dell'interfaccia utente, che elimina solo la tabella `historical_data`.

## API Endpoints

### GET `/api/aggregated-stats/:type`

Recupera le statistiche aggregate per un tipo specifico.

**Parametri:**
- `:type` - Tipo di aggregazione: `daily`, `3days`, `weekly`, `monthly`
- `limit` (query param, opzionale) - Numero di record da restituire (default: 60)

**Risposta:**
```json
{
  "success": true,
  "type": "daily",
  "count": 60,
  "data": [
    {
      "id": 1,
      "aggregation_type": "daily",
      "period_start": 3500000,
      "period_end": 3500432,
      "avg_hashrate": 2500000000,
      "avg_difficulty": 300000000000,
      "avg_tx_pool_size": 0,
      "block_count": 432,
      "created_at": "2024-12-12T10:30:00.000Z",
      "updated_at": "2024-12-12T10:30:00.000Z"
    }
  ]
}
```

### GET `/api/scan-progress`

Ottiene il progresso corrente della scansione blockchain.

**Risposta:**
```json
{
  "success": true,
  "progress": {
    "id": 1,
    "last_scanned_height": 3500000,
    "total_blocks_scanned": 3500000,
    "last_scan_timestamp": "2024-12-12T10:30:00.000Z",
    "is_initial_scan_complete": 1
  }
}
```

### POST `/api/rescan-blockchain`

Forza una riscansione completa della blockchain (solo admin).

**Autenticazione**: Richiede ruolo `admin`

**Risposta:**
```json
{
  "success": true,
  "message": "Blockchain rescan started"
}
```

## Frontend

### Period Selector

L'interfaccia include un selettore di periodo nella sezione "Real-Time Statistics":

```html
<select id="chartPeriod" onchange="changePeriod(this.value)">
  <option value="realtime">Real-Time (Last 60 blocks)</option>
  <option value="30days">Last 30 Days (Daily)</option>
  <option value="3months">Last 3 Months (3-day avg)</option>
  <option value="6months">Last 6 Months (Weekly avg)</option>
  <option value="1year">Last Year (Weekly avg)</option>
  <option value="5years">Last 5 Years (Monthly avg)</option>
  <option value="max">Max (Monthly avg)</option>
</select>
```

### Funzioni JavaScript

#### `changePeriod(period)`
Cambia la vista del grafico al periodo selezionato.

```javascript
changePeriod('30days');  // Carica medie giornaliere ultimi 30 giorni
changePeriod('realtime'); // Torna alla modalità real-time
```

#### `loadAggregatedChartData(aggregationType, limit)`
Carica i dati aggregati dal server e aggiorna i grafici.

```javascript
await loadAggregatedChartData('daily', 60);
```

#### `updateAllCharts()`
Aggiorna tutti i grafici con i dati correnti.

```javascript
updateAllCharts();
```

## Ottimizzazioni

### Scanner Ottimizzato

Per evitare sovraccarichi RPC, lo scanner utilizza:

- **Batch Size**: 10 blocchi per batch (ridotto da 100)
- **Sequential Fetching**: Richieste sequenziali invece che parallele
- **Pause tra Blocchi**: 50ms di pausa tra ogni richiesta
- **Pause tra Batch**: 500ms di pausa tra ogni batch
- **Error Handling**: Continua la scansione anche in caso di errori su singoli blocchi

### Performance

- Le statistiche aggregate vengono pre-calcolate durante la scansione
- Le query sui dati aggregati sono molto più veloci rispetto all'elaborazione real-time
- La retention automatica mantiene il database leggero
- I dati mensili per periodi lunghi utilizzano meno spazio rispetto ai dati raw

## Monitoraggio

### Log del Sistema

Lo scanner produce log dettagliati:

```
🔍 Avvio scansione blockchain per aggregazione statistiche...
📊 Scansione da blocco 1 a 3500000
✅ Scansionati blocchi 1-10 (10 blocchi)
✅ Scansionati blocchi 11-20 (10 blocchi)
...
✅ Scansione iniziale completata!
```

### Check Progresso

Verifica il progresso della scansione via API:

```bash
curl http://localhost:3000/api/scan-progress
```

## Troubleshooting

### Scanner Non Parte

Verificare che:
1. Il server sia connesso a un nodo Monero funzionante
2. Il nodo RPC risponda correttamente
3. La tabella `scan_progress` sia inizializzata

### Errori "socket hang up"

Normali durante la scansione iniziale con molte richieste. Lo scanner gestisce automaticamente questi errori e continua.

### Dati Mancanti

Se mancano dati aggregati:
1. Verificare il progresso con `/api/scan-progress`
2. Forzare una riscansione con `/api/rescan-blockchain` (admin only)
3. Controllare i log del server per errori

## Traduzioni

Il sistema supporta traduzioni complete:

- **Italiano** (`it-IT`): Tutte le opzioni tradotte
- **Inglese** (`en-US`): Tutte le opzioni tradotte

Le traduzioni includono:
- Etichette del selettore di periodo
- Testo informativo per ogni periodo
- Messaggi di stato e errori

## Best Practices

1. **Prima Scansione**: Lasciare completare la scansione iniziale prima di visualizzare periodi lunghi
2. **Backup**: Fare backup regolari della tabella `aggregated_statistics`
3. **Monitoraggio**: Controllare periodicamente `/api/scan-progress`
4. **Performance**: Usare periodi aggregati per analisi storiche invece di caricare tutti i dati raw

## Future Enhancements

Possibili miglioramenti futuri:
- Esportazione dati aggregati in CSV/JSON
- Grafici comparativi tra periodi diversi
- Alert su variazioni anomale nelle medie
- Previsioni basate sui trend storici
- Aggregazioni custom definite dall'utente
