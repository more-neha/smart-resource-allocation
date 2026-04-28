import { Link, Outlet, useNavigate } from "react-router-dom";
import logo from "../assets/smartaid-logo.svg";

export default function VolunteerLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white px-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SmartAid logo" className="h-8 w-8 rounded-full" />
          <span className="text-lg font-bold text-[#800020]">Volunteer Portal</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-gray-50"
        >
          Logout
        </button>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 pt-24 pb-8">
        <Outlet />
      </main>
    </div>
  );
}
