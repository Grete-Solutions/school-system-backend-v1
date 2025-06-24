export class PaginationUtil {
  static calculatePagination(
    totalRecords: number,
    page: number,
    limit: number
  ) {
    return {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      recordsPerPage: limit,
    };
  }

  static getPaginationParams(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
  }

  static getSortParams(sortBy?: string, sortOrder?: 'asc' | 'desc') {
    if (!sortBy) return {};
    return { [sortBy]: sortOrder || 'asc' };
  }
}