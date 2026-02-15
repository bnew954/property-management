import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, Search, People } from '@mui/icons-material';
import api from '../services/api';

export default function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTenants = async () => {
    try {
      const res = await api.get('/api/tenants/');
      setTenants(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleSave = async () => {
    try {
      if (editTenant) {
        await api.patch(`/api/tenants/${editTenant.id}/`, form);
        setSnackbar({ open: true, message: 'Tenant updated', severity: 'success' });
      } else {
        await api.post('/api/tenants/', form);
        setSnackbar({ open: true, message: 'Tenant added', severity: 'success' });
      }
      setOpenDialog(false);
      setEditTenant(null);
      setForm({ first_name: '', last_name: '', email: '', phone: '' });
      fetchTenants();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error saving tenant', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tenant?')) {
      return;
    }
    try {
      await api.delete(`/api/tenants/${id}/`);
      setSnackbar({ open: true, message: 'Tenant deleted', severity: 'success' });
      fetchTenants();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error deleting tenant', severity: 'error' });
    }
  };

  const openEdit = (tenant) => {
    setEditTenant(tenant);
    setForm({
      first_name: tenant.first_name || '',
      last_name: tenant.last_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
    });
    setOpenDialog(true);
  };

  const openAdd = () => {
    setEditTenant(null);
    setForm({ first_name: '', last_name: '', email: '', phone: '' });
    setOpenDialog(true);
  };

  const getInitials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();

  const getAvatarColor = (name) => {
    const colors = ['#7C5CFC', '#3b82f6', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredTenants = tenants.filter((t) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(s) ||
      ((t.email || '').toLowerCase().includes(s)) ||
      ((t.phone || '').toLowerCase().includes(s))
    );
  });

  const now = new Date();
  const totalTenants = tenants.length;
  const withEmail = tenants.filter((t) => (t.email || '').trim() !== '').length;
  const withPhone = tenants.filter((t) => (t.phone || '').trim() !== '').length;
  const addedThisMonth = tenants.filter((t) => {
    if (!t.created_at) return false;
    const created = new Date(t.created_at);
    if (Number.isNaN(created.getTime())) return false;
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const stats = [
    { label: 'Total Tenants', value: totalTenants },
    { label: 'With Email', value: withEmail },
    { label: 'With Phone', value: withPhone },
    { label: 'Added This Month', value: addedThisMonth },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>Tenants</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Manage tenant profiles and contacts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openAdd}
          sx={{
            backgroundColor: '#7C5CFC',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#6B4FD8' },
          }}
        >
          Add Tenant
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              p: 2,
              minWidth: 150,
            }}
          >
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              {stat.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <TextField
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name, email, or phone..."
        size="small"
        sx={{ maxWidth: 400, mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'rgba(255,255,255,0.5)' }} />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#7C5CFC' }} />
        </Box>
      ) : filteredTenants.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <People sx={{ fontSize: 64, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.3)' }}>
            {searchTerm ? 'No tenants match your search' : 'No tenants yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.2)', mt: 1 }}>
            {searchTerm ? 'Try a different search term' : 'Add your first tenant to get started'}
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <TableCell
                  sx={{
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  Phone
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: getAvatarColor(`${tenant.first_name} ${tenant.last_name}`),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(tenant.first_name, tenant.last_name)}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          {tenant.first_name} {tenant.last_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                          {tenant.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>{tenant.phone}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(tenant)}
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(tenant.id)}
                      sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>{editTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="First Name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Last Name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              backgroundColor: '#7C5CFC',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#6B4FD8' },
            }}
          >
            {editTenant ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
