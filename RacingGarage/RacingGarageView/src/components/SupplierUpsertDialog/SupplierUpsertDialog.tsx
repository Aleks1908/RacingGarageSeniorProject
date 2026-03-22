import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { createSupplier, updateSupplier } from "@/api/suppliers";
import type { SupplierRead } from "@/api/suppliers/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type FormValues = {
  name: string;
  contactEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  isActive: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SupplierRead | null;
  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string) {
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (!/^[0-9+\-().\s]+$/.test(s)) return false;
  return true;
}

export function SupplierUpsertDialog({
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
      contactEmail: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      country: "",
      isActive: true,
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        name: editing.name ?? "",
        contactEmail: editing.contactEmail ?? "",
        phone: editing.phone ?? "",
        addressLine1: editing.addressLine1 ?? "",
        addressLine2: editing.addressLine2 ?? "",
        city: editing.city ?? "",
        country: editing.country ?? "",
        isActive: editing.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        contactEmail: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        country: "",
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const name = (v.name ?? "").trim();
    if (!name) {
      form.setError("name", { message: "Name is required." });
      return;
    }

    const contactEmailRaw = (v.contactEmail ?? "").trim();
    const phoneRaw = (v.phone ?? "").trim();

    if (contactEmailRaw && !isValidEmail(contactEmailRaw)) {
      form.setError("contactEmail", {
        message: "Enter a valid email address.",
      });
      return;
    }

    if (phoneRaw && !isValidPhone(phoneRaw)) {
      form.setError("phone", {
        message:
          "Enter a valid phone number (digits, spaces, +, -, parentheses).",
      });
      return;
    }

    const base = {
      name,
      contactEmail: contactEmailRaw || null,
      phone: phoneRaw || null,
      addressLine1: (v.addressLine1 ?? "").trim() || null,
      addressLine2: (v.addressLine2 ?? "").trim() || null,
      city: (v.city ?? "").trim() || null,
      country: (v.country ?? "").trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, { ...base, isActive: !!v.isActive });
      } else {
        await createSupplier(base);
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
          <DialogTitle>
            {editing ? "Edit Supplier" : "New Supplier"}
          </DialogTitle>
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
                      <Input disabled={!canEdit || saving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                rules={{
                  validate: (v) => {
                    const s = (v ?? "").trim();
                    if (!s) return true;
                    return isValidEmail(s) || "Enter a valid email address.";
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        disabled={!canEdit || saving}
                        placeholder="Optional (e.g. sales@company.com)"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={(e) => field.onChange(e.target.value.trim())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                rules={{
                  validate: (v) => {
                    const s = (v ?? "").trim();
                    if (!s) return true;
                    return (
                      isValidPhone(s) ||
                      "Enter a valid phone number (7–15 digits)."
                    );
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        disabled={!canEdit || saving}
                        placeholder="Optional (e.g. +359 88 123 4567)"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={(e) => field.onChange(e.target.value.trim())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address line 1</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="Optional"
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
                name="addressLine2"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address line 2</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="Optional"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="Optional"
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="Optional"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 flex items-center gap-3 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                          disabled={!canEdit || saving}
                        />
                      </FormControl>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Active</div>
                        <div className="text-xs text-muted-foreground">
                          Disable instead of deleting, for history preservation.
                        </div>
                      </div>
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
              <Button type="submit" disabled={!canEdit || saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to manage suppliers.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
