const MAX_PAGE_LIMIT = 100;

export const sanitizePagination = (page?: string | number, limit?: string | number) => {
  const p = Math.max(1, parseInt(String(page || 1), 10) || 1);
  const l = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(String(limit || 10), 10) || 10));
  return { page: p, limit: l };
};
