import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createUser } from "@/api/users";
import type { UserCreate } from "@/api/users/types";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = {
  name: string;
  email: string;
  password: string;
  role: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => Promise<void> | void;
};

const ROLE_OPTIONS = ["Manager", "Mechanic", "PartsClerk"] as const;

export function UserCreateDialog({ open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "Mechanic",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "Mechanic",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const title = useMemo(() => "Create user", []);

  async function onSubmit(v: FormValues) {
    const name = v.name.trim();
    const email = v.email.trim();

    if (!name) {
      form.setError("name", { message: "Name is required." });
      return;
    }
    if (!email) {
      form.setError("email", { message: "Email is required." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      form.setError("email", { message: "Invalid email." });
      return;
    }
    if (!v.password || v.password.length < 6) {
      form.setError("password", { message: "Password must be 6+ chars." });
      return;
    }
    if (!v.role) {
      form.setError("role", { message: "Role is required." });
      return;
    }

    const dto: UserCreate = {
      name,
      email,
      password: v.password,
      role: v.role,
    };

    setSaving(true);
    try {
      await createUser(dto);
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Name is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={saving}
                        placeholder="e.g. John Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{
                  validate: (x) => {
                    const s = (x ?? "").trim();
                    if (!s) return "Email is required.";
                    if (!/^\S+@\S+\.\S+$/.test(s)) return "Invalid email.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        disabled={saving}
                        placeholder="e.g. john@garage.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{
                  validate: (x) => {
                    if (!x) return "Password is required.";
                    if (x.length < 6) return "Password must be 6+ chars.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary password</FormLabel>
                    <FormControl>
                      <Input
                        disabled={saving}
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                rules={{ required: "Role is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        disabled={saving}
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger className="w-full">
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
                {saving ? "Creating..." : "Create user"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
