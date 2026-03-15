import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createPartInstallation } from "@/api/partInstallations";
import type { InventoryStockRead } from "@/api/inventoryStock/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type FormValues = {
  stockRowId: string;
  quantity: string;
  notes: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  workOrderId: number;

  stockRows: InventoryStockRead[];

  canEdit: boolean;

  onSaved: () => Promise<void> | void;
};

export function PartInstallDialog({
  open,
  onOpenChange,
  workOrderId,
  stockRows,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      stockRowId: "",
      quantity: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ stockRowId: "", quantity: "", notes: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workOrderId]);

  const options = useMemo(() => {
    return stockRows
      .slice()
      .sort(
        (a, b) =>
          a.locationCode.localeCompare(b.locationCode) ||
          a.partSku.localeCompare(b.partSku)
      )
      .map((s) => ({
        id: s.id,
        label: `${s.locationCode} — ${s.partSku} (${s.partName}) [qty: ${s.quantity}]`,
      }));
  }, [stockRows]);

  const stockRowIdStr = form.watch("stockRowId");

  const selectedStock = useMemo(() => {
    const id = Number(stockRowIdStr);
    if (!Number.isFinite(id) || id <= 0) return null;
    return stockRows.find((s) => s.id === id) ?? null;
  }, [stockRows, stockRowIdStr]);

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const stockRowId = Number((v.stockRowId ?? "").trim());
    if (!Number.isFinite(stockRowId) || stockRowId <= 0) {
      form.setError("stockRowId", { message: "Select a stock row." });
      return;
    }

    const stock = stockRows.find((s) => s.id === stockRowId);
    if (!stock) {
      form.setError("stockRowId", { message: "Invalid selection." });
      return;
    }

    const rawQty = (v.quantity ?? "").trim();
    if (!rawQty) {
      form.setError("quantity", { message: "Quantity is required." });
      return;
    }

    const qty = Number(rawQty);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      form.setError("quantity", {
        message: "Quantity must be a positive integer.",
      });
      return;
    }

    if (qty > stock.quantity) {
      form.setError("quantity", {
        message: `Not enough stock. Available=${stock.quantity}.`,
      });
      return;
    }

    setSaving(true);
    try {
      await createPartInstallation({
        workOrderId,
        partId: stock.partId,
        inventoryLocationId: stock.inventoryLocationId,
        quantity: qty,
        notes: v.notes?.trim() ?? "",
      });

      onOpenChange(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Install failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Installed Part</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="stockRowId"
                rules={{ validate: (x) => (x ? true : "Select a stock row.") }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Stock row</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={!canEdit || saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location + part..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                rules={{
                  validate: (x) => {
                    const s = (x ?? "").trim();
                    if (!s) return "Quantity is required.";
                    const n = Number(s);
                    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
                      return "Quantity must be a positive integer.";
                    if (selectedStock && n > selectedStock.quantity)
                      return `Not enough stock (available ${selectedStock.quantity}).`;
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        inputMode="numeric"
                        placeholder="e.g. 1"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
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
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
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
                {saving ? "Saving..." : "Add part"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to install parts.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
