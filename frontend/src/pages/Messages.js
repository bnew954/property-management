import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
  useTheme,
  Autocomplete,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getInboxMessages,
  getMessageRecipients,
  getSentMessages,
  markMessageRead,
  replyMessage,
  sendMessage,
} from "../services/api";
import { useUser } from "../services/userContext";

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
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const normalizeMessageList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  return [];
};

const normalizeMessagingRecipients = (payload = {}) => {
  return {
    users: Array.isArray(payload.users) ? payload.users : [],
    tenants: Array.isArray(payload.tenants) ? payload.tenants : [],
  };
};

const getPersonName = (person = {}) => {
  const fullName = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return fullName || person.name || person.username || "Unknown";
};

const getInitials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (name) => {
  const colors = [
    "#7C5CFC",
    "#3b82f6",
    "#059669",
    "#d97706",
    "#dc2626",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const isMessageForCurrentUser = (message, user) => {
  if (!user) {
    return false;
  }
  if (message.recipient === user.id) {
    return true;
  }
  return Boolean(message.recipient_tenant && message.recipient_tenant === user.tenant_id);
};

const getMessageCounterpart = (message, user) => {
  if (message.sender === user?.id) {
    if (message.recipient_detail) {
      return {
        id: message.recipient_detail.id,
        name: getPersonName(message.recipient_detail),
        type: "user",
        hasAccount: true,
      };
    }
    if (message.recipient_tenant_detail) {
      return {
        id: message.recipient_tenant_detail.id,
        name: getPersonName(message.recipient_tenant_detail),
        type: "tenant",
        hasAccount: Boolean(message.recipient_tenant_has_account),
      };
    }
  }
  return {
    id: message.sender_detail?.id,
    name: getPersonName(message.sender_detail),
    type: "user",
    hasAccount: true,
  };
};

const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();

const isYesterday = (date) => {
  const d = new Date(date);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
};

const formatMessageTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const getThreadDateLabel = (value) => {
  if (!value) {
    return "";
  }
  if (isToday(value)) {
    return "Today";
  }
  if (isYesterday(value)) {
    return "Yesterday";
  }
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function Messages() {
  const { user } = useUser();
  const theme = useTheme();
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [recipients, setRecipients] = useState({ users: [], tenants: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState(null);
  const [composeValues, setComposeValues] = useState({ subject: "", body: "" });
  const [replyBody, setReplyBody] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [threadMenuAnchor, setThreadMenuAnchor] = useState(null);
  const [threadMenuId, setThreadMenuId] = useState(null);
  const longPressTimer = useRef(null);

  const messageRecipientOptions = useMemo(() => {
    const tenantLookup = recipients.tenants.map((tenant) => {
      const unit = tenant.unit || tenant.unit_label || tenant.unit_number || "";
      return {
        id: tenant.id,
        type: "tenant",
        name: getPersonName(tenant),
        email: tenant.email || "",
        unit: unit ? `Unit ${unit}` : "Unit N/A",
        hasAccount: Boolean(tenant.has_account),
      };
    });
    const userLookup = recipients.users
      .filter((entry) => entry.id !== user?.id)
      .map((entry) => ({
        id: entry.id,
        type: "user",
        name: getPersonName(entry),
        email: entry.email || "",
        hasAccount: true,
      }));
    return [...tenantLookup, ...userLookup];
  }, [recipients.tenants, recipients.users, user?.id]);

  const formatRecipientOptionLabel = (option) => {
    if (!option) {
      return "";
    }
    if (option.type === "tenant") {
      const emailPart = option.email ? ` ${option.email}` : "";
      return `${option.name}${emailPart} · ${option.unit || "Unit N/A"}`;
    }
    const emailPart = option.email ? ` ${option.email}` : "";
    return `${option.name}${emailPart}`;
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const [inboxRes, sentRes, recipientsRes] = await Promise.all([
        getInboxMessages(),
        getSentMessages(),
        getMessageRecipients(),
      ]);
      setInbox(normalizeMessageList(inboxRes.data));
      setSent(normalizeMessageList(sentRes.data));
      setRecipients(normalizeMessagingRecipients(recipientsRes.data));
    } catch {
      setError("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const threadGroups = useMemo(() => {
    const grouped = new Map();
    [...inbox, ...sent].forEach((message) => {
      const threadId = message.parent || message.id;
      if (!grouped.has(threadId)) {
        grouped.set(threadId, []);
      }
      grouped.get(threadId).push(message);
    });

    return Array.from(grouped.entries())
      .map(([threadId, messages]) => {
        const sorted = [...messages].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const last = sorted[sorted.length - 1];
        const counterpart = getMessageCounterpart(last, user);
        const unreadItems = sorted.filter(
          (item) => isMessageForCurrentUser(item, user) && !item.is_read
        );
        const threadPreview = last.body ? last.body : "";
        return {
          id: threadId,
          messages: sorted,
          subject: sorted[0]?.subject || "(No subject)",
          preview: threadPreview,
          updatedAt: last.created_at,
          unreadCount: unreadItems.length,
          counterpart,
          initiatedByCurrentUser: sorted[0]?.sender === user?.id,
          searchText: `${counterpart.name} ${(sorted[0]?.subject || "").toLowerCase()} ${threadPreview}`.toLowerCase(),
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [inbox, sent, user]);

  const visibleThreads = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    return threadGroups.filter((thread) => {
      if (filterTab === "unread" && thread.unreadCount <= 0) {
        return false;
      }
      if (filterTab === "sent" && !thread.initiatedByCurrentUser) {
        return false;
      }
      if (!search) {
        return true;
      }
      return thread.searchText.includes(search);
    });
  }, [threadGroups, conversationSearch, filterTab]);

  useEffect(() => {
    if (!selectedThreadId && visibleThreads.length > 0) {
      setSelectedThreadId(visibleThreads[0].id);
      return;
    }
    if (selectedThreadId && !visibleThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(visibleThreads[0]?.id || null);
    }
    if (!visibleThreads.length) {
      setSelectedThreadId(null);
    }
  }, [selectedThreadId, visibleThreads]);

  const selectedThread = threadGroups.find((thread) => thread.id === selectedThreadId);

  const threadedDateGroups = useMemo(() => {
    if (!selectedThread) {
      return [];
    }
    const groups = [];
    let current;
    selectedThread.messages.forEach((message) => {
      const dateKey = message.created_at
        ? new Date(message.created_at).toDateString()
        : "unknown";
      const dateLabel = getThreadDateLabel(message.created_at);
      if (!current || current.dateKey !== dateKey) {
        current = { dateKey, dateLabel, messages: [] };
        groups.push(current);
      }
      current.messages.push(message);
    });
    return groups;
  }, [selectedThread]);

  const setThreadMessageReadState = useCallback(
    async (thread, readState) => {
      if (!thread) {
        return;
      }
      const items = thread.messages.filter((item) => isMessageForCurrentUser(item, user));
      if (!items.length) {
        return;
      }
      const ids = items.map((item) => item.id);
      if (readState) {
        const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
        await Promise.all(unreadIds.map((itemId) => markMessageRead(itemId).catch(() => null)));
        setInbox((prev) =>
          prev.map((item) =>
            ids.includes(item.id) ? { ...item, is_read: true } : item
          )
        );
      } else {
        setInbox((prev) =>
          prev.map((item) =>
            ids.includes(item.id) ? { ...item, is_read: false } : item
          )
        );
      }
    },
    [user]
  );

  const handleSelectThread = async (thread) => {
    setSelectedThreadId(thread.id);
    const unreadItems = thread.messages.filter(
      (item) => isMessageForCurrentUser(item, user) && !item.is_read
    );
    if (unreadItems.length === 0) {
      return;
    }
    await setThreadMessageReadState(thread, true);
  };

  const handleCompose = async () => {
    if (!composeRecipient || !composeValues.subject.trim() || !composeValues.body.trim()) {
      return;
    }
    const payload = {
      subject: composeValues.subject.trim(),
      body: composeValues.body.trim(),
    };
    if (composeRecipient.type === "tenant") {
      payload.recipient_tenant = composeRecipient.id;
    } else {
      payload.recipient = composeRecipient.id;
    }

    try {
      await sendMessage(payload);
      setComposeOpen(false);
      setComposeRecipient(null);
      setComposeValues({ subject: "", body: "" });
      loadMessages();
    } catch {
      setError("Failed to send message.");
    }
  };

  const handleReply = async () => {
    if (!selectedThread || !replyBody.trim()) {
      return;
    }
    const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
    try {
      await replyMessage(lastMessage.id, { body: replyBody.trim() });
      setReplyBody("");
      loadMessages();
    } catch {
      setError("Failed to send reply.");
    }
  };

  const markCurrentThreadAsRead = () => {
    const thread = threadGroups.find((entry) => entry.id === threadMenuId);
    if (!thread) {
      return;
    }
    setThreadMessageReadState(thread, true);
    setThreadMenuAnchor(null);
    setThreadMenuId(null);
  };

  const markCurrentThreadAsUnread = () => {
    const thread = threadGroups.find((entry) => entry.id === threadMenuId);
    if (!thread) {
      return;
    }
    setThreadMessageReadState(thread, false);
    setThreadMenuAnchor(null);
    setThreadMenuId(null);
  };

  const handleDeleteConversation = () => {
    const thread = threadGroups.find((entry) => entry.id === threadMenuId);
    if (!thread) {
      return;
    }
    const confirmed = window.confirm(`Delete conversation with ${thread.counterpart.name}?`);
    if (!confirmed) {
      setThreadMenuAnchor(null);
      setThreadMenuId(null);
      return;
    }
    const threadIds = new Set(thread.messages.map((entry) => entry.id));
    setInbox((prev) => prev.filter((entry) => !threadIds.has(entry.id)));
    setSent((prev) => prev.filter((entry) => !threadIds.has(entry.id)));
    if (selectedThreadId === thread.id) {
      setSelectedThreadId(null);
    }
    setThreadMenuAnchor(null);
    setThreadMenuId(null);
  };

  const openThreadMenu = (event, thread) => {
    event.preventDefault();
    event.stopPropagation();
    setThreadMenuAnchor(event.currentTarget);
    setThreadMenuId(thread.id);
  };

  const closeThreadMenu = () => {
    setThreadMenuAnchor(null);
    setThreadMenuId(null);
  };

  const handleConversationTouchStart = (event, thread) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    const anchor = event.currentTarget;
    longPressTimer.current = setTimeout(() => {
      openThreadMenu(
        {
          preventDefault: () => {},
          stopPropagation: () => {},
          currentTarget: anchor,
        },
        thread
      );
      longPressTimer.current = null;
    }, 550);
  };

  const handleConversationTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const currentMenuThread = threadGroups.find((thread) => thread.id === threadMenuId);
  const currentMenuThreadRecipientMessages = currentMenuThread
    ? currentMenuThread.messages.filter((item) => isMessageForCurrentUser(item, user))
    : [];

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 600,
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          Messages
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Internal communication and threaded conversations
        </Typography>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Paper sx={{ p: 0, overflow: "hidden", minHeight: 520 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
            minHeight: 520,
          }}
        >
          <Box
            sx={{
              borderRight: { md: "1px solid", borderColor: "divider" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                p: 1.2,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => setComposeOpen(true)}
                sx={{
                  borderColor: "#7C5CFC",
                  color: "#7C5CFC",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                  },
                }}
              >
                Compose
              </Button>
            </Box>
            <Box sx={{ p: 1.2, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder="Search messages..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: "100%",
                  mb: 1,
                }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                px: 1.2,
                mb: 1,
                flexWrap: "nowrap",
              }}
            >
              {[
                { label: "All", value: "all" },
                { label: "Unread", value: "unread" },
                { label: "Sent", value: "sent" },
              ].map((tab) => {
                const active = filterTab === tab.value;
                return (
                  <Chip
                    key={tab.value}
                    label={tab.label}
                    size="small"
                    onClick={() => setFilterTab(tab.value)}
                    sx={{
                      cursor: "pointer",
                      borderRadius: "999px",
                      borderColor: active ? "#7C5CFC" : "rgba(255,255,255,0.2)",
                      color: active ? "#7C5CFC" : "text.secondary",
                      backgroundColor: active ? "rgba(124,92,252,0.12)" : "transparent",
                      textDecoration: active ? "underline" : "none",
                      textDecorationThickness: active ? "2px" : "auto",
                      textUnderlineOffset: active ? "4px" : "0px",
                      "&:hover": {
                        backgroundColor: active
                          ? "rgba(124,92,252,0.16)"
                          : "rgba(255,255,255,0.04)",
                      },
                    }}
                  />
                );
              })}
            </Box>
            <Box
              sx={{
                flex: 1,
                maxHeight: 470,
                overflowY: "auto",
              }}
            >
              {loading ? (
                <Typography sx={{ p: 1.2, fontSize: 12 }}>Loading...</Typography>
              ) : null}
              {visibleThreads.map((thread) => {
                const isActive = selectedThreadId === thread.id;
                return (
                  <Box
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    onContextMenu={(event) => openThreadMenu(event, thread)}
                    onTouchStart={(event) => handleConversationTouchStart(event, thread)}
                    onTouchEnd={handleConversationTouchEnd}
                    onTouchMove={handleConversationTouchEnd}
                    sx={{
                      px: 1.2,
                      py: 1,
                      cursor: "pointer",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      backgroundColor: isActive
                        ? "rgba(124,92,252,0.1)"
                        : "transparent",
                      borderLeft: isActive
                        ? "3px solid #7C5CFC"
                        : "3px solid transparent",
                      position: "relative",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
                      "&:hover .thread-menu-trigger": {
                        opacity: 1,
                      },
                      display: "flex",
                      gap: 1.5,
                      alignItems: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: getAvatarColor(thread.counterpart.name),
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(thread.counterpart.name)}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
                      >
                        <Typography
                          sx={{ fontSize: 12, fontWeight: 500, color: "text.primary" }}
                          noWrap
                        >
                          {thread.counterpart.name}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.6,
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: 10, color: "text.secondary" }}>
                            {toTimeAgo(thread.updatedAt)}
                          </Typography>
                          {thread.unreadCount > 0 ? (
                            <Box
                              sx={{
                                backgroundColor: "#7C5CFC",
                                color: "#fff",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {thread.unreadCount}
                            </Box>
                          ) : null}
                        </Box>
                      </Box>
                      <Typography
                        sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}
                        noWrap
                      >
                        {thread.subject}
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
                        {thread.preview}
                      </Typography>
                    </Box>
                      <Tooltip title="More options">
                        <IconButton
                          className="thread-menu-trigger"
                          size="small"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openThreadMenu(event, thread);
                          }}
                        sx={{
                          position: "absolute",
                          top: 6,
                          right: 4,
                          padding: 0,
                          color: "text.secondary",
                          opacity: 0,
                          transition: "opacity 0.15s ease",
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {selectedThread ? (
              <>
                <Box
                  sx={{
                    p: 1.2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                    {selectedThread.subject}
                  </Typography>
                  {selectedThread.counterpart?.type === "tenant" &&
                  !selectedThread.counterpart.hasAccount ? (
                    <Typography sx={{ mt: 0.4, fontSize: 11, color: "text.secondary" }}>
                      This tenant doesn&apos;t have an account yet. They will see your message when they
                      register.
                    </Typography>
                  ) : null}
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    maxHeight: 410,
                    overflowY: "auto",
                    p: 1.2,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {threadedDateGroups.map((group, groupIndex) => (
                    <Box key={`${group.dateKey}-${groupIndex}`}>
                      <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
                        <Divider
                          sx={{
                            flex: 1,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            height: "1px",
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            px: 2,
                            color: "rgba(255,255,255,0.3)",
                            fontSize: "0.7rem",
                          }}
                        >
                          {group.dateLabel}
                        </Typography>
                        <Divider
                          sx={{
                            flex: 1,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            height: "1px",
                          }}
                        />
                      </Box>
                      {group.messages.map((message) => {
                        const mine = message.sender === user?.id;
                        const senderName = mine ? "You" : getPersonName(message.sender_detail);
                        return (
                          <Box
                            key={message.id}
                            sx={{
                              mb: 1,
                              display: "flex",
                              justifyContent: mine ? "flex-end" : "flex-start",
                              alignItems: "flex-start",
                              gap: mine ? 0 : 1,
                            }}
                          >
                            {!mine ? (
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  backgroundColor: getAvatarColor(senderName),
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  mt: 0.4,
                                }}
                              >
                                {getInitials(senderName)}
                              </Box>
                            ) : null}
                            <Box
                              sx={{
                                maxWidth: "80%",
                                px: 1.2,
                                py: 0.8,
                                borderRadius: mine
                                  ? "16px 4px 16px 16px"
                                  : "4px 16px 16px 16px",
                                backgroundColor: mine ? "#7C5CFC" : "rgba(255,255,255,0.06)",
                                color: mine ? "#fff" : "text.primary",
                              }}
                            >
                              {!mine ? (
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    color: "text.secondary",
                                    mb: 0.2,
                                  }}
                                >
                                  {senderName}
                                </Typography>
                              ) : null}
                              <Typography
                                sx={{ fontSize: 12, color: mine ? "#fff" : "text.primary" }}
                              >
                                {message.body}
                              </Typography>
                              <Typography
                                sx={{
                                  mt: 0.4,
                                  fontSize: "0.65rem",
                                  color: mine ? "rgba(255,255,255,0.65)" : "text.secondary",
                                }}
                              >
                                {formatMessageTime(message.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
                <Box
                  sx={{
                    p: 1.2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "rgba(255,255,255,0.01)",
                  }}
                >
                  <Box
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={1}
                      maxRows={4}
                      placeholder="Write a reply..."
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleReply();
                        }
                      }}
                    />
                    <IconButton
                      onClick={handleReply}
                      disabled={!replyBody.trim()}
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        bgcolor: "#7C5CFC",
                        color: "#fff",
                        "&:hover": {
                          bgcolor: "#6b52e5",
                        },
                        flexShrink: 0,
                      }}
                    >
                      <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 0.6,
                  color: "rgba(255,255,255,0.2)",
                  p: 2,
                }}
              >
                <ChatBubbleOutlineIcon
                  sx={{ fontSize: 64, color: "rgba(255,255,255,0.08)" }}
                />
                <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.2)" }}>
                  Select a conversation
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                  or
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setComposeOpen(true)}
                  sx={{
                    mt: 1,
                    borderColor: "#7C5CFC",
                    color: "#7C5CFC",
                  }}
                >
                  Compose New Message
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setComposeRecipient(null);
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(14,14,14,0.95)"
                : "#fff",
            border:
              theme.palette.mode === "dark"
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.08)",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "text.primary",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          New Message
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "grid", gap: 1.2, mt: 1 }}>
            <Autocomplete
              options={messageRecipientOptions}
              value={composeRecipient}
              onChange={(event, value) => setComposeRecipient(value)}
              getOptionLabel={formatRecipientOptionLabel}
              isOptionEqualToValue={(option, value) =>
                option.type === value.type && option.id === value.id
              }
              filterOptions={(opts, { inputValue }) => {
                const input = inputValue.toLowerCase();
                return opts.filter((option) =>
                  `${option.name} ${option.email || ""} ${option.unit || ""}`
                    .toLowerCase()
                    .includes(input)
                );
              }}
              renderOption={(props, option) => {
                return (
                  <li {...props}>
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13 }}>{option.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        {option.type === "tenant"
                          ? `${option.email || "No email"} · ${option.unit || "Unit N/A"}`
                          : option.email || "No email"}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="To" placeholder="Search tenants..." />
              )}
            />
            <TextField
              label="Subject"
              value={composeValues.subject}
              onChange={(event) =>
                setComposeValues((prev) => ({
                  ...prev,
                  subject: event.target.value,
                }))
              }
            />
            <TextField
              multiline
              minRows={5}
              label="Body"
              value={composeValues.body}
              onChange={(event) =>
                setComposeValues((prev) => ({
                  ...prev,
                  body: event.target.value,
                }))
              }
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                onClick={() => {
                  setComposeOpen(false);
                  setComposeRecipient(null);
                }}
                sx={{ color: "text.secondary" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCompose}
                disabled={
                  !composeRecipient ||
                  !composeValues.subject.trim() ||
                  !composeValues.body.trim()
                }
              >
                Send
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Menu
        open={Boolean(threadMenuAnchor)}
        anchorEl={threadMenuAnchor}
        onClose={closeThreadMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={markCurrentThreadAsRead}
          disabled={!(currentMenuThread && currentMenuThreadRecipientMessages.some((item) => !item.is_read))}
        >
          Mark as Read
        </MenuItem>
        <MenuItem
          onClick={markCurrentThreadAsUnread}
          disabled={!(currentMenuThreadRecipientMessages.length > 0)}
        >
          Mark as Unread
        </MenuItem>
        <MenuItem onClick={handleDeleteConversation}>Delete Conversation</MenuItem>
      </Menu>
    </Box>
  );
}

export default Messages;

