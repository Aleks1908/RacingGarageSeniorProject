import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { IssueReportRead } from "@/api/issueReports/types";
import { createIssueReport, updateIssueReport } from "@/api/issueReports";

import type { TeamCarRead } from "@/api/teamCars/types";

import type { CarSessionRead } from "@/api/carSessions/types";
import { listCarSessionsForCar } from "@/api/carSessions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: IssueReportRead | null;
  cars: TeamCarRead[];
  currentUserId: number;
  canEdit: boolean;
  onSaved: () => Promise<void> | void;
  defaultTeamCarId?: number;
};

type IssueForm = {
  teamCarId: string;
  carSessionId: string;
  title: string;
  description: string;
  severity: string;
  status: "Open" | "Closed";
};

const severities = ["Low", "Medium", "High"] as const;
const EDIT_STATUSES: IssueForm["status"][] = ["Open", "Closed"];
const NONE = "__none__";

function coerceEditStatus(v: unknown): IssueForm["status"] {
  return v === "Closed" ? "Closed" : "Open";
}

function fmtSessionLabel(s: CarSessionRead) {
  const date = (s.date ?? "").slice(0, 10) || "—";
  const type = s.sessionType ?? "Session";
  const track = s.trackName ?? "—";
  return `${date} • ${type} @ ${track} (ID ${s.id})`;
}

export function IssueReportUpsertDialog({
  open,
  onOpenChange,
  editing,
  cars,
  currentUserId,
  canEdit,
  onSaved,
  defaultTeamCarId,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState<CarSessionRead[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const form = useForm<IssueForm>({
    defaultValues: {
      teamCarId: "",
      carSessionId: "",
      title: "",
      description: "",
      severity: "Medium",
      status: "Open",
    },
  });

  const dialogTitle = useMemo(
    () => (editing ? `Edit Issue #${editing.id}` : "New Issue Report"),
    [editing]
  );

  const selectedCarIdStr = form.watch("teamCarId");
  const selectedCarId = Number(selectedCarIdStr) || 0;

  const lockedCar = useMemo(() => {
    if (editing) return cars.find((c) => c.id === editing.teamCarId) ?? null;
    if (cars.length === 1) return cars[0];
    return null;
  }, [editing, cars]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        teamCarId: String(editing.teamCarId),
        carSessionId: editing.carSessionId ? String(editing.carSessionId) : "",
        title: editing.title ?? "",
        description: editing.description ?? "",
        severity: editing.severity ?? "Medium",
        status: coerceEditStatus(editing.status),
      });
    } else {
      form.reset({
        teamCarId: defaultTeamCarId ? String(defaultTeamCarId) : "",
        carSessionId: "",
        title: "",
        description: "",
        severity: "Medium",
        status: "Open",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultTeamCarId]);

  useEffect(() => {
    if (!open) return;

    if (!selectedCarId) {
      setSessions([]);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);

    listCarSessionsForCar(selectedCarId)
      .then((list) => {
        if (cancelled) return;
        setSessions(list ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setSessions([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedCarId]);

  const sessionsForCar = useMemo(() => {
    return (sessions ?? [])
      .slice()
      .sort(
        (a, b) =>
          (b.date ?? "").localeCompare(a.date ?? "") ||
          (b.id ?? 0) - (a.id ?? 0)
      );
  }, [sessions]);

  useEffect(() => {
    if (!open) return;

    const currentSessionId = Number(form.getValues("carSessionId")) || 0;
    if (!currentSessionId) return;

    const stillValid = sessionsForCar.some((s) => s.id === currentSessionId);
    if (!stillValid) form.setValue("carSessionId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCarId, sessionsForCar]);

  async function onSubmit(values: IssueForm) {
    setSaving(true);
    try {
      const teamCarId = Number(values.teamCarId);
      if (!teamCarId) throw new Error("Car is required.");
      if (!values.title.trim()) throw new Error("Title is required.");

      const carSessionId =
        (values.carSessionId ?? "").trim() === ""
          ? null
          : Number(values.carSessionId);

      if (
        carSessionId !== null &&
        (!Number.isFinite(carSessionId) || carSessionId <= 0)
      ) {
        throw new Error("Invalid session selection.");
      }

      const severity = values.severity;

      if (editing) {
        if (!canEdit) throw new Error("You don't have permission to edit.");

        const status = values.status;

        await updateIssueReport(editing.id, {
          teamCarId,
          carSessionId,
          linkedWorkOrderId: editing.linkedWorkOrderId ?? null,

          title: values.title.trim(),
          description: values.description?.trim() ?? "",

          severity,
          status,

          closedAt: status === "Closed" ? new Date().toISOString() : null,
        });
      } else {
        await createIssueReport({
          teamCarId,
          carSessionId,
          reportedByUserId: currentUserId,

          title: values.title.trim(),
          description: values.description?.trim() ?? "",
          severity,
          status: "Open",
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
                name="teamCarId"
                rules={{ validate: (v) => !!Number(v) || "Select a car" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Car</FormLabel>

                    {lockedCar ? (
                      <>
                        <input
                          type="hidden"
                          {...field}
                          value={String(lockedCar.id)}
                        />
                        <div className="rounded-md border px-3 py-2 text-sm">
                          <div className="font-medium">
                            #{lockedCar.carNumber} — {lockedCar.make}{" "}
                            {lockedCar.model}
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
                name="carSessionId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Session (optional)</FormLabel>

                    <Select
                      value={
                        (field.value ?? "").trim() === "" ? NONE : field.value
                      }
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                      disabled={saving || sessionsLoading || !selectedCarId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedCarId
                                ? "Select a car first"
                                : sessionsLoading
                                ? "Loading sessions…"
                                : "Unassigned"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>

                        {sessionsForCar.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {fmtSessionLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCarId &&
                    !sessionsLoading &&
                    sessionsForCar.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No sessions found for this car.
                      </div>
                    ) : null}

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Brake vibration"
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
                  <FormItem className="sm:col-span-2">
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
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {severities.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editing ? (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          field.onChange(v === "Closed" ? "Closed" : "Open")
                        }
                        disabled={saving || !canEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EDIT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
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
                  : "Create Issue"}
              </Button>
            </div>

            {editing && !canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to edit issues.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
