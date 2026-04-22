import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { deleteSupplier, listSuppliers } from "@/api/suppliers";
import type { SupplierRead } from "@/api/suppliers/types";

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
  Truck,
} from "lucide-react";
import { SupplierUpsertDialog } from "@/components/SupplierUpsertDialog/SupplierUpsertDialog";
import { fmtDateTime } from "@/lib/utils";

function fmtAddress(s: SupplierRead) {
  const line1 = (s.addressLine1 ?? "").trim();
  const line2 = (s.addressLine2 ?? "").trim();
  const city = (s.city ?? "").trim();
  const country = (s.country ?? "").trim();

  const lines: string[] = [];
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityCountry = [city, country].filter(Boolean).join(", ");
  if (cityCountry) lines.push(cityCountry);

  return lines.length ? lines.join(" • ") : "—";
}

export default function SuppliersPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("PartsClerk"),
    [roles]
  );

  const [items, setItems] = useState<SupplierRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listSuppliers({ activeOnly });
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load suppliers.");
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

    return items.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      const email = (s.contactEmail ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      const city = (s.city ?? "").toLowerCase();
      const country = (s.country ?? "").toLowerCase();

      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        city.includes(needle) ||
        country.includes(needle)
      );
    });
  }, [items, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: SupplierRead) {
    setEditing(row);
    setOpen(true);
  }

  async function onDelete(row: SupplierRead) {
    const ok = confirm(`Delete supplier "${row.name}"?`);
    if (!ok) return;

    try {
      await deleteSupplier(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout title="Suppliers" subtitle="Supplier management">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Truck className="h-4 w-4" />
            {loading ? "Loading..." : `${filtered.length} suppliers`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Supplier
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-xs text-muted-foreground">Search</div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, phone, city, country..."
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
                <div className="font-medium">Couldn’t load suppliers</div>
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-28">Active</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    No suppliers found.
                  </TableCell>
                </TableRow>
              )}

              {filtered
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
                .map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>

                    <TableCell>{s.contactEmail ?? "—"}</TableCell>

                    <TableCell>{s.phone ?? "—"}</TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {fmtAddress(s)}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateTime(s.createdAt)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={s.isActive ? "secondary" : "outline"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canManage}
                          onClick={() => openEdit(s)}
                          title={canManage ? "Edit" : "No permission"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!canManage}
                          onClick={() => onDelete(s)}
                          title={canManage ? "Delete" : "No permission"}
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

        {canManage && (
          <SupplierUpsertDialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
            editing={editing}
            canEdit={canManage}
            onSaved={load}
          />
        )}
      </div>
    </PageLayout>
  );
}
