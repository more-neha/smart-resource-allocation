import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function AdminPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", location: "", date: "", image_url: "" });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("smartaid_token");

  const fetchPrograms = () => {
    axios
      .get(`${API_BASE}/programs`)
      .then((res) => setPrograms(res.data.programs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/programs/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE}/programs`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setForm({ title: "", description: "", location: "", date: "", image_url: "" });
      setShowForm(false);
      setEditingId(null);
      fetchPrograms();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save program");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (program) => {
    setForm({
      title: program.title || "",
      description: program.description || "",
      location: program.location || "",
      date: program.date || "",
      image_url: program.image_url || "",
    });
    setEditingId(program.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this program?")) return;
    try {
      await axios.delete(`${API_BASE}/programs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPrograms();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete program");
    }
  };

  const colorPalette = [
    "from-[#800020] to-[#d6336c]",
    "from-[#1e40af] to-[#3b82f6]",
    "from-[#065f46] to-[#10b981]",
    "from-[#92400e] to-[#f59e0b]",
    "from-[#6b21a8] to-[#d946ef]",
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">Manage Programs</h1>
          <p className="mt-1 text-sm text-[#4b5563]">Add, edit, or delete NGO programs visible to the public.</p>
        </div>
        <button
          onClick={() => {
            setForm({ title: "", description: "", location: "", date: "", image_url: "" });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="min-h-11 rounded-lg bg-[#800020] px-5 text-sm font-semibold text-white transition hover:bg-[#9B0026]"
        >
          {showForm ? "Cancel" : "+ Add Program"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-[#e9dce1] bg-white p-6 shadow-sm space-y-4"
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a]">
                {editingId ? "Edit Program" : "Create New Program"}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#374151]">Title *</label>
                  <input
                    name="title" type="text" required value={form.title} onChange={handleChange}
                    className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                    placeholder="Program title"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#374151]">Date</label>
                  <input
                    name="date" type="date" value={form.date} onChange={handleChange}
                    className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">Location</label>
                <input
                  name="location" type="text" value={form.location} onChange={handleChange}
                  className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  placeholder="e.g., Pune, Maharashtra"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">Description</label>
                <textarea
                  name="description" rows={3} value={form.description} onChange={handleChange}
                  className="w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  placeholder="Describe the program..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#374151]">Image URL (optional)</label>
                <input
                  name="image_url" type="url" value={form.image_url} onChange={handleChange}
                  className="min-h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <button
                type="submit" disabled={submitting}
                className="min-h-11 w-full rounded-lg bg-[#800020] text-sm font-semibold text-white transition hover:bg-[#9B0026] disabled:opacity-60"
              >
                {submitting ? "Saving..." : editingId ? "Update Program" : "Create Program"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Programs List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 place-items-stretch">
        {loading ? (
          <div className="col-span-full rounded-xl border bg-white p-5 text-sm text-[#4b5563]">Loading programs...</div>
        ) : programs.length === 0 ? (
          <div className="col-span-full rounded-xl border border-[#e5e7eb] bg-white p-12 text-center text-[#6b7280]">
            No programs available. Click "+ Add Program" to create one.
          </div>
        ) : (
          programs.map((program, index) => (
            <motion.article
              key={program.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col h-full group overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm transition hover:shadow-md"
            >
              {program.image_url ? (
                <div className="w-full shrink-0 overflow-hidden">
                  <img
                    src={program.image_url}
                    alt={program.title}
                    className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className={`h-2 w-full bg-gradient-to-r ${colorPalette[index % colorPalette.length]} opacity-80 shrink-0`} />
              )}

              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-[#1a1a1a] leading-tight">{program.title}</h3>
                
                {program.description && (
                  <p className="mt-2 text-xs text-[#4b5563] leading-relaxed line-clamp-3">
                    {program.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-[#4b5563]">
                  {program.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fbcfe8] bg-[#fdf2f8] px-3 py-1.5 text-[#9d174d]">
                      📍 {program.location}
                    </span>
                  )}
                  {program.date && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-gray-50 px-3 py-1.5">
                      📅 {new Date(program.date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex gap-2 border-t border-[#e5e7eb] pt-4">
                  <button
                    onClick={() => handleEdit(program)}
                    className="flex-1 min-h-9 rounded-lg border border-[#d1d5db] bg-white text-xs font-semibold text-[#374151] hover:bg-gray-50 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
                    className="flex-1 min-h-9 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>
    </section>
  );
}

export default AdminPrograms;
