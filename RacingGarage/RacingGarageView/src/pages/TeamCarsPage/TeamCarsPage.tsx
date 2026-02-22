import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import {
  createTeamCar,
  deleteTeamCar,
  listTeamCars,
  updateTeamCar,
  type TeamCarRead,
} from "@/api/teamCars";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Plus,
  RefreshCcw,
  Trash2,
  Pencil,
  Car,
  ArrowLeft,
} from "lucide-react";

import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type CarForm = {
  carNumber: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
  carClass: string;
  status: string;
  odometerKm: number;
};

const defaultValues: CarForm = {
  carNumber: "",
  nickname: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  carClass: "",
  status: "Active",
  odometerKm: 0,
};

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
  const [saving, setSaving] = useState(false);

  const form = useForm<CarForm>({ defaultValues });

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
    form.reset(defaultValues);
    setOpen(true);
  }

  function openEdit(row: TeamCarRead) {
    setEditing(row);
    form.reset({
      carNumber: row.carNumber,
      nickname: row.nickname ?? "",
      make: row.make ?? "",
      model: row.model ?? "",
      year: row.year,
      carClass: row.carClass ?? "",
      status: row.status ?? "Active",
      odometerKm: row.odometerKm ?? 0,
    });
    setOpen(true);
  }

  async function onSubmit(values: CarForm) {
    setSaving(true);
    try {
      if (!values.carNumber.trim()) throw new Error("Car number is required.");

      if (editing) {
        await updateTeamCar(editing.id, values);
      } else {
        await createTeamCar(values);
      }

      setOpen(false);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/dashboard")}
            >
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

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-140">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Car" : "New Car"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="carNumber"
                    rules={{ required: "Car number is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Car Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 27" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. The Rocket" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="make"
                    rules={{ required: "Make is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input placeholder="BMW" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    rules={{ required: "Model is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="E46" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    rules={{
                      min: { value: 1950, message: "Year looks too low" },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carClass"
                    rules={{ required: "Class is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="GT4 / Time Attack / ..."
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
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Input placeholder="Active" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="odometerKm"
                    rules={{ min: { value: 0, message: "Cannot be negative" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odometer (km)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editing
                      ? "Save Changes"
                      : "Create Car"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
