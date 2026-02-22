import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createLaborLog, updateLaborLog } from "@/api/laborLogs";
import type { LaborLogRead } from "@/api/laborLogs/types";

import { updateWorkOrderTask } from "@/api/workOrderTasks";
import type { WorkOrderTaskRead } from "@/api/workOrderTasks/types";

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

import { Checkbox } from "@/components/ui/checkbox";

type TaskOption = { id: number; title: string; status: "Todo" | "Done" };
type FormValues = {
  taskId: string;
  minutes: string;
  logDate: string;
  comment: string;
  completeTask: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  workOrderTaskId?: number;

  tasks: TaskOption[];
  tasksFull: WorkOrderTaskRead[];

  editing: LaborLogRead | null;

  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function LaborLogUpsertDialog({
  open,
  onOpenChange,
  workOrderTaskId,
  tasks,
  tasksFull,
  editing,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      taskId: "",
      minutes: "",
      logDate: todayDateOnly(),
      comment: "",
      completeTask: false,
    },
  });

  const forcedTaskId = useMemo(() => {
    return workOrderTaskId && workOrderTaskId > 0 ? workOrderTaskId : null;
  }, [workOrderTaskId]);

  const isCreate = !editing;

  const shouldPickTask = useMemo(() => {
    return isCreate && (!workOrderTaskId || workOrderTaskId <= 0);
  }, [isCreate, workOrderTaskId]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        taskId: String(editing.workOrderTaskId),
        minutes: String(editing.minutes ?? ""),
        logDate: editing.logDate
          ? editing.logDate.slice(0, 10)
          : todayDateOnly(),
        comment: editing.comment ?? "",
        completeTask: false,
      });
      return;
    }

    const preselected =
      workOrderTaskId && workOrderTaskId > 0 ? String(workOrderTaskId) : "";

    form.reset({
      taskId: preselected,
      minutes: "",
      logDate: todayDateOnly(),
      comment: "",
      completeTask: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, workOrderTaskId, tasks.length]);

  const title = useMemo(
    () => (editing ? "Edit Labor Log" : "Log Labor"),
    [editing]
  );

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const rawTaskId = (v.taskId ?? "").trim();
    let taskIdNum: number | null = null;

    if (editing) {
      taskIdNum = editing.workOrderTaskId;
    } else {
      if (!rawTaskId) {
        form.setError("taskId", { message: "Task is required." });
        return;
      }
      const n = Number(rawTaskId);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
        form.setError("taskId", { message: "Invalid task." });
        return;
      }
      taskIdNum = n;
    }

    const rawMin = (v.minutes ?? "").trim();
    if (!rawMin) {
      form.setError("minutes", { message: "Minutes is required." });
      return;
    }
    const minutes = Number(rawMin);
    if (
      !Number.isFinite(minutes) ||
      !Number.isInteger(minutes) ||
      minutes <= 0
    ) {
      form.setError("minutes", {
        message: "Minutes must be a positive integer.",
      });
      return;
    }

    const rawDate = (v.logDate ?? "").trim();
    if (!rawDate) {
      form.setError("logDate", { message: "Date is required." });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      form.setError("logDate", { message: "Invalid date format." });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateLaborLog(editing.id, {
          minutes,
          logDate: rawDate,
          comment: v.comment?.trim() ?? "",
        });
      } else {
        await createLaborLog({
          workOrderTaskId: taskIdNum!,
          minutes,
          logDate: rawDate,
          comment: v.comment?.trim() ?? "",
        });
      }

      if (v.completeTask && taskIdNum) {
        const full = tasksFull.find((t) => t.id === taskIdNum);
        if (!full)
          throw new Error("Task details not available to complete it.");

        const now = new Date().toISOString();
        const COMPLETED_STATUS = "Done";

        await updateWorkOrderTask(taskIdNum, {
          title: full.title ?? "",
          description: full.description ?? "",
          status: COMPLETED_STATUS,
          sortOrder: full.sortOrder ?? 0,
          estimatedMinutes: full.estimatedMinutes ?? null,
          completedAt: now,
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

  const selectedTaskId = useMemo(() => {
    if (editing) return editing.workOrderTaskId;
    const n = Number((form.watch("taskId") ?? "").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, form.watch("taskId")]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              {isCreate && !forcedTaskId && (
                <FormField
                  control={form.control}
                  name="taskId"
                  rules={{
                    validate: (x) => {
                      if (!isCreate) return true;
                      if (!shouldPickTask) return true;
                      const s = (x ?? "").trim();
                      if (!s) return "Task is required.";
                      const n = Number(s);
                      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
                        return "Invalid task.";
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Task</FormLabel>
                      <FormControl>
                        <Select
                          disabled={!canEdit || saving || !!editing}
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a task..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tasks
                              .filter((t) => t.status === "Todo")
                              .map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  #{t.id} — {t.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                      {editing ? (
                        <div className="text-xs text-muted-foreground">
                          Task can’t be changed when editing.
                        </div>
                      ) : null}
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="minutes"
                rules={{
                  validate: (x) => {
                    const s = (x ?? "").trim();
                    if (!s) return "Minutes is required.";
                    const n = Number(s);
                    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
                      return "Minutes must be a positive integer.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        inputMode="numeric"
                        placeholder="e.g. 30"
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
                name="logDate"
                rules={{
                  validate: (x) => {
                    const s = (x ?? "").trim();
                    if (!s) return "Date is required.";
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
                      return "Invalid date format.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        type="date"
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
                name="comment"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Comment (optional)</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="Optional notes"
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
                name="completeTask"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <div className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                        disabled={!canEdit || saving || !selectedTaskId}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          Mark task as completed
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Saves the labor log and sets the task status to{" "}
                          <b>Done</b>.
                        </div>
                      </div>
                    </div>
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
                {saving ? "Saving..." : editing ? "Save Log" : "Log Labor"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to manage labor logs.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
