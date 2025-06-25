export interface PaginationMeta {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  recordsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// export interface IPaginatedResponse<T> {
//   data: T[];
//   pagination: {
//     totalRecords: number;
//     totalPages: number;
//     currentPage: number;
//     recordsPerPage: number;
//   };
// }