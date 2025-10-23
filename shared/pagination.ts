import { z } from 'zod';

export const paginationParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function createPaginatedResult<T>(
  allData: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const { limit, offset } = params;
  const data = allData.slice(offset, offset + limit);
  return {
    data,
    pagination: {
      total: allData.length,
      limit,
      offset,
      hasMore: offset + limit < allData.length,
    },
  };
}
