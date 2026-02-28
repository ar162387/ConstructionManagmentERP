import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, Shield, UserCog, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { name: "Super Admin", email: "superadmin@erp.com", role: "Super Admin" as const },
  { name: "Company Admin", email: "admin@erp.com", role: "Admin" as const },
  { name: "Site Manager", email: "site.mgr@erp.com", role: "Site Manager" as const },
];

const roleIcons: Record<string, React.ReactNode> = {
  "Super Admin": <Shield className="h-6 w-6" />,
  Admin: <UserCog className="h-6 w-6" />,
  "Site Manager": <User className="h-6 w-6" />,
};

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === "Site Manager" ? "/projects" : "/"} replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid email or password");
      setLoading(false);
    }
  };

  const selectAccount = (email: string) => {
    setEmail(email);
    setPassword("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="flex items-center gap-3 mb-10">
        <HardHat className="h-10 w-10 text-warning" />
        <span className="text-2xl font-bold tracking-tight">BuildERP</span>
      </div>

      <Card className="w-full max-w-lg border-2 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign In</CardTitle>
          <CardDescription>Enter your credentials or select an account below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@erp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" variant="warning" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </span>
            <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
              Or select account to fill email
            </span>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((u) => (
              <Button
                key={u.email}
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-auto py-3 px-4 justify-start gap-3 border-2 hover:border-primary hover:bg-primary/5"
                )}
                onClick={() => selectAccount(u.email)}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    u.role === "Super Admin" && "bg-warning/20 text-warning",
                    u.role === "Admin" && "bg-primary/20 text-primary",
                    u.role === "Site Manager" && "bg-success/20 text-success"
                  )}
                >
                  {roleIcons[u.role]}
                </span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-6">
        Construction Company ERP · Default password: password123
      </p>
    </div>
  );
}
