const MAX_PAGE_LIMIT = 100;
const ADMIN_MAX_PAGE_LIMIT = 500;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean;
}

export const sanitizePagination = (
  page?: string | number,
  limit?: string | number,
  isAdmin: boolean = false
): PaginationParams => {
  const maxLimit = isAdmin ? ADMIN_MAX_PAGE_LIMIT : MAX_PAGE_LIMIT;
  const p = Math.max(1, parseInt(String(page || 1), 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, parseInt(String(limit || 10), 10) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
};

export const parseSort = (
  sort?: string,
  defaultField: string = 'createdAt',
  defaultDirection: 'asc' | 'desc' = 'desc'
): SortParams => {
  if (!sort) return { field: defaultField, direction: defaultDirection };

  const [field, dir] = sort.split(':');
  const allowedDirections = ['asc', 'desc'];
  const direction = allowedDirections.includes(dir) ? dir as 'asc' | 'desc' : defaultDirection;

  // Whitelist allowed sort fields per module (override in service)
  return { field: field || defaultField, direction };
};

export const parseFilters = (
  query: Record<string, any>,
  allowedFields: string[] = []
): FilterParams => {
  const filters: FilterParams = {};

  for (const [key, value] of Object.entries(query)) {
    if (key === 'page' || key === 'limit' || key === 'sort' || key === 'search') continue;
    if (allowedFields.length > 0 && !allowedFields.includes(key)) continue;
    if (value === undefined || value === null || value === '') continue;

    // Parse boolean strings
    if (value === 'true') { filters[key] = true; continue; }
    if (value === 'false') { filters[key] = false; continue; }

    // Parse numbers
    const num = Number(value);
    if (!isNaN(num) && String(value) === String(num)) {
      filters[key] = num;
      continue;
    }

    // Keep as string
    filters[key] = String(value);
  }

  return filters;
};

export const buildPrismaWhere = (
  filters: FilterParams,
  schoolId?: string
): Record<string, any> => {
  const where: Record<string, any> = {};

  if (schoolId) {
    where.schoolId = schoolId;
  }

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'boolean') {
      where[key] = value;
    } else if (typeof value === 'number') {
      where[key] = value;
    } else {
      where[key] = { contains: value, mode: 'insensitive' };
    }
  }

  return where;
};

export const buildPrismaOrderBy = (
  sort: SortParams
): Record<string, 'asc' | 'desc'> => {
  return { [sort.field]: sort.direction };
};
