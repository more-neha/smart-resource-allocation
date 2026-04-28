import { useState } from "react";
import { motion } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

const problemTypes = [
  "Flood", "Fire", "Medical Emergency", "Food Shortage",
  "Shelter", "Water Crisis", "Natural Disaster", "Other"
];

function ProblemSubmissionForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    problem_type: "",
    description: "",
    place: "",
    location: "",
    severity: 3,
    people_affected: 1,
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("Only JPEG, PNG, GIF, and WebP images are allowed.");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        setForm((prev) => ({ ...prev, location: `${lat},${lon}` }));
        setLocating(false);
      },
      () => {
        setError("Unable to get current location. Please allow location permission or enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("first_name", form.first_name);
      formData.append("last_name", form.last_name);
      formData.append("phone", form.phone);
      formData.append("problem_type", form.problem_type);
      formData.append("description", form.description);
      formData.append("place", form.place);
      formData.append("location", form.location);
      formData.append("severity", form.severity);
      formData.append("people_affected", form.people_affected);
      if (image) {
        formData.append("image", image);
      }

      const res = await fetch(`${API_BASE}/report-problem`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to submit problem");
      }

      setSuccess(true);
      setForm({
        first_name: "", last_name: "", phone: "", problem_type: "",
        description: "", place: "", location: "", severity: 3, people_affected: 1,
      });
      setImage(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityLabels = { 1: "Low", 2: "Moderate", 3: "High", 4: "Severe", 5: "Critical" };
  const severityColors = { 1: "#16a34a", 2: "#65a30d", 3: "#d97706", 4: "#ea580c", 5: "#dc2626" };

  return (
    <section className="mx-auto w-full max-w-2xl py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-[#e9dce1] bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)] sm:p-8"
      >
        <div className="mb-6">
          <span className="inline-flex rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#800020]">
            Report a Problem
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1f1720]">
            Submit Community Need
          </h1>
          <p className="mt-2 text-sm text-[#6a565d]">
            Help us identify and address urgent community needs by filling out this form.
          </p>
        </div>

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✅ Problem reported successfully! Our team will review it shortly.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reporter Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">First Name *</label>
              <input
                id="first_name" name="first_name" type="text" required
                value={form.first_name} onChange={handleChange}
                className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Last Name *</label>
              <input
                id="last_name" name="last_name" type="text" required
                value={form.last_name} onChange={handleChange}
                className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
                placeholder="Your last name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Phone *</label>
            <input
              id="phone" name="phone" type="tel" required
              value={form.phone} onChange={handleChange}
              className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="+91 9876543210"
            />
          </div>

          {/* Problem Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="problem_type" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Problem Type *</label>
              <select
                id="problem_type" name="problem_type" required
                value={form.problem_type} onChange={handleChange}
                className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              >
                <option value="">Select type</option>
                {problemTypes.map((t) => (
                  <option key={t} value={t.toLowerCase()}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="location" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Map Coordinates *</label>
              <input
                id="location" name="location" type="text" required
                value={form.location} onChange={handleChange}
                className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
                placeholder="Latitude,Longitude (e.g. 19.076,72.877)"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#6b7280] leading-tight">Heatmap requires coordinates.<br/>Use current location for mapping.</p>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="rounded-lg border border-[#dfcdd3] bg-[#fff7f9] px-3 py-1.5 text-xs font-semibold text-[#800020] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                >
                  {locating ? "Locating..." : "Use Current Location"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="place" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Place / Address *</label>
            <input
              id="place" name="place" type="text" required
              value={form.place} onChange={handleChange}
              className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="e.g., Near Ravet-Punawale Highway"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">Description *</label>
            <textarea
              id="description" name="description" required rows={4}
              value={form.description} onChange={handleChange}
              className="w-full rounded-xl border border-[#dfcdd3] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              placeholder="Describe the problem in detail..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="severity" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">
                Severity: <span style={{ color: severityColors[form.severity] }}>{severityLabels[form.severity]}</span>
              </label>
              <input
                id="severity" name="severity" type="range" min="1" max="5"
                value={form.severity} onChange={handleChange}
                className="w-full accent-[#800020]"
              />
              <div className="flex justify-between text-xs text-[#6b7280]">
                <span>Low</span><span>Critical</span>
              </div>
            </div>
            <div>
              <label htmlFor="people_affected" className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">People Affected *</label>
              <input
                id="people_affected" name="people_affected" type="number" min="1" required
                value={form.people_affected} onChange={handleChange}
                className="min-h-12 w-full rounded-xl border border-[#dfcdd3] bg-white px-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#7a1731] focus:ring-2 focus:ring-[#7a1731]/20"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#2a1f23]">
              Upload Image <span className="font-normal text-[#6b7280]">(optional)</span>
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label
                htmlFor="image-upload"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-dashed border-[#dfcdd3] bg-[#fdf9fa] px-4 text-sm font-medium text-[#800020] transition hover:bg-[#fff0f3]"
              >
                📷 Choose File
                <input
                  id="image-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {image && <span className="text-xs text-[#6b7280]">{image.name}</span>}
            </div>
            {imagePreview && (
              <div className="mt-3 overflow-hidden rounded-xl border border-[#e9dce1]">
                <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
              </div>
            )}
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="min-h-12 w-full rounded-xl bg-[#7a1731] px-4 text-sm font-semibold text-white transition hover:bg-[#8f1a39] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </motion.div>
    </section>
  );
}

export default ProblemSubmissionForm;
