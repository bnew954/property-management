import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FolderIcon from "@mui/icons-material/Folder";
import GavelIcon from "@mui/icons-material/Gavel";
import ImageIcon from "@mui/icons-material/Image";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SecurityIcon from "@mui/icons-material/Security";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { alpha } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useCallback, useEffect, useMemo, useState } from "react";
import DocumentUpload from "../components/DocumentUpload";
import {
  deleteDocument,
  downloadDocument,
  getDocuments,
} from "../services/api";
import { useUser } from "../services/userContext";

const documentTypes = [
  "all",
  "lease_agreement",
  "inspection_report",
  "insurance",
  "tax_document",
  "notice",
  "receipt",
  "photo",
  "other",
];

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeConfig = {
  lease_agreement: DescriptionIcon,
  inspection_report: FactCheckIcon,
  insurance: SecurityIcon,
  tax_document: GavelIcon,
  notice: WarningAmberIcon,
  receipt: ReceiptLongIcon,
  photo: ImageIcon,
  other: FolderIcon,
};

const typeChip = (type, theme) => {
  const colors = {
    lease_agreement: theme.palette.info.main,
    inspection_report: theme.palette.warning.main,
    insurance: theme.palette.success.main,
    tax_document: theme.palette.secondary.main,
    notice: theme.palette.error.main,
    receipt: theme.palette.text.secondary,
    photo: theme.palette.info.main,
    other: theme.palette.text.secondary,
  };
  const IconByType = typeConfig[type] || FolderIcon;
  const icon = <IconByType sx={{ fontSize: 14 }} />;
  const color = colors[type] || colors.other;

  return (
    <Chip
      icon={icon}
      label={String(type || "other").replaceAll("_", " ")}
      size="small"
      sx={{
        bgcolor: `${color}22`,
        color,
        fontSize: 11,
        height: 22,
        textTransform: "capitalize",
      }}
    />
  );
};

function associatedWith(document) {
  if (document.property_detail?.name) {
    return document.property_detail.name;
  }
  if (document.unit_detail?.unit_number) {
    return `Unit ${document.unit_detail.unit_number}`;
  }
  if (document.tenant_detail) {
    return `${document.tenant_detail.first_name} ${document.tenant_detail.last_name}`;
  }
  if (document.lease) {
    return `Lease #${document.lease}`;
  }
  return "-";
}

function Documents({ templateOnly = false }) {
  const theme = useTheme();
  const { role } = useUser();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const canDelete = role === "landlord";

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (templateOnly) {
        params.is_template = true;
      }
      if (typeFilter !== "all") {
        params.document_type = typeFilter;
      }
      const response = await getDocuments(params);
      setDocuments(response.data || []);
    } catch {
      setError("Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [templateOnly, typeFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return documents;
    }
    return documents.filter((doc) => {
      const haystack = [
        doc.name,
        doc.description,
        doc.document_type,
        doc.uploaded_by_detail?.username,
        doc.property_detail?.name,
        doc.unit_detail?.unit_number,
        doc.tenant_detail?.first_name,
        doc.tenant_detail?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [documents, search]);

  const handleDownload = async (document) => {
    try {
      const response = await downloadDocument(document.id);
      const url = URL.createObjectURL(response.data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.file?.split("/").pop() || document.name;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download file.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      loadDocuments();
    } catch {
      setError("Unable to delete document.");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    setDroppedFile(file);
    setUploadOpen(true);
  };

  return (
    <Box onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} sx={{ position: "relative" }}>
      {dragging ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.6)}`,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Typography sx={{ fontSize: 14, color: "primary.main" }}>
            Drop file to upload
          </Typography>
        </Box>
      ) : null}
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
          {templateOnly ? "Templates" : "Documents"}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          {templateOnly
            ? "Reusable document templates"
            : "Store and manage files across properties, units, and tenants"}
        </Typography>
      </Box>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      <Paper sx={{ p: 1.2, mb: 1.2, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search documents"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 240, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <Select
          size="small"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          sx={{ minWidth: 170 }}
        >
          {documentTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type === "all" ? "All Types" : type.replaceAll("_", " ")}
            </MenuItem>
          ))}
        </Select>
        {role === "landlord" ? (
          <Button variant="outlined" size="small" onClick={() => setUploadOpen(true)}>
            Upload Document
          </Button>
        ) : null}
      </Paper>

      <TableContainer component={Paper} sx={{ bgcolor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Associated With</TableCell>
              <TableCell sx={headerCellSx}>Uploaded By</TableCell>
              <TableCell sx={headerCellSx}>Date</TableCell>
              <TableCell sx={headerCellSx}>Size</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow
                key={doc.id}
                sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}
              >
                <TableCell>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => handleDownload(doc)}
                    sx={{ p: 0, minWidth: "auto", color: "primary.main", textTransform: "none" }}
                  >
                    {doc.name}
                  </Button>
                </TableCell>
                <TableCell>{typeChip(doc.document_type, theme)}</TableCell>
                <TableCell>{associatedWith(doc)}</TableCell>
                <TableCell>
                  {doc.uploaded_by_detail
                    ? doc.uploaded_by_detail.first_name || doc.uploaded_by_detail.last_name
                      ? `${doc.uploaded_by_detail.first_name || ""} ${doc.uploaded_by_detail.last_name || ""}`.trim()
                      : doc.uploaded_by_detail.username
                    : "-"}
                </TableCell>
                <TableCell>{formatDate(doc.created_at)}</TableCell>
                <TableCell>{formatBytes(doc.file_size)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(doc)}
                    sx={{ color: "text.secondary", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                  >
                    <CloudDownloadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  {canDelete ? (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(doc.id)}
                      sx={{ color: "text.secondary", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                      No documents found.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <DocumentUpload
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setDroppedFile(null);
        }}
        initialFile={droppedFile}
        defaultIsTemplate={templateOnly}
        onUploaded={loadDocuments}
      />
    </Box>
  );
}

export default Documents;
