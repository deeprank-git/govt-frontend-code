import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingRowsProps {
  colSpan: number;
  rows?: number;
}

export function LoadingRows({ colSpan, rows = 3 }: LoadingRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan} className="h-16 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-full" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
