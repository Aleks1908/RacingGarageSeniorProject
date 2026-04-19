import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { setUserRole } from "@/api/users";
import type { UserRead, UserSetRole } from "@/api/users/types";

import { Button } from "@/components/ui/button";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = { role: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserRead | null;
  onSaved: () => Promise<void> | void;
};

const ROLE_OPTIONS = ["Manager", "Mechanic", "PartsClerk", "Driver"] as const;

export function UserRoleDialog({ open, onOpenChange, user, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: { role: "" },
  });

  useEffect(() => {
    if (!open) return;
    const current = user?.roles?.[0] ?? "Mechanic";
    form.reset({ role: current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const title = useMemo(() => {
    if (!user) return "Change role";
    return `Change role: ${user.firstName} ${user.lastName}`;
  }, [user]);

  async function onSubmit(v: FormValues) {
    if (!user) return;
    const role = (v.role ?? "").trim();
    if (!role) {
      form.setError("role", { message: "Role is required." });
      return;
    }

    const dto: UserSetRole = { role };

    setSaving(true);
    try {
      await setUserRole(user.id, dto);
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="text-sm text-muted-foreground">No user selected.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Current role:
              {(user.roles ?? []).length ? user.roles.join(", ") : "—"}
            </div>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="role"
                  rules={{ required: "Role is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New role</FormLabel>
                      <FormControl>
                        <Select
                          disabled={saving}
                          value={field.value ?? ""}
                          onValueChange={(x) => field.onChange(x)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    {saving ? "Saving..." : "Save role"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
