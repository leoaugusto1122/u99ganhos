export interface Category {
  id: string;
  name: string;
  active: boolean;
  // Legacy support optional, to be removed
  type?: 'fixed' | 'variable' | 'emergency';
  createdAt: Date;
}

export type CostType = 'unique' | 'fixed_monthly' | 'installments' | 'km_based' | 'custom_days';

export interface Vehicle {
  id: string;
  type: 'moto' | 'car';
  brand: string;
  model: string;
  year: number;
  plate: string;
  currentKm: number;
  avgKmPerLiter?: number;
  avgDailyKm?: number;
  lastKmUpdate: string; // Date ISO
  active: boolean;
  createdAt: Date;
}

export interface CostConfig {
  id: string;
  categoryId: string;
  vehicleId?: string;
  type: CostType;
  value: number;
  description?: string;

  // Recurrence Rules
  startDate: string;
  active: boolean;

  // Specific fields
  fixedDay?: number; // 1-31

  installmentsTotal?: number;
  installmentsPaid?: number;

  intervalKm?: number;
  lastKm?: number;

  intervalDays?: number;
  lastDate?: string;

  createdAt: Date;
}

export interface Cost {
  // Represents an actual financial event (History)
  id: string;
  configId?: string; // Link to the configuration that generated this
  categoryId: string;
  categoryName: string;
  vehicleId?: string;

  value: number;
  liters?: number;
  description?: string;
  date: string; // YYYY-MM-DD

  typeSnapshot: CostType; // Preservation of type at moment of creation

  // Legacy fields for compatibility during migration (can be deprecated)
  isFixed: boolean;
  recurrenceId?: string;

  createdAt: Date;
}

export type MaintenanceStatus = 'ok' | 'upcoming' | 'urgent' | 'overdue' | 'completed';

export interface MaintenanceCompletion {
  id: string;
  date: string; // ISO date
  km: number;
  costId?: string; // Link to associated Cost entry
  notes?: string;
  createdAt: Date;
}

export interface Maintenance {
  id: string;
  vehicleId: string;

  // Basic Info
  name: string; // Ex: "Troca de Óleo", "Revisão"
  description?: string;
  category?: string; // Optional category

  // Triggers
  intervalKm?: number; // Ex: 5000 (every 5000km)
  intervalDays?: number; // Ex: 180 (every 6 months)

  // Tracking
  lastKm?: number; // Last KM when performed
  lastDate?: string; // Last date when performed (ISO)
  nextKm?: number; // Calculated: lastKm + intervalKm
  nextDate?: string; // Calculated: lastDate + intervalDays

  // Estimated Cost
  estimatedCost?: number;

  // Status
  active: boolean;
  status: MaintenanceStatus; // Calculated based on current vehicle KM/date

  // History
  completionHistory: MaintenanceCompletion[];

  createdAt: Date;
}


export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO string
  accuracy?: number; // meters
  speed?: number; // m/s
}

export type TrackerStatus = 'idle' | 'active' | 'paused' | 'completed';

export interface KMTrackerSession {
  id: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  status: TrackerStatus;

  // Distance tracking
  totalDistanceKm: number;
  gpsPoints: GPSPoint[];

  // Stats
  duration: number; // milliseconds
  avgSpeed?: number; // km/h
  maxSpeed?: number; // km/h

  // Integration
  vehicleId?: string;
  earningsRecordId?: string; // Link to created earnings
  autoSaved: boolean;

  createdAt: Date;
}

export interface FaturamentoApp {
  id: string;
  name: string;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: Date;
}

// Keeping WorkSchedule as is
export interface WorkDay {
  day: string;
  enabled: boolean;
  hours: number;
}

export interface WorkSchedule {
  workDays: WorkDay[];
  summary: {
    daysPerWeek: number;
    hoursPerWeek: number;
    daysPerMonth: number;
    hoursPerMonth: number;
  };
}

// VariableCost used in EarningsRecord - considered "Quick Costs" during work
export interface VariableCost {
  id: string;
  type: 'gasolina' | 'pedagio' | 'alimentacao' | 'manutencao' | 'outros';
  value: number;
  liters?: number;
  description?: string;
}

export interface EarningsRecord {
  id: string;
  date: string;
  appId: string;
  appName: string;
  grossEarnings: number;
  variableCosts: VariableCost[];
  totalVariableCosts: number;
  netEarnings: number;
  hoursWorked?: number;
  kmDriven?: number;
  vehicleId?: string;
  createdAt: Date;
}

export interface ProfitSettings {
  isEnabled: boolean;
  profitPercentage: number;
}

export interface DailyAccount {
  cost: number;
  profit: number;
  costTarget: number;
  profitTarget: number;
  isCostMet: boolean;
  isProfitMet: boolean;
}

export interface TargetProgress {
  percentage: number;
  isAchieved: boolean;
}

export interface DailySummary {
  date: string;
  totalGrossEarnings: number;
  totalVariableCosts: number;
  totalNetEarnings: number;
  earningsByApp: { [appId: string]: { appName: string; total: number; color: string } };
  targetProgress: TargetProgress;
  records: EarningsRecord[];
}

export interface FinanceData {
  categories: Category[];
  costs: Cost[]; // History
  costConfigs: CostConfig[]; // Templates
  vehicles: Vehicle[];
  maintenances: Maintenance[]; // Maintenance tracking
  kmTrackerSessions: KMTrackerSession[]; // GPS tracking sessions
  activeSession?: KMTrackerSession; // Current active tracking session
  faturamentoApps: FaturamentoApp[];
  workSchedule: WorkSchedule;
  earningsRecords: EarningsRecord[];
  profitSettings: ProfitSettings;
}