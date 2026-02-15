import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
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
const getPostReadTime = (post) =>
  post?.read_time || post?.readTime || post?.estimated_read_time || "5 min read";
const getPostSlug = (post) => post?.slug || post?.id;

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
      <Grid container spacing={4}>
        {posts.map((post) => {
          const category = getPostCategory(post);
          const date = formatPostDate(
            post?.published_at || post?.publishedAt || post?.created_at || post?.date
          );
          const slug = getPostSlug(post);
          const title = getPostTitle(post);
          const excerpt = getPostExcerpt(post);

          return (
            <Grid
              item
              xs={12}
              md={4}
              key={slug}
              sx={{ display: "flex" }}
            >
              <Box
                onClick={() => slug && navigate(`/blog/${slug}`)}
                role={slug ? "button" : undefined}
                tabIndex={slug ? 0 : -1}
                sx={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
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
                  p: 3,
                }}
                onKeyDown={(event) => {
                  if (!slug) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/blog/${slug}`);
                  }
                }}
              >
                <Chip
                  label={categoryDisplay[category] || category || "Blog"}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(124,92,252,0.15)",
                    color: accentPurple,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    height: "20px",
                    maxWidth: "fit-content",
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
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
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
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                    }}
                  >
                    {excerpt}
                  </Typography>
                ) : null}

                <Box
                  sx={{
                    mt: "auto",
                    pt: 2,
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    color: "rgba(255, 255, 255, 0.35)",
                  }}
                >
                  <Typography variant="caption">{getPostAuthor(post)}</Typography>
                  {(getPostAuthor(post) || date) && <Typography variant="caption">&#8226;</Typography>}
                  <Typography variant="caption">{date || "Date unavailable"}</Typography>
                  <Typography variant="caption">&#8226;</Typography>
                  <Typography variant="caption">{getPostReadTime(post)}</Typography>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
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
