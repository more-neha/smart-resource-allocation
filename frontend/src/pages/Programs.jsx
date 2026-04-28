import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const colorPalette = [
    "from-[#800020] to-[#d6336c]",
    "from-[#1e40af] to-[#3b82f6]",
    "from-[#065f46] to-[#10b981]",
    "from-[#92400e] to-[#f59e0b]",
    "from-[#6b21a8] to-[#d946ef]",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#fce4ec]">
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1a1a1a]">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#800020] to-[#d6336c]">Programs</span>
          </h1>
          <p className="max-w-2xl text-base text-[#4b5563] md:text-lg leading-relaxed">
            Discover our initiatives designed to bring immediate relief and long-term resilience to communities in need.
          </p>
        </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800020] border-t-transparent"></div>
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl p-16 text-center text-[#6b7280] shadow-sm">
          No active programs available at the moment. Check back soon!
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 place-items-stretch">
          {programs.map((program, index) => (
            <motion.article
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
              className="flex flex-col h-full group relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(128,0,32,0.1)]"
            >
              {program.image_url ? (
                <div className="w-full shrink-0 overflow-hidden">
                  <img
                    src={program.image_url}
                    alt={program.title}
                    className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className={`h-3 w-full bg-gradient-to-r ${colorPalette[index % colorPalette.length]} opacity-80 shrink-0`} />
              )}

              <div className="p-6 sm:p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold text-[#1a1a1a] leading-tight group-hover:text-[#800020] transition-colors">
                  {program.title}
                </h3>

                {program.description && (
                  <p className="mt-3 text-sm text-[#4b5563] leading-relaxed line-clamp-4">
                    {program.description}
                  </p>
                )}

                <div className="mt-auto pt-6 flex flex-wrap gap-2 text-xs font-medium text-[#4b5563]">
                  {program.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fbcfe8] bg-[#fdf2f8] px-3 py-1.5 text-[#9d174d]">
                      📍 {program.location}
                    </span>
                  )}
                  {program.date && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white/80 px-3 py-1.5">
                      📅 {new Date(program.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}

export default Programs;
