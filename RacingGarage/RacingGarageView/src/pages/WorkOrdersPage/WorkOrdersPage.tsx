import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { deleteWorkOrder, listWorkOrders } from "@/api/workOrders";
import { listTeamCars } from "@/api/teamCars";
import { listUsers } from "@/api/users";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertTriangle,
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type { UserRead } from "@/api/users/types";
import type { WorkOrderRead } from "@/api/shared/types";
import type { TeamCarRead } from "@/api/teamCars/types";
import { WorkOrderUpsertDialog } from "@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog";

type Filters = {
  teamCarId: string;
  status: string;
  priority: string;
};

const priorities = ["Low", "Medium", "High"] as const;
const statuses = ["Open", "In Progress", "Closed"] as const;

export default function WorkOrdersPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = user?.roles ?? [];
  const canManage = roles.includes("Manager") || roles.includes("Mechanic");

  const [items, setItems] = useState<WorkOrderRead[]>([]);
  const [cars, setCars] = useState<TeamCarRead[]>([]);
  const [users, setUsers] = useState<UserRead[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    teamCarId: "all",
    status: "all",
    priority: "all",
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrderRead | null>(null);

  const mechanics = useMemo(
    () => users.filter((u) => u.isActive && u.roles.includes("Mechanic")),
    [users]
  );

  function fmtDateTime(v?: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [wo, carList, userList] = await Promise.all([
        listWorkOrders({
          teamCarId:
            filters.teamCarId !== "all" ? Number(filters.teamCarId) : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          priority: filters.priority !== "all" ? filters.priority : undefined,
        }),
        listTeamCars(),
        listUsers(),
      ]);

      setItems(wo);
      setCars(carList);
      setUsers(userList);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load work orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.teamCarId, filters.status, filters.priority]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: WorkOrderRead) {
    setEditing(row);
    setOpen(true);
  }

  async function onDelete(row: WorkOrderRead) {
    const ok = confirm(`Delete work order #${row.id}?`);
    if (!ok) return;

    try {
      await deleteWorkOrder(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout
      title="Work Orders"
      subtitle="Create, assign, and track work orders"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {loading ? "Loading..." : `${items.length} work orders`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Car</div>
              <Select
                value={filters.teamCarId}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, teamCarId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All cars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cars</SelectItem>
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      #{c.carNumber} — {c.make} {c.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <Select
                value={filters.priority}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, priority: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load work orders</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-17.5">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right w-37.5">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-10"
                  >
                    No work orders found.
                  </TableCell>
                </TableRow>
              )}

              {items.map((w) => (
                <TableRow
                  key={w.id}
                  className="cursor-pointer"
                  onClick={() => nav(`/work-orders/${w.id}`)}
                >
                  <TableCell>{w.id}</TableCell>

                  <TableCell>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {w.description || "—"}
                    </div>
                  </TableCell>

                  <TableCell>#{w.teamCarNumber}</TableCell>

                  <TableCell>
                    <Badge variant="outline">{w.priority}</Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">{w.status}</Badge>
                  </TableCell>

                  <TableCell className="text-sm">
                    {w.linkedIssueId ? (
                      <Badge variant="outline">Issue #{w.linkedIssueId}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm">
                    {w.assignedToName ?? "—"}
                  </TableCell>

                  <TableCell className="text-right text-sm text-muted-foreground">
                    {fmtDateTime(w.createdAt)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => nav(`/work-orders/${w.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => openEdit(w)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => onDelete(w)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {canManage && user && (
          <WorkOrderUpsertDialog
            open={open}
            onOpenChange={setOpen}
            editing={editing}
            cars={cars}
            mechanics={mechanics}
            currentUserId={user.userId}
            onSaved={load}
          />
        )}
      </div>
    </PageLayout>
  );
}
