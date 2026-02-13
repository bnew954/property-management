import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProperty, getUnits } from "../services/api";

function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPropertyDetail = async () => {
      try {
        const [propertyRes, unitsRes] = await Promise.all([
          getProperty(id),
          getUnits({ property_id: id }),
        ]);
        setProperty(propertyRes.data);
        setUnits(unitsRes.data || []);
      } catch (err) {
        setError("Unable to load property details.");
      } finally {
        setLoading(false);
      }
    };

    loadPropertyDetail();
  }, [id]);

  return (
    <div className="container">
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && property ? (
        <>
          <div className="page-header">
            <h1>{property.name}</h1>
          </div>
          <div className="card">
            <p>
              <strong>Address:</strong> {property.address_line1}
              {property.address_line2 ? `, ${property.address_line2}` : ""}, {property.city},{" "}
              {property.state} {property.zip_code}
            </p>
            <p>
              <strong>Type:</strong> {property.property_type}
            </p>
            <p>
              <strong>Description:</strong> {property.description || "No description provided."}
            </p>
          </div>

          <div className="card table-card">
            <h2>Units</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Unit #</th>
                  <th>Bedrooms</th>
                  <th>Bathrooms</th>
                  <th>Sq Ft</th>
                  <th>Rent</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.unit_number}</td>
                    <td>{unit.bedrooms}</td>
                    <td>{unit.bathrooms}</td>
                    <td>{unit.square_feet}</td>
                    <td>${Number(unit.rent_amount).toLocaleString()}</td>
                    <td>{unit.is_available ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {!loading && units.length === 0 ? (
                  <tr>
                    <td colSpan="6">No units found for this property.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default PropertyDetail;
