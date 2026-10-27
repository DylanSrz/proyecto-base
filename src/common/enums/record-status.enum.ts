/**
 * [ES] Estado de activación compartido por mecánicos y talleres (ACTIVE / INACTIVE).
 * Los valores son strings en MAYÚSCULAS: así se guardan en PostgreSQL (tipo enum)
 * y así viajan en el JSON.
 */
/** Activation status shared by mechanics and workshops. */
export enum RecordStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
