import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type TablePaginationProps = {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
  pageSizeOptions?: number[];
  /** 1-based start index for display (e.g. "Showing 1–12 of 50") */
  startIndexOneBased?: number;
  /** 0-based end index (exclusive) for display */
  endIndex?: number;
};

export function TablePagination({
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  pageSizeOptions = [12, 24, 50, 100],
  startIndexOneBased = 0,
  endIndex = 0,
}: TablePaginationProps) {
  const from = totalItems === 0 ? 0 : startIndexOneBased;
  const to = endIndex;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
            Rows per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger id="rows-per-page" className="w-[72px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Showing {from}–{to} of {totalItems}
        </span>
      </div>
      <Pagination className="w-auto mx-0">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (canPrevious) onPrevious();
              }}
              href="#"
              className={canPrevious ? "cursor-pointer" : "pointer-events-none opacity-50"}
              aria-disabled={!canPrevious}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm font-medium">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (canNext) onNext();
              }}
              href="#"
              className={canNext ? "cursor-pointer" : "pointer-events-none opacity-50"}
              aria-disabled={!canNext}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
