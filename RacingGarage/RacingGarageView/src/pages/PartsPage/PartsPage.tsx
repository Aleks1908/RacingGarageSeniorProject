import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { deletePart, listParts } from "@/api/parts";
import type { PartRead } from "@/api/parts/types";

import { listSuppliers } from "@/api/suppliers";
import type { SupplierRead } from "@/api/suppliers/types";

import { listInventoryLocations } from "@/api/inventoryLocations";
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
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  PlusCircle,
} from "lucide-react";

import { PartsUpsertDialog } from "@/components/PartsUpsertDialog/PartsUpsertDialog";
import { InventoryAdjustDialog } from "@/components/InventoryAdjustDialog/InventoryAdjustDialog";

export const PartsPage = () => {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("PartsClerk"),
    [roles]
  );

  const [items, setItems] = useState<PartRead[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartRead | null>(null);

  const [openReceive, setOpenReceive] = useState(false);
  const [receivePart, setReceivePart] = useState<PartRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [parts, sups, locs] = await Promise.all([
        listParts({ activeOnly }),
        listSuppliers({ activeOnly: false }),
        listInventoryLocations({ activeOnly: true }),
      ]);

      setItems(parts);
      setSuppliers(sups);
      setLocations(locs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load parts.");
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
    return items.filter(
      (p) =>
        p.sku.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle) ||
        (p.category ?? "").toLowerCase().includes(needle) ||
        (p.supplierName ?? "").toLowerCase().includes(needle)
    );
  }, [items, q]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: PartRead) {
    setEditing(row);
    setOpen(true);
  }

  function openReceiveForPart(p: PartRead) {
    setReceivePart(p);
    setOpenReceive(true);
  }

  async function onDelete(row: PartRead) {
    const ok = confirm(`Delete part ${row.sku}?`);
    if (!ok) return;

    try {
      await deletePart(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout title="Parts" subtitle="Parts catalog and reorder points">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Package className="h-4 w-4" />
            {loading ? "Loading..." : `${filtered.length} parts`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Part
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
                placeholder="Search by SKU, name, category, supplier..."
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
                <div className="font-medium">Couldn’t load parts</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-44">Category</TableHead>
                <TableHead className="w-32 text-right">Unit cost</TableHead>
                <TableHead className="w-36 text-right">Reorder</TableHead>
                <TableHead className="w-40">Supplier</TableHead>
                <TableHead className="w-28 text-right">Stock</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="text-right w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-10"
                  >
                    No parts found.
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.sku}</TableCell>

                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {p.id}
                    </div>
                  </TableCell>

                  <TableCell>{p.category || "—"}</TableCell>

                  <TableCell className="text-right">
                    {Number(p.unitCost ?? 0).toFixed(2)}
                  </TableCell>

                  <TableCell className="text-right">{p.reorderPoint}</TableCell>

                  <TableCell>{p.supplierName ?? "—"}</TableCell>

                  <TableCell className="text-right">
                    {p.currentStock ?? "0"}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={p.isActive ? "secondary" : "outline"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>

                      {p.needsReorder ? (
                        <Badge variant="destructive">Reorder</Badge>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !canManage || !p.isActive || locations.length === 0
                        }
                        onClick={() => openReceiveForPart(p)}
                        title={
                          locations.length === 0
                            ? "No active inventory locations"
                            : !p.isActive
                            ? "Part is inactive"
                            : canManage
                            ? "Receive stock"
                            : "No permission"
                        }
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => onDelete(p)}
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
          <PartsUpsertDialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
            editing={editing}
            suppliers={suppliers}
            onSaved={load}
          />
        )}

        {canManage && (
          <InventoryAdjustDialog
            open={openReceive}
            onOpenChange={(v) => {
              setOpenReceive(v);
              if (!v) setReceivePart(null);
            }}
            stock={null}
            parts={items}
            locations={locations}
            defaultPartId={receivePart?.id ?? null}
            canEdit={canManage}
            onSaved={load}
          />
        )}
      </div>
    </PageLayout>
  );
};
