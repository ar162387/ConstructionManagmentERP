import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MockStoreProvider } from "@/context/MockStore";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import ConsumableInventory from "./pages/ConsumableInventory";
import ItemLedger from "./pages/ItemLedger";
import NonConsumableInventory from "./pages/NonConsumableInventory";
import NonConsumableItemLedger from "./pages/NonConsumableItemLedger";
import Vendors from "./pages/Vendors";
import VendorLedger from "./pages/VendorLedger";
import Contractors from "./pages/Contractors";
import Employees from "./pages/Employees";
import BankAccounts from "./pages/BankAccounts";
import Expenses from "./pages/Expenses";
import Machinery from "./pages/Machinery";
import MachineLedger from "./pages/MachineLedger";
import Liabilities from "./pages/Liabilities";
import AuditLogs from "./pages/AuditLogs";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MockStoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/inventory/consumable" element={<ConsumableInventory />} />
          <Route path="/inventory/consumable/:itemId" element={<ItemLedger />} />
          <Route path="/inventory/non-consumable" element={<NonConsumableInventory />} />
          <Route path="/inventory/non-consumable/:itemId" element={<NonConsumableItemLedger />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/:vendorId" element={<VendorLedger />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/bank-accounts" element={<BankAccounts />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/machinery" element={<Machinery />} />
          <Route path="/machinery/:machineId" element={<MachineLedger />} />
          <Route path="/liabilities" element={<Liabilities />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </MockStoreProvider>
  </QueryClientProvider>
);

export default App;
