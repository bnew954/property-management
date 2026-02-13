import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  getOrgInvitations,
  getOrgMembers,
  getOrganization,
  getUnits,
  inviteMember,
  updateOrganization,
} from "../services/api";

const statusColorByName = {
  pending: "warning",
  accepted: "success",
  revoked: "default",
};

function OrgSettings() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [unitCount, setUnitCount] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("tenant");
  const [inviting, setInviting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleTabChange = (_, nextTab) => setActiveTab(nextTab);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [organizationResponse, membersResponse, invitationsResponse, unitsResponse] =
        await Promise.all([
          getOrganization(),
          getOrgMembers(),
          getOrgInvitations(),
          getUnits(),
        ]);

      const organizationData = organizationResponse.data || null;
      const membersData = membersResponse.data || [];
      const invitationsData = invitationsResponse.data || [];
      const unitsData = unitsResponse.data || [];

      setOrganization(organizationData);
      setMembers(membersData);
      setInvitations(invitationsData);
      setUnitCount(unitsData.length);
      setOrgName(organizationData?.name || "");
    } catch (err) {
      setError("Unable to load organization settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveOrganization = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }
    try {
      setSavingOrg(true);
      const response = await updateOrganization({ name: orgName.trim() });
      setOrganization(response.data);
      setSnackbar({
        open: true,
        message: "Organization updated successfully.",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to update organization.",
        severity: "error",
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setSnackbar({
        open: true,
        message: "Email is required.",
        severity: "error",
      });
      return;
    }
    try {
      setInviting(true);
      await inviteMember(email, inviteRole);
      setInviteEmail("");
      setInviteRole("tenant");
      setInviteOpen(false);
      setSnackbar({
        open: true,
        message: "Invitation sent.",
        severity: "success",
      });
      const invitationResponse = await getOrgInvitations();
      setInvitations(invitationResponse.data || []);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data
          ? JSON.stringify(err.response.data)
          : "Failed to send invitation.",
        severity: "error",
      });
    } finally {
      setInviting(false);
    }
  };

  const isPro = organization?.plan === "pro";

  return (
    <Box>
      <Box sx={{ mb: 1.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}>
          Settings
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Manage your organization details and workspace access.
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 1.6 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ borderRadius: 1, bgcolor: "background.paper" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab label="General" />
          <Tab label="Members" />
          <Tab label="Billing" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 2.4 } }}>
          {activeTab === 0 ? (
            <Box>
              <Typography sx={{ mb: 0.6, fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                General
              </Typography>
              {loading ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
              ) : null}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.2, maxWidth: 560 }}>
                <TextField
                  label="Workspace Name"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  size="small"
                  fullWidth
                />
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Chip
                    label={`Current Plan: ${isPro ? "Pro" : "Free"}`}
                    size="small"
                    color={isPro ? "success" : "default"}
                  />
                  {isPro ? null : (
                    <Button variant="outlined" size="small">
                      Upgrade to Pro
                    </Button>
                  )}
                </Box>
                <Typography sx={{ mt: 0.5, fontSize: 12, color: "text.secondary" }}>
                  Units used: {unitCount}/{organization?.max_units || 0}
                </Typography>
                <Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveOrganization}
                    disabled={savingOrg}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : null}

          {activeTab === 1 ? (
            <Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                  Organization Members
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAddAlt1Icon />}
                  onClick={() => setInviteOpen(true)}
                >
                  Invite Member
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mb: 1.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>Name</TableCell>
                      <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>Email</TableCell>
                      <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>Role</TableCell>
                      <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>Admin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: "primary.main", fontSize: "0.75rem" }}>
                              {(member.first_name || member.username || "M").slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Typography sx={{ fontSize: 13 }}>{member.first_name || member.username}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{member.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={member.role}
                            size="small"
                            color={member.role === "landlord" ? "primary" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={member.is_org_admin ? <AdminPanelSettingsIcon fontSize="small" /> : null}
                            label={member.is_org_admin ? "Yes" : "No"}
                            size="small"
                            color={member.is_org_admin ? "success" : "default"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ fontSize: 12, color: "text.secondary", py: 2 }}>
                          No members found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.6 }}>
                Pending Invitations
              </Typography>
              {loading ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Loading invitations...</Typography>
              ) : null}
              <Box sx={{ display: "grid", gap: 0.8 }}>
                {invitations.map((invitation) => (
                  <Box
                    key={invitation.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13 }}>{invitation.email}</Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        Role: {invitation.role}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={invitation.status}
                      color={statusColorByName[invitation.status] || "default"}
                    />
                  </Box>
                ))}
                {invitations.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>
                    No pending invitations.
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ) : null}

          {activeTab === 2 ? (
            <Box sx={{ maxWidth: 760 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
                Billing
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.8 }}>
                Current plan: <strong>{isPro ? "Pro" : "Free"}</strong>
              </Typography>
              {isPro ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.2 }}>
                  You are currently on the Pro plan.
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.2 }}>
                  Billing management coming soon.
                </Typography>
              )}
              <Button
                variant="contained"
                size="small"
                component={Link}
                to="/accounting"
                sx={{ minWidth: 180 }}
                startIcon={<ReceiptLongIcon />}
              >
                Upgrade to Pro
              </Button>
            </Box>
          ) : null}
        </Box>
      </Paper>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.4 }}>
          <TextField
            label="Email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <MenuItem value="landlord">Landlord</MenuItem>
              <MenuItem value="tenant">Tenant</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            size="small"
            disabled={inviting}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default OrgSettings;
