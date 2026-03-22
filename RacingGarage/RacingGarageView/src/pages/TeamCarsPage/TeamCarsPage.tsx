import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { deleteTeamCar, listTeamCars } from "@/api/teamCars";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  Car,
  ArrowLeft,
} from "lucide-react";
import type { TeamCarRead } from "@/api/teamCars/types";
import { TeamCarUpsertDialog } from "@/components/TeamCarUpsertDialog/TeamCarUpsertDialog";

export default function TeamCarsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const canManage = useMemo(
    () => roles.includes("Manager") || roles.includes("Mechanic"),
    [roles]
  );

  const [cars, setCars] = useState<TeamCarRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamCarRead | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listTeamCars();
      setCars(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load team cars.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: TeamCarRead) {
    setEditing(row);
    setOpen(true);
  }
  async function onDelete(row: TeamCarRead) {
    const ok = confirm(`Delete car ${row.carNumber}? This cannot be undone.`);
    if (!ok) return;

    try {
      await deleteTeamCar(row.id);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout title="Team Cars" subtitle="Cars list and quick management">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Car className="h-4 w-4" />
            {loading ? "Loading..." : `${cars.length} cars`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Car
              </Button>
            )}
          </div>
        </div>

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load cars</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-27.5">#</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Odometer (km)</TableHead>
                <TableHead className="w-42.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && cars.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    No cars yet.
                  </TableCell>
                </TableRow>
              )}

              {cars.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => nav(`/team-cars/${c.id}`)}
                >
                  <TableCell className="font-medium">{c.carNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {c.make} {c.model} ({c.year})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.nickname || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{c.carClass}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="text-right">{c.odometerKm}</TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canManage}
                        onClick={() => onDelete(c)}
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
          <TeamCarUpsertDialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
            editing={editing}
            onSaved={refresh}
          />
        )}
      </div>
    </PageLayout>
  );
}
