import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const API_URL = "http://localhost:5000/api/customers";
const GOOGLE_API_URL = "http://localhost:5000/api/auth/google";

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

  // Check whether a user is already logged in
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  // Load saved user information
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });

  // --------------------------------------------------
  // Google Login
  // --------------------------------------------------
  const handleGoogleLogin = async (credentialResponse) => {
    try {
      setError("");
      setMessage("");

      if (!credentialResponse?.credential) {
        throw new Error("Google did not return a credential.");
      }

      const response = await fetch(GOOGLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google login failed");
      }

      // Store JWT token
      localStorage.setItem("token", data.token);

      // Store logged-in user
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setIsAuthenticated(true);
      setMessage("Google login successful!");
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed");
    }
  };

  // --------------------------------------------------
  // Google Login Error
  // --------------------------------------------------
  const handleGoogleLoginError = () => {
    setError("Google login failed. Please try again.");
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setIsAuthenticated(false);
    setCustomers([]);
    setEditingCustomer(null);
    setMessage("");
    setError("");
  };

  // --------------------------------------------------
  // Fetch all customers
  // --------------------------------------------------
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          data.message || "Failed to fetch customers"
        );
      }

      setCustomers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Load customers after authentication
  // --------------------------------------------------
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // --------------------------------------------------
  // Start editing a customer
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Handle form input changes
  // --------------------------------------------------
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Update customer
  // --------------------------------------------------
  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingCustomer) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        handleLogout();
        throw new Error("Please login again.");
      }

      const response = await fetch(
        `${API_URL}/${editingCustomer._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
        if (response.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          data.message || "Failed to update customer"
        );
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

  // --------------------------------------------------
  // Cancel editing
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Delete customer
  // --------------------------------------------------
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

      const token = localStorage.getItem("token");

      if (!token) {
        handleLogout();
        throw new Error("Please login again.");
      }

      const response = await fetch(
        `${API_URL}/${customerId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          data.message || "Failed to delete customer"
        );
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

  // --------------------------------------------------
  // Login screen
  // --------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f4f6f8",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            textAlign: "center",
            width: "380px",
            maxWidth: "100%",
          }}
        >
          <h1
            style={{
              marginBottom: "10px",
            }}
          >
            LocalBiz Customer Analytics
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: "30px",
            }}
          >
            Sign in to access the customer dashboard
          </p>

          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={handleGoogleLoginError}
          />

          {error && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "12px",
                borderRadius: "6px",
                marginTop: "20px",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Customer dashboard
  // --------------------------------------------------
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              LocalBiz Customer Analytics
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "8px",
              }}
            >
              Customer Update & Delete Management
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span>
              Welcome, <strong>{user?.username || "User"}</strong>
            </span>

            <button
              onClick={handleLogout}
              style={logoutButtonStyle}
            >
              Logout
            </button>
          </div>
        </div>

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
                    <option value="High Value">
                      High Value
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  style={updateButtonStyle}
                >
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
                          onClick={() =>
                            handleEdit(customer)
                          }
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

// --------------------------------------------------
// Styles
// --------------------------------------------------

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

const logoutButtonStyle = {
  padding: "8px 15px",
  backgroundColor: "#dc3545",
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