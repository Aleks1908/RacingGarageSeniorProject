import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createTeamCar, updateTeamCar } from "@/api/teamCars";
import type { TeamCarRead } from "@/api/teamCars/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const carStatuses = ["Active", "Service", "Retired"] as const;

export type TeamCarForm = {
  carNumber: string;
  nickname: string;
  make: string;
  model: string;
  year: string;
  carClass: string;
  status: string;
  odometerKm: string;
};

const makeDefaults = (): TeamCarForm => ({
  carNumber: "",
  nickname: "",
  make: "",
  model: "",
  year: "",
  carClass: "",
  status: "Active",
  odometerKm: "",
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  editing: TeamCarRead | null;

  onSaved: () => Promise<void> | void;

  disabled?: boolean;
};

export function TeamCarUpsertDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  disabled,
}: Props) {
  const [saving, setSaving] = useState(false);

  const title = editing ? "Edit Car" : "New Car";

  const form = useForm<TeamCarForm>({
    defaultValues: makeDefaults(),
  });

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        carNumber: editing.carNumber,
        nickname: editing.nickname ?? "",
        make: editing.make ?? "",
        model: editing.model ?? "",
        year: String(editing.year),
        carClass: editing.carClass ?? "",
        status: editing.status ?? "Active",
        odometerKm:
          editing.odometerKm != null ? String(editing.odometerKm) : "",
      });
    } else {
      form.reset(makeDefaults());
    }
  }, [open, editing, form]);

  const canSubmit = useMemo(() => !saving && !disabled, [saving, disabled]);

  async function onSubmit(values: TeamCarForm) {
    setSaving(true);
    try {
      const odometerKm =
        values.odometerKm.trim() === "" ? 0 : Number(values.odometerKm);

      const year =
        values.year.trim() === ""
          ? new Date().getFullYear()
          : Number(values.year);

      if (!Number.isFinite(year) || year < 1950)
        throw new Error("Year looks too low.");

      if (!Number.isFinite(odometerKm) || odometerKm < 0) {
        throw new Error("Odometer cannot be negative.");
      }

      const payload = {
        ...values,
        carNumber: values.carNumber.trim(),
        nickname: values.nickname?.trim() ?? "",
        make: values.make.trim(),
        model: values.model.trim(),
        carClass: values.carClass.trim(),
        status: values.status?.trim() || "Active",
        year,
        odometerKm,
      };

      if (editing) {
        await updateTeamCar(editing.id, payload);
      } else {
        await createTeamCar(payload);
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
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="carNumber"
                rules={{ required: "Car number is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 27"
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. The Rocket"
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                rules={{ required: "Make is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="BMW" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                rules={{ required: "Model is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="E46" {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                rules={{
                  min: { value: 1950, message: "Year looks too low" },
                  required: "Year is required",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2025"
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carClass"
                rules={{ required: "Class is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="GT4 / Time Attack / ..."
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>

                        <SelectContent>
                          {carStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                rules={{ required: "Odometer is required" }}
                name="odometerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 120000"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={disabled}
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

              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Car"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
