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
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function Messages() {
  const { user } = useUser();
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
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
      const [inboxRes, sentRes, usersRes] = await Promise.all([
        getInboxMessages(),
        getSentMessages(),
        getMessageRecipients(),
      ]);
      setInbox(inboxRes.data || []);
      setSent(sentRes.data || []);
      setUsers((usersRes.data || []).filter((u) => u.id !== user?.id));
    } catch {
      setError("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const threads = useMemo(() => {
    const grouped = new Map();
    [...inbox, ...sent].forEach((message) => {
      const threadId = message.parent || message.id;
      if (!grouped.has(threadId)) {
        grouped.set(threadId, []);
      }
      grouped.get(threadId).push(message);
    });

    const result = Array.from(grouped.entries()).map(([threadId, messages]) => {
      const sorted = messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const last = sorted[sorted.length - 1];
      const unread = sorted.some(
        (item) => item.recipient === user?.id && !item.is_read
      );
      const otherUser =
        last.sender === user?.id ? last.recipient_detail : last.sender_detail;
      return {
        threadId,
        messages: sorted,
        subject: sorted[0]?.subject || "(No subject)",
        preview: last.body,
        updatedAt: last.created_at,
        unread,
        otherUserName:
          otherUser?.first_name || otherUser?.last_name
            ? `${otherUser?.first_name || ""} ${otherUser?.last_name || ""}`.trim()
            : otherUser?.username || "Unknown",
      };
    });

    return result.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [inbox, sent, user?.id]);

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].threadId);
    }
  }, [selectedThreadId, threads]);

  const selectedThread = threads.find((thread) => thread.threadId === selectedThreadId);

  const handleSelectThread = async (thread) => {
    setSelectedThreadId(thread.threadId);
    const unreadItems = thread.messages.filter(
      (item) => item.recipient === user?.id && !item.is_read
    );
    if (unreadItems.length === 0) {
      return;
    }
    await Promise.all(unreadItems.map((item) => markMessageRead(item.id).catch(() => null)));
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
    try {
      await sendMessage({
        recipient: Number(composeValues.recipient),
        subject: composeValues.subject.trim(),
        body: composeValues.body.trim(),
      });
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

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
          Messages
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Internal communication and threaded conversations
        </Typography>
      </Box>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      <Paper sx={{ p: 0, overflow: "hidden", minHeight: 520 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, minHeight: 520 }}>
          <Box sx={{ borderRight: { md: "1px solid rgba(255,255,255,0.06)" } }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setComposeOpen(true)}
                sx={{
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#e0e0e0",
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
              {threads.map((thread) => (
                <Box
                  key={thread.threadId}
                  onClick={() => handleSelectThread(thread)}
                  sx={{
                    px: 1.2,
                    py: 1,
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    backgroundColor:
                      selectedThreadId === thread.threadId
                        ? "rgba(124,92,252,0.12)"
                        : "transparent",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#e5e7eb" }}>
                      {thread.otherUserName}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "#6b7280" }}>
                      {toTimeAgo(thread.updatedAt)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: "#d1d5db", mt: 0.2 }}>
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
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#ef4444", mt: 0.6 }} />
                  ) : null}
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {selectedThread ? (
              <>
                <Box sx={{ p: 1.2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {selectedThread.subject}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, maxHeight: 410, overflowY: "auto", p: 1.2 }}>
                  {selectedThread.messages.map((message) => {
                    const mine = message.sender === user?.id;
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
                            border: "1px solid rgba(255,255,255,0.08)",
                            bgcolor: mine ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <Typography sx={{ fontSize: 12, color: "#e5e7eb" }}>{message.body}</Typography>
                          <Typography sx={{ mt: 0.4, fontSize: 10, color: "#6b7280" }}>
                            {fullDate(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                <Box sx={{ p: 1.2, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 1 }}>
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

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ bgcolor: "#141414", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          New Message
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#141414", pt: 2 }}>
          <Box sx={{ display: "grid", gap: 1.2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Recipient</InputLabel>
              <Select
                label="Recipient"
                value={composeValues.recipient}
                onChange={(event) =>
                  setComposeValues((prev) => ({ ...prev, recipient: event.target.value }))
                }
              >
                {users.map((recipient) => (
                  <MenuItem key={recipient.id} value={recipient.id}>
                    {recipient.first_name || recipient.last_name
                      ? `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim()
                      : recipient.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Subject"
              value={composeValues.subject}
              onChange={(event) =>
                setComposeValues((prev) => ({ ...prev, subject: event.target.value }))
              }
            />
            <TextField
              multiline
              minRows={5}
              label="Body"
              value={composeValues.body}
              onChange={(event) =>
                setComposeValues((prev) => ({ ...prev, body: event.target.value }))
              }
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                onClick={() => setComposeOpen(false)}
                sx={{ color: "text.secondary" }}
              >
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

