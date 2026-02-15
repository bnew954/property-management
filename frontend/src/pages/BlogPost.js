import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import PublicFooter from "../components/PublicFooter";
import PublicNavBar from "../components/PublicNavBar";
import { getBlogPost, getBlogPosts } from "../services/api";

const mutedText = "rgba(255,255,255,0.55)";
const categoryDisplay = {
  product_updates: "Product Updates",
  property_management: "Property Management",
  accounting: "Accounting",
  ai_technology: "AI & Technology",
  tips_tricks: "Tips & Tricks",
  industry_news: "Industry News",
};

const formatDate = (value, long = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
};

const extractPosts = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getPostCategory = (post) => post?.category || post?.category_slug || post?.categorySlug || "";
const getPostTitle = (post) => post?.title || "Untitled";
const getPostAuthor = (post) =>
  post?.author_name || post?.author?.name || post?.author || "Onyx PM";
const getPostReadTime = (post) =>
  post?.read_time || post?.readTime || post?.estimated_read_time || "5 min read";

const renderStyledText = (line, keyPrefix = "line") => {
  const parts = String(line).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={`${keyPrefix}-${index}`}>{part}</strong> : part
  );
};

const parseLineWithBold = (line, key) => {
  return (
    <Typography key={key} variant="body1" sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8, mb: 2 }}>
      {renderStyledText(line, key)}
    </Typography>
  );
};

const parseMarkdown = (content) => {
  if (!content) return null;
  const lines = String(content).split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <Box key={`spacer-${index}`} sx={{ height: 8 }} />;
    }

    if (trimmed.startsWith("## ")) {
      return (
        <Typography
          key={`h2-${index}`}
          variant="h6"
          sx={{ fontWeight: 700, mt: 4, mb: 2, color: "#fff" }}
        >
          {trimmed.replace(/^##\s+/, "")}
        </Typography>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <Typography
          key={`h3-${index}`}
          variant="subtitle1"
          sx={{ fontWeight: 600, mt: 3, mb: 1, color: "#fff" }}
        >
          {trimmed.replace(/^###\s+/, "")}
        </Typography>
      );
    }

    if (trimmed.startsWith("- ")) {
      const text = trimmed.replace(/^- /, "");
      return (
        <Box key={`bullet-${index}`} sx={{ display: "flex", alignItems: "flex-start", gap: 1.2, mb: 1.2 }}>
          <Box
            sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#7C5CFC", mt: 0.8, flexShrink: 0 }}
          />
          <Box
            sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8, fontSize: "0.95rem" }}
            component="span"
          >
            {renderStyledText(text, `bullet-text-${index}`)}
          </Box>
        </Box>
      );
    }

    return parseLineWithBold(trimmed, `p-${index}`);
  });
};

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getBlogPost(slug);
        const currentPost = response?.data || null;
        setPost(currentPost);

        const allPostsResponse = await getBlogPosts();
        const allPosts = extractPosts(allPostsResponse).filter((entry) => entry.slug !== slug);
        const currentCategory = getPostCategory(currentPost);
        setRelatedPosts(
          allPosts.filter((entry) => getPostCategory(entry) === currentCategory).slice(0, 3)
        );
      } catch (err) {
        setError("Post not found");
        setPost(null);
        setRelatedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    window.scrollTo(0, 0);
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", minHeight: "100vh" }}>
        <PublicNavBar />
        <Box
          sx={{ pt: "64px", display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}
        >
          <CircularProgress sx={{ color: "#7C5CFC" }} />
        </Box>
        <PublicFooter />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", minHeight: "100vh" }}>
        <PublicNavBar />
        <Container maxWidth="md" sx={{ pt: 16, pb: 12, px: { xs: 2, md: 3 }, mt: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", mb: 2 }}>
            Post not found
          </Typography>
          <MuiLink
            component={Link}
            to="/blog"
            sx={{ color: "#7C5CFC", textDecoration: "none" }}
          >
            &#8592; Back to Blog
          </MuiLink>
        </Container>
        <PublicFooter />
      </Box>
    );
  }

  const category = getPostCategory(post);
  const date = formatDate(post.published_at || post.publishedAt || post.created_at || post.date, true);
  const title = getPostTitle(post);
  const author = getPostAuthor(post);
  const readTime = getPostReadTime(post);
  const content = post.content || post.body || post.text || "";
  const tags = Array.isArray(post.tags)
    ? post.tags
    : typeof post.tags === "string"
    ? post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", minHeight: "100vh" }}>
      <PublicNavBar />
      <Box sx={{ pt: "64px" }}>
        <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 }, pt: 16 }}>
          <Chip
            label={categoryDisplay[category] || category || "Blog"}
            size="small"
            sx={{
              backgroundColor: "rgba(124,92,252,0.15)",
              color: "#7C5CFC",
              fontSize: "0.65rem",
              fontWeight: 600,
              height: "20px",
            }}
          />
          <Typography variant="h4" sx={{ mt: 2, fontWeight: 800, color: "#fff" }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: mutedText }}>
            {author} &#8226; {date || "Date unavailable"} &#8226; {readTime}
          </Typography>
          <Divider sx={{ mt: 3, mb: 4, borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
        </Container>

        <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 } }}>
          <Box>{parseMarkdown(content)}</Box>
        </Container>

        <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 }, mt: 4 }}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff", mb: 1.5 }}>
              Tags
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {tags.length ? (
                tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: mutedText,
                      borderColor: "rgba(255,255,255,0.2)",
                      fontSize: "0.7rem",
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: mutedText }}>
                  No tags
                </Typography>
              )}
            </Box>
          </Box>

          <MuiLink
            component={Link}
            to="/blog"
            sx={{ display: "inline-block", mt: 4, color: "#7C5CFC", textDecoration: "none" }}
          >
            &#8592; Back to Blog
          </MuiLink>
        </Container>

        <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 }, mt: 6, mb: 8 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff", mb: 3 }}>
            More from the Blog
          </Typography>
          {relatedPosts.length ? (
            <Grid container spacing={2}>
              {relatedPosts.map((related) => (
                <Grid item xs={12} md={4} key={related.slug || related.id}>
                  <Box
                    component={Link}
                    to={`/blog/${related.slug || related.id}`}
                    sx={{
                      display: "block",
                      textDecoration: "none",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "12px",
                      p: 2.5,
                      height: "100%",
                      transition: "all 0.2s",
                      "&:hover": {
                        border: "1px solid rgba(124, 92, 252, 0.2)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: "#fff",
                        mb: 1,
                        display: "-webkit-box",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                      }}
                    >
                      {getPostTitle(related)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: mutedText,
                        mb: 2,
                        display: "-webkit-box",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                      }}
                    >
                      {related.excerpt || related.summary || ""}
                    </Typography>
                    <Typography variant="caption" sx={{ color: mutedText }}>
                      {formatDate(
                        related.published_at || related.publishedAt || related.created_at || related.date
                      ) || "Date unavailable"}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" sx={{ color: mutedText }}>
              No related posts yet.
            </Typography>
          )}
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
}
