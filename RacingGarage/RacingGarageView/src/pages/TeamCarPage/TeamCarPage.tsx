import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

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
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Flag,
  Wrench,
  Pencil,
  Plus,
} from "lucide-react";

import { getTeamCarDashboard } from "@/api/teamCars";
import type { TeamCarDashboard, TeamCarRead } from "@/api/teamCars/types";

import { TeamCarUpsertDialog } from "@/components/TeamCarUpsertDialog/TeamCarUpsertDialog";

import { listUsers } from "@/api/users";
import type { UserRead } from "@/api/users/types";
import { WorkOrderUpsertDialog } from "@/components/WorkOrderUpsertDialog/WorkOrderUpsertDialog";
import { IssueReportUpsertDialog } from "@/components/IssueReportUpsertDialog/IssueReportUpsertDialog";

import { listCarSessions } from "@/api/carSessions";
import type { CarSessionRead } from "@/api/carSessions/types";
import { CarSessionUpsertDialog } from "@/components/CarSessionUpsertDialog/CarSessionUpsertDialog";
import { Separator } from "@/components/ui/separator";

function toTeamCarReadFromSummary(c: TeamCarDashboard["car"]): TeamCarRead {
  return {
    id: c.id,
    carNumber: c.carNumber,
    make: c.make,
    model: c.model,
    year: c.year,
    status: c.status,
    nickname: c.nickname ?? "",
    carClass: c.carClass ?? "",
    odometerKm: c.odometerKm ?? 0,
    createdAt: new Date().toISOString(),
  };
}

function fmtDateOnly(v?: string | null) {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  return s;
}

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

export default function TeamCarPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const carId = Number(id);

  const { user } = useAuth();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const canManageCar = useMemo(
    () => roles.includes("Manager") || roles.includes("Mechanic"),
    [roles],
  );

  const canCreateIssue = useMemo(
    () => roles.includes("Manager") || roles.includes("Driver"),
    [roles],
  );

  const canCreateWorkOrder = useMemo(
    () => roles.includes("Manager") || roles.includes("Mechanic"),
    [roles],
  );

  const canEditIssue = roles.includes("Manager") || roles.includes("Driver");

  const canManageSessions = useMemo(
    () => roles.includes("Manager") || roles.includes("Driver"),
    [roles],
  );

  const [data, setData] = useState<TeamCarDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [openEditCar, setOpenEditCar] = useState(false);
  const [editingCar, setEditingCar] = useState<TeamCarRead | null>(null);

  const [openWo, setOpenWo] = useState(false);
  const [users, setUsers] = useState<UserRead[]>([]);

  const mechanics = useMemo(
    () => users.filter((u) => u.isActive && u.roles.includes("Mechanic")),
    [users],
  );

  const [openIssue, setOpenIssue] = useState(false);

  const [sessions, setSessions] = useState<CarSessionRead[]>([]);
  const [openSession, setOpenSession] = useState(false);
  const [editingSession, setEditingSession] = useState<CarSessionRead | null>(
    null,
  );

  const sessionsForCar = useMemo(() => {
    return sessions
      .filter((s) => s.teamCarId === carId)
      .slice()
      .sort(
        (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.id - a.id,
      );
  }, [sessions, carId]);

  async function load() {
    if (!Number.isFinite(carId) || carId <= 0) {
      setErr("Invalid car id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const [dash, userList, sessionList] = await Promise.all([
        getTeamCarDashboard(carId),
        listUsers().catch(() => [] as UserRead[]),
        listCarSessions().catch(() => [] as CarSessionRead[]),
      ]);

      setData(dash);
      setUsers(userList);
      setSessions(sessionList);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load car dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const title = data
    ? `#${data.car.carNumber} — ${data.car.make} ${data.car.model} (${data.car.year})`
    : "Team Car";

  function openCarEdit() {
    if (!data) return;
    setEditingCar(data.car as TeamCarRead);
    setOpenEditCar(true);
  }

  function openAddWorkOrder() {
    if (!user) return;
    setOpenWo(true);
  }

  function openAddIssue() {
    if (!user) return;
    setOpenIssue(true);
  }

  function openAddSession() {
    if (!user) return;
    setEditingSession(null);
    setOpenSession(true);
  }

  return (
    <PageLayout
      title={title}
      subtitle="Car dashboard: sessions, issues, work orders"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => nav(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {canManageCar && data && (
              <Button size="sm" variant="outline" onClick={openCarEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit car
              </Button>
            )}
          </div>
        </div>

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load car</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        {loading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Car details</div>

                <div className="mt-2 grid gap-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-muted-foreground">Car</div>
                    <div className="text-right">
                      <div className="font-medium">
                        #{data.car.carNumber} — {data.car.make} {data.car.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.car.year}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-muted-foreground">Status</div>
                    <Badge variant="secondary">{data.car.status}</Badge>
                  </div>

                  {data.car.nickname?.trim() ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-muted-foreground">Nickname</div>
                      <div className="font-medium">{data.car.nickname}</div>
                    </div>
                  ) : null}

                  {data.car.carClass?.trim() ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-muted-foreground">Class</div>
                      <div className="font-medium">{data.car.carClass}</div>
                    </div>
                  ) : null}

                  {typeof data.car.odometerKm === "number" &&
                  data.car.odometerKm > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-muted-foreground">Odometer</div>
                      <div className="font-medium">
                        {data.car.odometerKm.toLocaleString()} km
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Latest Session
                </div>
                <div className="mt-2 text-sm">
                  {data.latestSession ? (
                    <div className="space-y-1">
                      <div className="font-medium">
                        {data.latestSession.sessionType} @
                        {data.latestSession.trackName}
                      </div>
                      <div className="text-muted-foreground">
                        {fmtDateOnly(data.latestSession.date)} • Laps:
                        {data.latestSession.laps}
                      </div>
                      <div className="text-muted-foreground">
                        Driver: {data.latestSession.driverName ?? "—"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      No sessions yet.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Open Items
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Badge variant="outline">
                    {data.openIssues.length} issues
                  </Badge>
                  <Badge variant="outline">
                    {data.openWorkOrders.length} work orders
                  </Badge>
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <Flag className="h-4 w-4" />
                  Sessions
                </div>
                <div className="flex gap-2">
                  {canManageSessions && (
                    <Button size="sm" onClick={openAddSession}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add session
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav(`/car-sessions?car=${carId}`)}
                  >
                    View all
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Laps</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsForCar.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No sessions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessionsForCar.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{s.sessionType}</div>
                          {s.notes ? (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {s.notes}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>{s.trackName}</TableCell>
                        <TableCell className="text-sm">
                          {s.driverName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {s.laps}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmtDateOnly(s.date)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Open Issues
                </div>
                <div className="flex gap-2">
                  {canCreateIssue && (
                    <Button size="sm" onClick={openAddIssue}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add issue
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav(`/issue-reports?car=${carId}`)}
                  >
                    View all
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-17.5">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reported</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.openIssues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        No open issues.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.openIssues.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.id}</TableCell>

                        <TableCell>
                          <div className="font-medium">{i.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {i.description || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">
                          #{i.teamCarNumber}
                        </TableCell>

                        <TableCell className="text-sm">
                          {i.carSessionId ? (
                            <Badge variant="outline">
                              Session #{i.carSessionId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">{i.severity}</Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary">{i.status}</Badge>
                        </TableCell>

                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmtDateTime(i.reportedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <Wrench className="h-4 w-4" />
                  Open Work Orders
                </div>
                <div className="flex gap-2">
                  {canCreateWorkOrder && (
                    <Button size="sm" onClick={openAddWorkOrder}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add work order
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav(`/work-orders?car=${carId}`)}
                  >
                    View all
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.openWorkOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No open work orders.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.openWorkOrders.map((w) => (
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
                        <TableCell>
                          <Badge variant="outline">{w.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{w.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.assignedToName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmtDateTime(w.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {canManageCar && (
          <TeamCarUpsertDialog
            open={openEditCar}
            onOpenChange={(v) => {
              setOpenEditCar(v);
              if (!v) setEditingCar(null);
            }}
            editing={editingCar}
            onSaved={load}
          />
        )}

        {canCreateWorkOrder && user && data && (
          <WorkOrderUpsertDialog
            open={openWo}
            onOpenChange={setOpenWo}
            editing={null}
            cars={[toTeamCarReadFromSummary(data.car)]}
            mechanics={mechanics}
            currentUserId={user.userId}
            onSaved={async () => {
              setOpenWo(false);
              await load();
            }}
          />
        )}

        {canCreateIssue && user && data && (
          <IssueReportUpsertDialog
            open={openIssue}
            onOpenChange={setOpenIssue}
            editing={null}
            cars={[toTeamCarReadFromSummary(data.car)]}
            currentUserId={user.userId}
            defaultTeamCarId={data.car.id}
            canEdit={canEditIssue}
            onSaved={async () => {
              setOpenIssue(false);
              await load();
            }}
          />
        )}

        {data && user && (
          <CarSessionUpsertDialog
            open={openSession}
            onOpenChange={(v) => {
              setOpenSession(v);
              if (!v) setEditingSession(null);
            }}
            editing={editingSession}
            cars={[toTeamCarReadFromSummary(data.car)]}
            drivers={users}
            defaultTeamCarId={data.car.id}
            canEdit={canManageSessions}
            onSaved={async () => {
              setOpenSession(false);
              setEditingSession(null);
              await load();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}
