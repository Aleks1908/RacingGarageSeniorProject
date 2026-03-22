import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { listInventoryStock } from "@/api/inventoryStock";
import { listInventoryMovements } from "@/api/inventoryMovements";
import { listInventoryLocations } from "@/api/inventoryLocations";
import { listParts } from "@/api/parts";

import type { InventoryStockRead } from "@/api/inventoryStock/types";
import type { InventoryMovementRead } from "@/api/inventoryMovements/types";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";
import type { PartRead } from "@/api/parts/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  RefreshCcw,
  Boxes,
  AlertTriangle,
  Plus,
  PlusCircle,
} from "lucide-react";
import { InventoryAdjustDialog } from "@/components/InventoryAdjustDialog/InventoryAdjustDialog";

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

type TabKey = "stock" | "movements";

export const InventoryPage = () => {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const canAdjust = useMemo(
    () => roles.includes("Manager") || roles.includes("PartsClerk"),
    [roles]
  );

  const [stock, setStock] = useState<InventoryStockRead[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRead[]>([]);
  const [locations, setLocations] = useState<InventoryLocationRead[]>([]);
  const [partsAll, setPartsAll] = useState<PartRead[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("stock");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterPart, setFilterPart] = useState<string>("all");

  const [openDialog, setOpenDialog] = useState(false);
  const [selected, setSelected] = useState<InventoryStockRead | null>(null);

  const [defaultPartId, setDefaultPartId] = useState<number | null>(null);
  const [defaultLocationId, setDefaultLocationId] = useState<number | null>(
    null
  );

  const locationOptions = useMemo(() => {
    return locations
      .filter((l) => l.isActive)
      .map((l) => ({ id: l.id, code: l.code, name: l.name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [locations]);

  const partsFromStock = useMemo(() => {
    const map = new Map<number, { name: string; sku: string }>();
    for (const s of stock)
      map.set(s.partId, { name: s.partName, sku: s.partSku });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [stock]);

  const filteredStock = useMemo(() => {
    return stock
      .filter((s) =>
        filterLocation === "all"
          ? true
          : s.inventoryLocationId === Number(filterLocation)
      )
      .filter((s) =>
        filterPart === "all" ? true : s.partId === Number(filterPart)
      )
      .sort(
        (a, b) =>
          a.locationCode.localeCompare(b.locationCode) ||
          a.partSku.localeCompare(b.partSku)
      );
  }, [stock, filterLocation, filterPart]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [s, m, l, p] = await Promise.all([
        listInventoryStock(),
        listInventoryMovements(),
        listInventoryLocations({ activeOnly: true }),
        listParts({ activeOnly: true }),
      ]);
      setStock(s);
      setMovements(m);
      setLocations(l);
      setPartsAll(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReceive(prefill?: { partId?: number; locationId?: number }) {
    setSelected(null);
    setDefaultPartId(prefill?.partId ?? null);
    setDefaultLocationId(prefill?.locationId ?? null);
    setOpenDialog(true);
  }

  return (
    <PageLayout title="Inventory" subtitle="Stock overview and movements">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Boxes className="h-4 w-4" />
            {loading ? "Loading..." : `${stock.length} stock rows`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canAdjust && (
              <Button size="sm" onClick={() => openReceive()}>
                <Plus className="h-4 w-4 mr-2" />
                Receive stock
              </Button>
            )}
          </div>
        </div>

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load inventory</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="movements">Movements</TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Location</div>
                  <Select
                    value={filterLocation}
                    onValueChange={setFilterLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locationOptions.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.code} — {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Part</div>
                  <Select value={filterPart} onValueChange={setFilterPart}>
                    <SelectTrigger>
                      <SelectValue placeholder="All parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All parts</SelectItem>
                      {partsFromStock.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.sku} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {!loading && filteredStock.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-10"
                        >
                          No rows match the filters.
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredStock.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline">{s.locationCode}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {s.partName}
                            <span className="text-muted-foreground">
                              ({s.partSku})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {s.quantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDateTime(s.updatedAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canAdjust}
                              onClick={() =>
                                openReceive({
                                  partId: s.partId,
                                  locationId: s.inventoryLocationId,
                                })
                              }
                              title={canAdjust ? "Add stock" : "No permission"}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="movements" className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                Showing latest {movements.length} movements.
              </div>

              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Reason / Audit</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {!loading && movements.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-10"
                        >
                          No movements yet.
                        </TableCell>
                      </TableRow>
                    )}

                    {movements
                      .slice()
                      .sort(
                        (a, b) =>
                          (b.performedAt ?? "").localeCompare(
                            a.performedAt ?? ""
                          ) || (b.id ?? 0) - (a.id ?? 0)
                      )
                      .map((m) => {
                        const notes = (m.notes ?? "").trim();
                        const hasNotes = notes.length > 0;
                        const hasWO = m.workOrderId != null;

                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {fmtDateTime(m.performedAt)}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline">{m.locationCode}</Badge>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">
                                {m.partName}
                                <span className="text-muted-foreground">
                                  ({m.partSku})
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              <span
                                className={
                                  m.quantityChange < 0 ? "text-destructive" : ""
                                }
                              >
                                {m.quantityChange}
                              </span>
                            </TableCell>

                            <TableCell className="align-top">
                              <div className="font-medium">{m.reason}</div>

                              {(hasWO || hasNotes) && (
                                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                  {hasWO && (
                                    <div>WorkOrder #{m.workOrderId}</div>
                                  )}
                                  {hasNotes && <div>Notes: {notes}</div>}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground">
                              {m.performedByName ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>

        <InventoryAdjustDialog
          open={openDialog}
          onOpenChange={(v) => {
            setOpenDialog(v);
            if (!v) {
              setSelected(null);
              setDefaultPartId(null);
              setDefaultLocationId(null);
            }
          }}
          stock={selected}
          parts={partsAll}
          locations={locations}
          defaultPartId={defaultPartId}
          defaultLocationId={defaultLocationId}
          canEdit={canAdjust}
          onSaved={load}
        />
      </div>
    </PageLayout>
  );
};
