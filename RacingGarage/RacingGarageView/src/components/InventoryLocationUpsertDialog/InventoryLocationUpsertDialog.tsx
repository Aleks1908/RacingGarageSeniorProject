import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { InventoryLocationRead } from "@/api/inventoryLocations/types";
import {
  createInventoryLocation,
  updateInventoryLocation,
} from "@/api/inventoryLocations";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InventoryLocationRead | null;
  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

type FormValues = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

export function InventoryLocationUpsertDialog({
  open,
  onOpenChange,
  editing,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
    },
  });

  const dialogTitle = useMemo(
    () => (editing ? `Edit Location #${editing.id}` : "New Inventory Location"),
    [editing],
  );

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        name: editing.name ?? "",
        code: editing.code ?? "",
        description: editing.description ?? "",
        isActive: !!editing.isActive,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (!canEdit)
        throw new Error("You don't have permission to manage locations.");
      if (!values.name.trim()) throw new Error("Name is required.");
      if (!values.code.trim()) throw new Error("Code is required.");

      const name = values.name.trim();
      const code = values.code.trim().toUpperCase();
      const description = values.description?.trim() ?? "";

      if (editing) {
        await updateInventoryLocation(editing.id, {
          name,
          code,
          description,
          isActive: values.isActive,
        });
      } else {
        await createInventoryLocation({
          name,
          code,
          description,
          isActive: values.isActive,
        });
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
      <DialogContent className="sm:max-w-162.5">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
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
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Main Shelf A"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                rules={{ required: "Code is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. A1"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        If off, this location won't be selectable for stock
                        movements, but stays in history.
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

              <Button
                type="submit"
                disabled={saving || (!!editing && !canEdit)}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Location"}
              </Button>
            </div>

            {editing && !canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to edit locations.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
