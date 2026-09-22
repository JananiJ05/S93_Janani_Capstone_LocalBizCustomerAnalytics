import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/customers";

function App() {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    totalOrders: 0,
    totalSpent: 0,
    segment: "New",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch all customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load customers when the page opens
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Start editing a customer
  const handleEdit = (customer) => {
    setEditingCustomer(customer);

    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      totalOrders: customer.totalOrders || 0,
      totalSpent: customer.totalSpent || 0,
      segment: customer.segment || "New",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Update customer
  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingCustomer) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/${editingCustomer._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            totalOrders: Number(formData.totalOrders),
            totalSpent: Number(formData.totalSpent),
            segment: formData.segment,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update customer");
      }

      setMessage("Customer updated successfully!");

      setEditingCustomer(null);

      setFormData({
        name: "",
        email: "",
        phone: "",
        totalOrders: 0,
        totalSpent: 0,
        segment: "New",
      });

      await fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingCustomer(null);

    setFormData({
      name: "",
      email: "",
      phone: "",
      totalOrders: 0,
      totalSpent: 0,
      segment: "New",
    });

    setMessage("");
    setError("");
  };

  // Delete customer
  const handleDelete = async (customerId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/${customerId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete customer");
      }

      setMessage("Customer deleted successfully!");

      if (editingCustomer?._id === customerId) {
        handleCancel();
      }

      await fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f4f6f8",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          LocalBiz Customer Analytics
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Customer Update & Delete Management
        </p>

        {/* Success Message */}
        {message && (
          <div
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Update Form */}
        {editingCustomer && (
          <div
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "10px",
              marginBottom: "30px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Update Customer</h2>

            <form onSubmit={handleUpdate}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "15px",
                }}
              >
                <div>
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Total Orders</label>
                  <input
                    type="number"
                    name="totalOrders"
                    value={formData.totalOrders}
                    onChange={handleChange}
                    min="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Total Spent</label>
                  <input
                    type="number"
                    name="totalSpent"
                    value={formData.totalSpent}
                    onChange={handleChange}
                    min="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Segment</label>
                  <select
                    name="segment"
                    value={formData.segment}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="New">New</option>
                    <option value="Regular">Regular</option>
                    <option value="High Value">High Value</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <button type="submit" style={updateButtonStyle}>
                  Update Customer
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Customer List */}
        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Customers</h2>

            <button
              onClick={fetchCustomers}
              style={refreshButtonStyle}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading customers...</p>
          ) : customers.length === 0 ? (
            <p>No customers found.</p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>Email</th>
                    <th style={tableHeaderStyle}>Phone</th>
                    <th style={tableHeaderStyle}>Orders</th>
                    <th style={tableHeaderStyle}>Spent</th>
                    <th style={tableHeaderStyle}>Segment</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id}>
                      <td style={tableCellStyle}>
                        {customer.name}
                      </td>

                      <td style={tableCellStyle}>
                        {customer.email}
                      </td>

                      <td style={tableCellStyle}>
                        {customer.phone || "-"}
                      </td>

                      <td style={tableCellStyle}>
                        {customer.totalOrders}
                      </td>

                      <td style={tableCellStyle}>
                        ₹{customer.totalSpent}
                      </td>

                      <td style={tableCellStyle}>
                        {customer.segment}
                      </td>

                      <td style={tableCellStyle}>
                        <button
                          onClick={() => handleEdit(customer)}
                          style={editButtonStyle}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(customer._id)
                          }
                          style={deleteButtonStyle}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  border: "1px solid #ccc",
  borderRadius: "5px",
  boxSizing: "border-box",
};

const updateButtonStyle = {
  padding: "10px 18px",
  backgroundColor: "#198754",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginRight: "10px",
};

const cancelButtonStyle = {
  padding: "10px 18px",
  backgroundColor: "#6c757d",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const editButtonStyle = {
  padding: "7px 12px",
  backgroundColor: "#0d6efd",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  marginRight: "8px",
};

const deleteButtonStyle = {
  padding: "7px 12px",
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const refreshButtonStyle = {
  padding: "8px 15px",
  backgroundColor: "#6c757d",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const tableHeaderStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "2px solid #ddd",
};

const tableCellStyle = {
  padding: "12px",
  borderBottom: "1px solid #ddd",
};

export default App;