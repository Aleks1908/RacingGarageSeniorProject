import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "@/components/PageLayout/PageLayout";
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
} from "lucide-react";
import { getTeamCarDashboard, type TeamCarDashboard } from "@/api/teamCars";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  // backend sends DateOnly / DateTime as ISO string; show readable without overthinking
  return d.replace("T", " ").replace("Z", " UTC");
}

export default function TeamCarPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const carId = Number(id);

  const [data, setData] = useState<TeamCarDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!Number.isFinite(carId) || carId <= 0) {
      setErr("Invalid car id.");
      return;
    }

    setErr(null);
    try {
      const res = await getTeamCarDashboard(carId);
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load car dashboard.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const title = data
    ? `Car ${data.car.carNumber} — ${data.car.make} ${data.car.model} (${data.car.year})`
    : "Team Car";

  return (
    <PageLayout
      title={title}
      subtitle="Car dashboard: sessions, issues, work orders"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/team-cars")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
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

        {data && (
          <>
            {/* Top summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{data.car.status}</Badge>
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
                        {data.latestSession.sessionType} @{" "}
                        {data.latestSession.trackName}
                      </div>
                      <div className="text-muted-foreground">
                        {fmtDate(data.latestSession.date)} • Laps:{" "}
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

            {/* Open issues */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Open Issues
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => nav("/issue-reports")}
                >
                  View all
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.openIssues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No open issues 🎉
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
                        <TableCell>
                          <Badge variant="outline">{i.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{i.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmtDate(i.reportedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Open work orders */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <Wrench className="h-4 w-4" />
                  Open Work Orders
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => nav("/work-orders")}
                >
                  View all
                </Button>
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
                      <TableRow key={w.id}>
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
                          {fmtDate(w.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}
