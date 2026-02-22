import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { listCarSessions, deleteCarSession } from "@/api/carSessions";
import type { CarSessionRead } from "@/api/carSessions/types";

import { listTeamCars } from "@/api/teamCars";
import type { TeamCarRead } from "@/api/teamCars/types";

import { listUsers } from "@/api/users";
import type { UserRead } from "@/api/users/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ArrowLeft,
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  Flag,
} from "lucide-react";

import { CarSessionUpsertDialog } from "@/components/CarSessionUpsertDialog/CarSessionUpsertDialog";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return d.replace("T", " ").replace("Z", " UTC");
}

export default function CarSessionsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roles = user?.roles ?? [];

  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("Driver"),
    [roles]
  );

  const [sessions, setSessions] = useState<CarSessionRead[]>([]);
  const [cars, setCars] = useState<TeamCarRead[]>([]);
  const [drivers, setDrivers] = useState<UserRead[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filterCarId, setFilterCarId] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarSessionRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [s, c, u] = await Promise.all([
        listCarSessions(),
        listTeamCars().catch(() => [] as TeamCarRead[]),
        listUsers().catch(() => [] as UserRead[]),
      ]);
      setSessions(s);
      setCars(c);
      setDrivers(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const carOptions = useMemo(() => {
    return cars
      .slice()
      .sort((a, b) => (a.carNumber ?? "").localeCompare(b.carNumber ?? ""))
      .map((c) => ({
        id: c.id,
        label: `#${c.carNumber} — ${c.make} ${c.model}`,
      }));
  }, [cars]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return sessions
      .filter((s) =>
        filterCarId === "all" ? true : s.teamCarId === Number(filterCarId)
      )
      .filter((s) => {
        if (!needle) return true;
        const track = (s.trackName ?? "").toLowerCase();
        const type = (s.sessionType ?? "").toLowerCase();
        const driver = (s.driverName ?? "").toLowerCase();
        const carNo = (s.teamCarNumber ?? "").toLowerCase();
        return (
          track.includes(needle) ||
          type.includes(needle) ||
          driver.includes(needle) ||
          carNo.includes(needle)
        );
      })
      .sort(
        (a, b) =>
          (b.date ?? "").localeCompare(a.date ?? "") ||
          (b.id ?? 0) - (a.id ?? 0)
      );
  }, [sessions, q, filterCarId]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: CarSessionRead) {
    setEditing(row);
    setOpen(true);
  }

  async function onDelete(row: CarSessionRead) {
    if (!canManage) return;
    const ok = confirm(`Delete session #${row.id}? This cannot be undone.`);
    if (!ok) return;

    try {
      await deleteCarSession(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout title="Car Sessions" subtitle="All sessions across all cars">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Flag className="h-4 w-4" />
            {loading ? "Loading..." : `${filtered.length} sessions`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add session
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-xs text-muted-foreground">Search</div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Track, session type, driver, car number..."
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Car</div>
              <Select value={filterCarId} onValueChange={setFilterCarId}>
                <SelectTrigger>
                  <SelectValue placeholder="All cars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cars</SelectItem>
                  {carOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.label}
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
                <div className="font-medium">Couldn’t load sessions</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Laps</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-10"
                  >
                    No sessions found.
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>

                  <TableCell>
                    <Badge variant="outline">#{s.teamCarNumber}</Badge>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(s.date)}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">{s.sessionType}</Badge>
                  </TableCell>

                  <TableCell className="font-medium">{s.trackName}</TableCell>

                  <TableCell className="text-sm">
                    {s.driverName ?? "—"}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {s.laps ?? 0}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => openEdit(s)}
                        title={canManage ? "Edit session" : "No permission"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => onDelete(s)}
                        title={canManage ? "Delete session" : "No permission"}
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

        {canManage && (
          <CarSessionUpsertDialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
            editing={editing}
            cars={cars}
            drivers={drivers}
            canEdit={canManage}
            onSaved={load}
          />
        )}
      </div>
    </PageLayout>
  );
}
