import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CarSessionRead } from "@/api/carSessions/types";
import { createCarSession, updateCarSession } from "@/api/carSessions";

import type { TeamCarRead } from "@/api/teamCars/types";
import type { UserRead } from "@/api/users/types";

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
  teamCarId: string;
  sessionType: string;
  date: string;
  trackName: string;
  driverUserId: string;
  laps: string;
  notes: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  editing: CarSessionRead | null;

  cars: TeamCarRead[];
  drivers: UserRead[];
  defaultTeamCarId?: number;

  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

const NONE = "__none__";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CarSessionUpsertDialog({
  open,
  onOpenChange,
  editing,
  cars,
  drivers,
  defaultTeamCarId,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      teamCarId: "",
      sessionType: "Practice",
      date: todayYYYYMMDD(),
      trackName: "",
      driverUserId: "",
      laps: "0",
      notes: "",
    },
  });

  const lockedCar = useMemo(() => {
    if (editing) {
      const hit = cars.find((c) => c.id === editing.teamCarId);
      return hit ?? null;
    }
    if (cars.length === 1) return cars[0];

    if (defaultTeamCarId) {
      const hit = cars.find((c) => c.id === defaultTeamCarId);
      if (hit) return hit;
    }

    return null;
  }, [editing, cars, defaultTeamCarId]);

  const carIsLocked = useMemo(() => {
    if (editing) return true;
    return !!lockedCar;
  }, [editing, lockedCar]);

  const title = useMemo(
    () => (editing ? `Edit Session #${editing.id}` : "Add Session"),
    [editing]
  );

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        teamCarId: String(editing.teamCarId),
        sessionType: editing.sessionType ?? "Practice",
        date: editing.date ?? todayYYYYMMDD(),
        trackName: editing.trackName ?? "",
        driverUserId: editing.driverUserId ? String(editing.driverUserId) : "",
        laps: String(editing.laps ?? 0),
        notes: editing.notes ?? "",
      });
    } else {
      const preselected =
        lockedCar?.id ?? (defaultTeamCarId ? defaultTeamCarId : undefined);

      form.reset({
        teamCarId: preselected ? String(preselected) : "",
        sessionType: "Practice",
        date: todayYYYYMMDD(),
        trackName: "",
        driverUserId: "",
        laps: "0",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultTeamCarId, lockedCar?.id]);

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const teamCarId = Number(v.teamCarId);
    if (!Number.isFinite(teamCarId) || teamCarId <= 0) {
      form.setError("teamCarId", { message: "Select a car." });
      return;
    }

    const trackName = (v.trackName ?? "").trim();
    if (!trackName) {
      form.setError("trackName", { message: "Track name is required." });
      return;
    }

    const rawLaps = (v.laps ?? "").trim();
    const laps = rawLaps === "" ? 0 : Number(rawLaps);
    if (!Number.isFinite(laps) || !Number.isInteger(laps) || laps < 0) {
      form.setError("laps", {
        message: "Laps must be a non-negative integer.",
      });
      return;
    }

    const driverUserId =
      (v.driverUserId ?? "").trim() === "" ? null : Number(v.driverUserId);

    setSaving(true);
    try {
      if (editing) {
        await updateCarSession(editing.id, {
          teamCarId,
          sessionType: (v.sessionType ?? "").trim() || "Practice",
          date: (v.date ?? "").trim() || todayYYYYMMDD(),
          trackName,
          driverUserId,
          laps,
          notes: (v.notes ?? "").trim() || null,
        });
      } else {
        await createCarSession({
          teamCarId,
          sessionType: (v.sessionType ?? "").trim() || "Practice",
          date: (v.date ?? "").trim() || todayYYYYMMDD(),
          trackName,
          driverUserId,
          laps,
          notes: (v.notes ?? "").trim() || null,
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

  const lockedLabel = useMemo(() => {
    if (lockedCar) {
      return `#${lockedCar.carNumber} — ${lockedCar.make} ${lockedCar.model}`;
    }
    if (editing) {
      return `#${editing.teamCarNumber ?? editing.teamCarId}`;
    }
    return "";
  }, [lockedCar, editing]);

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
                name="teamCarId"
                rules={{ validate: (x) => !!Number(x) || "Select a car." }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Car</FormLabel>

                    {carIsLocked ? (
                      <>
                        <input type="hidden" {...field} />

                        <div className="rounded-md border px-3 py-2 text-sm">
                          <div className="font-medium">{lockedLabel}</div>
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
                            <SelectValue placeholder="Select car" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cars.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              #{c.carNumber} — {c.make} {c.model}
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
                name="sessionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session type</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="e.g. Practice / Qualifying / Race"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                rules={{
                  validate: (x) =>
                    (x ?? "").trim() ? true : "Date is required.",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={!canEdit || saving}
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
                name="trackName"
                rules={{ required: "Track name is required." }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Track</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="e.g. Serres Circuit"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver (optional)</FormLabel>

                    <Select
                      value={
                        (field.value ?? "").trim() === "" ? NONE : field.value
                      }
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                      disabled={!canEdit || saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {drivers
                          .slice()
                          .filter(
                            (u) =>
                              u.isActive && (u.roles ?? []).includes("Driver")
                          )
                          .sort((a, b) =>
                            (a.name ?? "").localeCompare(b.name ?? "")
                          )
                          .map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
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
                name="laps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Laps</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        inputMode="numeric"
                        placeholder="e.g. 10"
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
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
                {saving
                  ? "Saving..."
                  : editing
                  ? "Save Changes"
                  : "Create Session"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to manage sessions.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
