import { useEffect, useState } from "react";
import { getTenants } from "../services/api";

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const response = await getTenants();
        setTenants(response.data || []);
      } catch (err) {
        setError("Unable to load tenants.");
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Tenants</h1>
      </div>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  {tenant.first_name} {tenant.last_name}
                </td>
                <td>{tenant.email}</td>
                <td>{tenant.phone}</td>
              </tr>
            ))}
            {!loading && tenants.length === 0 ? (
              <tr>
                <td colSpan="3">No tenants found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TenantList;
