import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='100%' height='100%' fill='%23f3e8ec'/></svg>";

const features = [
  {
    titleKey: "feature_live_need_title",
    textKey: "feature_live_need_text",
    image: "/images/medical-aid-pune-rural.svg",
  },
  {
    titleKey: "feature_volunteer_match_title",
    textKey: "feature_volunteer_match_text",
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    titleKey: "feature_transparent_ops_title",
    textKey: "feature_transparent_ops_text",
    image: "/images/nonprofit-operations-board.svg",
  },
];

const steps = [
  {
    id: "01",
    titleKey: "step_collect_title",
    textKey: "step_collect_text",
  },
  {
    id: "02",
    titleKey: "step_prioritize_title",
    textKey: "step_prioritize_text",
  },
  {
    id: "03",
    titleKey: "step_deploy_title",
    textKey: "step_deploy_text",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45 },
};

function Home() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,rgba(128,0,32,0.14),transparent_65%)]" />

      <section className="space-y-16 py-4 sm:py-6 lg:space-y-20">
        <motion.section
          {...fadeInUp}
          className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-[#f2e8eb] bg-white/95 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)] md:grid-cols-2 md:p-8 lg:p-10"
        >
          <div>
            <p className="inline-flex rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#800020]">
              {t("app_name")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#1a1a1a] sm:text-4xl lg:text-5xl">
              {t("home_hero_title")}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4a4a4a] sm:text-base">
              {t("home_hero_text")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.995 }} transition={{ duration: 0.2 }}>
                <Link
                  to="/submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#800020] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(128,0,32,0.24)] transition duration-200 hover:bg-[#9B0026]"
                >
                  {t("report_problem")}
                </Link>
              </motion.div>

            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-lg">
              <img
                src="https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&w=1400&q=80"
                alt={t("home_hero_image_alt")}
                className="h-64 w-full rounded-lg object-cover transition duration-300 hover:scale-105 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:h-64 lg:h-64"
                loading="eager"
                onError={(event) => {
                  event.currentTarget.src = IMAGE_FALLBACK;
                }}
              />
            </div>
            <div className="absolute -bottom-4 -left-3 rounded-xl bg-white px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
              <p className="text-xs uppercase tracking-wide text-[#6b7280]">{t("avg_assignment_time")}</p>
              <p className="text-lg font-semibold text-[#800020]">{t("under_12_min")}</p>
            </div>
          </motion.div>
        </motion.section>

        <motion.section id="features" {...fadeInUp} className="space-y-5">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">{t("features_title")}</h2>
            <p className="mt-2 text-sm text-[#4a4a4a] sm:text-base">
              {t("features_text")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map((item, index) => (
              <motion.article
                key={item.titleKey}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-xl border border-[#f2e8eb] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition duration-300 hover:shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
              >
                <div className="overflow-hidden rounded-t-lg">
                  <img
                    src={item.image}
                    alt={t(item.titleKey)}
                    className="h-48 w-full rounded-t-lg object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = IMAGE_FALLBACK;
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[#1a1a1a]">{t(item.titleKey)}</h3>
                  <p className="mt-2 text-sm text-[#4a4a4a]">{t(item.textKey)}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="how-it-works"
          {...fadeInUp}
          className="rounded-2xl border border-[#f2e8eb] bg-gradient-to-r from-[#fff7f9] to-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.06)] sm:p-7"
        >
          <h2 className="text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">{t("how_it_works")}</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                className="rounded-xl border border-[#f2e8eb] bg-white p-4 shadow-[0_6px_18px_rgba(0,0,0,0.05)]"
              >
                <p className="text-sm font-semibold text-[#800020]">{t("step_label")} {step.id}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#1a1a1a]">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm text-[#4a4a4a]">{t(step.textKey)}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="cta"
          {...fadeInUp}
          className="rounded-2xl bg-[#800020] p-6 text-white shadow-[0_10px_24px_rgba(128,0,32,0.3)] sm:p-8"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">{t("cta_title")}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                {t("cta_text")}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Link
                to="/register-volunteer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#800020] transition duration-200 hover:bg-[#fff0f3]"
              >
                Become a Volunteer
              </Link>
            </motion.div>
          </div>
        </motion.section>
      </section>
    </div>
  );
}

export default Home;
