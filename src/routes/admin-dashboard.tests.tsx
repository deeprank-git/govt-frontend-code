import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as categoryService from "@/services/categoryService";
import * as testSeriesService from "@/services/testSeriesService";
import * as testService from "@/services/testService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { TestWizardDialog } from "@/components/admin/TestWizardDialog";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/tests")({
  component: TestsPage,
});

function TestsPage() {
  const { data: categoriesRes } = useQuery({ queryKey: ["ad-categories"], queryFn: () => categoryService.getCategories() });
  const categories = unwrapList<any>(categoriesRes);
  const { data: seriesRes } = useQuery({ queryKey: ["ad-series"], queryFn: () => testSeriesService.getTestSeries() });
  const series = unwrapList<any>(seriesRes);
  const { data: testsRes, isLoading } = useQuery({ queryKey: ["ad-tests"], queryFn: () => testService.getTests() });
  const tests = unwrapList<any>(testsRes);

  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(tests, ["title"]);

  const openCreate = () => { setEditingTest(null); setWizardOpen(true); };
  const openEdit = (t: any) => { setEditingTest(t); setWizardOpen(true); };

  const deleteMut = useMutation({
    mutationFn: (id: string) => testService.deleteTest(id),
    onSuccess: () => {
      toast.success("Test deleted");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not delete test"),
  });

  const togglePublishMut = useMutation({
    mutationFn: (t: any) => testService.updateTest(t._id, { isPublished: !t.isPublished }),
    onSuccess: (_data, t) => {
      toast.success(t.isPublished ? "Test unpublished" : "Test published");
      qc.invalidateQueries({ queryKey: ["ad-tests"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update publish status"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Tests</h2>
        <Button size="sm" onClick={openCreate}>New</Button>
      </div>
      <div className="mb-2">
        <Input
          placeholder="Search tests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Qs</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Published</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={6} />}
          {!isLoading && paginated.map((t) => (
            <TableRow key={t._id}>
              <TableCell>{t.title}</TableCell>
              <TableCell>{t.totalQuestions}</TableCell>
              <TableCell>{t.totalMarks}</TableCell>
              <TableCell>{t.duration} Min</TableCell>
              <TableCell>{t.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => togglePublishMut.mutate(t)}
                  disabled={togglePublishMut.isPending}
                >
                  {t.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTarget(t._id)}
                  disabled={deleteMut.isPending}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && tests.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                No tests yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      <TestWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingTest={editingTest}
        categories={categories}
        series={series}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ad-tests"] })}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
        itemLabel="this test"
      />
    </div>
  );
}
