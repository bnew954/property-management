import { useEffect, useMemo, useRef, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Box, Chip, Fade, Grow, IconButton, TextField, Typography } from "@mui/material";
import { sendAiMessage } from "../services/api";

const quickActions = [
  "Summarize my portfolio",
  "Who has overdue rent?",
  "Show maintenance requests",
  "Revenue this month",
];

const welcomeMessage =
  "Hi! I'm your Onyx AI assistant. I can help you with questions about your properties, tenants, leases, payments, and accounting. What would you like to know?";

const chipSx = {
  borderColor: "rgba(124,92,252,0.3)",
  color: "#7C5CFC",
  "&:hover": {
    backgroundColor: "rgba(124,92,252,0.1)",
  },
  mr: 1,
  mb: 1,
};

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderMessageText(content) {
  const normalized = content || "";
  const parts = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    const before = normalized.slice(lastIndex, match.index);
    if (before) {
      parts.push({ type: "text", value: before });
    }
    parts.push({ type: "bold", value: match[1] || "" });
    lastIndex = match.index + match[0].length;
  }

  const remainder = normalized.slice(lastIndex);
  if (remainder) {
    parts.push({ type: "text", value: remainder });
  }

  if (!parts.length) {
    return <span>{normalized}</span>;
  }

  return (
    <span>
      {parts.map((part, index) =>
        part.type === "bold" ? (
          <span key={index} style={{ fontWeight: 600 }}>
            {part.value}
          </span>
        ) : (
          <span key={index}>{part.value}</span>
        )
      )}
    </span>
  );
}

export default function AiAgent() {
  const logoSrc = `${process.env.PUBLIC_URL || ""}/logo-icon.png`;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);

  const messageList = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        formattedTime: formatTime(message.timestamp),
      })),
    [messages]
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: welcomeMessage,
            timestamp: new Date(),
            isWelcome: true,
          },
        ]);
      }
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageList, isLoading]);

  const clearChat = () => {
    setMessages([]);
  };

  const sendMessage = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const nextHistory = [...messagesRef.current, userMessage].map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setHasUnread(false);

    try {
      const response = await sendAiMessage({
        message: trimmed,
        history: nextHistory,
      });
      const aiContent = response?.data?.message || "Sorry, I could not generate a response.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiContent,
          timestamp: new Date(),
        },
      ]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } finally {
      setIsLoading(false);
      if (isOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleSend = () => {
    if (isLoading) {
      return;
    }
    sendMessage(inputValue);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const quickAction = (text) => {
    if (isLoading) {
      return;
    }
    sendMessage(text);
  };

  return (
    <>
      {!isOpen && (
        <Fade in={showButton} timeout={700}>
          <Box
            onClick={() => {
              setIsOpen(true);
            }}
            sx={{
              "@keyframes float": {
                "0%,100%": {
                  transform: "translateY(0px)",
                  filter: "drop-shadow(0 0 20px rgba(124, 92, 252, 0.5))",
                },
                "50%": {
                  transform: "translateY(-3px)",
                  filter: "drop-shadow(0 0 30px rgba(124, 92, 252, 0.7))",
                },
              },
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 44,
              height: 44,
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              filter: "drop-shadow(0 0 20px rgba(124, 92, 252, 0.5))",
              animation: "float 3s ease-in-out infinite",
              transition: "all 0.3s ease",
              "&:hover": {
                animation: "none",
                transform: "scale(1.05)",
                filter: "drop-shadow(0 0 40px rgba(255, 60, 60, 0.9)) brightness(1.3) hue-rotate(200deg)",
              },
            }}
          >
            <img
              src={logoSrc}
              alt="AI Assistant"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
            {hasUnread ? (
              <Box
                sx={{
                  position: "absolute",
                  top: 9,
                  right: 10,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  boxShadow: "0 0 0 2px rgba(10,10,20,0.85)",
                }}
              />
            ) : null}
          </Box>
        </Fade>
      )}

      <Grow in={isOpen} timeout={200} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1300,
            height: 560,
            backgroundColor: "#0d0d14",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            width: 400,
            borderRadius: "16px",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            "@keyframes typingDot": {
              "0%,80%,100%": {
                transform: "translateY(0)",
                opacity: 0.4,
              },
              "40%": {
                transform: "translateY(-3px)",
                opacity: 1,
              },
            },
          }}
        >
          <Box
            sx={{
              height: 56,
              px: 2.5,
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
              <SmartToyIcon sx={{ color: "#7c5cfc", fontSize: 24 }} />
              <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600 }}>
                Onyx AI Assistant
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => {
                  setHasUnread(false);
                  setIsOpen(false);
                }}
                sx={{ color: "rgba(255,255,255,0.75)" }}
                aria-label="Minimize"
              >
                <KeyboardArrowDownIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={clearChat}
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                  },
                }}
                aria-label="Clear chat"
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 2,
              py: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(255,255,255,0.1)",
                borderRadius: 4,
              },
            }}
          >
            {messageList.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <Box
                  key={`${message.timestamp}-${index}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: 0.5,
                  }}
                >
                  {!isUser && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <SmartToyIcon sx={{ color: "#7c5cfc", fontSize: 20 }} />
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        Onyx AI
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      backgroundColor: isUser ? "#7C5CFC" : "rgba(255, 255, 255, 0.05)",
                      borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                      p: 1.5,
                      color: isUser ? "#fff" : "rgba(255, 255, 255, 0.8)",
                      maxWidth: "85%",
                      ml: isUser ? "auto" : 0,
                      "& .MuiTypography-root": {
                        lineHeight: 1.6,
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {isUser ? message.content : renderMessageText(message.content)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.2)" }}>
                    {message.formattedTime}
                  </Typography>
                  {!isUser && message.isWelcome ? (
                    <Box sx={{ mt: 0.6, display: "flex", flexWrap: "wrap" }}>
                      {quickActions.map((action) => (
                        <Chip
                          key={action}
                          label={action}
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => quickAction(action)}
                          sx={chipSx}
                        />
                      ))}
                    </Box>
                  ) : null}
                </Box>
              );
            })}

            {isLoading && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <SmartToyIcon sx={{ color: "#7c5cfc", fontSize: 20 }} />
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                    Onyx AI
                  </Typography>
                </Box>
                <Box
                  sx={{
                    maxWidth: "85%",
                    p: 1.5,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "4px 12px 12px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                  }}
                >
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.3)",
                        animation: "typingDot 1s infinite",
                        animationDelay: `${index * 0.15}s`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box ref={messagesEndRef} />
          </Box>

          <Box
            sx={{
              minHeight: 56,
              px: 1,
              py: 1,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your properties..."
              variant="standard"
              multiline
              maxRows={4}
              autoComplete="off"
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: "#fff",
                  fontSize: 13,
                  px: 1.8,
                  minHeight: "32px",
                  py: 1,
                  "& .MuiInputBase-input": {
                    color: "#fff",
                  },
                },
              }}
              sx={{ flex: 1 }}
              disabled={isLoading}
            />
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                color: "#7C5CFC",
                "&:disabled": { color: "rgba(255,255,255,0.2)" },
                mb: 0.6,
              }}
              aria-label="Send"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Grow>
    </>
  );
}
