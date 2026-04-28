import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("smartaid_token");

  const fetchAdmins = () => {
    if (!token) return;
    axios
      .get(`${API_BASE}/api/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAdmins(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchAdmins, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/admins/add`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      setEmail("");
      fetchAdmins();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to add admin.");
    }
  };

  const handleRemove = async (adminEmail) => {
    setMessage("");
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/admins/remove`,
        { email: adminEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      fetchAdmins();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to remove admin.");
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl py-6 sm:py-10 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">Manage Admins</h1>
        <p className="mt-1 text-sm text-[#4a4a4a]">Only super admins can add or remove administrators.</p>
      </motion.div>

      {/* Add admin form */}
      <div className="rounded-2xl border border-[#e9dce1] bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-semibold text-[#1f1720]">Add New Admin</h2>
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user email"
            className="flex-1 min-h-12 rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
          />
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-[#7a1731] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1a39]"
          >
            Add Admin
          </button>
        </form>

        {message && (
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Admin list */}
      <div className="rounded-2xl border border-[#e9dce1] bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-semibold text-[#1f1720]">Current Admins</h2>
        {loading ? (
          <p className="mt-3 text-sm text-[#6b7280]">Loading...</p>
        ) : admins.length === 0 ? (
          <p className="mt-3 text-sm text-[#6b7280]">No admins found.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl border border-[#f2e8eb] bg-[#fdf9fa] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">{admin.name}</p>
                  <p className="text-xs text-[#6b7280]">{admin.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      admin.role === "super_admin"
                        ? "bg-[#f3e8ff] text-[#7c3aed]"
                        : "bg-[#fff0f3] text-[#800020]",
                    ].join(" ")}
                  >
                    {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                  {admin.role !== "super_admin" && (
                    <button
                      onClick={() => handleRemove(admin.email)}
                      className="min-h-8 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ManageAdmins;
