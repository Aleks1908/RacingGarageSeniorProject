import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { listIssueReports, deleteIssueReport } from "@/api/issueReports";
import type { IssueReportRead } from "@/api/issueReports/types";
import { listTeamCars } from "@/api/teamCars";
import type { TeamCarRead } from "@/api/teamCars/types";

import { IssueReportUpsertDialog } from "@/components/IssueReportUpsertDialog/IssueReportUpsertDialog";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ArrowLeft,
} from "lucide-react";

import { fmtDateTime } from "@/lib/utils";

type Filters = {
  teamCarId: string;
  status: string;
  severity: string;
};

const statuses = ["Open", "Linked", "Closed"] as const;
const severities = ["Low", "Medium", "High"] as const;

export const IssueReportsPage = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const canCreate = useMemo(
    () => roles.includes("Driver") || roles.includes("Manager"),
    [roles],
  );
  const canEdit = useMemo(
    () => roles.includes("Manager") || roles.includes("Driver"),
    [roles],
  );

  const [items, setItems] = useState<IssueReportRead[]>([]);
  const [cars, setCars] = useState<TeamCarRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    teamCarId: searchParams.get("car") ?? "all",
    status: "all",
    severity: "all",
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IssueReportRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [issueList, carList] = await Promise.all([
        listIssueReports({
          teamCarId:
            filters.teamCarId !== "all" ? Number(filters.teamCarId) : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          severity: filters.severity !== "all" ? filters.severity : undefined,
        }),
        listTeamCars(),
      ]);

      setItems(issueList);
      setCars(carList);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load issue reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.teamCarId, filters.status, filters.severity]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: IssueReportRead) {
    setEditing(row);
    setOpen(true);
  }

  async function onDelete(row: IssueReportRead) {
    const ok = confirm(`Delete issue #${row.id}?`);
    if (!ok) return;

    try {
      await deleteIssueReport(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <PageLayout title="Issue Reports" subtitle="Track driver-reported issues">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {loading ? "Loading..." : `${items.length} issues`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canCreate && user && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Issue
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
              <div className="text-xs text-muted-foreground">Severity</div>
              <Select
                value={filters.severity}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, severity: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {severities.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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
                <div className="font-medium">Couldn’t load issues</div>
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
                <TableHead>Session ID</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right w-37.5">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    No issues found.
                  </TableCell>
                </TableRow>
              )}

              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.id}</TableCell>

                  <TableCell>
                    <div className="font-medium">{i.title}</div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-muted-foreground cursor-help max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                            {i.description || "—"}
                          </div>
                        </TooltipTrigger>
                        {i.description && (
                          <TooltipContent className="max-w-2xl">
                            <p className="whitespace-pre-wrap break-words">
                              {i.description}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <div className="text-xs text-muted-foreground mt-1">
                      by {i.reportedByName}
                    </div>
                  </TableCell>

                  <TableCell>#{i.teamCarNumber}</TableCell>

                  <TableCell className="text-sm">
                    {i.carSessionId ? (
                      <Badge variant="outline">Session #{i.carSessionId}</Badge>
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

                  <TableCell className="text-sm">
                    {fmtDateTime(i.reportedAt)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !canEdit ||
                          (!roles.includes("Manager") &&
                            i.reportedByUserId !== user?.userId)
                        }
                        onClick={() => openEdit(i)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={
                          !canEdit ||
                          (!roles.includes("Manager") &&
                            i.reportedByUserId !== user?.userId)
                        }
                        onClick={() => onDelete(i)}
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

        {user && (canCreate || canEdit) && (
          <IssueReportUpsertDialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
            editing={editing}
            cars={cars}
            currentUserId={user.userId}
            canEdit={canEdit}
            onSaved={load}
          />
        )}
      </div>
    </PageLayout>
  );
};
