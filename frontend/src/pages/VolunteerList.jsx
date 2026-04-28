import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

function VolunteerList() {
  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem("smartaid_token");
    axios
      .get(`${API_BASE}/volunteers`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        setVolunteers(response.data || []);
      })
      .catch((error) => {
        setLoadError(error?.response?.data?.detail || "Could not load volunteers.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleRemove = async (volunteerId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the volunteer network?`)) {
      return;
    }

    const token = localStorage.getItem("smartaid_token");
    try {
      await axios.post(
        `${API_BASE}/remove-volunteer/${volunteerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVolunteers((prev) => prev.filter((v) => v.volunteer_id !== volunteerId));
      alert("Volunteer removed successfully");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to remove volunteer.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Registered Volunteers</h1>
        <p className="text-gray-600">List of all approved volunteers in the system.</p>
        {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full rounded-xl border bg-white p-5 text-sm text-gray-600">
            Loading volunteers...
          </div>
        )}

        {!isLoading && volunteers.length === 0 && (
          <div className="col-span-full rounded-xl border bg-white p-5 text-sm text-gray-600">
            No volunteers found.
          </div>
        )}

        {volunteers.map((volunteer) => (
          <article
            key={volunteer.volunteer_id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">
              {volunteer.first_name} {volunteer.last_name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{volunteer.email} • {volunteer.phone}</p>
            
            <div className="space-y-1 text-sm text-gray-700">
              <p><span className="font-semibold">Address:</span> {volunteer.address}</p>
              <p><span className="font-semibold">Profession:</span> {volunteer.profession}</p>
            </div>
            
            <div className="mt-5 border-t border-gray-100 pt-4">
              <button
                onClick={() => handleRemove(volunteer.volunteer_id, `${volunteer.first_name} ${volunteer.last_name}`)}
                className="w-full rounded-lg bg-red-50 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                🗑️ Remove Volunteer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default VolunteerList;
