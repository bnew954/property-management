import { useEffect, useState } from "react";
import { getMaintenanceRequests } from "../services/api";

const badgeClassForPriority = (priority) => {
  if (priority === "emergency") return "badge badge-red";
  if (priority === "high") return "badge badge-orange";
  if (priority === "medium") return "badge badge-blue";
  return "badge badge-gray";
};

const badgeClassForStatus = (status) => {
  if (status === "completed") return "badge badge-green";
  if (status === "in_progress") return "badge badge-blue";
  if (status === "cancelled") return "badge badge-gray";
  return "badge badge-orange";
};

function MaintenanceList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await getMaintenanceRequests();
        setRequests(response.data || []);
      } catch (err) {
        setError("Unable to load maintenance requests.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Maintenance Requests</h1>
      </div>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Unit</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.title}</td>
                <td>{request.unit_detail?.unit_number || request.unit}</td>
                <td>
                  <span className={badgeClassForPriority(request.priority)}>
                    {request.priority}
                  </span>
                </td>
                <td>
                  <span className={badgeClassForStatus(request.status)}>
                    {request.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 ? (
              <tr>
                <td colSpan="4">No maintenance requests found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MaintenanceList;
