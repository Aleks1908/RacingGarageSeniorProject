import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Plus,
  RefreshCcw,
  Shield,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";

import PageLayout from "@/components/PageLayout/PageLayout";
import { useAuth } from "@/auth/useAuth";

import { listUsers, deactivateUser } from "@/api/users";
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

import { UserCreateDialog } from "@/components/UserCreateDialog/UserCreateDialog";
import { UserRoleDialog } from "@/components/UserRoleDialog/UserRoleDialog";

export const UsersPage = () => {
  const nav = useNavigate();
  const { user } = useAuth();

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const canManageUsers = useMemo(() => roles.includes("Manager"), [roles]);

  const [items, setItems] = useState<UserRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [selected, setSelected] = useState<UserRead | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listUsers();
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return items

      .filter((u) => {
        if (!needle) return true;
        return (
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle) ||
          (u.roles ?? []).some((r) => r.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => {
        const ax = a.isActive ? 0 : 1;
        const bx = b.isActive ? 0 : 1;
        return ax - bx || a.name.localeCompare(b.name);
      });
  }, [items, q]);

  function openRoleDialog(u: UserRead) {
    setSelected(u);
    setRoleOpen(true);
  }

  async function onDeactivate(u: UserRead) {
    if (!canManageUsers) return;

    const ok = confirm(`Deactivate ${u.name} (${u.email})?`);
    if (!ok) return;

    try {
      await deactivateUser(u.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Deactivate failed");
    }
  }

  return (
    <PageLayout title="Users" subtitle="Accounts and role management">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <UsersIcon className="h-4 w-4" />
            {loading ? "Loading..." : `${filtered.length} users`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {canManageUsers && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New user
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-xs text-muted-foreground">Search</div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, role..."
              />
            </div>
          </div>
        </Card>

        {!canManageUsers && (
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              You can view users, but only Managers can create users or change
              roles.
            </div>
          </Card>
        )}

        {err && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">Couldn’t load users</div>
                <div className="text-muted-foreground">{err}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-10"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(u.roles ?? []).length === 0 ? (
                        <Badge variant="outline">—</Badge>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant="secondary">
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManageUsers}
                        onClick={() => openRoleDialog(u)}
                        title={canManageUsers ? "Change role" : "No permission"}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canManageUsers || !u.isActive}
                        onClick={() => onDeactivate(u)}
                        title={
                          !u.isActive
                            ? "Already inactive"
                            : canManageUsers
                            ? "Deactivate user"
                            : "No permission"
                        }
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

        {canManageUsers && (
          <>
            <UserCreateDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSaved={load}
            />

            <UserRoleDialog
              open={roleOpen}
              onOpenChange={(v) => {
                setRoleOpen(v);
                if (!v) setSelected(null);
              }}
              user={selected}
              onSaved={load}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
};
