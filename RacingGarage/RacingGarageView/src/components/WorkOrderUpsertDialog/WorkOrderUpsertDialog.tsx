import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createWorkOrder, updateWorkOrder } from "@/api/workOrders";
import { listIssueReports, linkIssueToWorkOrder } from "@/api/issueReports";
import type { IssueReportRead } from "@/api/issueReports/types";

import type { TeamCarRead } from "@/api/teamCars/types";
import type { UserRead } from "@/api/users/types";
import type { WorkOrderRead } from "@/api/shared/types";

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

type WorkOrderForm = {
  teamCarId: string;
  linkedIssueId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedToUserId: string;
};

const priorities = ["Low", "Medium", "High"] as const;
const statusesCreate = ["Open", "In Progress"] as const;
const statusesEdit = ["Open", "In Progress", "Closed"] as const;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  editing?: WorkOrderRead | null;

  cars: TeamCarRead[];
  mechanics: UserRead[];
  currentUserId: number;

  editingLinkedIssueId?: number | null;
  editingLinkedIssue?: IssueReportRead | null;

  onSaved?: () => void | Promise<void>;
};

export function WorkOrderUpsertDialog({
  open,
  onOpenChange,
  editing,
  cars,
  mechanics,
  currentUserId,
  editingLinkedIssueId,
  editingLinkedIssue,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesErr, setIssuesErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<IssueReportRead[]>([]);

  const lockedCar = useMemo(() => {
    if (editing) {
      return cars.find((c) => c.id === editing.teamCarId) ?? null;
    }

    if (cars.length === 1) return cars[0];

    return null;
  }, [editing, cars]);

  const form = useForm<WorkOrderForm>({
    defaultValues: {
      teamCarId: "all",
      linkedIssueId: "none",
      title: "",
      description: "",
      priority: "Medium",
      status: "Open",
      dueDate: "",
      assignedToUserId: "none",
    },
  });

  const dialogTitle = editing ? "Edit Work Order" : "New Work Order";

  const statusOptions = useMemo(() => {
    return editing ? statusesEdit : statusesCreate;
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) return;
    const cur = form.getValues("status");
    if (cur === "Closed") {
      form.setValue("status", "Open", { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const teamCarIdStr = form.watch("teamCarId");
  const teamCarIdNum =
    teamCarIdStr && teamCarIdStr !== "all" ? Number(teamCarIdStr) : 0;

  const editLinkedId = useMemo(() => {
    return typeof editingLinkedIssueId === "number"
      ? editingLinkedIssueId
      : null;
  }, [editingLinkedIssueId]);

  const issuesForSelect = useMemo(() => {
    const base = issues.slice();

    if (editing && editingLinkedIssue) {
      const exists = base.some((x) => x.id === editingLinkedIssue.id);
      if (!exists) base.unshift(editingLinkedIssue);
    }

    const seen = new Set<number>();
    return base.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  }, [issues, editing, editingLinkedIssue]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      const due = editing.dueDate ? editing.dueDate.slice(0, 10) : "";
      form.reset({
        teamCarId: String(editing.teamCarId),
        linkedIssueId: editLinkedId ? String(editLinkedId) : "none",
        title: editing.title ?? "",
        description: editing.description ?? "",
        priority: editing.priority ?? "Medium",
        status: editing.status ?? "Open",
        dueDate: due,
        assignedToUserId: editing.assignedToUserId
          ? String(editing.assignedToUserId)
          : "none",
      });
    } else {
      form.reset({
        teamCarId: lockedCar ? String(lockedCar.id) : "all",
        linkedIssueId: "none",
        title: "",
        description: "",
        priority: "Medium",
        status: "Open",
        dueDate: "",
        assignedToUserId: "none",
      });
    }

    setIssues([]);
    setIssuesErr(null);
    setIssuesLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, editLinkedId, lockedCar?.id]);

  useEffect(() => {
    if (!open) return;

    if (!teamCarIdNum || !Number.isFinite(teamCarIdNum) || teamCarIdNum <= 0) {
      setIssues([]);
      setIssuesErr(null);
      setIssuesLoading(false);
      form.setValue("linkedIssueId", "none", { shouldDirty: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIssuesLoading(true);
        setIssuesErr(null);

        const list = await listIssueReports({
          teamCarId: teamCarIdNum,
          status: "Open",
        });

        if (cancelled) return;

        const filtered = list.filter((i) => {
          if (i.status !== "Open") return false;
          if (i.linkedWorkOrderId == null) return true;
          if (editing && i.linkedWorkOrderId === editing.id) return true;
          return false;
        });

        setIssues(filtered);
      } catch (e) {
        if (cancelled) return;
        setIssuesErr(e instanceof Error ? e.message : "Failed to load issues.");
        setIssues([]);
      } finally {
        if (!cancelled) setIssuesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamCarIdNum, editing?.id]);

  useEffect(() => {
    if (!open) return;
    if (!editing) return;
    if (!editLinkedId) return;

    const current = form.getValues("linkedIssueId");
    if (current === String(editLinkedId)) return;

    const exists = issuesForSelect.some((x) => x.id === editLinkedId);
    if (exists) {
      form.setValue("linkedIssueId", String(editLinkedId), {
        shouldDirty: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, editLinkedId, issuesForSelect.length]);

  const canSubmit = useMemo(() => !saving, [saving]);

  async function applyIssueLink(
    workOrderId: number,
    nextIssueId: number | null,
  ) {
    const prevIssueId = editing ? (editLinkedId ?? null) : null;

    if (editing && prevIssueId === nextIssueId) return;

    if (editing && prevIssueId && prevIssueId !== nextIssueId) {
      await linkIssueToWorkOrder(prevIssueId, null);
    }

    if (nextIssueId) {
      await linkIssueToWorkOrder(nextIssueId, workOrderId);
    }
  }

  async function onSubmit(values: WorkOrderForm) {
    setSaving(true);
    try {
      const teamCarId =
        values.teamCarId === "all" ? 0 : Number(values.teamCarId);
      if (!teamCarId) throw new Error("Team car is required.");
      if (!values.title.trim()) throw new Error("Title is required.");

      const dueDate = values.dueDate
        ? new Date(values.dueDate).toISOString()
        : null;

      const assignedToUserId =
        values.assignedToUserId && values.assignedToUserId !== "none"
          ? Number(values.assignedToUserId)
          : null;

      const issueId =
        values.linkedIssueId && values.linkedIssueId !== "none"
          ? Number(values.linkedIssueId)
          : null;

      if (editing) {
        await updateWorkOrder(editing.id, {
          teamCarId,
          title: values.title.trim(),
          description: values.description?.trim() ?? "",
          priority: values.priority,
          status: values.status,
          dueDate,
          closedAt:
            values.status === "Closed" ? new Date().toISOString() : null,
          assignedToUserId,
          carSessionId: editing.carSessionId ?? null,
        });

        await applyIssueLink(editing.id, issueId);
      } else {
        const created = await createWorkOrder({
          teamCarId,
          createdByUserId: currentUserId,
          title: values.title.trim(),
          description: values.description?.trim() ?? "",
          priority: values.priority,
          status: values.status,
          dueDate,
          assignedToUserId,
          carSessionId: null,
        });

        await applyIssueLink(created.id, issueId);
      }

      onOpenChange(false);
      if (onSaved) await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const issuesDisabled =
    saving || issuesLoading || !teamCarIdNum || issuesForSelect.length === 0;

  const issuesPlaceholder = !teamCarIdNum
    ? "Select a car first"
    : issuesLoading
      ? "Loading issues..."
      : issuesForSelect.length === 0
        ? "No open issues for this car"
        : "No linked issue";

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
                rules={{ validate: (v) => v !== "all" || "Select a car" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Car <span className="text-destructive">*</span></FormLabel>

                    {lockedCar ? (
                      <>
                        <input
                          type="hidden"
                          {...field}
                          value={String(lockedCar.id)}
                        />
                        <div className="rounded-md border px-3 py-2 text-sm">
                          <div className="font-medium">
                            #{lockedCar.carNumber} — {lockedCar.make}
                            {lockedCar.model}
                          </div>
                        </div>
                      </>
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={saving}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select car" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Select car…</SelectItem>
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
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Brake inspection" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedIssueId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 mb-4">
                    <FormLabel>Link Issue (Open)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={issuesDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={issuesPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No linked issue</SelectItem>
                        {issuesForSelect.map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            #{i.id} — {i.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {issuesErr ? (
                      <p className="text-xs text-destructive mt-1 -mb-3">
                        {issuesErr}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 -mb-3">
                        Only <b>Open</b> issues for the selected car are shown.
                      </p>
                    )}
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
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned mechanic</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {mechanics.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.firstName} {m.lastName} ({m.email})
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((s) => (
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

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={saving} />
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
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Work Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
