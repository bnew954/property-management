import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProperties } from "../services/api";

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await getProperties();
        setProperties(response.data || []);
      } catch (err) {
        setError("Unable to load properties.");
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Properties</h1>
        <button type="button" className="button-primary">
          Add Property
        </button>
      </div>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>State</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td>
                  <Link to={`/properties/${property.id}`} className="text-link">
                    {property.name}
                  </Link>
                </td>
                <td>{property.city}</td>
                <td>{property.state}</td>
                <td>{property.property_type}</td>
              </tr>
            ))}
            {!loading && properties.length === 0 ? (
              <tr>
                <td colSpan="4">No properties found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PropertyList;
