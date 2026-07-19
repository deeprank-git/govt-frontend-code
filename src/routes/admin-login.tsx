import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as authService from "@/services/authService";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      if (res.user?.role !== "admin") {
        authService.logout();
        toast.error("This login is for administrators only.");
        return;
      }
      navigate({ to: "/admin-dashboard" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-center">Admin Login</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Log In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
