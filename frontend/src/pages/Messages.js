import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getInboxMessages,
  getOrganizationUsers,
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

const fullDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

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
        name: getPersonName(message.recipient_detail),
        type: "user",
        hasAccount: true,
      };
    }
    if (message.recipient_tenant_detail) {
      return {
        name: getPersonName(message.recipient_tenant_detail),
        type: "tenant",
        hasAccount: Boolean(message.recipient_tenant_has_account),
      };
    }
  }

  return {
    name: getPersonName(message.sender_detail),
    type: "user",
    hasAccount: true,
  };
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
  const [composeValues, setComposeValues] = useState({
    recipient: "",
    subject: "",
    body: "",
  });
  const [replyBody, setReplyBody] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const [inboxRes, sentRes, recipientsRes] = await Promise.all([
        getInboxMessages(),
        getSentMessages(),
        getOrganizationUsers(),
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
        const unread = sorted.some(
          (item) => isMessageForCurrentUser(item, user) && !item.is_read
        );
        return {
          threadId,
          messages: sorted,
          subject: sorted[0]?.subject || "(No subject)",
          preview: last.body,
          updatedAt: last.created_at,
          unread,
          counterpart,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [inbox, sent, user]);

  useEffect(() => {
    if (!selectedThreadId && threadGroups.length > 0) {
      setSelectedThreadId(threadGroups[0].threadId);
    }
  }, [selectedThreadId, threadGroups]);

  const selectedThread = threadGroups.find(
    (thread) => thread.threadId === selectedThreadId
  );

  const handleSelectThread = async (thread) => {
    setSelectedThreadId(thread.threadId);
    const unreadItems = thread.messages.filter(
      (item) => isMessageForCurrentUser(item, user) && !item.is_read
    );
    if (unreadItems.length === 0) {
      return;
    }

    await Promise.all(
      unreadItems.map((item) => markMessageRead(item.id).catch(() => null))
    );
    setInbox((prev) =>
      prev.map((item) =>
        unreadItems.some((unread) => unread.id === item.id)
          ? { ...item, is_read: true }
          : item
      )
    );
  };

  const handleCompose = async () => {
    if (!composeValues.recipient || !composeValues.subject.trim() || !composeValues.body.trim()) {
      return;
    }
    const [recipientType, recipientId] = composeValues.recipient.split(":");
    const payload = {
      subject: composeValues.subject.trim(),
      body: composeValues.body.trim(),
    };
    if (recipientType === "tenant") {
      payload.recipient_tenant = Number(recipientId);
    } else {
      payload.recipient = Number(recipientId);
    }

    try {
      await sendMessage(payload);
      setComposeOpen(false);
      setComposeValues({ recipient: "", subject: "", body: "" });
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

  const filteredUserRecipients = useMemo(
    () => recipients.users.filter((recipient) => recipient.id !== user?.id),
    [recipients.users, user?.id]
  );

  const selectedRecipient = useMemo(() => {
    if (!composeValues.recipient) {
      return null;
    }
    const [recipientType, recipientId] = composeValues.recipient.split(":");
    const normalizedId = Number(recipientId);
    if (recipientType === "tenant") {
      return (
        recipients.tenants.find((tenant) => tenant.id === normalizedId) || null
      );
    }
    return filteredUserRecipients.find((entry) => entry.id === normalizedId) || null;
  }, [composeValues.recipient, filteredUserRecipients, recipients.tenants]);

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
          <Box sx={{ borderRight: { md: "1px solid", borderColor: "divider" } }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setComposeOpen(true)}
                sx={{
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": { borderColor: "primary.main", color: "primary.main" },
                }}
              >
                Compose
              </Button>
            </Box>
            <Box sx={{ maxHeight: 470, overflowY: "auto" }}>
              {loading ? (
                <Typography sx={{ p: 1.2, fontSize: 12 }}>Loading...</Typography>
              ) : null}
              {threadGroups.map((thread) => (
                <Box
                  key={thread.threadId}
                  onClick={() => handleSelectThread(thread)}
                  sx={{
                    px: 1.2,
                    py: 1,
                    cursor: "pointer",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    backgroundColor:
                      selectedThreadId === thread.threadId
                        ? alpha(theme.palette.primary.main, 0.12)
                        : "transparent",
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                >
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
                  >
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 500, color: "text.primary" }}
                    >
                      {thread.counterpart.name}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "text.secondary" }}>
                      {toTimeAgo(thread.updatedAt)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
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
                  {thread.unread ? (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "error.main",
                        mt: 0.6,
                      }}
                    />
                  ) : null}
                </Box>
              ))}
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
                  {selectedThread.counterpart?.type === "tenant" && !selectedThread.counterpart.hasAccount ? (
                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 11,
                        color: "text.secondary",
                      }}
                    >
                      This tenant doesn&apos;t have an account yet — they&apos;ll see your
                      message when they register.
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ flexGrow: 1, maxHeight: 410, overflowY: "auto", p: 1.2 }}>
                  {selectedThread.messages.map((message) => {
                    const mine = message.sender === user?.id;
                    const senderName =
                      mine ? "You" : getPersonName(message.sender_detail);
                    return (
                      <Box
                        key={message.id}
                        sx={{
                          mb: 1,
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: "80%",
                            px: 1.2,
                            py: 0.8,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: mine
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(
                                  theme.palette.text.secondary,
                                  theme.palette.mode === "dark" ? 0.08 : 0.05
                                ),
                          }}
                        >
                          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                            {senderName}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "text.primary", mt: 0.2 }}>
                            {message.body}
                          </Typography>
                          <Typography sx={{ mt: 0.4, fontSize: 10, color: "text.secondary" }}>
                            {fullDate(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                <Box
                  sx={{
                    p: 1.2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Write a reply..."
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                  />
                  <Button variant="contained" onClick={handleReply}>
                    <SendIcon sx={{ fontSize: 16 }} />
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Select a conversation to start messaging.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ color: "text.primary", borderBottom: "1px solid", borderColor: "divider" }}>
          New Message
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "grid", gap: 1.2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Recipient</InputLabel>
              <Select
                label="Recipient"
                value={composeValues.recipient}
                onChange={(event) =>
                  setComposeValues((prev) => ({
                    ...prev,
                    recipient: event.target.value,
                  }))
                }
              >
                <ListSubheader disableSticky>Team Members</ListSubheader>
                {filteredUserRecipients.map((recipient) => (
                  <MenuItem key={`user-${recipient.id}`} value={`user:${recipient.id}`}>
                    {getPersonName(recipient)}
                    {recipient.email ? ` (${recipient.email})` : ""}
                  </MenuItem>
                ))}
                <ListSubheader disableSticky>Tenants</ListSubheader>
                {recipients.tenants.map((tenant) => (
                  <MenuItem key={`tenant-${tenant.id}`} value={`tenant:${tenant.id}`}>
                    {tenant.name || "Unknown Tenant"}
                    {tenant.email ? ` (${tenant.email})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedRecipient?.type === "tenant" ? (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                This tenant doesn&apos;t have an account yet — they&apos;ll see your message
                when they register.
              </Typography>
            ) : null}
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
              <Button onClick={() => setComposeOpen(false)} sx={{ color: "text.secondary" }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleCompose}>
                Send
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default Messages;
