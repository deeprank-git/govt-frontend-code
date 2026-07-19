import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as userService from "@/services/userService";

export const Route = createFileRoute("/admin-dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const { data: usersRes } = useQuery({ queryKey: ["ad-users"], queryFn: () => userService.getAllUsers() });
  const users = unwrapList<any>(usersRes);

  const qc = useQueryClient();

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
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not update user"),
  });

  return (
    <div>
      <h2 className="text-base font-semibold mb-2">Users</h2>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u._id}>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
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
                <Button size="sm" variant="outline" onClick={() => activeMut.mutate({ id: u._id, isActive: !u.isActive })} disabled={activeMut.isPending}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No users found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
