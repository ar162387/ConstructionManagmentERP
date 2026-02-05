import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Building2 className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">ProjectFlow ERP</h1>
          <p className="mt-2 text-xl text-muted-foreground">
            Enterprise Project Management System
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/login')}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
