import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createWorkOrderTask, updateWorkOrderTask } from "@/api/workOrderTasks";
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

const TASK_STATUSES = ["Todo", "Done"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && TASK_STATUSES.includes(v as TaskStatus);
}
type FormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  estimatedMinutes: string; 
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  workOrderId: number;
  editing: WorkOrderTaskRead | null;

  canEdit: boolean;
  onSaved: () => Promise<void> | void;
};

export function WorkOrderTaskUpsertDialog({
  open,
  onOpenChange,
  workOrderId,
  editing,
  canEdit,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      status: "Todo",
      estimatedMinutes: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.reset({
        title: editing.title ?? "",
        description: editing.description ?? "",
        status: isTaskStatus(editing.status) ? editing.status : "Todo",
        estimatedMinutes:
          editing.estimatedMinutes === null ||
          editing.estimatedMinutes === undefined
            ? ""
            : String(editing.estimatedMinutes),
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: "Todo",
        estimatedMinutes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, workOrderId]);

  const dialogTitle = useMemo(
    () => (editing ? "Edit Task" : "Add Task"),
    [editing]
  );

  async function onSubmit(v: FormValues) {
    if (!canEdit) return;

    const title = (v.title ?? "").trim();
    if (!title) {
      form.setError("title", { message: "Title is required." });
      return;
    }

    const rawMin = (v.estimatedMinutes ?? "").trim();
    let estimatedMinutes: number | null = null;
    if (rawMin !== "") {
      const n = Number(rawMin);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        form.setError("estimatedMinutes", {
          message: "Estimated minutes must be a non-negative integer.",
        });
        return;
      }
      estimatedMinutes = n;
    }

    const status: TaskStatus = v.status ?? "Todo";
    const completedAt = status === "Done" ? new Date().toISOString() : null;

    setSaving(true);
    try {
      if (editing) {
        await updateWorkOrderTask(editing.id, {
          title,
          description: (v.description ?? "").trim(),
          status,
          sortOrder: 0, 
          estimatedMinutes,
          completedAt,
        });
      } else {
        await createWorkOrderTask({
          workOrderId,
          title,
          description: (v.description ?? "").trim(),
          status,
          sortOrder: 0, 
          estimatedMinutes,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        placeholder="e.g. Replace brake pads"
                        {...field}
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
                name="status"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Status</FormLabel>

                    <Select
                      value={field.value ?? "Todo"}
                      onValueChange={(val) => {
                        if (isTaskStatus(val)) field.onChange(val);
                      }}
                      disabled={!canEdit || saving}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
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
                name="estimatedMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated minutes (optional)</FormLabel>
                    <FormControl>
                      <Input
                        disabled={!canEdit || saving}
                        inputMode="numeric"
                        placeholder="e.g. 45"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
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
                {saving ? "Saving..." : editing ? "Save Task" : "Add Task"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-xs text-muted-foreground">
                You don’t have permission to manage tasks.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
