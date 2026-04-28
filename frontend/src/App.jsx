import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import VolunteerLayout from "./layouts/VolunteerLayout";
import Home from "./pages/Home";
import ProblemSubmissionForm from "./pages/ProblemSubmissionForm";
import Login from "./pages/Login";
import Programs from "./pages/Programs";
import AdminDashboard from "./pages/AdminDashboard";
import VolunteerList from "./pages/VolunteerList";
import VolunteerRegister from "./pages/VolunteerRegister";
import ApplicationReview from "./pages/ApplicationReview";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import ChatPage from "./pages/ChatPage";
import ManageAdmins from "./pages/ManageAdmins";
import AdminRequests from "./pages/AdminRequests";
import AdminPrograms from "./pages/AdminPrograms";

function ProtectedRoute({ roles, children }) {
  const token = localStorage.getItem("smartaid_token");
  const role = localStorage.getItem("smartaid_role");

  if (!token) return <Navigate to="/login" replace />;
  if (roles && (!role || !roles.includes(role))) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/submit" element={<ProblemSubmissionForm />} />
          <Route path="/login" element={<Login />} />
          
          {/* We keep register-volunteer here but protected for users */}
          <Route 
            path="/register-volunteer" 
            element={
              <ProtectedRoute roles={["user"]}>
                <VolunteerRegister />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/application-review" 
            element={
              <ProtectedRoute roles={["user"]}>
                <ApplicationReview />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* ADMIN ROUTES */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute roles={["admin", "super_admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="volunteers" element={<VolunteerList />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="programs" element={<AdminPrograms />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="manage-admins" element={<ManageAdmins />} />
        </Route>

        {/* VOLUNTEER ROUTES */}
        <Route 
          path="/volunteer-dashboard" 
          element={
            <ProtectedRoute roles={["volunteer"]}>
              <VolunteerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<VolunteerDashboard />} />
        </Route>

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
