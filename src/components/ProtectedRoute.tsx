import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Minimum role required: "Admin" = Admin or Super Admin; "Super Admin" = Super Admin only */
  requiredRole?: "Admin" | "Super Admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const defaultPath = user.role === "Site Manager" ? "/projects" : "/";
  if (requiredRole === "Super Admin" && user.role !== "Super Admin") {
    return <Navigate to={defaultPath} replace />;
  }
  if (requiredRole === "Admin" && user.role !== "Admin" && user.role !== "Super Admin") {
    return <Navigate to={defaultPath} replace />;
  }

  return <>{children}</>;
}
