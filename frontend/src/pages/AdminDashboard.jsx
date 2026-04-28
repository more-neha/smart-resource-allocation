import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const API_BASE = "http://127.0.0.1:8000";

const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='100%' height='100%' fill='%23f3e8ec'/></svg>";

const DEFAULT_MAP_CENTER = [20.5937, 78.9629];
const DEFAULT_INCIDENT_RADIUS_KM = 8;

const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function hasValidCoordinates(problem) {
  const latitude = Number(problem?.location?.latitude);
  const longitude = Number(problem?.location?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);
}

function getSeverityColor(severity) {
  if (severity >= 5) return "#b91c1c";
  if (severity >= 4) return "#ea580c";
  if (severity >= 3) return "#f59e0b";
  return "#10b981";
}

function HeatmapLayer({ points, radius, blur, minOpacity }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return undefined;

    const heatLayer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 15,
      minOpacity,
      gradient: {
        0.2: "#22c55e",
        0.4: "#f59e0b",
        0.7: "#f97316",
        1.0: "#b91c1c",
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [blur, map, minOpacity, points, radius]);

  return null;
}

function FitMapToIncidents({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!incidents.length) return;

    const bounds = L.latLngBounds(incidents.map((incident) => [incident.latitude, incident.longitude]));
    map.fitBounds(bounds.pad(0.25));
  }, [map, incidents]);

  return null;
}

function CenterOnUserLocation({ location, zoom = 11 }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!location || hasCenteredRef.current) return;
    map.setView(location, zoom, { animate: true });
    hasCenteredRef.current = true;
  }, [location, map, zoom]);

  return null;
}

function AdminDashboard() {
  const [problems, setProblems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyticsRadiusKm, setAnalyticsRadiusKm] = useState(DEFAULT_INCIDENT_RADIUS_KM);
  const [heatRadius, setHeatRadius] = useState(32);
  const [heatBlur, setHeatBlur] = useState(24);
  const [heatMinOpacity, setHeatMinOpacity] = useState(0.35);
  const [affectedScale, setAffectedScale] = useState(180);
  const [userLocation, setUserLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [impact, setImpact] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [resourceGaps, setResourceGaps] = useState([]);
  const [showProblems, setShowProblems] = useState(true);
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  const token = localStorage.getItem("smartaid_token");

  const fetchProblems = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const [problemsResult, tasksResult, volunteersResult, impactResult, predictionsResult, gapResult, activityResult] = await Promise.allSettled([
      axios.get(`${API_BASE}/problems`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/volunteers`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/api/analytics/impact`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/api/analytics/predictions`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/api/analytics/resource-gap`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/api/activity/recent`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (problemsResult.status === "fulfilled") {
      setProblems(problemsResult.value.data.problems || []);
      setError("");
    } else {
      setProblems([]);
      setError(problemsResult.reason?.response?.data?.detail || "Failed to load problems.");
    }

    if (tasksResult.status === "fulfilled") {
      setTasks(tasksResult.value.data.tasks || []);
    } else {
      setTasks([]);
    }

    if (volunteersResult.status === "fulfilled") {
      setVolunteers(volunteersResult.value.data.volunteers || []);
    }

    if (impactResult.status === "fulfilled") {
      setImpact(impactResult.value.data);
    }

    if (predictionsResult.status === "fulfilled") {
      setPredictions(predictionsResult.value.data.hotspots || []);
    }

    if (gapResult.status === "fulfilled") {
      setResourceGaps(gapResult.value.data.gaps || []);
    }

    if (activityResult.status === "fulfilled") {
      setRecentActivity(activityResult.value.data || []);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchProblems();
    const interval = setInterval(fetchProblems, 10000);
    return () => clearInterval(interval);
  }, [fetchProblems]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationDenied(false);
      },
      () => {
        setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  }, []);

  const handleSuggest = async (problemId) => {
    setSelectedProblem(problemId);
    setLoadingSuggestions(true);
    setSuggestError("");
    setSuggestions([]);
    setAiAnalysis("");

    try {
      const res = await axios.get(`${API_BASE}/api/suggest-volunteers/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions(res.data.suggestions || []);
      setAiAnalysis(res.data.ai_analysis || "");
    } catch (err) {
      setSuggestError(err?.response?.data?.detail || "Failed to get suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAssign = async (problemId, volunteerId) => {
    try {
      const res = await axios.post(
        `${API_BASE}/assign-task`,
        { problem_id: problemId, volunteer_id: volunteerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const notification = res?.data?.data?.notification || {};
      const notificationLabel = notification.status === "sent" ? "Message sent" : "Message not sent";
      const notificationDetail = notification.error ? `\n${notification.error}` : "";

      alert(`Task assigned successfully. ${notificationLabel}.${notificationDetail}`);

      // Success, remove suggestions and refresh
      setSelectedProblem(null);
      setSuggestions([]);
      fetchProblems();
    } catch (err) {
      setSuggestError(err?.response?.data?.detail || "Failed to assign volunteer.");
    }
  };

  const handleAiReview = async (problemId) => {
    try {
      const res = await axios.post(
        `${API_BASE}/admin/incidents/${problemId}/ai-review`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(
        `AI Recommendation: ${res.data.recommended_action.toUpperCase()} (confidence: ${Math.round(
          (res.data.confidence || 0) * 100
        )}%)\n${res.data.summary}`
      );
      fetchProblems();
    } catch (err) {
      setSuggestError(err?.response?.data?.detail || "Failed to run AI review.");
    }
  };

  const handleVerifyOrReject = async (problemId, action) => {
    try {
      const res = await axios.post(
        `${API_BASE}/admin/incidents/${problemId}/decision`,
        {
          action,
          notes: action === "verify" ? "Verified by admin with AI support" : "Rejected by admin",
          auto_notify: action === "verify",
          max_volunteers: 3,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (action === "verify") {
        const notified = res?.data?.notified_volunteers || [];
        if (notified.length === 0) {
          alert("Incident verified. No volunteers were selected for WhatsApp notification.");
        } else {
          const sentCount = notified.filter((n) => n.status === "sent").length;
          const failed = notified.filter((n) => n.status !== "sent");
          const failedText = failed.length
            ? `\nFailed: ${failed.map((f) => `${f.name || f.volunteer_id} (${f.error || "unknown error"})`).join(", ")}`
            : "";
          alert(`Incident verified. WhatsApp attempted for ${notified.length} volunteers. Sent: ${sentCount}.${failedText}`);
        }
      } else {
        alert("Incident rejected successfully.");
      }

      fetchProblems();
    } catch (err) {
      setSuggestError(err?.response?.data?.detail || "Failed to submit incident decision.");
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm("Do you want to delete this problem?")) return;
    try {
      await axios.delete(`${API_BASE}/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProblems();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete problem.");
    }
  };

  const activeProblems = problems.filter(
    (p) => (p.status === "pending" || p.status === "active") && p.verification_status !== "rejected"
  );

  const mapIncidents = useMemo(
    () =>
      activeProblems
        .filter(hasValidCoordinates)
        .map((problem) => ({
          id: problem.id,
          type: problem.type || "Other",
          latitude: Number(problem.location.latitude),
          longitude: Number(problem.location.longitude),
          severity: Number(problem.severity) || 1,
          peopleAffected: Number(problem.people_affected) || 0,
          locationText: problem.location?.text || "Unknown location",
          status: problem.status,
          description: problem.description,
        })),
    [activeProblems]
  );

  const problemCoordinatesById = useMemo(() => {
    const map = new Map();
    problems
      .filter(hasValidCoordinates)
      .forEach((problem) => {
        map.set(problem.id, {
          latitude: Number(problem.location.latitude),
          longitude: Number(problem.location.longitude),
        });
      });
    return map;
  }, [problems]);

  const activeVolunteerTaskPoints = useMemo(
    () =>
      tasks
        .map((task) => {
          const status = String(task?.status || "").toLowerCase();
          const volunteerId = task?.assignee?.volunteer_id;
          const problemId = task?.problem?.id;

          if (!(status === "active" || status === "accepted") || !volunteerId || !problemId) {
            return null;
          }

          const problemCoordinates = problemCoordinatesById.get(problemId);
          if (!problemCoordinates) return null;

          return {
            volunteerId,
            latitude: problemCoordinates.latitude,
            longitude: problemCoordinates.longitude,
          };
        })
        .filter(Boolean),
    [problemCoordinatesById, tasks]
  );

  const incidentsWithAreaStats = useMemo(
    () =>
      mapIncidents.map((incident) => {
        const nearbyIncidents = mapIncidents.filter(
          (other) =>
            distanceInKm(incident.latitude, incident.longitude, other.latitude, other.longitude) <= analyticsRadiusKm
        );

        const typeBreakdown = nearbyIncidents.reduce((accumulator, nearby) => {
          const type = nearby.type;
          accumulator[type] = (accumulator[type] || 0) + nearby.peopleAffected;
          return accumulator;
        }, {});

        const nearbyVolunteerIds = new Set(
          activeVolunteerTaskPoints
            .filter(
              (point) =>
                distanceInKm(incident.latitude, incident.longitude, point.latitude, point.longitude) <= analyticsRadiusKm
            )
            .map((point) => point.volunteerId)
        );

        const totalAffected = nearbyIncidents.reduce((sum, nearby) => sum + nearby.peopleAffected, 0);

        return {
          ...incident,
          nearbyIncidentsCount: nearbyIncidents.length,
          totalAffected,
          typeBreakdown,
          activeVolunteersNearby: nearbyVolunteerIds.size,
        };
      }),
    [activeVolunteerTaskPoints, analyticsRadiusKm, mapIncidents]
  );

  const heatPoints = useMemo(
    () =>
      incidentsWithAreaStats.map((incident) => {
        const intensity = Math.min(1, incident.severity * 0.15 + incident.peopleAffected / affectedScale);
        return [incident.latitude, incident.longitude, intensity];
      }),
    [affectedScale, incidentsWithAreaStats]
  );

  const totalAreaAffected = useMemo(
    () => incidentsWithAreaStats.reduce((sum, incident) => sum + incident.peopleAffected, 0),
    [incidentsWithAreaStats]
  );

  const totalNearbyActiveVolunteers = useMemo(
    () =>
      incidentsWithAreaStats.reduce((sum, incident) => {
        return sum + incident.activeVolunteersNearby;
      }, 0),
    [incidentsWithAreaStats]
  );

  return (
    <>
      <section className="space-y-6 pb-4">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-[#4a4a4a]">Overview of system status and reported problems</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Total Reports</p>
            <p className="text-2xl font-bold text-gray-900">{problems.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Critical Cases</p>
            <p className="text-2xl font-bold text-red-600">{problems.filter(p => p.severity >= 4).length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">People Impacted</p>
            <p className="text-2xl font-bold text-amber-600">
              {problems.reduce((acc, p) => acc + (p.people_affected || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Active Needs</p>
            <p className="text-2xl font-bold text-blue-600">{activeProblems.length}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#f2e8eb] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2e8eb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a1a]">Incident Heatmap</h2>
            <p className="text-xs text-[#6b7280]">Hover hotspots to inspect affected people by incident type and active volunteers nearby.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold text-[#800020]">
              Radius analytics: {analyticsRadiusKm} km
            </p>
            <button
              type="button"
              onClick={() => {
                if (!navigator?.geolocation) return;
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                    setLocationDenied(false);
                  },
                  () => setLocationDenied(true),
                  { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                );
              }}
              className="rounded-full border border-[#f2e8eb] bg-white px-3 py-1 text-xs font-semibold text-[#374151] hover:bg-[#fafafa]"
            >
              Use My Location
            </button>
            <button
              type="button"
              onClick={() => setUserLocation(null)}
              className="rounded-full border border-[#f2e8eb] bg-white px-3 py-1 text-xs font-semibold text-[#374151] hover:bg-[#fafafa]"
            >
              Show Incidents
            </button>
          </div>
        </div>

        {locationDenied && (
          <div className="border-b border-[#f2e8eb] bg-[#fff7ed] px-4 py-2 text-xs text-[#9a3412] sm:px-5">
            Location permission was denied. Map is using default center. Allow location access and click "Use My Location".
          </div>
        )}

        <div className="grid gap-3 border-b border-[#f2e8eb] px-4 py-3 sm:grid-cols-2 lg:grid-cols-5 sm:px-5">
          <label className="text-xs text-[#4b5563]">
            Area Radius ({analyticsRadiusKm} km)
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={analyticsRadiusKm}
              onChange={(event) => setAnalyticsRadiusKm(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="text-xs text-[#4b5563]">
            Heat Radius ({heatRadius})
            <input
              type="range"
              min="12"
              max="60"
              step="1"
              value={heatRadius}
              onChange={(event) => setHeatRadius(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="text-xs text-[#4b5563]">
            Heat Blur ({heatBlur})
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={heatBlur}
              onChange={(event) => setHeatBlur(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="text-xs text-[#4b5563]">
            Min Opacity ({heatMinOpacity.toFixed(2)})
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={heatMinOpacity}
              onChange={(event) => setHeatMinOpacity(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="text-xs text-[#4b5563]">
            Affected Scale ({affectedScale})
            <input
              type="range"
              min="60"
              max="320"
              step="10"
              value={affectedScale}
              onChange={(event) => setAffectedScale(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>

        {/* Map Layer Toggles */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#374151] cursor-pointer">
            <input type="checkbox" checked={showProblems} onChange={() => setShowProblems(!showProblems)} className="rounded text-[#800020] focus:ring-[#800020]" />
            Show Problems
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#374151] cursor-pointer">
            <input type="checkbox" checked={showVolunteers} onChange={() => setShowVolunteers(!showVolunteers)} className="rounded text-[#800020] focus:ring-[#800020]" />
            Show Volunteers
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#374151] cursor-pointer">
            <input type="checkbox" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} className="rounded text-[#800020] focus:ring-[#800020]" />
            Show Heatmap
          </label>
          <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block"></div>
          <button 
            onClick={() => setIsSimulating(true)}
            className="rounded-lg bg-[#065f46] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#047857] shadow-sm flex items-center gap-1.5"
          >
            🛰️ Simulate Scenario
          </button>
        </div>

        <div className="relative h-[480px] w-full z-0 overflow-hidden rounded-xl border border-[#e5e7eb] shadow-sm">
          <MapContainer 
            center={userLocation || [22.9734, 78.6569]} 
            zoom={userLocation ? 11 : 5} 
            className="h-full w-full z-0" 
            scrollWheelZoom
            maxBounds={[[6.5, 68.0], [37.0, 97.5]]}
            maxBoundsViscosity={1.0}
            minZoom={4}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <CenterOnUserLocation location={userLocation} zoom={11} />

            {showHeatmap && heatPoints.length > 0 && (
              <HeatmapLayer points={heatPoints} radius={heatRadius} blur={heatBlur} minOpacity={heatMinOpacity} />
            )}

            {showProblems && mapIncidents.map((incident) => (
              <Marker 
                key={`marker-${incident.id}`} 
                position={[incident.latitude, incident.longitude]}
                icon={new L.Icon({
                   iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${incident.status === 'completed' ? 'green' : incident.status === 'active' || incident.status === 'assigned' ? 'gold' : 'red'}.png`,
                   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                   iconSize: [25, 41],
                   iconAnchor: [12, 41],
                   popupAnchor: [1, -34],
                   shadowSize: [41, 41]
                })}
              >
                <Popup>
                  <div className="min-w-[200px] space-y-1 text-xs p-1">
                    <p className="font-bold text-sm text-[#111827] border-b pb-1">{incident.type}</p>
                    <p className="text-[#4b5563] pt-1">📍 <b>Place:</b> {incident.locationText}</p>
                    <p className="text-[#4b5563] line-clamp-2"><b>Desc:</b> {incident.description}</p>
                    <div className="flex items-center justify-between pt-2">
                       <span className="font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          Sev: {incident.severity}/5
                       </span>
                       <span className={`font-bold px-2 py-0.5 rounded text-white capitalize ${incident.status === 'completed' ? 'bg-green-600' : incident.status === 'active' || incident.status === 'assigned' ? 'bg-orange-500' : 'bg-red-600'}`}>
                          {incident.status}
                       </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showVolunteers && volunteers.map((v) => (
              v.latitude && v.longitude && (
                <Marker key={`vol-${v.id}`} position={[v.latitude, v.longitude]} icon={volunteerIcon}>
                   <Popup>
                     <div className="text-xs p-1 space-y-1">
                        <p className="font-bold text-sm text-[#1e40af] border-b pb-1">🔵 Volunteer</p>
                        <p className="font-semibold text-[#111827] pt-1">{v.first_name} {v.last_name}</p>
                        <p className="text-[#4b5563]">💼 {v.profession || "Field Agent"}</p>
                        <p className="text-[#4b5563]">📞 {v.phone}</p>
                     </div>
                   </Popup>
                </Marker>
              )
            ))}

            {/* Area Stats Circle Markers (Keep as overlay for analytical view) */}
            {showProblems && incidentsWithAreaStats.map((incident) => (
              <Fragment key={`incident-area-${incident.id}`}>
                <CircleMarker
                  center={[incident.latitude, incident.longitude]}
                  radius={Math.max(12, Math.min(25, 8 + incident.severity + incident.peopleAffected / 35))}
                  pathOptions={{
                    color: getSeverityColor(incident.severity),
                    fillColor: getSeverityColor(incident.severity),
                    fillOpacity: 0.25,
                    weight: 1,
                    dashArray: '5, 5'
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
                    <div className="min-w-[180px] space-y-1 text-xs">
                      <p className="font-bold text-[#111827]">{incident.locationText} (Area)</p>
                      <p>Active cases: {incident.nearbyIncidentsCount}</p>
                      <p>Total affected: {incident.totalAffected}</p>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </Fragment>
            ))}

            {/* Predictive Hotspots */}
            {predictions.map((hotspot, idx) => (
              <Circle
                key={`hotspot-${idx}`}
                center={[hotspot.latitude, hotspot.longitude]}
                radius={2000}
                pathOptions={{
                  color: hotspot.risk_level === 'High' ? '#ef4444' : '#f59e0b',
                  fillColor: hotspot.risk_level === 'High' ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.2,
                  dashArray: '10, 10',
                  weight: 2
                }}
              >
                <Tooltip direction="center" opacity={1} permanent>
                  <div className="text-[10px] font-bold text-[#b91c1c] uppercase tracking-tighter animate-pulse">
                    ⚠️ {hotspot.message}
                  </div>
                </Tooltip>
              </Circle>
            ))}

            {/* Simulation Results Overlay */}
            {simulationData && (
              <Circle
                center={simulationData.center || userLocation || [22.9734, 78.6569]}
                radius={simulationData.estimates.affected_radius_km * 1000}
                pathOptions={{
                  color: '#9333ea',
                  fillColor: '#9333ea',
                  fillOpacity: 0.25,
                  weight: 3
                }}
              >
                <Popup>
                  <div className="text-xs p-2 space-y-2 min-w-[200px]">
                    <p className="font-bold text-purple-700 text-sm">Simulation Result</p>
                    <p><b>Estimated Affected:</b> {simulationData.estimates.affected_area_km2} km²</p>
                    <p><b>Volunteers Needed:</b> {simulationData.estimates.required_volunteers}</p>
                    <p><b>Avg Response Time:</b> {simulationData.estimates.avg_response_time_min} mins</p>
                  </div>
                </Popup>
              </Circle>
            )}
          </MapContainer>

          {incidentsWithAreaStats.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-3 z-[500] w-[220px] rounded-xl border border-[#f2e8eb] bg-white/95 p-3 text-xs text-[#374151] shadow-md backdrop-blur-sm">
              <p className="font-semibold text-[#111827]">Map Snapshot</p>
              <p className="mt-1">Incidents shown: {incidentsWithAreaStats.length}</p>
              <p>Total affected: {totalAreaAffected}</p>
              <p>Nearby active volunteers: {totalNearbyActiveVolunteers}</p>

              <div className="mt-3">
                <p className="mb-1 font-semibold text-[#111827]">Heat Intensity</p>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#f59e0b] to-[#b91c1c]" />
                <div className="mt-1 flex justify-between text-[10px] text-[#6b7280]">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          )}

          {incidentsWithAreaStats.length === 0 && (
            <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-lg border border-[#f2e8eb] bg-white/90 px-3 py-2 text-center text-sm text-[#6b7280] shadow-sm backdrop-blur-sm">
              Map loaded. No mappable incident coordinates yet. Submit reports with latitude/longitude to show hotspots.
            </div>
          )}
        </div>
      </section>

      {/* Impact Dashboard Section */}
      {impact && (
        <section className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Total Tasks Completed</p>
              <p className="mt-2 text-3xl font-extrabold text-[#065f46]">{impact.total_tasks_completed}</p>
              <p className="mt-1 text-xs text-[#10b981]">Success Rate: 100%</p>
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Total People Helped</p>
              <p className="mt-2 text-3xl font-extrabold text-[#800020]">{impact.total_people_helped}</p>
              <p className="mt-1 text-xs text-[#d6336c]">Direct Community Impact</p>
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Areas Resolved</p>
              <p className="mt-2 text-3xl font-extrabold text-[#1e40af]">{impact.unique_areas_resolved}</p>
              <p className="mt-1 text-xs text-[#3b82f6]">Across Multiple Districts</p>
            </div>
          </div>
        </section>
      )}

      {/* Analytics Alerts Panel */}
      {(predictions.length > 0 || resourceGaps.length > 0) && (
        <section className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
               📡 Intelligence Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predictions.map((h, i) => (
                <div key={`alert-pred-${i}`} className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">Predictive Hotspot Detected</p>
                    <p className="text-xs text-red-700">{h.message} near {h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {resourceGaps.map((g, i) => (
                <div key={`alert-gap-${i}`} className="flex items-center gap-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    📉
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">Resource Gap Alert</p>
                    <p className="text-xs text-orange-700">{g.alert} (Score: {g.gap_score})</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Simulation Modal */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-[#065f46] to-[#047857] p-6 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                   🛰️ Scenario Simulation
                </h2>
                <p className="mt-1 text-xs opacity-90">Estimate response requirements before deployment</p>
              </div>
              <form 
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const payload = {
                    location: formData.get("location"),
                    type: formData.get("type"),
                    severity: Number(formData.get("severity"))
                  };
                  try {
                    const res = await axios.post(`${API_BASE}/api/analytics/simulate`, payload, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    setSimulationData(res.data);
                    setIsSimulating(false);
                  } catch (err) {
                    alert("Simulation failed.");
                  }
                }}
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Location / Area</label>
                  <input name="location" required className="w-full rounded-lg border border-gray-200 p-2.5 text-sm" placeholder="e.g. Pune Central" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Incident Type</label>
                  <select name="type" className="w-full rounded-lg border border-gray-200 p-2.5 text-sm">
                    <option value="Flood">Flood</option>
                    <option value="Medical">Medical Emergency</option>
                    <option value="Fire">Fire</option>
                    <option value="Food">Food Shortage</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Severity (1-5)</label>
                  <input name="severity" type="range" min="1" max="5" defaultValue="3" className="w-full" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsSimulating(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-600">Cancel</button>
                  <button type="submit" className="flex-1 rounded-lg bg-[#065f46] py-2.5 text-sm font-bold text-white">Run Simulation</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>

    <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Recent Activity Feed */}
        {recentActivity.length > 0 && (
          <div className="mb-10 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#6b7280] mb-6 flex items-center gap-2">
              🕒 Recent Platform Activity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    act.new_status === 'completed' ? 'bg-green-500' : 
                    act.new_status === 'assigned' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-[#111827]">
                      <span className="font-bold">{act.volunteer_name}</span> {
                        act.new_status === 'assigned' ? 'was assigned to' :
                        act.new_status === 'completed' ? 'completed' :
                        act.new_status === 'accepted' ? 'accepted' : 'updated status for'
                      } <span className="font-semibold text-[#800020]">{act.problem_type}</span>
                    </p>
                    <p className="mt-1 text-[10px] text-[#6b7280] flex items-center gap-2">
                      {new Date(act.created_at).toLocaleString()} • Via {act.changed_via.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Grid of problems */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading && <div className="col-span-full rounded-xl border bg-white p-5 text-sm">Loading data...</div>}
          
          {!loading && activeProblems.length === 0 && (
            <div className="col-span-full rounded-xl border border-[#f0e4e4] bg-[#fffdfd] p-5 text-center text-[#4a4a4a]">
              No active problems found.
            </div>
          )}

        {activeProblems.map((p) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="group overflow-hidden rounded-xl border border-[#f2e8eb] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.06)] transition duration-300 hover:shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
          >
            {/* Image */}
            <div className="h-40 w-full overflow-hidden bg-[#f9f5f6]">
              {p.image_url ? (
                <img src={p.image_url} alt={p.type} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <img src={IMAGE_FALLBACK} alt="Placeholder" className="h-full w-full object-cover" />
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex rounded-full bg-[#fff0f3] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#800020]">
                    {p.type}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold leading-tight text-[#1a1a1a] pr-4">{p.location?.text || "Unknown Location"}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={() => handleDeleteProblem(p.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete Problem"
                  >
                    ✕
                  </button>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fef2f2] font-semibold text-[#dc2626]">
                    {p.severity}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[#6b7280]">
                <p>Reporter: {p.first_name} {p.last_name}</p>
                <p>Phone: {p.phone}</p>
                <p>People Affected: {p.people_affected}</p>
                <p>
                  Verification: <span className="font-semibold uppercase">{p.verification_status || "pending"}</span>
                </p>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-[#4a4a4a]">{p.description}</p>

              {p.ai_summary && (
                <p className="mt-2 rounded-md bg-[#fff7ed] px-2 py-1 text-xs text-[#9a3412]">
                  AI: {p.ai_summary} ({Math.round((p.ai_confidence || 0) * 100)}%)
                </p>
              )}

              {/* Before / After Preview for Completed Tasks */}
              {p.status === "completed" && (
                <div className="mt-4 space-y-3 pt-3 border-t border-gray-50">
                  <div className="flex gap-2 rounded-xl bg-gray-50 p-2 border border-gray-100">
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase text-center">Before</p>
                      <div className="h-20 w-full overflow-hidden rounded-lg bg-gray-200">
                        <img src={p.image_url || IMAGE_FALLBACK} className="h-full w-full object-cover" alt="Before" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase text-center text-[#800020]">After (Proof)</p>
                      <div className="h-20 w-full overflow-hidden rounded-lg bg-gray-200 border-2 border-[#800020]/20">
                         <img src={p.proof_image_url ? `${API_BASE}${p.proof_image_url}` : IMAGE_FALLBACK} className="h-full w-full object-cover" alt="After" />
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[10px] italic font-medium text-[#6b7280]">“We don’t just assign tasks, we track real impact.”</p>
                </div>
              )}

              {(p.verification_status || "pending") === "pending" && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAiReview(p.id)}
                    className="min-h-9 w-full rounded-lg border border-[#f59e0b] bg-[#fffbeb] px-3 text-xs font-semibold text-[#92400e] transition hover:bg-[#fef3c7]"
                  >
                    AI Review
                  </button>
                  <button
                    onClick={() => handleVerifyOrReject(p.id, "verify")}
                    className="min-h-9 w-full rounded-lg bg-[#065f46] px-3 text-xs font-semibold text-white transition hover:bg-[#047857]"
                  >
                    Verify + Alert Nearby Volunteers
                  </button>
                  <button
                    onClick={() => handleVerifyOrReject(p.id, "reject")}
                    className="min-h-9 w-full rounded-lg bg-[#b91c1c] px-3 text-xs font-semibold text-white transition hover:bg-[#991b1b]"
                  >
                    Reject Report
                  </button>
                </div>
              )}

              {p.status === "pending" && p.verification_status === "verified" && (
                <div className="mt-4">
                  <button
                    onClick={() => handleSuggest(p.id)}
                    className="min-h-10 w-full rounded-lg bg-[#800020] px-4 text-sm font-semibold text-white transition hover:bg-[#9B0026]"
                  >
                    Find Volunteers
                  </button>
                </div>
              )}

              {p.status === "active" && (
                <div className="mt-4 flex min-h-10 w-full items-center justify-center rounded-lg border border-[#800020] bg-[#fff0f3] px-4 text-sm font-semibold text-[#800020]">
                  Assigned
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>

    {/* Assignment Modal overlay */}
      <AnimatePresence>
        {selectedProblem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setSelectedProblem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-[#f2e8eb] px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#fff7f9] to-white">
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Suggest Volunteers</h2>
                <button onClick={() => setSelectedProblem(null)} className="text-[#6b7280] hover:text-[#1a1a1a]">
                  ✕
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="text-center text-sm text-[#6b7280]">Analyzing matches...</div>
                ) : suggestError ? (
                  <div className="text-red-600 text-sm">{suggestError}</div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center text-sm text-[#6b7280]">No suitable volunteers found.</div>
                ) : (
                  <div className="space-y-4">
                    {/* SRA AI Analysis */}
                    {aiAnalysis && !aiAnalysis.error && (
                      <div className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#92400e] mb-2">🤖 AI Incident Strategy</p>
                        <p className="text-sm text-[#78350f] font-semibold mb-1">Summary:</p>
                        <p className="text-sm text-[#78350f] mb-3">{aiAnalysis.summary}</p>
                        <p className="text-sm text-[#78350f] font-semibold mb-1">Solution:</p>
                        <p className="text-sm text-[#78350f] mb-3">{aiAnalysis.solution}</p>
                        {aiAnalysis.steps && aiAnalysis.steps.length > 0 && (
                          <>
                            <p className="text-sm text-[#78350f] font-semibold mb-1">Action Plan:</p>
                            <ul className="list-decimal list-inside text-sm text-[#78350f] space-y-1">
                              {aiAnalysis.steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                    {aiAnalysis?.error && (
                       <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                         ⚠️ AI processing delayed. Showing fallback proximity matching.
                       </div>
                    )}
                    
                    {suggestions.map((v, index) => (
                      <div key={v.volunteer_id} className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between transition ${index === 0 && (!aiAnalysis || !aiAnalysis.error) ? 'border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-orange-50/30' : 'border-[#e9dce1]'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[#1a1a1a]">{v.name}</h3>
                            {v.tasks_completed >= 5 && v.rating >= 4.5 && (
                              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[9px] font-bold text-yellow-700 border border-yellow-200">
                                👑 TOP VOLUNTEER
                              </span>
                            )}
                            {index === 0 && (
                              <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#92400e]">
                                ⭐ TOP MATCH
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6b7280] font-medium uppercase tracking-tight">
                             <span className="flex items-center gap-1">⭐ {v.rating?.toFixed(1) || "5.0"} Rating</span>
                             <span className="flex items-center gap-1">✓ {v.tasks_completed || 0} Tasks</span>
                             <span className="flex items-center gap-1">⏱ {v.avg_response_time || 0}m Avg</span>
                          </div>
                          <p className="mt-1 text-xs text-[#6b7280]">{v.email} • {v.phone}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded bg-white border border-gray-200 px-2 py-1">📍 {v.address}</span>
                            <span className="rounded bg-white border border-gray-200 px-2 py-1">💼 {v.profession}</span>
                          </div>
                          {v.ai_reason && (
                            <p className="mt-2 text-xs text-[#92400e] bg-[#fef3c7] p-2 rounded-md italic">
                              "{v.ai_reason}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-[#16a34a]">{v.relevance_score}</div>
                            <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Score</div>
                          </div>
                          <button
                            onClick={() => handleAssign(selectedProblem, v.volunteer_id)}
                            className="min-h-9 rounded-lg bg-[#800020] px-4 text-xs font-semibold text-white transition hover:bg-[#9B0026]"
                          >
                            Assign Task
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AdminDashboard;
