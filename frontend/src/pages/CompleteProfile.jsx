import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

function CompleteProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    skills: "",
    location: "",
    availability: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const token = localStorage.getItem("smartaid_token");
    const email = localStorage.getItem("smartaid_email");
    if (!token || !email) {
      setError("No authentication token or email found. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      await axios.post(`${API_BASE}/complete-profile`, { ...form, email }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      navigate("/home");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl py-6 sm:py-10">
      <div className="rounded-2xl border border-[#e9dce1] bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f1720]">Complete Your Profile</h1>
        <p className="mt-2 text-sm text-[#6a565d]">Almost there! Please provide a few more details to get started as a volunteer.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="skills" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">
              Skills
            </label>
            <textarea
              id="skills"
              name="skills"
              required
              rows={3}
              value={form.skills}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#dfcdd3] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="e.g. First Aid, Driving, Translation..."
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={form.location}
              onChange={handleChange}
              className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="City or Area"
            />
          </div>

          <div>
            <label htmlFor="availability" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">
              Availability
            </label>
            <input
              id="availability"
              name="availability"
              type="text"
              required
              value={form.availability}
              onChange={handleChange}
              className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="e.g. Weekends, Evenings..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-xl bg-[#7a1731] px-4 text-sm font-semibold text-white transition hover:bg-[#8f1a39] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CompleteProfile;
