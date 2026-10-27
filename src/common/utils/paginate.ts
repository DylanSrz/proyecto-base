/**
 * [ES] Arma la respuesta paginada estándar: { items, meta: { total, page, limit, totalPages } }.
 * Se usa en todos los listados para que tengan el mismo formato.
 * [EN] Builds the standard paginated response.
 */
export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const paginate = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> => ({
  items,
  meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
});
