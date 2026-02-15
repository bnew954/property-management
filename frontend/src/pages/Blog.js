import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import PublicFooter from "../components/PublicFooter";
import PublicNavBar from "../components/PublicNavBar";
import { getBlogPosts } from "../services/api";

const mutedText = "rgba(255, 255, 255, 0.55)";
const accentPurple = "#7C5CFC";

const CATEGORY_TABS = [
  { label: "All", value: "all" },
  { label: "Product Updates", value: "product_updates" },
  { label: "Property Management", value: "property_management" },
  { label: "Accounting", value: "accounting" },
  { label: "AI & Technology", value: "ai_technology" },
  { label: "Tips & Tricks", value: "tips_tricks" },
  { label: "Industry News", value: "industry_news" },
];

const categoryDisplay = {
  product_updates: "Product Updates",
  property_management: "Property Management",
  accounting: "Accounting",
  ai_technology: "AI & Technology",
  tips_tricks: "Tips & Tricks",
  industry_news: "Industry News",
};

const extractPosts = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const formatPostDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getPostExcerpt = (post) => post.excerpt || post.summary || "";
const getPostCategory = (post) =>
  post?.category || post?.category_slug || post?.categorySlug || "";
const getPostTitle = (post) => post?.title || "Untitled";
const getPostAuthor = (post) =>
  post?.author_name || post?.author?.name || post?.author || "Onyx PM";
const getPostReadTime = (post) => {
  const minutes =
    post?.read_time_minutes ??
    post?.read_time ??
    post?.readTime ??
    post?.estimated_read_time ??
    "5";
  const numericMinutes = Number(minutes);
  if (Number.isFinite(numericMinutes)) {
    return `${Math.round(numericMinutes)} min read`;
  }
  const parsedFromText = Number.parseInt(String(minutes), 10);
  if (Number.isFinite(parsedFromText)) {
    return `${parsedFromText} min read`;
  }
  return `${minutes} min read`;
};
const getPostSlug = (post) => post?.slug || post?.id;
const getCategoryLabel = (category) => categoryDisplay[category] || category || "Blog";
const getCategoryGradient = (category) => {
  const gradients = {
    product_updates: "linear-gradient(135deg, rgba(124,92,252,0.15) 0%, rgba(124,92,252,0.05) 100%)",
    property_management: "linear-gradient(135deg, rgba(39,202,64,0.15) 0%, rgba(39,202,64,0.05) 100%)",
    accounting: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)",
    ai_technology: "linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0.05) 100%)",
    tips_tricks: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
    industry_news: "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0.05) 100%)",
  };
  return gradients[category] || gradients.product_updates;
};

const getCategoryIcon = (category) => {
  const icons = {
    product_updates: <RocketLaunchIcon sx={{ fontSize: "inherit" }} />,
    property_management: <HomeWorkIcon sx={{ fontSize: "inherit" }} />,
    accounting: <AccountBalanceIcon sx={{ fontSize: "inherit" }} />,
    ai_technology: <AutoAwesomeIcon sx={{ fontSize: "inherit" }} />,
    tips_tricks: <LightbulbIcon sx={{ fontSize: "inherit" }} />,
    industry_news: <TrendingUpIcon sx={{ fontSize: "inherit" }} />,
  };
  return icons[category] || icons.product_updates;
};

export default function Blog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPosts = async (category) => {
    setLoading(true);
    setError("");
    try {
      const params = category && category !== "all" ? { category } : {};
      const response = await getBlogPosts(params);
      setPosts(extractPosts(response));
    } catch (err) {
      setError("Failed to load blog posts. Please try again.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPosts(activeCategory);
  }, [activeCategory]);

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: accentPurple }} />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ maxWidth: 620, mx: "auto", mt: 4 }}>
          <Alert
            severity="error"
            sx={{
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#fff",
            }}
            action={
              <Button
                onClick={() => fetchPosts(activeCategory)}
                sx={{ color: accentPurple, textTransform: "none" }}
              >
                Retry
              </Button>
            }
          >
            <AlertTitle>Unable to load posts</AlertTitle>
            {error}
          </Alert>
        </Box>
      );
    }

    if (!posts.length) {
      return (
        <Typography sx={{ textAlign: "center", color: mutedText, pb: 4 }}>
          No posts found
        </Typography>
      );
    }

    return (
      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 4 }}>
        {posts.map((post) => {
          const category = getPostCategory(post);
          const date = formatPostDate(
            post?.published_at || post?.publishedAt || post?.created_at || post?.date
          );
          const slug = getPostSlug(post);
          const title = getPostTitle(post);
          const excerpt = getPostExcerpt(post);

          return (
            <Box key={slug} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box
                onClick={() => slug && navigate(`/blog/${slug}`)}
                role={slug ? "button" : undefined}
                tabIndex={slug ? 0 : -1}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: slug ? "pointer" : "default",
                  transition: "all 0.2s",
                  "&:hover": {
                    border: "1px solid rgba(124, 92, 252, 0.2)",
                    transform: "translateY(-2px)",
                  },
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
                onKeyDown={(event) => {
                  if (!slug) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/blog/${slug}`);
                  }
                }}
              >
                <Box
                  sx={{
                    height: "180px",
                    width: "100%",
                    background: getCategoryGradient(category),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Box sx={{ fontSize: "2.5rem", opacity: 0.3, color: "#fff" }}>
                    {getCategoryIcon(category)}
                  </Box>
                </Box>
                <Box sx={{ p: 3, display: "flex", flexDirection: "column", flex: 1 }}>
                  <Chip
                    label={getCategoryLabel(category)}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(124,92,252,0.15)",
                      color: "#7C5CFC",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      width: "fit-content",
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      mt: 1.5,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {title}
                  </Typography>
                  {excerpt ? (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: mutedText,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {excerpt}
                    </Typography>
                  ) : null}
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.3)", mt: "auto", pt: 2 }}
                  >
                    {getPostAuthor(post)} • {date || "Date unavailable"} • {getPostReadTime(post)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
      </Container>
    );
  };

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", minHeight: "100vh" }}>
      <PublicNavBar />
      <Box sx={{ pt: "64px" }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, pt: 16, pb: 6, textAlign: "center" }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: "#fff" }}>
            Blog
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: mutedText }}>
            Product updates, property management tips, and industry insights.
          </Typography>

          <Box
            sx={{
              mt: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "50px",
              p: "4px",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const active = tab.value === activeCategory;
              return (
                <Box
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  sx={{
                    borderRadius: "50px",
                    px: 3,
                    py: 1,
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
                    backgroundColor: active ? accentPurple : "transparent",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: active ? accentPurple : "rgba(255,255,255,0.08)",
                    },
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: 8 }}>
          {renderContent()}
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
}
