import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import PageLayout from "@/components/PageLayout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/auth/useAuth";

import { getWorkOrderDetails, updateWorkOrder } from "@/api/workOrders";
import type { WorkOrderDetails } from "@/api/workOrders/types";

import { getTeamCar } from "@/api/teamCars";
import type { TeamCarRead } from "@/api/teamCars/types";

import { listUsers } from "@/api/users";
import type { UserRead } from "@/api/users/types";

import type { WorkOrderRead } from "@/api/shared/types";
import type { LaborLogRead } from "@/api/laborLogs/types";

import { WorkOrderUpsertDialog } from "@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog";

import { WorkOrderTaskUpsertDialog } from "@/components/WorkOrderTaskUpsertDialog/WorkOrderTaskUpsertDialog";
import { LaborLogUpsertDialog } from "@/components/LaborLogUpsertDialog/LaborLogUpsertDialog";
import { PartInstallDialog } from "@/components/PartInstallDialog/PartInstallDialog";

import { listInventoryStock } from "@/api/inventoryStock";
import type { InventoryStockRead } from "@/api/inventoryStock/types";

import { deleteWorkOrderTask } from "@/api/workOrderTasks";
import { deleteLaborLog } from "@/api/laborLogs";
import { deletePartInstallation } from "@/api/partInstallations";

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
}

const STATUS_OPTIONS = ["Open", "In Progress", "Closed"] as const;

export const WorkOrderDetailsPage = () => {
  const nav = useNavigate();
  const { id } = useParams();
  const workOrderId = Number(id);

  const { user } = useAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roles = user?.roles ?? [];

  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("Mechanic"),
    [roles]
  );

  const [data, setData] = useState<WorkOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [car, setCar] = useState<TeamCarRead | null>(null);
  const [carErr, setCarErr] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRead[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsErr, setDepsErr] = useState<string | null>(null);

  const mechanics = useMemo(
    () => users.filter((u) => u.isActive && u.roles.includes("Mechanic")),
    [users]
  );

  const [editOpen, setEditOpen] = useState(false);

  const [taskOpen, setTaskOpen] = useState(false);

  const [laborOpen, setLaborOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<LaborLogRead | null>(null);
  const [forcedTaskId, setForcedTaskId] = useState<number | undefined>(
    undefined
  );

  const [partOpen, setPartOpen] = useState(false);
  const [stockRows, setStockRows] = useState<InventoryStockRead[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockErr, setStockErr] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [deleting, setDeleting] = useState<{
    kind: "task" | "labor" | "part";
    id: number;
  } | null>(null);

  async function loadDetails() {
    setErr(null);
    setLoading(true);
    try {
      const resp = await getWorkOrderDetails(workOrderId);
      setData(resp);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load work order.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(workOrderId) || workOrderId <= 0) {
      setErr("Invalid work order id.");
      setLoading(false);
      return;
    }
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  useEffect(() => {
    const teamCarId = data?.workOrder?.teamCarId;
    if (!teamCarId) return;

    let cancelled = false;
    (async () => {
      try {
        setCarErr(null);
        const c = await getTeamCar(teamCarId);
        if (!cancelled) setCar(c);
      } catch (e) {
        if (cancelled) return;
        setCar(null);
        setCarErr(e instanceof Error ? e.message : "Failed to load car.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.workOrder?.teamCarId]);

  useEffect(() => {
    if (!canManage) return;
    if (!editOpen) return;

    let cancelled = false;
    (async () => {
      try {
        setDepsLoading(true);
        setDepsErr(null);
        const userList = await listUsers();
        if (!cancelled) setUsers(userList);
      } catch (e) {
        if (cancelled) return;
        setDepsErr(
          e instanceof Error ? e.message : "Failed to load edit data."
        );
      } finally {
        if (!cancelled) setDepsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManage, editOpen]);

  async function quickSetStatus(nextStatus: string) {
    if (!canManage) return;
    if (!data) return;
    if (statusSaving) return;

    const wo = data.workOrder;
    const current = wo.status ?? "Open";
    if (current === nextStatus) return;

    setStatusSaving(true);
    try {
      await updateWorkOrder(wo.id, {
        teamCarId: wo.teamCarId,
        assignedToUserId: wo.assignedToUserId ?? null,
        carSessionId: wo.carSessionId ?? null,

        title: wo.title ?? "",
        description: wo.description ?? "",
        priority: wo.priority ?? "Medium",
        status: nextStatus,

        dueDate: wo.dueDate ?? null,
        closedAt: nextStatus === "Closed" ? new Date().toISOString() : null,
      });

      await loadDetails();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDeleteTask(taskId: number) {
    if (!canManage) return;
    if (!confirm("Delete this task?")) return;

    setDeleting({ kind: "task", id: taskId });
    try {
      await deleteWorkOrderTask(taskId);
      await loadDetails();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete task");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteLabor(laborId: number) {
    if (!canManage) return;
    if (!confirm("Delete this labor log?")) return;

    setDeleting({ kind: "labor", id: laborId });
    try {
      await deleteLaborLog(laborId);
      await loadDetails();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete labor log");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeletePart(installId: number) {
    if (!canManage) return;
    if (
      !confirm("Delete this installed part entry? This will restore inventory.")
    )
      return;

    setDeleting({ kind: "part", id: installId });
    try {
      await deletePartInstallation(installId);
      await loadDetails();
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Failed to delete part installation"
      );
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    if (!partOpen) return;

    let cancelled = false;
    (async () => {
      try {
        setStockLoading(true);
        setStockErr(null);
        const rows = await listInventoryStock();
        if (!cancelled) setStockRows(rows);
      } catch (e) {
        if (cancelled) return;
        setStockErr(e instanceof Error ? e.message : "Failed to load stock.");
        setStockRows([]);
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partOpen]);

  const counts = useMemo(() => {
    if (!data) return null;
    return {
      tasks: data.tasks.length,
      labor: data.laborLogs.length,
      installs: data.partInstallations.length,
    };
  }, [data]);

  const taskOptions = useMemo(() => {
    return (data?.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: (t.status as "Todo" | "Done") ?? "Todo",
    }));
  }, [data?.tasks]);

  if (loading) {
    return (
      <PageLayout title="Work Order" subtitle="Loading details...">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </PageLayout>
    );
  }

  if (err || !data) {
    return (
      <PageLayout title="Work Order" subtitle="Details">
        <div className="text-sm text-destructive">{err ?? "Not found."}</div>
      </PageLayout>
    );
  }

  const wo = data.workOrder;
  const woAsRead = wo as unknown as WorkOrderRead;
  const linked = data.linkedIssue ?? null;

  const carTitle = car
    ? `#${wo.teamCarNumber} ${car.make} ${car.model} (${car.year})`
    : "";
  const carNickname = car?.nickname?.trim() ? car.nickname.trim() : "";

  return (
    <PageLayout
      title={`#${wo.id} ${wo.title}`}
      subtitle={`${wo.status} • ${wo.priority}`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => nav(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={depsLoading || !!depsErr}
              title={depsErr ?? undefined}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {carErr ? (
          <div className="text-xs text-destructive">Car: {carErr}</div>
        ) : null}

        {canManage && depsErr && (
          <div className="text-sm text-destructive">
            Edit is unavailable: {depsErr}
          </div>
        )}

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <div className="min-w-0">
                  <div className="font-medium leading-tight">
                    {carTitle ? (
                      <span className="font-normal">{carTitle}</span>
                    ) : null}
                  </div>

                  {carNickname ? (
                    <div className="text-xs font-medium text-muted-foreground">
                      Nickname:
                      <span className="font-medium text-muted-foreground">
                        {carNickname}
                      </span>
                    </div>
                  ) : null}
                </div>

                {canManage && (
                  <div className="max-w-44">
                    <Select
                      value={wo.status ?? "Open"}
                      onValueChange={(v) => quickSetStatus(v)}
                      disabled={statusSaving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">{wo.status}</Badge>
                <Badge variant="secondary">{wo.priority}</Badge>
              </div>
            </CardTitle>

            {wo.description ? (
              <div className="space-y-1">
                <div className="text-md font-medium">Description</div>
                <p className="text-sm text-muted-foreground">
                  {wo.description}
                </p>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <div>Created by</div>
                <div className="text-muted-foreground">{wo.createdByName}</div>
              </div>
              <div>
                <div>Assigned to</div>
                <div className="text-muted-foreground">
                  {wo.assignedToName ?? "Unassigned"}
                </div>
              </div>
              <div>
                <div>Created</div>
                <div className="text-muted-foreground">
                  {fmtDateTime(wo.createdAt)}
                </div>
              </div>
              <div>
                <div>Due</div>
                <div className="text-muted-foreground">
                  {fmtDate(wo.dueDate)}
                </div>
              </div>
            </div>

            {linked && linked.id && (
              <>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="lg:col-span-2">
                    <div className="text-muted-foreground">Linked issue</div>
                    {linked ? (
                      <div className="flex items-center gap-2">
                        #{linked.id} - {linked.title}
                        <Badge variant="outline">{linked.severity}</Badge>
                        <Badge variant="secondary">{linked.status}</Badge>
                      </div>
                    ) : (
                      <div>—</div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Tasks</span>
                <span className="font-medium">{counts?.tasks ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-medium">
                  {data.totalLaborMinutes} min
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Parts installed</span>
                <span className="font-medium">
                  {data.totalInstalledPartsQty}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="tasks">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tasks">
                  Tasks ({counts?.tasks ?? 0})
                </TabsTrigger>
                <TabsTrigger value="labor">
                  Labor ({counts?.labor ?? 0})
                </TabsTrigger>
                <TabsTrigger value="parts">
                  Parts ({counts?.installs ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-4 space-y-3">
                {canManage && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setTaskOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add task
                    </Button>
                  </div>
                )}

                {data.tasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No tasks yet.
                  </div>
                ) : (
                  <div className="max-h-105 overflow-auto rounded-md border">
                    <div className="divide-y">
                      {data.tasks
                        .slice()
                        .sort((a, b) => a.id - b.id)
                        .map((t) => (
                          <div key={t.id} className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">{t.title}</div>

                                {t.description ? (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {t.description}
                                  </div>
                                ) : null}

                                {(t.estimatedMinutes != null ||
                                  t.completedAt) && (
                                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                    {t.estimatedMinutes != null && (
                                      <span>
                                        Estimated: {t.estimatedMinutes} min
                                      </span>
                                    )}
                                    {t.completedAt ? (
                                      <span>
                                        Completed: {fmtDateTime(t.completedAt)}
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline">{t.status}</Badge>

                                {canManage && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteTask(t.id)}
                                    disabled={
                                      !!deleting &&
                                      deleting.kind === "task" &&
                                      deleting.id === t.id
                                    }
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="labor" className="mt-4 space-y-3">
                {canManage && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingLabor(null);
                        setForcedTaskId(undefined);
                        setLaborOpen(true);
                      }}
                      disabled={taskOptions.length === 0}
                      title={
                        taskOptions.length === 0
                          ? "Create a task first"
                          : undefined
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {taskOptions.length === 0
                        ? "Create a task first"
                        : "Add labor"}
                    </Button>
                  </div>
                )}

                {data.laborLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No labor logs yet.
                  </div>
                ) : (
                  <div className="max-h-105 overflow-auto rounded-md border">
                    <div className="divide-y">
                      {data.laborLogs.map((l) => (
                        <div key={l.id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {l.mechanicName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {l.minutes} min • {fmtDate(l.logDate)}
                              </div>
                              {l.comment ? (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {l.comment}
                                </div>
                              ) : null}
                            </div>

                            {canManage && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteLabor(l.id)}
                                disabled={
                                  !!deleting &&
                                  deleting.kind === "labor" &&
                                  deleting.id === l.id
                                }
                                title="Delete labor log"
                                className="shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="parts" className="mt-4 space-y-3">
                {canManage && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setPartOpen(true)}
                      disabled={stockLoading}
                      title={stockLoading ? "Loading inventory…" : undefined}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add part
                    </Button>
                  </div>
                )}

                {stockErr && (
                  <div className="text-xs text-destructive">{stockErr}</div>
                )}

                {data.partInstallations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No parts installed yet.
                  </div>
                ) : (
                  <div className="max-h-105 overflow-auto rounded-md border">
                    <div className="divide-y">
                      {data.partInstallations.map((pi) => (
                        <div key={pi.id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {pi.partName}
                                <span className="text-muted-foreground">
                                  ({pi.partSku})
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                x{pi.quantity} • {pi.locationCode} •
                                {fmtDateTime(pi.installedAt)}
                              </div>
                              {pi.notes ? (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {pi.notes}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline">
                                {pi.installedByName ?? "—"}
                              </Badge>

                              {canManage && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeletePart(pi.id)}
                                  disabled={
                                    !!deleting &&
                                    deleting.kind === "part" &&
                                    deleting.id === pi.id
                                  }
                                  title="Delete installed part (restores inventory)"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {canManage && user && (
          <WorkOrderUpsertDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            editing={woAsRead}
            cars={car ? [car] : []}
            mechanics={mechanics}
            currentUserId={user.userId}
            onSaved={loadDetails}
            editingLinkedIssueId={data.linkedIssueId ?? null}
            editingLinkedIssue={data.linkedIssue ?? null}
          />
        )}

        {canManage && (
          <WorkOrderTaskUpsertDialog
            open={taskOpen}
            onOpenChange={setTaskOpen}
            workOrderId={wo.id}
            editing={null}
            canEdit={canManage}
            onSaved={async () => {
              setTaskOpen(false);
              await loadDetails();
            }}
          />
        )}

        {canManage && (
          <LaborLogUpsertDialog
            open={laborOpen}
            onOpenChange={(v) => {
              setLaborOpen(v);
              if (!v) {
                setEditingLabor(null);
                setForcedTaskId(undefined);
              }
            }}
            workOrderTaskId={forcedTaskId}
            tasks={taskOptions}
            editing={editingLabor}
            canEdit={canManage}
            tasksFull={data.tasks}
            onSaved={async () => {
              setLaborOpen(false);
              setEditingLabor(null);
              setForcedTaskId(undefined);
              await loadDetails();
            }}
          />
        )}

        {canManage && data && (
          <PartInstallDialog
            open={partOpen}
            onOpenChange={(v) => {
              setPartOpen(v);
              if (!v) setStockErr(null);
            }}
            workOrderId={data.workOrder.id}
            stockRows={stockRows}
            canEdit={canManage}
            onSaved={async () => {
              setPartOpen(false);
              await loadDetails();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
};
