import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

import type { PartRead, PartCreate, PartUpdate } from "@/api/parts/types";

import { createPart, updatePart } from "@/api/parts";
import type { SupplierRead } from "@/api/suppliers/types";

type PartForm = {
  name: string;
  sku: string;
  category: string;
  unitCost: string;
  reorderPoint: string;
  supplierId: string;
  isActive: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  editing: PartRead | null;

  suppliers: SupplierRead[];

  onSaved: () => Promise<void> | void;
};

export function PartsUpsertDialog({
  open,
  onOpenChange,
  editing,
  suppliers,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<PartForm>({
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      unitCost: "0",
      reorderPoint: "0",
      supplierId: "none",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        name: editing.name ?? "",
        sku: editing.sku ?? "",
        category: editing.category ?? "",
        unitCost: String(editing.unitCost ?? 0),
        reorderPoint: String(editing.reorderPoint ?? 0),
        supplierId: editing.supplierId ? String(editing.supplierId) : "none",
        isActive: editing.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        category: "",
        unitCost: "0",
        reorderPoint: "0",
        supplierId: "none",
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const title = useMemo(() => {
    return editing ? `Edit Part (ID ${editing.id})` : "New Part";
  }, [editing]);

  async function onSubmit(v: PartForm) {
    const name = v.name.trim();
    const sku = v.sku.trim().toUpperCase();
    const category = v.category.trim();

    if (!name) {
      form.setError("name", { message: "Name is required." });
      return;
    }
    if (!sku) {
      form.setError("sku", { message: "Sku is required." });
      return;
    }
    if (!category) {
      form.setError("category", { message: "Category is required." });
      return;
    }

    const unitCost = Number(v.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      form.setError("unitCost", { message: "Unit cost must be 0 or more." });
      return;
    }

    const reorderPoint = Number(v.reorderPoint);
    if (!Number.isFinite(reorderPoint) || reorderPoint < 0) {
      form.setError("reorderPoint", {
        message: "Reorder point must be 0 or more.",
      });
      return;
    }

    const supplierId = v.supplierId === "none" ? null : Number(v.supplierId);

    if (supplierId !== null && !Number.isFinite(supplierId)) {
      form.setError("supplierId", { message: "Supplier must be a number." });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const dto: PartUpdate = {
          name,
          sku,
          category,
          unitCost,
          reorderPoint,
          supplierId,
          isActive: !!v.isActive,
        };
        await updatePart(editing.id, dto);
      } else {
        const dto: PartCreate = {
          name,
          sku,
          category,
          unitCost,
          reorderPoint,
          supplierId,
        };
        await createPart(dto);
      }

      onOpenChange(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Brake Pads"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                rules={{ required: "Sku is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sku</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. BP-001"
                        disabled={saving}
                        {...field}
                        onBlur={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Brakes"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder point</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        inputMode="numeric"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Supplier (optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {suppliers
                          .filter((s) => s.isActive)
                          .map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          If off, this part won’t be selectable for installs,
                          but stays in history.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                          disabled={saving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
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
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editing
                  ? "Save changes"
                  : "Create part"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
