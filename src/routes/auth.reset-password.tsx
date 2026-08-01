import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import * as authService from "@/services/authService";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import authImg from "@/assets/auth-illustration.png";

const search = z.object({
    token: z.string(),
});

export const Route = createFileRoute("/auth/reset-password")({
    validateSearch: (s) => search.parse(s),
    head: () => ({
        meta: [
            { title: "Reset Password — Testopy" },
            {
                name: "description",
                content: "Reset your Testopy account password.",
            },
        ],
    }),
    component: ResetPasswordPage,
});

function ResetPasswordPage() {
    const { token } = Route.useSearch();

    if (!token) {
        return (
            <div className="min-h-screen bg-hero-radial flex flex-col">
                <div className="container mx-auto px-4 py-6">
                    <Logo />
                </div>
                <div className="flex-1 grid place-items-center px-4 pb-10">
                    <Card className="w-full max-w-md p-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-display font-extrabold">Invalid Link</h1>
                        <p className="mt-2 text-muted-foreground">
                            The reset link is missing or invalid. Please request a new password reset.
                        </p>
                        <Link to="/auth" search={{ mode: "login" } as never}>
                            <Button className="mt-6 w-full">Back to Login</Button>
                        </Link>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-hero-radial flex flex-col">
            <div className="container mx-auto px-4 py-6">
                <Logo />
            </div>
            <div className="flex-1 grid place-items-center px-4 pb-10">
                <Card className="w-full max-w-5xl grid md:grid-cols-[1fr_1.1fr] overflow-hidden">
                    <aside className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                        <div>
                            <h2 className="text-2xl font-display font-extrabold">Create a New Password</h2>
                            <p className="mt-2 text-muted-foreground">
                                Enter a new password to regain access to your account. Make sure it's strong and unique.
                            </p>
                            <ul className="mt-6 space-y-3 text-sm">
                                {[
                                    ["🔒 Secure", "Use a password with letters, numbers, and symbols."],
                                    ["⏱ Fresh", "This link expires in 1 hour for security."],
                                    ["✅ Quick", "Once set, you can login immediately."],
                                ].map(([t, d]) => (
                                    <li key={t} className="flex gap-3">
                                        <span className="text-xl">{t.split(" ")[0]}</span>
                                        <div>
                                            <div className="font-semibold">{t.split(" ").slice(1).join(" ")}</div>
                                            <div className="text-xs text-muted-foreground">{d}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <img
                            src={authImg}
                            alt=""
                            width={400}
                            height={400}
                            loading="lazy"
                            className="mx-auto h-44 w-auto"
                        />
                    </aside>
                    <section className="p-8">
                        <ResetForm token={token} />
                    </section>
                </Card>
            </div>
        </div>
    );
}

function ResetForm({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const passwordsMatch = password === confirm;
    const passwordValid = password.length >= 6;
    const canSubmit = passwordsMatch && passwordValid && password.length > 0 && !loading;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (!passwordsMatch) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword({ token, newPassword: password });
            setSuccess(true);
            toast.success("Password reset successfully");
        } catch (err: any) {
            const message = err?.response?.data?.message ?? "Error resetting password";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center">
                <div className="mb-4 flex justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h1 className="text-2xl font-display font-extrabold">Password Reset Successfully</h1>
                <p className="mt-2 text-muted-foreground">
                    Your password has been updated. You can now login with your new password.
                </p>
                <Link to="/auth" search={{ mode: "login" } as never}>
                    <Button className="mt-6 w-full">Go to Login</Button>
                </Link>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-display font-extrabold">Reset Your Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter a new password for your account</p>

            {error && (
                <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4 mt-6">
                <div>
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={show ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a new password"
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShow((v) => !v)}
                        >
                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                        At least 6 characters
                    </p>
                </div>

                <div>
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <div className="relative">
                        <Input
                            id="confirm"
                            type={show ? "text" : "password"}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Confirm your new password"
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShow((v) => !v)}
                        >
                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {password && confirm && (
                        <p className={`text-xs mt-1.5 ${passwordsMatch ? "text-green-600" : "text-destructive"}`}>
                            {passwordsMatch ? "✓ Passwords match" : "✗ Passwords don't match"}
                        </p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {loading ? "Resetting…" : "Reset Password"}
                </Button>
            </form>

            <p className="text-sm text-center mt-5 text-muted-foreground">
                Remember your password?{" "}
                <Link to="/auth" search={{ mode: "login" } as never} className="text-primary font-medium">
                    Login
                </Link>
            </p>
        </div>
    );
}
