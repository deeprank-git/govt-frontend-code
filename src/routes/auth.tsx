import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as authService from "@/services/authService";
import { setAuth } from "@/lib/auth-store";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { toast } from "sonner";
import authImg from "@/assets/auth-illustration.png";
import type { ApiError } from "@/api/axiosClient";

const search = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Login / Sign Up — GovtPrep" },
      {
        name: "description",
        content: "Access your GovtPrep account to track your preparation and take mock tests.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: (redirect as never) ?? "/dashboard" });
  }, [user, loading, redirect, navigate]);

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen bg-hero-radial flex flex-col">
      <div className="container mx-auto px-4 py-6">
        <Logo />
      </div>
      <div className="flex-1 grid place-items-center px-4 pb-10">
        <Card className="w-full max-w-5xl grid md:grid-cols-[1fr_1.1fr] overflow-hidden">
          <aside className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            <div>
              <h2 className="text-2xl font-display font-extrabold">
                {isLogin ? "Welcome Back!" : "Create Your Account"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {isLogin
                  ? "Login to continue your preparation and track your progress."
                  : "Join millions of aspirants preparing for a better future."}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  ["📝 Mock Tests", "Practice with exam-level mock tests."],
                  ["🗞 Current Affairs", "Stay updated with the latest current affairs."],
                  ["📚 Exam Info", "Get detailed information about all government exams."],
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
          <section className="p-8">{isLogin ? <LoginForm /> : <SignupForm />}</section>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login({ email, password });
      toast.success("Signed in");
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold">Login to Your Account</h1>
      <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your account</p>
      <p className="text-sm text-muted-foreground mt-1">
        Enter your credentials to access your account
      </p>

      <form onSubmit={submit} className="space-y-4 mt-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="text-right mt-1.5">
            <a href="#" className="text-xs text-primary hover:underline">
              Forgot Password?
            </a>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </Button>
      </form>
      <p className="text-sm text-center mt-5 text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/auth" search={{ mode: "signup" } as never} className="text-primary font-medium">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (!accept) return toast.error("Please accept the Terms");
    setLoading(true);
    try {
      const res = await authService.register({ name: fullName, email, password });
      setAuth(res.token, res.user);
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold">Sign Up</h1>
      <p className="text-sm text-muted-foreground mt-1">Create an account to get started</p>

      <form onSubmit={submit} className="space-y-3 mt-6">
        <div>
          <Label htmlFor="fn">Full Name</Label>
          <Input
            id="fn"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <Label htmlFor="em">Email Address</Label>
          <Input
            id="em"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
        </div>
        <div>
          <Label htmlFor="mo">Mobile Number</Label>
          <Input
            id="mo"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter your mobile number"
          />
        </div>
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
          />
        </div>
        <div>
          <Label htmlFor="cpw">Confirm Password</Label>
          <Input
            id="cpw"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your password"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={accept} onCheckedChange={(v) => setAccept(!!v)} />I agree to the{" "}
          <a href="#" className="text-primary">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary">
            Privacy Policy
          </a>
          .
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Sign Up"}
        </Button>
      </form>
      <p className="text-sm text-center mt-5 text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" search={{ mode: "login" } as never} className="text-primary font-medium">
          Login
        </Link>
      </p>
    </div>
  );
}
