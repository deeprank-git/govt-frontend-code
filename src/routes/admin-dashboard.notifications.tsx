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
import { toast } from "sonner";
import { unwrapList } from "@/lib/api-unwrap";
import * as notificationService from "@/services/notificationService";
import * as userService from "@/services/userService";
import { LoadingRows } from "@/components/admin/LoadingRows";
import { AdminPager } from "@/components/admin/AdminPager";
import { usePaginatedSearch } from "@/hooks/use-paginated-search";

export const Route = createFileRoute("/admin-dashboard/notifications")({
  component: NotificationsPage,
});

const emptyForm = { userId: "broadcast", title: "", message: "", type: "info" as const };

function NotificationsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: usersRes } = useQuery({ queryKey: ["ad-users-for-notify"], queryFn: () => userService.getAllUsers() });
  const users = unwrapList<any>(usersRes);

  const { data: sentRes, isLoading } = useQuery({ queryKey: ["ad-notifications"], queryFn: () => notificationService.adminGetNotifications({ limit: 100 }) });
  const sent = unwrapList<any>(sentRes);

  const { search, setSearch, paginated, page, setPage, totalPages } = usePaginatedSearch(sent, ["title", "message"]);

  const sendMut = useMutation({
    mutationFn: () => notificationService.adminSendNotification({
      userId: form.userId === "broadcast" ? undefined : form.userId,
      title: form.title,
      message: form.message,
      type: form.type,
    }),
    onSuccess: () => {
      toast.success("Notification sent");
      qc.invalidateQueries({ queryKey: ["ad-notifications"] });
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Could not send notification"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3 text-gradient-primary">Send Notification</h2>
        <div className="space-y-3 max-w-xl">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="result">Result</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipient</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">Broadcast to all users</SelectItem>
                  {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || !form.title || !form.message}>
            {sendMut.isPending ? "Sending…" : "Send Notification"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-gradient-primary">Sent Notifications</h2>
        <div className="mb-2">
          <Input
            placeholder="Search notifications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>Type</TableHead><TableHead>Recipient</TableHead><TableHead>Sent At</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LoadingRows colSpan={5} />}
            {!isLoading && paginated.map((n) => (
              <TableRow key={n._id}>
                <TableCell>{n.title}</TableCell>
                <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                <TableCell>{n.user ? `${n.user.name} (${n.user.email})` : "Broadcast"}</TableCell>
                <TableCell>{new Date(n.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {!isLoading && sent.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No notifications sent yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <AdminPager page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
