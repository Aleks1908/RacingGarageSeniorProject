import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import {
  deleteInventoryLocation,
  listInventoryLocations,
} from "@/api/inventoryLocations";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertTriangle,
  ArrowLeft,
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  MapPin,
} from "lucide-react";

import { InventoryLocationUpsertDialog } from "@/components/InventoryLocationUpsertDialog/InventoryLocationUpsertDialog";

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

export default function InventoryLocationsPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("PartsClerk"),
    [roles]
  );

  const [items, setItems] = useState<InventoryLocationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryLocationRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listInventoryLocations({ activeOnly });
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((l) => {
      const name = (l.name ?? "").toLowerCase();
      const code = (l.code ?? "").toLowerCase();
      const desc = (l.description ?? "").toLowerCase();
      return (
        name.includes(needle) || code.includes(needle) || desc.includes(needle)
      );
    });
  }, [items, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: InventoryLocationRead) {
    setEditing(row);
    setOpen(true);
  }

  async function onDelete(row: InventoryLocationRead) {
    const ok = confirm(`Deactivate location "${row.name}"?`);
    if (!ok) return;

    try {
      await deleteInventoryLocation(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!user) {
    return (
      <PageLayout title="Inventory Locations" subtitle="Location management">
        <div className="text-sm text-muted-foreground">Please sign in.</div>
      </PageLayout>
    );
  }

  if (!canManage) {
    return (
      <PageLayout title="Inventory Locations" subtitle="Location management">
        <Card className="p-4 border-destructive/40">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Access denied</div>
              <div className="text-muted-foreground">
                Only Parts Clerks and Managers can manage inventory locations.
              </div>
            </div>
          </div>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Inventory Locations" subtitle="Location management">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <MapPin className="h-4 w-4" />
            {loading ? "Loading..." : `${filtered.length} locations`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Location
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-xs text-muted-foreground">Search</div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, code, description..."
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Active only</div>
              <Button
                type="button"
                variant={activeOnly ? "default" : "outline"}
                onClick={() => setActiveOnly((v) => !v)}
              >
                {activeOnly ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>
        </Card>

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load locations</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-32">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-28">Active</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    No locations found.
                  </TableCell>
                </TableRow>
              )}

              {filtered
                .slice()
                .sort(
                  (a, b) =>
                    (a.name ?? "").localeCompare(b.name ?? "") || a.id - b.id
                )
                .map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {l.code}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.description?.trim() ? l.description : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateTime(l.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.isActive ? "secondary" : "outline"}>
                        {l.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(l)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(l)}
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>

        <InventoryLocationUpsertDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
          editing={editing}
          canEdit={canManage}
          onSaved={load}
        />
      </div>
    </PageLayout>
  );
}
