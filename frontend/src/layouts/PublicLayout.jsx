import { Link, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "../assets/smartaid-logo.svg";

export default function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffafb] via-white to-[#fff7f9] text-[#4a4a4a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_top,rgba(128,0,32,0.08),transparent_68%)]" />
      
      <header className="sticky top-0 z-30 border-b border-[#f0e4e4]/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight text-[#800020]">
            <img src={logo} alt="SmartAid logo" className="h-10 w-10 rounded-full shadow-[0_10px_24px_rgba(128,0,32,0.18)]" />
            <span className="leading-none">SmartAid</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-[#4a4a4a] hover:text-[#800020]">
              Home
            </Link>
            <Link to="/programs" className="text-sm font-medium text-[#4a4a4a] hover:text-[#800020]">
              Programs
            </Link>
            <Link to="/submit" className="text-sm font-medium text-[#4a4a4a] hover:text-[#800020]">
              Submit Problem
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-lg bg-[#800020] px-4 text-sm font-semibold text-white transition hover:bg-[#9B0026]"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
