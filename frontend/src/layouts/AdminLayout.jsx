import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/smartaid-logo.svg";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("smartaid_role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const navLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/volunteers", label: "Volunteers" },
    { to: "/admin/requests", label: "Register Volunteers" },
    { to: "/admin/programs", label: "Manage Programs" },
    { to: "/admin/chat", label: "Chat (SRA)" },
    ...(role === "super_admin" ? [{ to: "/admin/manage-admins", label: "Manage Admins" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#e5e7eb] bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-[#e5e7eb] px-6">
          <img src={logo} alt="SmartAid logo" className="h-8 w-8 rounded-full" />
          <span className="text-lg font-bold text-[#800020]">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                location.pathname === link.to
                  ? "bg-[#fff0f3] text-[#800020]"
                  : "text-[#4b5563] hover:bg-gray-50 hover:text-[#111827]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="mt-4 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
