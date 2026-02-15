import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Module = {
  title: string;
  desc: string;
  to: string;
  allow: string[]; // roles that can see it
};

export default function DashboardPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  const modules: Module[] = useMemo(
    () => [
      {
        title: "Team Cars",
        desc: "Cars, status, sessions, dashboards",
        to: "/team-cars",
        allow: ["Manager", "Mechanic", "Driver", "PartsClerk"],
      },

      {
        title: "Work Orders",
        desc: "Create/assign/track work orders",
        to: "/work-orders",
        allow: ["Manager", "Mechanic"],
      },

      {
        title: "Issue Reports",
        desc: "Driver-reported issues and tracking",
        to: "/issue-reports",
        allow: ["Manager", "Driver"],
      },

      {
        title: "Inventory",
        desc: "Stock, locations, reorder views",
        to: "/inventory",
        allow: ["Manager", "PartsClerk"],
      },
      {
        title: "Parts",
        desc: "Parts catalog, reorder points",
        to: "/parts",
        allow: ["Manager", "PartsClerk"],
      },
      {
        title: "Suppliers",
        desc: "Supplier management",
        to: "/suppliers",
        allow: ["Manager", "PartsClerk"],
      },

      {
        title: "Users",
        desc: "Create users, assign roles",
        to: "/users",
        allow: ["Manager"],
      },
    ],
    []
  );

  const visible = modules.filter((m) => m.allow.some((r) => roles.includes(r)));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Logged in as {user?.name} ({roles.join(", ")})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <Card
            key={m.to}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => nav(m.to)}
          >
            <CardHeader>
              <CardTitle>{m.title}</CardTitle>
              <CardDescription>{m.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
