import { Link } from "react-router-dom";

const navStyle = {
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "14px 24px",
  borderBottom: "1px solid #1f2937",
};

const containerStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const linksStyle = {
  display: "flex",
  gap: "18px",
};

const linkStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 500,
};

function Navbar() {
  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        <Link to="/" style={{ ...linkStyle, fontSize: "1.05rem", fontWeight: 700 }}>
          Property Manager
        </Link>
        <div style={linksStyle}>
          <Link to="/" style={linkStyle}>
            Dashboard
          </Link>
          <Link to="/properties" style={linkStyle}>
            Properties
          </Link>
          <Link to="/tenants" style={linkStyle}>
            Tenants
          </Link>
          <Link to="/maintenance" style={linkStyle}>
            Maintenance
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
