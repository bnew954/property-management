import { useEffect, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BuildIcon from "@mui/icons-material/Build";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import { Box, Card, CardContent, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getLeases,
  getMaintenanceRequests,
  getPayments,
  getProperties,
  getTenants,
  getUnits,
} from "../services/api";
import { useUser } from "../services/userContext";

function Dashboard() {
  const { role, user } = useUser();
  const theme = useTheme();
  const [counts, setCounts] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    activeLeases: 0,
    openMaintenance: 0,
    myPayments: 0,
    myMaintenance: 0,
    myLeaseInfo: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([
    { name: "Occupied", value: 0 },
    { name: "Vacant", value: 0 },
  ]);
  const [maintenanceStatusData, setMaintenanceStatusData] = useState([]);
  const [tenantAmountDue, setTenantAmountDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (role === "tenant") {
          const tenantId = user?.tenant_id;
          const [paymentsRes, maintenanceRes, leasesRes] = await Promise.all([
            getPayments(),
            getMaintenanceRequests(),
            getLeases(),
          ]);
          const paymentItems = tenantId
          ? (paymentsRes.data || []).filter((item) => item.lease_detail?.tenant === tenantId)
          : (paymentsRes.data || []);
          const maintenanceItems = tenantId
            ? (maintenanceRes.data || []).filter((item) => item.tenant_detail?.id === tenantId || item.tenant === tenantId)
            : (maintenanceRes.data || []);
          const leaseItems = tenantId
            ? (leasesRes.data || []).filter((item) => item.tenant_detail?.id === tenantId || item.tenant === tenantId)
            : (leasesRes.data || []);
          const activeLease = leaseItems
            .filter((item) => item.is_active)
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];

          setCounts((prev) => ({
            ...prev,
            myPayments: paymentItems.length,
            myMaintenance: maintenanceItems.length,
            myLeaseInfo: leaseItems.filter((item) => item.is_active).length,
          }));
          setTenantAmountDue(activeLease ? Number(activeLease.monthly_rent || 0) : null);
        } else {
          const [propertiesRes, unitsRes, leasesRes, maintenanceRes, paymentsRes, tenantsRes] = await Promise.all([
            getProperties(),
            getUnits(),
            getLeases(),
            getMaintenanceRequests(),
            getPayments(),
            getTenants(),
          ]);

          const units = unitsRes.data || [];
          const maintenanceItems = maintenanceRes.data || [];
          const leaseItems = leasesRes.data || [];
          const paymentItems = paymentsRes.data || [];
          const openMaintenance = maintenanceItems.filter(
            (item) => item.status !== "completed" && item.status !== "cancelled"
          ).length;
          const activeLeases = leaseItems.filter((item) => item.is_active).length;

          setCounts({
            properties: (propertiesRes.data || []).length,
            units: (unitsRes.data || []).length,
            tenants: (tenantsRes.data || []).length,
            activeLeases,
            openMaintenance,
            myPayments: 0,
            myMaintenance: 0,
            myLeaseInfo: 0,
          });

          const occupiedUnits = units.filter((item) => !item.is_available).length;
          const vacantUnits = Math.max(units.length - occupiedUnits, 0);
          setOccupancyData([
            { name: "Occupied", value: occupiedUnits },
            { name: "Vacant", value: vacantUnits },
          ]);

          const statusCounts = {
            submitted: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
          };
          maintenanceItems.forEach((item) => {
            if (statusCounts[item.status] !== undefined) {
              statusCounts[item.status] += 1;
            }
          });
          setMaintenanceStatusData([
            { status: "Submitted", count: statusCounts.submitted },
            { status: "In Progress", count: statusCounts.in_progress },
            { status: "Completed", count: statusCounts.completed },
            { status: "Cancelled", count: statusCounts.cancelled },
          ]);

          const monthBuckets = new Map();
          const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
          const fullMonthFormatter = new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          });
          const now = new Date();
          const months = [];
          for (let i = 11; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            months.push({
              key,
              label: monthFormatter.format(d),
              fullLabel: fullMonthFormatter.format(d),
            });
            monthBuckets.set(key, 0);
          }

          paymentItems.forEach((payment) => {
            if (!payment.payment_date) {
              return;
            }
            const d = new Date(`${payment.payment_date}T00:00:00`);
            if (Number.isNaN(d.getTime())) {
              return;
            }
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!monthBuckets.has(key)) {
              return;
            }
            const next = Number(monthBuckets.get(key) || 0) + Number(payment.amount || 0);
            monthBuckets.set(key, next);
          });

          setRevenueData(
            months.map((month) => ({
              month: month.label,
              fullMonth: month.fullLabel,
              total: Number(monthBuckets.get(month.key) || 0),
            }))
          );
          setTenantAmountDue(null);
        }
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [role, user?.tenant_id, user?.id]);

  const totalUnits = occupancyData.reduce((sum, item) => sum + item.value, 0);
  const occupiedUnits = occupancyData.find((item) => item.name === "Occupied")?.value || 0;
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const occupancySeries = occupancyData.map((entry) => ({
    ...entry,
    color:
      entry.name === "Occupied"
        ? theme.palette.primary.main
        : alpha(theme.palette.text.secondary, theme.palette.mode === "light" ? 0.22 : 0.2),
  }));
  const statusColorByLabel = {
    Submitted: theme.palette.info.main,
    "In Progress": theme.palette.warning.main,
    Completed: theme.palette.success.main,
    Cancelled: theme.palette.error.main,
  };
  const maintenanceSeries = maintenanceStatusData.map((entry) => ({
    ...entry,
    color: statusColorByLabel[entry.status] || theme.palette.text.secondary,
  }));

  const cards =
    role === "tenant"
      ? [
          {
            title: "My Payments",
            value: counts.myPayments,
            path: "/payments",
            icon: <PaymentIcon sx={{ color: theme.palette.primary.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "My Maintenance Requests",
            value: counts.myMaintenance,
            path: "/maintenance",
            icon: <BuildIcon sx={{ color: theme.palette.warning.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "My Lease Info",
            value: counts.myLeaseInfo,
            path: "/my-lease",
            icon: <AssignmentTurnedInIcon sx={{ color: theme.palette.success.main, opacity: 0.7, fontSize: 18 }} />,
          },
        ]
      : [
          {
            title: "Total Properties",
            value: counts.properties,
            icon: (
              <ApartmentIcon
                sx={{ color: theme.palette.primary.main, opacity: 0.7, fontSize: 18 }}
              />
            ),
          },
          {
            title: "Total Units",
            value: counts.units,
            icon: (
              <HomeWorkIcon sx={{ color: theme.palette.info.main, opacity: 0.7, fontSize: 18 }} />
            ),
          },
          {
            title: "Total Tenants",
            value: counts.tenants,
            icon: <PeopleIcon sx={{ color: theme.palette.primary.light, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "Active Leases",
            value: counts.activeLeases,
            icon: <AssignmentTurnedInIcon sx={{ color: theme.palette.success.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "Open Requests",
            value: counts.openMaintenance,
            icon: <BuildIcon sx={{ color: theme.palette.warning.main, opacity: 0.7, fontSize: 18 }} />,
          },
        ];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Box
      sx={{
        "@keyframes dashboardFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: "dashboardFadeIn 0.35s ease",
      }}
    >
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}>
        Welcome back, {user?.first_name || user?.username || "User"}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {user?.organization?.name || "No workspace"}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
        {today}
      </Typography>
      {loading ? <Typography sx={{ mb: 2 }}>Loading...</Typography> : null}
      {!loading &&
      role === "landlord" &&
      user?.organization?.plan === "free" &&
      user?.organization?.max_units &&
      counts.units >= Math.max(user.organization.max_units - 1, 1) ? (
        <Typography
          sx={{
            mb: 1.5,
            fontSize: 12,
            color: "text.secondary",
            p: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {`You're using ${counts.units}/${user.organization.max_units} free units. Upgrade to Pro for unlimited units.`}
        </Typography>
      ) : null}
      {error ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
      ) : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1.5,
        }}
      >
        {role === "tenant" ? (
          <Card
            component={Link}
            to="/pay-rent"
            sx={{
              gridColumn: { xs: "1 / -1", md: "1 / -1" },
              bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.05 : 0.07),
              borderColor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.28 : 0.33),
              textDecoration: "none",
              "&:hover": {
                borderColor: alpha(theme.palette.success.main, 0.55),
                backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.1 : 0.12),
              },
            }}
          >
            <CardContent sx={{ p: 1.8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Pay Rent
                </Typography>
                <Typography sx={{ fontSize: 20, lineHeight: 1.2, fontWeight: 600, color: "text.primary" }}>
                  {tenantAmountDue !== null
                    ? Number(tenantAmountDue).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })
                    : "No amount due"}
                </Typography>
                <Typography sx={{ mt: 0.2, fontSize: 12, color: "text.secondary" }}>
                  Pay securely online with card
                </Typography>
              </Box>
              <CreditCardIcon sx={{ color: theme.palette.success.main, fontSize: 22 }} />
            </CardContent>
          </Card>
        ) : null}
        {cards.map((card) => (
          <Card
            key={card.title}
            component={card.path ? Link : "div"}
            to={card.path || undefined}
            sx={{
              bgcolor: "background.paper",
              textDecoration: "none",
              cursor: card.path ? "pointer" : "default",
              "&:hover": card.path
                ? { borderColor: "primary.main", backgroundColor: "action.hover" }
                : undefined,
            }}
          >
            <CardContent sx={{ p: 1.8 }}>
              <Box sx={{ mb: 1 }}>{card.icon}</Box>
              <Typography sx={{ fontSize: 24, lineHeight: 1.1, fontWeight: 600, color: "text.primary" }}>
                {card.value}
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: 12, color: "text.secondary" }}>
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      {role === "landlord" ? (
        <Box sx={{ mt: 2, display: "grid", gap: 1.5 }}>
          <Paper sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
              Revenue Overview
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
              Monthly payment totals for the last 12 months
            </Typography>
            {revenueData.some((item) => item.total > 0) ? (
              <Box sx={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                    />
                    <CartesianGrid
                      stroke={theme.palette.divider}
                      strokeOpacity={theme.palette.mode === "light" ? 0.5 : 0.25}
                      vertical={false}
                    />
                    <YAxis
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                      width={60}
                      tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        Number(value || 0).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        }),
                        "Revenue",
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth || ""}
                    />
                    <Area type="monotone" dataKey="total" stroke="none" fill="url(#revenueFill)" />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: "text.secondary", py: 4 }}>
                No payment data available yet.
              </Typography>
            )}
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            <Paper sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
                Occupancy Rate
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                Occupied vs vacant units
              </Typography>
              <Box sx={{ width: "100%", height: 240, position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={occupancySeries}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {occupancySeries.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [value, "Units"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    pointerEvents: "none",
                  }}
                >
                  <Typography sx={{ fontSize: 24, fontWeight: 600, color: "text.primary" }}>
                    {occupancyRate}%
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    Occupied
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
                Maintenance Overview
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                Request volume by status
              </Typography>
              <Box sx={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={maintenanceStatusData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <CartesianGrid
                      stroke={theme.palette.divider}
                      strokeOpacity={theme.palette.mode === "light" ? 0.4 : 0.25}
                      horizontal={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [value, "Requests"]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {maintenanceSeries.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </Box>
      ) : null}
      <Paper sx={{ mt: 2, p: 2, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.8 }}>
          Recent Activity
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          No recent activity
        </Typography>
      </Paper>
    </Box>
  );
}

export default Dashboard;












