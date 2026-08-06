import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as reportService from "@/services/reportService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/reports")({
  component: ReportsPage,
});

const STATUS_TINT: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  reviewed: "",
  resolved: "bg-success/15 text-success-foreground border-transparent",
};

function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: reportsRes, isLoading } = useQuery({
    queryKey: ["ad-reports", statusFilter],
    queryFn: () => reportService.adminGetReports(statusFilter === "all" ? undefined : { status: statusFilter as any }),
  });
  const reports = unwrapList<any>(reportsRes);

  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState<any>(null);
  const [status, setStatus] = useState<string>("pending");
  const [adminNote, setAdminNote] = useState("");

  const openReview = (r: any) => {
    setReviewing(r);
    setStatus(r.status ?? "pending");
    setAdminNote(r.adminNote ?? "");
  };

  // Use reason and question text as search fields
  const searchableReports = reports.map((r) => ({
    ...r,
    _searchText: `${r.reason ?? ""} ${r.question?.questionText ?? ""} ${r.user?.name ?? ""} ${r.user?.email ?? ""}`,
  }));

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(searchableReports, ["_searchText"]);

  const saveMut = useMutation({
    mutationFn: () => reportService.adminUpdateReport(reviewing._id, { status: status as any, adminNote }),
    onSuccess: () => {
      toast.success("Report updated");
      qc.invalidateQueries({ queryKey: ["ad-reports"] });
      setReviewing(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update report"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Question Reports</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search reports…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reported By</TableHead>
            <TableHead>Question</TableHead>
            <TableHead>Test</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reported At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={7} />}
          {!isLoading && paginated.map((r) => (
            <TableRow key={r._id}>
              <TableCell>{r.user?.name}<div className="text-xs text-muted-foreground">{r.user?.email}</div></TableCell>
              <TableCell className="max-w-xs truncate">{r.question?.questionText}</TableCell>
              <TableCell>{r.test?.title ?? "—"}</TableCell>
              <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
              <TableCell><Badge variant="outline" className={STATUS_TINT[r.status]}>{r.status}</Badge></TableCell>
              <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => openReview(r)}>Review</Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && reports.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No reports found.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Report</DialogTitle></DialogHeader>
          {reviewing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Question</Label>
                <p className="text-sm">{reviewing.question?.questionText}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="text-sm">{reviewing.reason}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Admin Note</Label>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="e.g. fixed correct answer to option C" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
