import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const problemTypes = ["medical", "food", "shelter", "education", "water", "other"] as const;

const severityMeta: Record<number, { labelKey: string; badgeClass: string }> = {
  1: { labelKey: "low", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  2: { labelKey: "moderate", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  3: { labelKey: "high", badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  4: { labelKey: "severe", badgeClass: "bg-red-100 text-red-800 border-red-200" },
  5: { labelKey: "critical", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

type FormDataState = {
  problemType: string;
  location: string;
  severity: number;
  peopleAffected: string;
  description: string;
  photo: File | null;
};

const initialForm: FormDataState = {
  problemType: "",
  location: "",
  severity: 1,
  peopleAffected: "",
  description: "",
  photo: null,
};

function ProblemSubmissionForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormDataState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const currentSeverity = severityMeta[formData.severity];
  const currentSeverityLabel = t(currentSeverity.labelKey);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.problemType) nextErrors.problemType = t("problem_type_required");
    if (!formData.location.trim()) {
      nextErrors.location = "Location is required.";
    }

    const people = Number(formData.peopleAffected);
    if (!formData.peopleAffected || Number.isNaN(people) || people < 1) {
      nextErrors.peopleAffected = t("people_affected_required");
    }

    if (!formData.description.trim()) nextErrors.description = t("description_required");

    return nextErrors;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "severity" ? Number(value) : value,
    }));

    if (submitSuccess) setSubmitSuccess(false);
    if (submitError) setSubmitError("");
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, photo: file }));
    if (submitSuccess) setSubmitSuccess(false);
    if (submitError) setSubmitError("");
  };

  const resetForm = () => {
    setFormData(initialForm);
    setErrors({});
    setSubmitError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitSuccess(false);
      setSubmitError("");
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSubmitError("");

    const payload = {
      problem_type: formData.problemType,
      description: formData.description.trim(),
      location: formData.location.trim(),
      severity: formData.severity,
      people_affected: Number(formData.peopleAffected)
    };

    try {
      await axios.post("http://127.0.0.1:8000/report-problem", payload);

      setSubmitSuccess(true);
      resetForm();
    } catch (error: any) {
      setSubmitSuccess(false);
      setSubmitError(error?.response?.data?.detail || "Could not submit problem report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-2 w-full rounded-t-2xl bg-[#800020]" />

        <div className="p-5 sm:p-7">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>

          <h1
            className="text-2xl font-semibold tracking-tight text-[#800020] sm:text-3xl"
            style={{ fontFamily: '"Merriweather", Georgia, serif' }}
          >
            {t("report_problem")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
            {t("share_need")}
          </p>

          {submitSuccess && (
            <div
              className="mt-4 rounded-lg border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm font-medium text-[#800020]"
              role="status"
            >
              {t("problem_submitted_successfully")}
            </div>
          )}

          {submitError && (
            <div
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="problemType" className="mb-2 block text-sm font-semibold text-[#800020]">
                {t("problem_type")} <span className="text-red-600">*</span>
              </label>
              <select
                id="problemType"
                name="problemType"
                value={formData.problemType}
                onChange={handleChange}
                className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                aria-invalid={Boolean(errors.problemType)}
              >
                <option value="">{t("select_problem_type")}</option>
                {problemTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(type)}
                  </option>
                ))}
              </select>
              {errors.problemType && <p className="mt-1 text-sm text-red-600">{errors.problemType}</p>}
            </div>

            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-semibold text-[#800020]">
                {t("location")} <span className="text-red-600">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="Enter area, address, or coordinates"
                value={formData.location}
                onChange={handleChange}
                className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                aria-invalid={Boolean(errors.location)}
              />
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="severity" className="block text-sm font-semibold text-[#800020]">
                  {t("severity")} (1-5)
                </label>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${currentSeverity.badgeClass}`}
                >
                  {currentSeverityLabel}
                </span>
              </div>

              <input
                id="severity"
                name="severity"
                type="range"
                min="1"
                max="5"
                step="1"
                value={formData.severity}
                onChange={handleChange}
                className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#800020]"
              />

              <div className="mt-2 grid grid-cols-5 text-center text-[11px] font-medium text-gray-500 sm:text-xs">
                <span>{t("low")}</span>
                <span>{t("moderate")}</span>
                <span>{t("high")}</span>
                <span>{t("severe")}</span>
                <span>{t("critical")}</span>
              </div>
            </div>

            <div>
              <label htmlFor="peopleAffected" className="mb-2 block text-sm font-semibold text-[#800020]">
                {t("people_affected")} <span className="text-red-600">*</span>
              </label>
              <input
                id="peopleAffected"
                name="peopleAffected"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder={t("people_affected_placeholder")}
                value={formData.peopleAffected}
                onChange={handleChange}
                className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                aria-invalid={Boolean(errors.peopleAffected)}
              />
              {errors.peopleAffected && <p className="mt-1 text-sm text-red-600">{errors.peopleAffected}</p>}
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-semibold text-[#800020]">
                {t("description")} <span className="text-red-600">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder={t("description_placeholder")}
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label htmlFor="photo" className="mb-2 block text-sm font-semibold text-[#800020]">
                {t("photo_upload")}
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#800020] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              {formData.photo && (
                <p className="mt-1 text-xs text-gray-500">
                  {t("selected")}: {formData.photo.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-lg bg-[#800020] px-5 text-base font-semibold text-white transition hover:bg-[#69001b] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? t("submitting") : t("submit")}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="h-12 w-full rounded-lg border border-[#800020] px-5 text-base font-semibold text-[#800020] transition hover:bg-[#800020]/5 sm:w-auto"
              >
                {t("clear_form")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ProblemSubmissionForm;
