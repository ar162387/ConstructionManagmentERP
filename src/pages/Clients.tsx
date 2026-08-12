import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClients } from "@/hooks/useClients";
import { createClient, updateClient, type ApiClient } from "@/services/clientsService";
import { toast } from "sonner";

export default function Clients() {
  const { clients, loading, error, refetch } = useClients();
  const [name, setName] = useState(""); const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApiClient | null>(null); const [editName, setEditName] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { await createClient(name); setName(""); await refetch(); toast.success("Client saved"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save client"); } finally { setSaving(false); } };
  const saveEdit = async (event: React.FormEvent) => { event.preventDefault(); if (!editing) return; setSaving(true); try { await updateClient(editing.id, editName); setEditing(null); await refetch(); toast.success("Client updated"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update client"); } finally { setSaving(false); } };
  return <Layout><PageHeader title="Clients" subtitle="Create, edit, and review client payment ledgers" />
    <form onSubmit={submit} className="flex gap-2 max-w-md mb-6"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" /><Button variant="warning" disabled={saving}>{saving ? "Saving…" : "Add Client"}</Button></form>
    {error ? <p className="text-destructive">{error}</p> : loading ? <p className="text-muted-foreground">Loading clients…</p> : <div className="rounded-xl border bg-card divide-y">{clients.length ? clients.map((client) => <div key={client.id} className="flex items-center justify-between p-4 hover:bg-muted/30"><span className="font-medium">{client.name}</span><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${client.name}`} onClick={() => { setEditing(client); setEditName(client.name); }}><Pencil className="h-4 w-4" /></Button><Link to={`/clients/${client.id}/ledger`} className="text-primary text-sm hover:underline">View ledger</Link></div></div>) : <p className="p-6 text-muted-foreground">No clients yet</p>}</div>}
    <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader><form onSubmit={saveEdit} className="space-y-4"><div><label className="text-xs">Client name</label><Input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="warning" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></DialogFooter></form></DialogContent></Dialog>
  </Layout>;
}
