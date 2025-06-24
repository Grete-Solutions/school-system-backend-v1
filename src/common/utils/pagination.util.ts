export class PaginationUtil {
  static calculatePagination(
    totalRecords: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    return {
      totalRecords,
      totalPages,
      currentPage: Math.min(page, totalPages),
      recordsPerPage: limit,
    };
  }

  static getPaginationParams(page: number, limit: number) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    return { skip, take: validLimit };
  }

  static getSortParams(sortBy?: string, sortOrder?: 'asc' | 'desc') {
    if (!sortBy) return {};
    return { [sortBy]: sortOrder || 'asc' };
  }

  static validatePaginationParams(page?: number, limit?: number) {
    const validPage = page && page > 0 ? page : 1;
    const validLimit = limit && limit > 0 && limit <= 100 ? limit : 10;
    return { page: validPage, limit: validLimit };
  }
}