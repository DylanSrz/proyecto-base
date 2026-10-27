/**
 * [ES] Roles del sistema: ADMIN (gestiona todo) y TECHNICIAN (sus mantenimientos asignados).
 * Los valores son strings en MAYÚSCULAS: así se guardan en PostgreSQL (tipo enum)
 * y así viajan en el JSON.
 */
export enum Role {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}
