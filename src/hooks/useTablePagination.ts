import { useState, useMemo, useEffect } from "react";

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [12, 24, 50, 100];

export function useTablePagination<T>(
  items: T[],
  options?: { defaultPageSize?: number; pageSizeOptions?: number[] }
) {
  const pageSizeOpts = options?.pageSizeOptions ?? PAGE_SIZE_OPTIONS;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(options?.defaultPageSize ?? DEFAULT_PAGE_SIZE);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Keep page in bounds when list length or pageSize changes
  useEffect(() => {
    if (totalPages >= 1 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return {
    paginatedItems,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndexOneBased: totalItems === 0 ? 0 : startIndex + 1,
    endIndex,
    canPrev,
    canNext,
    goPrev,
    goNext,
    pageSizeOptions: pageSizeOpts,
  };
}
