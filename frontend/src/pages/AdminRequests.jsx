import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("smartaid_token");

  const fetchRequests = () => {
    if (!token) return;
    axios
      .get(`${API_BASE}/volunteer-requests/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setRequests(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRequests, [token]);

  const handleAction = async (requestId, action) => {
    try {
      await axios.post(
        `${API_BASE}/volunteer-requests/action`,
        { request_id: requestId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRequests();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to process request");
    }
  };

  if (loading) return <div className="p-8">Loading requests...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Volunteer Requests</h1>
        <p className="text-gray-600">Review and approve or reject new volunteer applications.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
          No pending requests at the moment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg">{req.first_name} {req.last_name}</h3>
                <p className="text-sm text-gray-500 mb-4">{req.email} • {req.phone}</p>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">Location:</span> {req.address}</p>
                  <p><span className="font-medium text-gray-700">Profession:</span> {req.profession}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleAction(req.id, "approved")}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(req.id, "rejected")}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-sm font-medium transition"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
