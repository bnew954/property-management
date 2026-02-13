import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/api";

const toTimeAgo = (value) => {
  if (!value) {
    return "";
  }
  const then = new Date(value);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const open = Boolean(anchorEl);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadNotificationsCount();
      setUnreadCount(response.data?.unread_count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.data || []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [loadNotifications, loadUnreadCount, open]);

  const visibleNotifications = useMemo(
    () => (showAll ? notifications : notifications.slice(0, 6)),
    [notifications, showAll]
  );

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        // Keep UI responsive even if mark-read fails.
      }
    }
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(prev - (notification.is_read ? 0 : 1), 0));
    if (notification.link) {
      navigate(notification.link);
      setAnchorEl(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // noop
    }
  };

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          color: "#9ca3af",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 1,
          "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.03)" },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            "& .MuiBadge-badge": {
              fontSize: 10,
              minWidth: 16,
              height: 16,
            },
          }}
        >
          <NotificationsNoneIcon sx={{ fontSize: 18 }} />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 360,
            mt: 1,
            borderRadius: 1,
            backgroundColor: "#141414",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      >
        <Box sx={{ p: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
            Notifications
          </Typography>
          <Button
            size="small"
            onClick={handleMarkAllRead}
            sx={{ fontSize: 11, minWidth: "auto", color: "text.secondary", px: 0.5 }}
          >
            Mark all as read
          </Button>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
        <Box sx={{ maxHeight: 340, overflowY: "auto" }}>
          {visibleNotifications.map((notification) => (
            <Box
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                px: 1.2,
                py: 1.1,
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    mt: 0.7,
                    bgcolor: notification.is_read ? "transparent" : "#ef4444",
                    border: notification.is_read ? "1px solid rgba(255,255,255,0.1)" : "none",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#e5e7eb" }}>
                    {notification.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: "#6b7280", mt: 0.3 }}>
                    {toTimeAgo(notification.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
          {visibleNotifications.length === 0 ? (
            <Box sx={{ p: 1.6 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                No notifications yet.
              </Typography>
            </Box>
          ) : null}
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button
            size="small"
            onClick={() => setShowAll((prev) => !prev)}
            sx={{ fontSize: 11, color: "text.secondary" }}
          >
            {showAll ? "Show recent" : "View all"}
          </Button>
        </Box>
      </Popover>
    </>
  );
}

export default NotificationBell;

