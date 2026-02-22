import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Car,
  Wrench,
  AlertTriangle,
  Boxes,
  Package,
  Truck,
  Users,
  ArrowRight,
  Flag,
  Settings,
} from "lucide-react";
import PageLayout from "@/components/PageLayout/PageLayout";

type Module = {
  title: string;
  desc: string;
  to: string;
  allow: string[];
  icon: React.ReactNode;
  cta: string;
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
        icon: <Car className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Work Orders",
        desc: "Create/assign/track work orders",
        to: "/work-orders",
        allow: ["Manager", "Mechanic", "Driver", "PartsClerk"],
        icon: <Wrench className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Sessions",
        desc: "All car sessions (practice/qualifying/race logs)",
        to: "/car-sessions",
        allow: ["Manager", "Driver", "Mechanic"],
        icon: <Flag className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Issue Reports",
        desc: "Driver-reported issues and tracking",
        to: "/issue-reports",
        allow: ["Manager", "Driver", "Mechanic", "PartsClerk"],
        icon: <AlertTriangle className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Inventory",
        desc: "Stock, locations, reorder views",
        to: "/inventory",
        allow: ["Manager", "PartsClerk", "Mechanic"],
        icon: <Boxes className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Parts",
        desc: "Parts catalog, reorder points",
        to: "/parts",
        allow: ["Manager", "PartsClerk"],
        icon: <Package className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Suppliers",
        desc: "Supplier management",
        to: "/suppliers",
        allow: ["Manager", "PartsClerk"],
        icon: <Truck className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "User Settings",
        desc: "Manage your profile and password",
        to: "/user-settings",
        allow: ["Manager", "Mechanic", "Driver", "PartsClerk"],
        icon: <Settings className="h-5 w-5" />,
        cta: "Open",
      },
      {
        title: "Users",
        desc: "Create users, assign roles",
        to: "/users",
        allow: ["Manager"],
        icon: <Users className="h-5 w-5" />,
        cta: "Manage",
      },
    ],
    []
  );

  const visible = modules.filter((m) => m.allow.some((r) => roles.includes(r)));

  return (
    <PageLayout title="Dashboard" subtitle="Choose a module to continue">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <Card
            key={m.to}
            className="group h-full cursor-pointer transition hover:shadow-md"
            onClick={() => nav(m.to)}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md border p-2">{m.icon}</div>
                <CardTitle className="text-base">{m.title}</CardTitle>
              </div>
              <CardDescription>{m.desc}</CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <Button
                className="w-full cursor-pointer"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  nav(m.to);
                }}
              >
                {m.cta}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No modules available for your role.
        </div>
      )}
    </PageLayout>
  );
}
