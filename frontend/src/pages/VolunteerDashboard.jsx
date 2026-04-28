import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

function VolunteerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assigned");
  const [error, setError] = useState("");
  const [expandedTask, setExpandedTask] = useState(null);
  const [completionImage, setCompletionImage] = useState({}); // task_id -> file

  const token = localStorage.getItem("smartaid_token");

  const fetchTasks = useCallback(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/my-tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setTasks(res.data.tasks || []);
        setError("");
      })
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append("task_id", taskId);
      formData.append("status", newStatus);
      if (completionImage[taskId]) {
        formData.append("proof_image", completionImage[taskId]);
      }

      await axios.put(
        `${API_BASE}/update-task-status`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          } 
        }
      );
      // Clear image state for this task
      setCompletionImage(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      fetchTasks();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update task.");
    }
  };

  const assignedTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "assigned" || t.status === "active" || t.status === "accepted"
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const displayTasks = activeTab === "assigned" ? assignedTasks : completedTasks;

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-[#fef3c7] text-[#92400e]",
      assigned: "bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]",
      active: "bg-[#dbeafe] text-[#1e40af]",
      accepted: "bg-[#dbeafe] text-[#1e40af]",
      declined: "bg-[#fee2e2] text-[#b91c1c]",
      completed: "bg-[#dcfce7] text-[#166534]",
    };
    return styles[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <section className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">Volunteer Dashboard</h1>
        <p className="mt-1 text-sm text-[#4a4a4a]">View and manage your assigned tasks</p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.article
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#f2e8eb] border-l-[3px] border-l-[#800020] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
        >
          <p className="text-sm text-[#4a4a4a]">Total Tasks</p>
          <p className="mt-2 text-3xl font-semibold text-[#800020]">{tasks.length}</p>
        </motion.article>
        <motion.article
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-xl border border-[#f2e8eb] border-l-[3px] border-l-[#d97706] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
        >
          <p className="text-sm text-[#4a4a4a]">Active</p>
          <p className="mt-2 text-3xl font-semibold text-[#d97706]">{assignedTasks.length}</p>
        </motion.article>
        <motion.article
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-[#f2e8eb] border-l-[3px] border-l-[#16a34a] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
        >
          <p className="text-sm text-[#4a4a4a]">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-[#16a34a]">{completedTasks.length}</p>
        </motion.article>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["assigned", "completed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "min-h-11 rounded-lg border-[1.5px] px-4 text-sm font-medium capitalize transition",
              activeTab === tab
                ? "border-[#800020] bg-[#800020] text-white"
                : "border-[#800020] bg-transparent text-[#800020] hover:bg-[#fff0f3]",
            ].join(" ")}
          >
            {tab} ({tab === "assigned" ? assignedTasks.length : completedTasks.length})
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {loading && <div className="rounded-xl border bg-white p-5 text-sm text-[#4a4a4a]">Loading tasks...</div>}

        {!loading && displayTasks.length === 0 && (
          <div className="rounded-xl border border-[#f0e4e4] bg-[#fffdfd] p-5 text-center text-sm text-[#4a4a4a]">
            No {activeTab} tasks found.
          </div>
        )}

        {displayTasks.map((task) => {
          const hasAI = task.ai_explanation && (task.ai_explanation.summary || task.ai_explanation.steps?.length > 0);
          const isExpanded = expandedTask === task.task_id;

          return (
            <motion.article
              key={task.task_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#f2e8eb] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="rounded-full bg-[#800020] px-2.5 py-1 text-xs font-semibold text-white">
                    {task.problem?.type || "Task"}
                  </span>
                  <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <span className="text-xs text-[#6b7280]">Task #{task.task_id}</span>
              </div>

              {task.problem?.description && (
                <p className="mt-3 text-sm text-[#4a4a4a]">{task.problem.description}</p>
              )}

              {task.problem?.severity && (
                <p className="mt-2 text-xs text-[#6b7280]">
                  Severity: <span className="font-semibold">{task.problem.severity}/5</span>
                  {task.problem.location && <> • Location: <span className="font-semibold">{task.problem.location}</span></>}
                </p>
              )}

              {/* SRA AI Explanation Section */}
              {hasAI && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedTask(isExpanded ? null : task.task_id)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#fff7ed] to-[#fffbeb] px-3 py-1.5 text-xs font-semibold text-[#92400e] transition hover:from-[#fef3c7] hover:to-[#fef3c7]"
                  >
                    🤖 SRA AI Analysis {isExpanded ? "▲" : "▼"}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4 space-y-3"
                      >
                        {task.ai_explanation.summary && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#92400e]">Summary</p>
                            <p className="mt-1 text-sm text-[#78350f]">{task.ai_explanation.summary}</p>
                          </div>
                        )}
                        {task.ai_explanation.suggested_solution && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#92400e]">Suggested Solution</p>
                            <p className="mt-1 text-sm text-[#78350f]">{task.ai_explanation.suggested_solution}</p>
                          </div>
                        )}
                        {task.ai_explanation.steps?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#92400e]">Steps to Resolve</p>
                            <ol className="mt-1 list-decimal list-inside space-y-1 text-sm text-[#78350f]">
                              {task.ai_explanation.steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {task.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(task.task_id, "active")}
                    className="flex-1 min-h-9 rounded-lg bg-[#16a34a] px-4 text-xs font-semibold text-white transition hover:bg-[#15803d]"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(task.task_id, "declined")}
                    className="flex-1 min-h-9 rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    ✕ Deny
                  </button>
                </div>
              )}
              {(task.status === "active" || task.status === "accepted" || task.status === "assigned") && (
                <div className="mt-4 space-y-3 pt-3 border-t border-gray-50">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       📸 Upload Proof (After Image)
                    </label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setCompletionImage(prev => ({ ...prev, [task.task_id]: e.target.files[0] }))}
                        className="w-full text-[10px] text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#800020] file:text-white hover:file:bg-[#9B0026] cursor-pointer"
                      />
                      {completionImage[task.task_id] && (
                        <p className="mt-1 text-[10px] text-green-600 font-semibold flex items-center gap-1">
                          ✓ {completionImage[task.task_id].name} selected
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStatusUpdate(task.task_id, "completed")}
                    className="w-full min-h-10 rounded-xl bg-gradient-to-r from-[#800020] to-[#5d0017] px-4 text-xs font-bold text-white transition hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#800020]/20"
                  >
                    🚀 Submit Proof & Complete
                  </button>
                </div>
              )}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

export default VolunteerDashboard;
