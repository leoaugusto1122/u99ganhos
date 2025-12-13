import * as SQLite from 'expo-sqlite';
import {
    Category,
    Cost,
    CostConfig,
    Vehicle,
    Maintenance,
    MaintenanceCompletion,
    EarningsRecord,
    KMTrackerSession,
    FaturamentoApp,
    WorkSchedule,
    ProfitSettings,
    GPSPoint,
    MaintenanceStatus,
    CostType,
    FinanceData
} from './types';
import * as FileSystem from 'expo-file-system';

// Backup Data Structure Interface
export interface BackupData {
    version: number;
    timestamp: string;
    data: FinanceData;
}

// Open the database
// Open the database lazily
let _db: SQLite.SQLiteDatabase | null = null;
const getDb = () => {
    if (!_db) {
        _db = SQLite.openDatabaseSync('finance.db');
    }
    return _db;
};

// Proxy object to handle lazy initialization
const db = {
    execSync: (source: string) => getDb().execSync(source),
    runSync: (source: string, ...params: any[]) => getDb().runSync(source, ...params),
    getAllSync: (source: string, ...params: any[]) => getDb().getAllSync(source, ...params),
    getFirstSync: (source: string, ...params: any[]) => getDb().getFirstSync(source, ...params),
    withTransactionSync: (callback: () => void) => getDb().withTransactionSync(callback),
} as unknown as SQLite.SQLiteDatabase;

export const databaseService = {
    // Initialize Database Tables
    initDatabase: () => {
        db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        brand TEXT,
        model TEXT,
        year INTEGER,
        plate TEXT,
        currentKm REAL,
        active INTEGER DEFAULT 1,
        lastKmUpdate TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS maintenances (
        id TEXT PRIMARY KEY,
        vehicleId TEXT,
        name TEXT,
        description TEXT,
        category TEXT,
        intervalKm INTEGER,
        intervalDays INTEGER,
        lastKm INTEGER,
        lastDate TEXT,
        nextKm INTEGER,
        nextDate TEXT,
        status TEXT,
        estimatedCost REAL,
        active INTEGER DEFAULT 1,
        createdAt TEXT,
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS maintenance_history (
        id TEXT PRIMARY KEY,
        maintenanceId TEXT,
        date TEXT,
        km INTEGER,
        costId TEXT,
        notes TEXT,
        createdAt TEXT,
        FOREIGN KEY (maintenanceId) REFERENCES maintenances(id)
      );

      CREATE TABLE IF NOT EXISTS cost_configs (
        id TEXT PRIMARY KEY,
        categoryId TEXT,
        vehicleId TEXT,
        type TEXT,
        value REAL,
        description TEXT,
        startDate TEXT,
        endDate TEXT,
        active INTEGER DEFAULT 1,
        intervalKm INTEGER,
        intervalDays INTEGER,
        installmentsTotal INTEGER,
        installmentsPaid INTEGER,
        lastKm INTEGER,
        lastDate TEXT,
        createdAt TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS costs (
        id TEXT PRIMARY KEY,
        categoryId TEXT,
        vehicleId TEXT,
        configId TEXT,
        value REAL,
        description TEXT,
        date TEXT,
        typeSnapshot TEXT,
        isFixed INTEGER,
        createdAt TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
        FOREIGN KEY (configId) REFERENCES cost_configs(id)
      );

      CREATE TABLE IF NOT EXISTS earnings_records (
        id TEXT PRIMARY KEY,
        date TEXT,
        appId TEXT,
        appName TEXT,
        grossEarnings REAL,
        netEarnings REAL,
        totalVariableCosts REAL,
        variableCosts TEXT, -- JSON
        hoursWorked REAL,
        kmDriven REAL,
        notes TEXT,
        createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS km_tracker_sessions (
        id TEXT PRIMARY KEY,
        vehicleId TEXT,
        startTime TEXT,
        endTime TEXT,
        status TEXT,
        totalDistanceKm REAL,
        duration INTEGER,
        maxSpeed REAL,
        avgSpeed REAL,
        autoSaved INTEGER,
        gpsPoints TEXT, -- JSON
        createdAt TEXT,
        FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
      );
    `);
        console.log('Database initialized successfully');
    },

    // --- GENERIC HELPERS ---

    // Clear all data (Reset App)
    clearAllData: () => {
        db.execSync(`
            DELETE FROM settings;
            DELETE FROM km_tracker_sessions;
            DELETE FROM earnings_records;
            DELETE FROM costs;
            DELETE FROM cost_configs;
            DELETE FROM maintenance_history;
            DELETE FROM maintenances;
            DELETE FROM vehicles;
            DELETE FROM categories;
        `);
    },

    // --- BACKUP & RESTORE ---

    getAllDataAsJSON: (): BackupData => {
        // Fetch all data using existing methods
        const categories = databaseService.getCategories();
        const vehicles = databaseService.getVehicles();
        const maintenances = databaseService.getMaintenances();
        const costs = databaseService.getCosts();
        const costConfigs = databaseService.getCostConfigs();
        const earningsRecords = databaseService.getEarnings();
        const kmTrackerSessions = databaseService.getKMSessions();

        // Settings are stored individually, need to fetch manually or specific ones
        // We will fetch known settings
        const workSchedule = databaseService.getSetting<any>('workSchedule', null);
        const profitSettings = databaseService.getSetting<any>('profitSettings', null);
        const faturamentoApps = databaseService.getSetting<any>('faturamentoApps', null);

        // Construct FinanceData-like object, but we need strictly serializable data
        // Our types are mostly serializable.

        return {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                categories,
                vehicles,
                maintenances,
                costs,
                costConfigs,
                earningsRecords,
                kmTrackerSessions,
                workSchedule, // might be null if not set, handled by import
                profitSettings,
                faturamentoApps,
                activeSession: undefined // Don't backup active session state, or maybe yes? Safe to skip.
            } as any // Cast to avoid strict activeSession mismatch if needed
        };
    },

    importDataFromJSON: (backup: BackupData) => {
        if (!backup || !backup.data) {
            throw new Error('Invalid backup file');
        }

        const { data } = backup;

        // Transactional import: Clear then Insert
        db.withTransactionSync(() => {
            // 1. Clear existing
            databaseService.clearAllData();

            // 2. Insert Settings
            if (data.workSchedule) databaseService.saveSetting('workSchedule', data.workSchedule);
            if (data.profitSettings) databaseService.saveSetting('profitSettings', data.profitSettings);
            if (data.faturamentoApps) databaseService.saveSetting('faturamentoApps', data.faturamentoApps);

            // 3. Insert Entities
            data.categories.forEach(c => databaseService.addCategory(c));
            data.vehicles.forEach(v => databaseService.addVehicle(v));
            data.maintenances.forEach(m => databaseService.addMaintenance(m)); // Handles history? addMaintenance does NOT add history array automatically in my implementation?
            // Wait, my addMaintenance implementation DOES check m.completionHistory! (lines 297-301)
            // So if backup includes history in the maintenance object (getMaintenances DOES includes it), it works!

            data.costConfigs.forEach(c => databaseService.addCostConfig(c));
            data.costs.forEach(c => databaseService.addCost(c));
            data.earningsRecords.forEach(e => databaseService.addEarningsRecord(e));
            data.kmTrackerSessions.forEach(s => databaseService.addKMSession(s));

        });
    },

    // --- SETTINGS (Apps, Profile, etc) ---
    saveSetting: (key: string, value: any) => {
        const jsonValue = JSON.stringify(value);
        db.runSync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, jsonValue]
        );
    },

    getSetting: <T>(key: string, defaultValue: T): T => {
        const result = db.getFirstSync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?',
            [key]
        );
        return result ? JSON.parse(result.value) : defaultValue;
    },

    // --- CATEGORIES ---
    getCategories: (): Category[] => {
        const rows = db.getAllSync<Category>('SELECT * FROM categories');
        // Convert boolean/integer if needed, assuming simple mapping works or manual map
        return rows.map(r => ({
            ...r,
            active: Boolean(r.active)
        }));
    },

    addCategory: (category: Category) => {
        db.runSync(
            'INSERT INTO categories (id, name, active, createdAt) VALUES (?, ?, ?, ?)',
            [category.id, category.name, category.active ? 1 : 0, category.createdAt.toISOString()]
        );
    },

    updateCategory: (id: string, name: string) => {
        db.runSync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    },

    deleteCategory: (id: string) => {
        db.runSync('DELETE FROM categories WHERE id = ?', [id]);
    },

    // --- VEHICLES ---
    getVehicles: (): Vehicle[] => {
        const rows = db.getAllSync<any>('SELECT * FROM vehicles');
        return rows.map(r => ({
            ...r,
            active: Boolean(r.active)
        }));
    },

    addVehicle: (vehicle: Vehicle) => {
        db.runSync(
            `INSERT INTO vehicles (id, brand, model, year, plate, currentKm, active, lastKmUpdate, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vehicle.id,
                vehicle.brand,
                vehicle.model,
                vehicle.year,
                vehicle.plate,
                vehicle.currentKm,
                vehicle.active ? 1 : 0,
                vehicle.lastKmUpdate,
                vehicle.createdAt.toISOString()
            ]
        );
    },

    updateVehicle: (id: string, updates: Partial<Vehicle>) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => `${k} = ?`)
            .join(', ');

        if (!fields) return;

        const values = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                const val = (updates as any)[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return val.toISOString();
                return val;
            });

        db.runSync(`UPDATE vehicles SET ${fields} WHERE id = ?`, [...values, id]);
    },

    deleteVehicle: (id: string) => {
        db.runSync('DELETE FROM vehicles WHERE id = ?', [id]);
    },

    // --- MAINTENANCES ---
    getMaintenances: (): Maintenance[] => {
        const rows = db.getAllSync<any>('SELECT * FROM maintenances');
        const historyRows = db.getAllSync<any>('SELECT * FROM maintenance_history');

        return rows.map(m => {
            const history = historyRows
                .filter(h => h.maintenanceId === m.id)
                .map(h => ({ ...h }));

            return {
                ...m,
                active: Boolean(m.active),
                status: m.status as MaintenanceStatus,
                completionHistory: history
            };
        });
    },

    addMaintenance: (m: Maintenance) => {
        db.runSync(
            `INSERT INTO maintenances (
                id, vehicleId, name, description, category, intervalKm, intervalDays, 
                lastKm, lastDate, nextKm, nextDate, status, estimatedCost, active, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                m.id, m.vehicleId, m.name, m.description || null, m.category || null,
                m.intervalKm || null, m.intervalDays || null, m.lastKm || null, m.lastDate || null,
                m.nextKm || null, m.nextDate || null, m.status, m.estimatedCost || null,
                m.active ? 1 : 0, m.createdAt.toISOString()
            ]
        );

        // Add history if any (usually empty on create but good to support)
        if (m.completionHistory && m.completionHistory.length > 0) {
            m.completionHistory.forEach(h => {
                databaseService.addMaintenanceHistory(m.id, h);
            });
        }
    },

    updateMaintenance: (id: string, updates: Partial<Maintenance>) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id' && k !== 'completionHistory')
            .map(k => `${k} = ?`)
            .join(', ');

        if (!fields) return;

        const values = Object.keys(updates)
            .filter(k => k !== 'id' && k !== 'completionHistory')
            .map(k => {
                const val = (updates as any)[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return val.toISOString();
                return val;
            });

        db.runSync(`UPDATE maintenances SET ${fields} WHERE id = ?`, [...values, id]);
    },

    deleteMaintenance: (id: string) => {
        db.runSync('DELETE FROM maintenance_history WHERE maintenanceId = ?', [id]);
        db.runSync('DELETE FROM maintenances WHERE id = ?', [id]);
    },

    addMaintenanceHistory: (maintenanceId: string, h: MaintenanceCompletion) => {
        db.runSync(
            `INSERT INTO maintenance_history (id, maintenanceId, date, km, costId, notes, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [h.id, maintenanceId, h.date, h.km, h.costId || null, h.notes || null, h.createdAt.toISOString()]
        );
    },

    // --- COSTS & CONFIGS ---
    getCosts: (): Cost[] => {
        const rows = db.getAllSync<any>('SELECT * FROM costs');
        return rows.map(c => ({
            ...c,
            isFixed: Boolean(c.isFixed),
            // Need to join logic? For simple list, we usually need categoryName.
            // In Context we might enrich this.
            // For now, raw data.
        }));
    },

    getCostConfigs: (): CostConfig[] => {
        const rows = db.getAllSync<any>('SELECT * FROM cost_configs');
        return rows.map(c => ({
            ...c,
            active: Boolean(c.active)
        }));
    },

    addCost: (cost: Cost) => {
        db.runSync(
            `INSERT INTO costs (
                id, categoryId, vehicleId, configId, value, description, date, typeSnapshot, isFixed, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cost.id, cost.categoryId, cost.vehicleId || null, cost.configId || null,
                cost.value, cost.description || null, cost.date, cost.typeSnapshot,
                cost.isFixed ? 1 : 0, cost.createdAt.toISOString()
            ]
        );
    },

    deleteCost: (id: string) => {
        db.runSync('DELETE FROM costs WHERE id = ?', [id]);
    },

    addCostConfig: (config: CostConfig) => {
        db.runSync(
            `INSERT INTO cost_configs (
                id, categoryId, vehicleId, type, value, description, startDate, 
                active, intervalKm, intervalDays, installmentsTotal, installmentsPaid, lastKm, lastDate, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                config.id, config.categoryId, config.vehicleId || null, config.type, config.value,
                config.description || null, config.startDate,
                config.active ? 1 : 0, config.intervalKm || null, config.intervalDays || null,
                config.installmentsTotal || null, config.installmentsPaid || null,
                config.lastKm || null, config.lastDate || null, config.createdAt.toISOString()
            ]
        );
    },

    updateCostConfig: (id: string, updates: Partial<CostConfig>) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => `${k} = ?`)
            .join(', ');

        if (!fields) return;

        const values = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                const val = (updates as any)[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return val.toISOString();
                return val;
            });

        db.runSync(`UPDATE cost_configs SET ${fields} WHERE id = ?`, [...values, id]);
    },

    // --- EARNINGS ---
    getEarnings: (): EarningsRecord[] => {
        const rows = db.getAllSync<any>('SELECT * FROM earnings_records');
        return rows.map(r => ({
            ...r,
            variableCosts: JSON.parse(r.variableCosts || '[]'),
            // Ensure types match
        }));
    },

    addEarningsRecord: (record: EarningsRecord) => {
        db.runSync(
            `INSERT INTO earnings_records (
                id, date, appId, appName, grossEarnings, netEarnings, totalVariableCosts,
                variableCosts, hoursWorked, kmDriven, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                record.id, record.date, record.appId, record.appName,
                record.grossEarnings, record.netEarnings, record.totalVariableCosts,
                JSON.stringify(record.variableCosts), record.hoursWorked || null,
                record.kmDriven || null, record.createdAt.toISOString()
            ]
        );
    },

    updateEarningsRecord: (id: string, updates: Partial<EarningsRecord>) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                if (k === 'variableCosts') return `variableCosts = ?`;
                return `${k} = ?`;
            })
            .join(', ');

        if (!fields) return;

        const values = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                if (k === 'variableCosts') return JSON.stringify((updates as any)[k]);
                const val = (updates as any)[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return val.toISOString();
                return val;
            });

        db.runSync(`UPDATE earnings_records SET ${fields} WHERE id = ?`, [...values, id]);
    },

    deleteEarningsRecord: (id: string) => {
        db.runSync('DELETE FROM earnings_records WHERE id = ?', [id]);
    },

    // --- KM SESSIONS ---
    getKMSessions: (): KMTrackerSession[] => {
        const rows = db.getAllSync<any>('SELECT * FROM km_tracker_sessions');
        return rows.map(s => ({
            ...s,
            autoSaved: Boolean(s.autoSaved),
            gpsPoints: JSON.parse(s.gpsPoints)
        }));
    },

    addKMSession: (session: KMTrackerSession) => {
        db.runSync(
            `INSERT INTO km_tracker_sessions (
                id, vehicleId, startTime, endTime, status, totalDistanceKm, duration,
                maxSpeed, avgSpeed, autoSaved, gpsPoints, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                session.id, session.vehicleId || null, session.startTime, session.endTime || null,
                session.status, session.totalDistanceKm, session.duration, session.maxSpeed || null,
                session.avgSpeed || null, session.autoSaved ? 1 : 0,
                JSON.stringify(session.gpsPoints), session.createdAt.toISOString()
            ]
        );
    },

    updateKMSession: (id: string, updates: Partial<KMTrackerSession>) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                if (k === 'gpsPoints') return `gpsPoints = ?`;
                return `${k} = ?`;
            })
            .join(', ');

        if (!fields) return;

        const values = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => {
                const val = (updates as any)[k];
                if (k === 'gpsPoints') return JSON.stringify(val);
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return val.toISOString();
                return val;
            });

        db.runSync(`UPDATE km_tracker_sessions SET ${fields} WHERE id = ?`, [...values, id]);
    },

    deleteKMSession: (id: string) => {
        db.runSync('DELETE FROM km_tracker_sessions WHERE id = ?', [id]);
    }
};
