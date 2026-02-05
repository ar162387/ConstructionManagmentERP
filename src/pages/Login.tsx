import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Building2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isAuthenticated) {
    return <Navigate to="/invoices" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);

      if (loggedInUser) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate(loggedInUser.role === 'site_manager' ? '/invoices' : '/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Please check your credentials and try again.',
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      let message = 'Please check your credentials and try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
          .response;
        const data = res?.data;
        if (data?.errors && typeof data.errors === 'object') {
          const parts = Object.values(data.errors).flat();
          if (parts.length) message = parts.join(' ');
        } else if (data?.message) {
          message = data.message;
        }
      }
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'super@projectflow.com', role: 'Super Admin' },
    { email: 'admin@projectflow.com', role: 'Admin' },
    { email: 'manager@projectflow.com', role: 'Site Manager' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ProjectFlow</h1>
              <p className="text-sm opacity-80">Enterprise ERP System</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Manage Your Projects<br />With Confidence
            </h2>
            <p className="text-lg opacity-80 max-w-md">
              A comprehensive project management and financial system designed for modern enterprises.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <span className="text-2xl font-bold">50+</span>
                <span className="text-sm opacity-80">Projects<br />Managed</span>
              </div>
              <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <span className="text-2xl font-bold">$25M</span>
                <span className="text-sm opacity-80">Budget<br />Tracked</span>
              </div>
            </div>
          </div>

          <p className="text-sm opacity-60">
            © 2024 ProjectFlow ERP. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ProjectFlow</h1>
              <p className="text-sm text-muted-foreground">Enterprise ERP System</p>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo Accounts */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Demo Accounts</CardTitle>
              <CardDescription className="text-xs">
                Click to auto-fill credentials (password: any)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('demo123');
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{account.role}</p>
                    <p className="text-xs text-muted-foreground">{account.email}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
