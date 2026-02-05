import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BankAccounts from "./pages/BankAccounts";
import Analytics from "./pages/Analytics";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Projects from "./pages/Projects";
import Inventory from "./pages/Inventory";
import Personnel from "./pages/Personnel";
import Vendors from "./pages/Vendors";
import VendorInvoices from "./pages/VendorInvoices";
import Contractors from "./pages/Contractors";
import ContractorBilling from "./pages/ContractorBilling";
import StockConsumption from "./pages/StockConsumption";
import Receiving from "./pages/Receiving";
import StoreInventory from "./pages/StoreInventory";
import Expenses from "./pages/Expenses";
import ProjectDashboard from "./pages/ProjectDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="prism-theme" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ProjectProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bank" element={<BankAccounts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/personnel" element={<Personnel />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/invoices" element={<VendorInvoices />} />
            <Route path="/contractors" element={<Contractors />} />
            <Route path="/contractor-billing" element={<ContractorBilling />} />
            <Route path="/stock-consumption" element={<StockConsumption />} />
            <Route path="/inventory/receiving" element={<Receiving />} />
            <Route path="/inventory/store" element={<StoreInventory />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
            </ProjectProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
