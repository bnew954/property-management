import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAccountingReports, getProperties } from "../services/api";
import { useUser } from "../services/userContext";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

function FinancialReports() {
  const { role } = useUser();
  const thisYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${thisYear}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [propertyId, setPropertyId] = useState("all");
  const [properties, setProperties] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    try {
      setError("");
      const params = { date_from: dateFrom, date_to: dateTo };
      if (propertyId !== "all") params.property_id = propertyId;
      const [reportRes, propertiesRes] = await Promise.all([
        getAccountingReports(params),
        getProperties(),
      ]);
      setReport(reportRes.data || null);
      setProperties(propertiesRes.data || []);
    } catch {
      setError("Unable to load financial report.");
    }
  }, [dateFrom, dateTo, propertyId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const expensesByCategory = useMemo(
    () =>
      (report?.expenses_by_category || []).map((item, idx) => ({
        ...item,
        color: ["#ef4444", "#f59e0b", "#a855f7", "#3b82f6", "#22c55e", "#6b7280"][idx % 6],
      })),
    [report?.expenses_by_category]
  );

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Income", report.total_income],
      ["Total Expenses", report.total_expenses],
      ["Net Operating Income", report.net_operating_income],
      ["Rent Collection Rate", report.rent_collection_rate],
      [],
      ["Month", "Income", "Expenses"],
      ...(report.income_by_month || []).map((m) => [m.month, m.income, m.expenses]),
      [],
      ["Expense Category", "Total"],
      ...(report.expenses_by_category || []).map((c) => [c.category, c.total]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "financial_report.csv";
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {role !== "landlord" ? (
        <Paper sx={{ p: 2, bgcolor: "#141414" }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Financial reports are available to landlord accounts only.
          </Typography>
        </Paper>
      ) : null}
      {role !== "landlord" ? null : (
      <>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", mb: 0.6 }}>
        Financial Reports
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.2 }}>
        Profit and loss insights by date range and property
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}

      <Paper sx={{ p: 1.2, mb: 1.2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Property</InputLabel>
          <Select label="Property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <MenuItem value="all">All Properties</MenuItem>
            {properties.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" size="small" onClick={loadReport}>Run Report</Button>
        <Button variant="outlined" size="small" onClick={exportCsv}>Export to CSV</Button>
      </Paper>

      {report ? (
        <>
          <Paper sx={{ p: 1.4, mb: 1.2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.8 }}>P&L Summary</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: "#22c55e" }}>Income: {formatCurrency(report.total_income)}</Typography>
              <Typography sx={{ fontSize: 13, color: "#ef4444" }}>Expenses: {formatCurrency(report.total_expenses)}</Typography>
              <Typography sx={{ fontSize: 13, color: Number(report.net_operating_income) >= 0 ? "#22c55e" : "#ef4444" }}>NOI: {formatCurrency(report.net_operating_income)}</Typography>
            </Box>
          </Paper>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr 1fr" }, gap: 1.2 }}>
            <Paper sx={{ p: 1.2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.8 }}>Income by Month</Typography>
              <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={report.income_by_month || []}>
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <Paper sx={{ p: 1.2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.8 }}>Expenses by Category</Typography>
              <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={expensesByCategory} dataKey="total" nameKey="category" innerRadius={60} outerRadius={95}>
                      {expensesByCategory.map((item) => <Cell key={item.category} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </>
      ) : null}
      </>
      )}
    </Box>
  );
}

export default FinancialReports;
