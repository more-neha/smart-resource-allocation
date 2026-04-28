import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export default function VolunteerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    profession: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const token = localStorage.getItem("smartaid_token");

    try {
      await axios.post(
        `${API_BASE}/volunteer-request`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/application-review");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 rounded-2xl shadow border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Volunteer Application</h1>
      <p className="text-gray-600 mb-6">Join our network to help respond to community emergencies.</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input required type="text" name="first_name" value={form.first_name} onChange={handleChange} className="w-full border rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input required type="text" name="last_name" value={form.last_name} onChange={handleChange} className="w-full border rounded-lg p-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number *</label>
          <input required type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg p-2.5" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address *</label>
          <input required type="text" name="address" value={form.address} onChange={handleChange} className="w-full border rounded-lg p-2.5" placeholder="City, Region" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Profession / Skills *</label>
          <input required type="text" name="profession" value={form.profession} onChange={handleChange} className="w-full border rounded-lg p-2.5" placeholder="Doctor, Driver, etc." />
        </div>

        <button disabled={isSubmitting} type="submit" className="w-full bg-[#800020] text-white font-bold py-3 rounded-lg hover:bg-[#9B0026] transition">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
