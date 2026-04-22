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
import { Switch } from "@/components/ui/switch";
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
  const [formError, setFormError] = useState<string | null>(null);

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

    setFormError(null);

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

  function handleApiError(e: unknown) {
    const msg = e instanceof Error ? e.message : "Save failed";

    // Route well-known backend messages to the relevant field so they appear
    // inline under the field rather than as a generic banner.
    if (/name is required/i.test(msg) || /supplier with name/i.test(msg)) {
      form.setError("name", { message: msg });
    } else if (/email/i.test(msg)) {
      form.setError("contactEmail", { message: msg });
    } else if (/phone/i.test(msg)) {
      form.setError("phone", { message: msg });
    } else {
      setFormError(msg);
    }
  }

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    setFormError(null);

    const base = {
      name: v.name.trim(),
      contactEmail: (v.contactEmail ?? "").trim(),
      phone: (v.phone ?? "").trim(),
      addressLine1: (v.addressLine1 ?? "").trim(),
      addressLine2: (v.addressLine2 ?? "").trim(),
      city: (v.city ?? "").trim(),
      country: (v.country ?? "").trim(),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, { ...base, isActive: !!v.isActive });
      } else {
        await createSupplier({ ...base, isActive: !!v.isActive });
      }

      onOpenChange(false);
      await onSaved();
    } catch (e) {
      handleApiError(e);
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
          {/* noValidate disables browser-native field popups so react-hook-form
              controls all validation feedback via FormMessage */}
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  validate: (v) =>
                    !!(v ?? "").trim() || "Name is required",
                }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Brembo S.p.A."
                        disabled={!canEdit || saving}
                        {...field}
                      />
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
                        autoComplete="email"
                        inputMode="email"
                        disabled={!canEdit || saving}
                        placeholder="Optional (e.g. sales@company.com)"
                        {...field}
                        onBlur={() => {
                          field.onChange((field.value ?? "").trim());
                          field.onBlur();
                        }}
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
                        {...field}
                        onBlur={() => {
                          field.onChange((field.value ?? "").trim());
                          field.onBlur();
                        }}
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
                        {...field}
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
                        {...field}
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
                        {...field}
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
                        {...field}
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
                        Disable instead of deleting, for history preservation.
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canEdit || saving}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {formError && (
              <p className="text-sm font-medium text-destructive">{formError}</p>
            )}

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
                You don't have permission to manage suppliers.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
