import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

const initialForm = {
  name: "",
  email: "",
  password: "",
  skills: "",
  location: "",
  availability: "",
};

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(`${API_BASE}/signup`, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        skills: form.skills.trim(),
        location: form.location.trim(),
        availability: form.availability.trim(),
      });

      setSuccess("Volunteer signup successful. Please login now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err?.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md py-8">
      <div className="rounded-2xl border border-[#f2e8eb] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Volunteer Signup</h1>
        <p className="mt-1 text-sm text-[#4a4a4a]">Create your volunteer account to start contributing.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {success && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl bg-[#fff7f9] p-4 text-sm text-[#4a4a4a]">
            Admins do not sign up here. Admin access is pre-seeded and can log in directly.
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div>
            <label htmlFor="skills" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Skills
            </label>
            <input
              id="skills"
              name="skills"
              type="text"
              placeholder="first aid, logistics, rescue"
              required
              value={form.skills}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={form.location}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div>
            <label htmlFor="availability" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
              Availability
            </label>
            <input
              id="availability"
              name="availability"
              type="text"
              placeholder="weekends, evenings, on-call"
              required
              value={form.availability}
              onChange={handleChange}
              className="min-h-11 w-full rounded-lg border border-[#e6d6dc] px-3 text-sm text-[#1a1a1a] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-lg bg-[#800020] px-4 text-sm font-semibold text-white transition hover:bg-[#9B0026] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Signup"}
          </button>
        </form>

        <p className="mt-4 text-sm text-[#4a4a4a]">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#800020] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}

export default Signup;
