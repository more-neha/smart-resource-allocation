import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

function ApplicationReview() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("smartaid_token");
    if (!token) return;

    axios
      .get(`${API_BASE}/volunteer-request/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-xl py-16 text-center">
        <div className="animate-pulse text-[#800020]">Loading...</div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl py-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-[#e9dce1] bg-white p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)] sm:p-8 text-center"
      >
        {status === "pending" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff8e1]">
              <svg className="h-8 w-8 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1f1720]">Application Under Review</h1>
            <p className="mt-3 text-sm text-[#6a565d] leading-relaxed">
              Your volunteer application has been submitted successfully and is currently being reviewed by an administrator.
              You will be notified once a decision has been made.
            </p>
            <div className="mt-6 inline-flex items-center rounded-full bg-[#fef3c7] px-4 py-2 text-sm font-medium text-[#92400e]">
              ⏳ Status: Pending Review
            </div>
          </>
        )}

        {status === "rejected" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2f2]">
              <svg className="h-8 w-8 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1f1720]">Application Not Approved</h1>
            <p className="mt-3 text-sm text-[#6a565d] leading-relaxed">
              Unfortunately, your volunteer application was not approved at this time.
              You can reach out to an admin via chat for more details.
            </p>
            <div className="mt-6 inline-flex items-center rounded-full bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#dc2626]">
              ❌ Status: Rejected
            </div>
            <div className="mt-5">
              <Link
                to="/chat"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7a1731] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1a39]"
              >
                💬 Chat with Admin
              </Link>
            </div>
          </>
        )}

        {status === "approved" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5]">
              <svg className="h-8 w-8 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1f1720]">You're Approved! 🎉</h1>
            <p className="mt-3 text-sm text-[#6a565d]">
              Congratulations! Your volunteer application has been approved. You now have full access to the volunteer dashboard.
            </p>
            <div className="mt-5">
              <Link
                to="/volunteer-dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7a1731] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1a39]"
              >
                Go to Volunteer Dashboard →
              </Link>
            </div>
          </>
        )}

        {!status && (
          <>
            <h1 className="text-2xl font-semibold text-[#1f1720]">No Application Found</h1>
            <p className="mt-3 text-sm text-[#6a565d]">
              You haven't submitted a volunteer application yet.
            </p>
            <div className="mt-5">
              <Link
                to="/register-volunteer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7a1731] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1a39]"
              >
                Apply Now →
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
}

export default ApplicationReview;
