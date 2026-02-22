import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { adjustInventoryStock } from "@/api/inventoryStock";
import type { InventoryStockRead } from "@/api/inventoryStock/types";

import { listWorkOrders } from "@/api/workOrders";
import type { WorkOrderRead } from "@/api/shared/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { PartRead } from "@/api/parts/types";
import type { InventoryLocationRead } from "@/api/inventoryLocations/types";

type FormValues = {
  quantityChange: string;
  reason: string;
  notes: string;

  workOrderId: string;

  partId: string;
  inventoryLocationId: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  stock: InventoryStockRead | null;

  parts?: PartRead[];
  locations?: InventoryLocationRead[];

  defaultPartId?: number | null;
  defaultLocationId?: number | null;

  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

const WO_STATUS_ALLOWED = new Set(["Open", "In Progress"]);

export function InventoryAdjustDialog({
  open,
  onOpenChange,
  stock,
  parts,
  locations,
  defaultPartId = null,
  defaultLocationId = null,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [workOrders, setWorkOrders] = useState<WorkOrderRead[]>([]);
  const [woLoading, setWoLoading] = useState(false);
  const [woErr, setWoErr] = useState<string | null>(null);

  const receiveMode = !stock;

  const form = useForm<FormValues>({
    defaultValues: {
      quantityChange: "",
      reason: receiveMode ? "Receive" : "Adjustment",
      notes: "",
      workOrderId: "none",
      partId: "",
      inventoryLocationId: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      quantityChange: "",
      reason: receiveMode ? "Receive" : "Adjustment",
      notes: "",
      workOrderId: "none",
      partId: receiveMode && defaultPartId ? String(defaultPartId) : "",
      inventoryLocationId:
        receiveMode && defaultLocationId ? String(defaultLocationId) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stock?.id, defaultPartId, defaultLocationId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        setWoLoading(true);
        setWoErr(null);

        const list = await listWorkOrders();
        if (cancelled) return;

        const filtered = (list ?? []).filter(
          (wo) => wo.status && WO_STATUS_ALLOWED.has(wo.status)
        );

        filtered.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

        setWorkOrders(filtered);
      } catch (e) {
        if (cancelled) return;
        setWoErr(
          e instanceof Error ? e.message : "Failed to load work orders."
        );
        setWorkOrders([]);
      } finally {
        if (!cancelled) setWoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const title = useMemo(() => {
    if (stock)
      return `Adjust: ${stock.partName} (${stock.partSku}) @ ${stock.locationCode}`;
    return "Receive / Add stock";
  }, [stock]);

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const rawQty = (v.quantityChange ?? "").trim();
    if (!rawQty) {
      form.setError("quantityChange", {
        message: "Quantity change is required.",
      });
      return;
    }
    const qty = Number(rawQty);
    if (!Number.isFinite(qty) || !Number.isInteger(qty)) {
      form.setError("quantityChange", {
        message: "Must be an integer number.",
      });
      return;
    }
    if (qty === 0) {
      form.setError("quantityChange", { message: "Cannot be 0." });
      return;
    }

    const rawWo = (v.workOrderId ?? "none").trim();
    let workOrderId: number | null = null;
    if (rawWo !== "none") {
      const wo = Number(rawWo);
      if (!Number.isFinite(wo) || !Number.isInteger(wo) || wo <= 0) {
        form.setError("workOrderId", { message: "Invalid work order." });
        return;
      }
      workOrderId = wo;
    }

    let partId: number;
    let inventoryLocationId: number;

    if (stock) {
      partId = stock.partId;
      inventoryLocationId = stock.inventoryLocationId;
    } else {
      const rawPartId = (v.partId ?? "").trim();
      const rawLocId = (v.inventoryLocationId ?? "").trim();

      if (!rawPartId) {
        form.setError("partId", { message: "Select a part." });
        return;
      }
      if (!rawLocId) {
        form.setError("inventoryLocationId", { message: "Select a location." });
        return;
      }

      partId = Number(rawPartId);
      inventoryLocationId = Number(rawLocId);

      if (!Number.isFinite(partId) || partId <= 0) {
        form.setError("partId", { message: "Invalid part selected." });
        return;
      }
      if (!Number.isFinite(inventoryLocationId) || inventoryLocationId <= 0) {
        form.setError("inventoryLocationId", {
          message: "Invalid location selected.",
        });
        return;
      }
    }

    setSaving(true);
    try {
      await adjustInventoryStock({
        partId,
        inventoryLocationId,
        quantityChange: qty,
        reason:
          (v.reason ?? "").trim() || (receiveMode ? "Receive" : "Adjustment"),
        notes: (v.notes ?? "").trim() || "",
        workOrderId,
      });

      onOpenChange(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setSaving(false);
    }
  }

  const canRenderReceive =
    !stock &&
    Array.isArray(parts) &&
    parts.length > 0 &&
    Array.isArray(locations) &&
    locations.length > 0;

  const workOrderPlaceholder = woLoading
    ? "Loading work orders..."
    : workOrders.length === 0
    ? "No open work orders"
    : "Click to select";

  const workOrderSelectDisabled =
    !canEdit || saving || woLoading || workOrders.length === 0;

  const lockedLocation = useMemo(() => {
    if (!receiveMode) return null;
    if (!defaultLocationId) return null;
    return (locations ?? []).find((l) => l.id === defaultLocationId) ?? null;
  }, [receiveMode, defaultLocationId, locations]);

  const lockedPart = useMemo(() => {
    if (!receiveMode) return null;
    if (!defaultPartId) return null;
    return (parts ?? []).find((p) => p.id === defaultPartId) ?? null;
  }, [receiveMode, defaultPartId, parts]);

  const WorkOrderField = (
    <FormField
      control={form.control}
      name="workOrderId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Work order (optional)</FormLabel>
          <Select
            value={field.value ?? "none"}
            onValueChange={field.onChange}
            disabled={workOrderSelectDisabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={workOrderPlaceholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Click to select</SelectItem>
              {workOrders.map((wo) => (
                <SelectItem key={wo.id} value={String(wo.id)}>
                  #{wo.id} — {wo.title} ({wo.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {woErr ? (
            <div className="text-xs text-destructive">{woErr}</div>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {stock ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Current qty:{" "}
              <span className="font-medium text-foreground">
                {stock.quantity}
              </span>
            </div>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <div className="text-sm font-medium">
                      {stock.locationCode}
                    </div>
                  </FormItem>

                  <FormItem>
                    <FormLabel>Part</FormLabel>
                    <div className="text-sm font-medium">
                      {stock.partSku} — {stock.partName}
                    </div>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="quantityChange"
                    rules={{
                      validate: (x) => {
                        const s = (x ?? "").trim();
                        if (!s) return "Quantity change is required.";
                        const n = Number(s);
                        if (!Number.isFinite(n) || !Number.isInteger(n))
                          return "Must be an integer number.";
                        if (n === 0) return "Cannot be 0.";
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity change</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            inputMode="numeric"
                            disabled={!canEdit || saving}
                            placeholder="e.g. 5 or -2"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {WorkOrderField}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input
                            disabled={!canEdit || saving}
                            placeholder="Adjustment / Receive / Audit..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input
                            disabled={!canEdit || saving}
                            placeholder="Optional notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={!canEdit || saving}>
                    {saving ? "Saving..." : "Apply adjustment"}
                  </Button>
                </div>

                {!canEdit && (
                  <div className="text-xs text-muted-foreground">
                    You don’t have permission to adjust inventory.
                  </div>
                )}
              </form>
            </Form>
          </div>
        ) : canRenderReceive ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Choose a part + location, then enter the quantity you’re receiving
              (use negative only if you really mean to reduce stock).
            </div>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="inventoryLocationId"
                    rules={{
                      validate: (x) =>
                        (x ?? "").trim() ? true : "Select a location.",
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>

                        {lockedLocation ? (
                          <>
                            <input
                              type="hidden"
                              {...field}
                              value={String(lockedLocation.id)}
                            />

                            <div className="rounded-md border px-3 py-2 text-sm">
                              <div className="font-medium">
                                {lockedLocation.code} — {lockedLocation.name}
                              </div>
                            </div>
                          </>
                        ) : (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            disabled={!canEdit || saving}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations!.map((l) => (
                                <SelectItem key={l.id} value={String(l.id)}>
                                  {l.code} — {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partId"
                    rules={{
                      validate: (x) =>
                        (x ?? "").trim() ? true : "Select a part.",
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part</FormLabel>

                        {lockedPart ? (
                          <>
                            <input
                              type="hidden"
                              {...field}
                              value={String(lockedPart.id)}
                            />

                            <div className="rounded-md border px-3 py-2 text-sm">
                              <div className="font-medium">
                                {lockedPart.sku} — {lockedPart.name}
                              </div>
                            </div>
                          </>
                        ) : (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            disabled={!canEdit || saving}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select part" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {parts!
                                .slice()
                                .sort((a, b) =>
                                  (a.sku ?? "").localeCompare(b.sku ?? "")
                                )
                                .map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.sku} — {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantityChange"
                    rules={{
                      validate: (x) => {
                        const s = (x ?? "").trim();
                        if (!s) return "Quantity is required.";
                        const n = Number(s);
                        if (!Number.isFinite(n) || !Number.isInteger(n))
                          return "Must be an integer number.";
                        if (n === 0) return "Cannot be 0.";
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            inputMode="numeric"
                            disabled={!canEdit || saving}
                            placeholder="e.g. 10"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {WorkOrderField}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input
                            disabled={!canEdit || saving}
                            placeholder="Receive / Adjustment / Audit..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input
                            disabled={!canEdit || saving}
                            placeholder="Optional notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={!canEdit || saving}>
                    {saving ? "Saving..." : "Receive / add stock"}
                  </Button>
                </div>

                {!canEdit && (
                  <div className="text-xs text-muted-foreground">
                    You don’t have permission to adjust inventory.
                  </div>
                )}
              </form>
            </Form>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground space-y-2">
            <div>To receive stock, the dialog needs both:</div>
            <ul className="list-disc pl-5">
              <li>parts list (props.parts)</li>
              <li>locations list (props.locations)</li>
            </ul>
            <div>Load them in the page and pass them in.</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
