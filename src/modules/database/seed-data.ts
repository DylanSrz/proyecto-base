/**
 * [ES] Datos de demostración del seeder (lo que pide el enunciado):
 * 1 admin (desde .env) + 2 técnicos, 3 mecánicos (2 activos vinculados a los
 * técnicos, 1 inactivo), 2 talleres (1 activo, 1 inactivo), 4 vehículos
 * (2 AVAILABLE, 1 IN_MAINTENANCE, 1 INACTIVE) y mantenimientos COMPLETED para
 * el historial, más uno IN_PROGRESS y uno SCHEDULED.
 * [EN] Demo seed data.
 */
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { MaintenanceType } from '../../common/enums/maintenance-type.enum.js';
import { RecordStatus } from '../../common/enums/record-status.enum.js';
import { VehicleStatus } from '../../common/enums/vehicle-status.enum.js';

/** Demo data. Natural keys (email, plate, name, description) make the seed idempotent. */

export const TECHNICIAN_PASSWORD = 'Tech12345';

export const TECHNICIANS = [
  { name: 'Carlos Perez', email: 'carlos.perez@fleetcore.com' },
  { name: 'Laura Gomez', email: 'laura.gomez@fleetcore.com' },
];

export const MECHANICS = [
  {
    name: 'Carlos Perez',
    email: 'carlos.perez@fleetcore.com',
    specialty: 'Engines',
    status: RecordStatus.ACTIVE,
    userEmail: 'carlos.perez@fleetcore.com',
  },
  {
    name: 'Laura Gomez',
    email: 'laura.gomez@fleetcore.com',
    specialty: 'Brakes and suspension',
    status: RecordStatus.ACTIVE,
    userEmail: 'laura.gomez@fleetcore.com',
  },
  {
    name: 'Andres Rios',
    email: 'andres.rios@fleetcore.com',
    specialty: 'Electrical systems',
    status: RecordStatus.INACTIVE,
    userEmail: null,
  },
];

export const WORKSHOPS = [
  {
    name: 'North Workshop',
    address: '45th Street #12-30, Medellin',
    status: RecordStatus.ACTIVE,
  },
  {
    name: 'Downtown Workshop',
    address: '10th Avenue #5-21, Medellin',
    status: RecordStatus.INACTIVE,
  },
];

export const VEHICLES = [
  { plate: 'ABC123', brand: 'Chevrolet', model: 'NPR', year: 2020, mileage: 52300, status: VehicleStatus.AVAILABLE },
  { plate: 'DEF456', brand: 'Toyota', model: 'Hilux', year: 2022, mileage: 31000, status: VehicleStatus.AVAILABLE },
  { plate: 'GHI789', brand: 'Hino', model: '300', year: 2019, mileage: 88000, status: VehicleStatus.IN_MAINTENANCE },
  { plate: 'JKL012', brand: 'Ford', model: 'Cargo', year: 2015, mileage: 150000, status: VehicleStatus.INACTIVE },
];

const HOUR = 60 * 60 * 1000;

const tomorrowAt = (hours: number, minutes: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};

export interface SeedMaintenance {
  plate: string;
  mechanicEmail: string;
  workshopName: string;
  type: MaintenanceType;
  description: string;
  mileage: number;
  scheduledAt: Date;
  estimatedEndAt: Date;
  status: MaintenanceStatus;
  startedAt?: Date;
  closing?: {
    workPerformed: string;
    finalCost: number;
    finishedAt: Date;
    finalMileage: number;
  };
}

/** Built lazily so relative dates are computed when the seed runs. */
// [ES] Es una función (no constante) para calcular fechas relativas ("ahora", "mañana")
// en el momento de ejecutar el seed.
export const buildMaintenances = (now = new Date()): SeedMaintenance[] => [
  {
    plate: 'ABC123',
    mechanicEmail: 'carlos.perez@fleetcore.com',
    workshopName: 'North Workshop',
    type: MaintenanceType.PREVENTIVE,
    description: 'Oil and filter change',
    mileage: 45000,
    scheduledAt: new Date('2026-09-15T14:00:00.000Z'),
    estimatedEndAt: new Date('2026-09-15T16:30:00.000Z'),
    startedAt: new Date('2026-09-15T14:05:00.000Z'),
    status: MaintenanceStatus.COMPLETED,
    closing: {
      workPerformed: 'Changed engine oil, oil filter and air filter',
      finalCost: 350000,
      finishedAt: new Date('2026-09-15T16:30:00.000Z'),
      finalMileage: 45000,
    },
  },
  {
    plate: 'ABC123',
    mechanicEmail: 'laura.gomez@fleetcore.com',
    workshopName: 'North Workshop',
    type: MaintenanceType.CORRECTIVE,
    description: 'Brake pad replacement',
    mileage: 52300,
    scheduledAt: new Date('2026-10-10T12:00:00.000Z'),
    estimatedEndAt: new Date('2026-10-10T14:00:00.000Z'),
    startedAt: new Date('2026-10-10T12:00:00.000Z'),
    status: MaintenanceStatus.COMPLETED,
    closing: {
      workPerformed: 'Replaced front and rear brake pads',
      finalCost: 480000,
      finishedAt: new Date('2026-10-10T14:00:00.000Z'),
      finalMileage: 52300,
    },
  },
  {
    plate: 'GHI789',
    mechanicEmail: 'carlos.perez@fleetcore.com',
    workshopName: 'North Workshop',
    type: MaintenanceType.CORRECTIVE,
    description: 'Clutch kit replacement',
    mileage: 88000,
    scheduledAt: new Date(now.getTime() - HOUR),
    estimatedEndAt: new Date(now.getTime() + 3 * HOUR),
    startedAt: new Date(now.getTime() - HOUR),
    status: MaintenanceStatus.IN_PROGRESS,
  },
  {
    plate: 'DEF456',
    mechanicEmail: 'laura.gomez@fleetcore.com',
    workshopName: 'North Workshop',
    type: MaintenanceType.PREVENTIVE,
    description: '30,000 km preventive inspection',
    mileage: 31000,
    scheduledAt: tomorrowAt(7, 30),
    estimatedEndAt: tomorrowAt(9, 0),
    status: MaintenanceStatus.SCHEDULED,
  },
];

/** Status path that leads to each final status, used to build the audit log. */
// [ES] Camino de estados para generar un log de auditoría coherente con el estado final.
// Ej: COMPLETED -> logs SCHEDULED, SCHEDULED->IN_PROGRESS, IN_PROGRESS->COMPLETED.
export const STATUS_PATH: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [MaintenanceStatus.SCHEDULED],
  [MaintenanceStatus.IN_PROGRESS]: [
    MaintenanceStatus.SCHEDULED,
    MaintenanceStatus.IN_PROGRESS,
  ],
  [MaintenanceStatus.COMPLETED]: [
    MaintenanceStatus.SCHEDULED,
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.COMPLETED,
  ],
  [MaintenanceStatus.CANCELLED]: [
    MaintenanceStatus.SCHEDULED,
    MaintenanceStatus.CANCELLED,
  ],
};
