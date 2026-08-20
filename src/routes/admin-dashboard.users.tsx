import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as userService from "@/services/userService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ["ad-users", roleFilter],
    queryFn: () => userService.getAllUsers(roleFilter !== "all" ? { role: roleFilter } : undefined),
  });
  const users = unwrapList<any>(usersRes);

  const qc = useQueryClient();

  // Confirm deactivation state: stores { id, isActive } of the targeted user
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; isActive: boolean } | null>(null);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(users, ["name", "email", "mobile"]);

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => userService.updateUserByAdmin(id, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["ad-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update role"),
  });

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userService.updateUserByAdmin(id, { isActive }),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["ad-users"] });
      setDeactivateTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update user"),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 text-gradient-primary">Users</h2>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <LoadingRows colSpan={6} />}
          {!isLoading && paginated.map((u) => (
            <TableRow key={u._id}>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.mobile || "—"}</TableCell>
              <TableCell>
                <Select value={u.role} onValueChange={(v) => roleMut.mutate({ id: u._id, role: v })}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">student</SelectItem>
                    <SelectItem value="instructor">instructor</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{u.isActive ? "Active" : "Deactivated"}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeactivateTarget({ id: u._id, isActive: !u.isActive })}
                  disabled={activeMut.isPending}
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && users.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No users found.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDeleteDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && activeMut.mutate(deactivateTarget)}
        isPending={activeMut.isPending}
        confirmLabel={deactivateTarget?.isActive ? "Activate" : "Deactivate"}
        description={
          deactivateTarget?.isActive
            ? "This will restore access for this user."
            : "This will revoke access for this user. You can reactivate them later."
        }
      />
    </div>
  );
}
