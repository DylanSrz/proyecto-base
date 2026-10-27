/**
 * [ES] Tipos de mantenimiento: PREVENTIVE (programado) y CORRECTIVE (reparación).
 * Los valores son strings en MAYÚSCULAS: así se guardan en PostgreSQL (tipo enum)
 * y así viajan en el JSON.
 */
export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}
