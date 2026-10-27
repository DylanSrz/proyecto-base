/**
 * [ES] Estados del vehículo. IN_MAINTENANCE lo asigna el sistema al iniciar un mantenimiento;
 * INACTIVE es la eliminación lógica.
 * Los valores son strings en MAYÚSCULAS: así se guardan en PostgreSQL (tipo enum)
 * y así viajan en el JSON.
 */
export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  INACTIVE = 'INACTIVE',
}
