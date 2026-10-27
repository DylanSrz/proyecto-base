/**
 * [ES] Estados del mantenimiento. ACTIVE_MAINTENANCE_STATUSES (SCHEDULED, IN_PROGRESS)
 * se usa en todas las reglas de "mantenimiento activo".
 * Los valores son strings en MAYÚSCULAS: así se guardan en PostgreSQL (tipo enum)
 * y así viajan en el JSON.
 */
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Statuses that keep a vehicle and a mechanic busy. */
export const ACTIVE_MAINTENANCE_STATUSES = [
  MaintenanceStatus.SCHEDULED,
  MaintenanceStatus.IN_PROGRESS,
] as const;
