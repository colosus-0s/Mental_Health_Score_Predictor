/* ==========================================================================
   Mental Health Score Predictor — script.js
   Sections: 1 DOM references / 2 Configuration / 3 Input handling /
             4 Live tracker updates / 5 Validation / 6 API request /
             7 Loading state / 8 Result rendering / 9 Error handling /
             10 Reset / Recalculate
   ========================================================================== */

/* ---------- 1. DOM references ---------- */
const API_BASE="http://127.0.0.1:8000"
const form          = document.getElementById("predictionForm");
const submitBtn     = document.getElementById("submitBtn");
const btnLabel      = submitBtn.querySelector(".btn-label");
const btnSpinner    = submitBtn.querySelector(".btn-spinner");
const formErrorEl   = document.getElementById("formError");

const statusDot     = document.getElementById("statusDot");
const statusText    = document.getElementById("statusText");

const countrySelect     = document.getElementById("country");
const countryOtherRow   = document.getElementById("countryOtherRow");
const countryOtherInput = document.getElementById("countryOther");

const liveCaption   = document.getElementById("liveCaption");
const scoreValueEl  = document.getElementById("scoreValue");
const scoreCaption  = document.getElementById("scoreCaption");
const ringProgress  = document.getElementById("ringProgress");

const interpEl       = document.getElementById("scoreInterpretation");
const interpBadgeEl  = document.getElementById("scoreInterpBadge");

const errorInline    = document.getElementById("errorInline");
const errorTitleEl   = document.getElementById("errorTitle");
const errorTextEl    = document.getElementById("errorText");
const errorRetryBtn  = document.getElementById("errorRetryBtn");

const resultActions  = document.getElementById("resultActions");
const recalcBtn      = document.getElementById("recalcBtn");
const resetBtn       = document.getElementById("resetBtn");

const trackSleep    = document.getElementById("trackSleep");
const trackStudy    = document.getElementById("trackStudy");
const trackActivity = document.getElementById("trackActivity");
const trackUsage    = document.getElementById("trackUsage");
const trackUnlocks  = document.getElementById("trackUnlocks");
const trackStress   = document.getElementById("trackStress");

const fillSleep    = document.getElementById("fillSleep");
const fillStudy    = document.getElementById("fillStudy");
const fillActivity = document.getElementById("fillActivity");
const fillUsage    = document.getElementById("fillUsage");

const fillSleepPercent    = document.getElementById("fillSleepPercent");
const fillStudyPercent    = document.getElementById("fillStudyPercent");
const fillActivityPercent = document.getElementById("fillActivityPercent");
const fillUsagePercent    = document.getElementById("fillUsagePercent");

/* ---------- 2. Configuration ---------- */
const API_BASE_URL = "http://127.0.0.1:8000";
const SCORE_SCALE_MAX = 10;
const RING_CIRCUMFERENCE = 540.35;
const HOUR_FIELD_MAX = 24;
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NUMERIC_RULES = {
  age:            { min: 10, max: 100, integer: true },
  dailyUsage:     { min: 0,  max: 24,  integer: false },
  dailyUnlocks:   { min: 0,  max: null, integer: true },
  studyHours:     { min: 0,  max: 24,  integer: false },
  activityHours:  { min: 0,  max: 24,  integer: false },
  sleepHours:     { min: 0,  max: 24,  integer: false },
};

const REQUIRED_SELECTS = ["gender", "country", "academicLevel", "platform", "purpose", "stressLevel"];

/* ---------- 3. Input handling ---------- */
countrySelect.addEventListener("change", () => {
  countryOtherRow.hidden = countrySelect.value !== "Other";
});

function getFormData() {
  const countryValue = countrySelect.value === "Other" && countryOtherInput.value.trim()
    ? countryOtherInput.value.trim()
    : countrySelect.value;

  return {
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    country: countryValue,
    academic_level: document.getElementById("academicLevel").value,
    most_used_platform: document.getElementById("platform").value,
    purpose_of_use: document.getElementById("purpose").value,
    avg_daily_usage_hours: document.getElementById("dailyUsage").value,
    daily_unlocks: document.getElementById("dailyUnlocks").value,
    study_hours: document.getElementById("studyHours").value,
    physical_activity_hours: document.getElementById("activityHours").value,
    sleep_hours_per_night: document.getElementById("sleepHours").value,
    stress_level: document.getElementById("stressLevel").value,
  };
}

/* ---------- 4. Live tracker updates ---------- */
function formatHours(raw) {
  if (raw === "") return "\u2014";
  const value = Number(raw);
  return Number.isNaN(value) ? "\u2014" : value.toFixed(1) + " h";
}

function updateBar(fillEl, percentEl, raw, max) {
  const value = Number(raw);
  const percent = raw === "" || Number.isNaN(value) ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  fillEl.style.width = percent + "%";
  if (percentEl) percentEl.textContent = Math.round(percent) + "%";
}

function refreshTracker() {
  const sleep    = document.getElementById("sleepHours").value;
  const study    = document.getElementById("studyHours").value;
  const activity = document.getElementById("activityHours").value;
  const usage    = document.getElementById("dailyUsage").value;
  const unlocks  = document.getElementById("dailyUnlocks").value;
  const stress   = document.getElementById("stressLevel").value;

  trackSleep.textContent    = formatHours(sleep);
  trackStudy.textContent    = formatHours(study);
  trackActivity.textContent = formatHours(activity);
  trackUsage.textContent    = formatHours(usage);
  trackUnlocks.textContent  = unlocks === "" ? "\u2014" : unlocks;
  trackStress.textContent   = stress === "" ? "\u2014" : stress;

  updateBar(fillSleep, fillSleepPercent, sleep, HOUR_FIELD_MAX);
  updateBar(fillStudy, fillStudyPercent, study, HOUR_FIELD_MAX);
  updateBar(fillActivity, fillActivityPercent, activity, HOUR_FIELD_MAX);
  updateBar(fillUsage, fillUsagePercent, usage, HOUR_FIELD_MAX);
}

["sleepHours", "studyHours", "activityHours", "dailyUsage", "dailyUnlocks"].forEach((id) => {
  document.getElementById(id).addEventListener("input", refreshTracker);
});
document.getElementById("stressLevel").addEventListener("change", refreshTracker);

/* ---------- 5. Validation ---------- */
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + "-error");
  if (input) input.classList.add("invalid");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + "-error");
  if (input) input.classList.remove("invalid");
  if (errorEl) errorEl.textContent = "";
}

function clearAllErrors() {
  const allFieldIds = [
    "age", "gender", "country", "academicLevel",
    "platform", "purpose", "dailyUsage", "dailyUnlocks",
    "studyHours", "activityHours", "sleepHours", "stressLevel",
  ];
  allFieldIds.forEach(clearFieldError);
  formErrorEl.hidden = true;
  formErrorEl.textContent = "";
}

function validateForm() {
  clearAllErrors();
  let isValid = true;

  REQUIRED_SELECTS.forEach((fieldId) => {
    const value = document.getElementById(fieldId).value;
    if (!value) {
      setFieldError(fieldId, "Required.");
      isValid = false;
    }
  });

  Object.entries(NUMERIC_RULES).forEach(([fieldId, rule]) => {
    const raw = document.getElementById(fieldId).value;
    if (raw === "") {
      setFieldError(fieldId, "Required.");
      isValid = false;
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      setFieldError(fieldId, "Invalid number.");
      isValid = false;
      return;
    }
    if (rule.integer && !Number.isInteger(value)) {
      setFieldError(fieldId, "Whole number only.");
      isValid = false;
      return;
    }
    if (value < rule.min || (rule.max !== null && value > rule.max)) {
      const rangeText = rule.max !== null ? `${rule.min}\u2013${rule.max}` : `${rule.min}+`;
      setFieldError(fieldId, `Range: ${rangeText}.`);
      isValid = false;
    }
  });

  return isValid;
}

/* ---------- 6. API request ---------- */
async function predictScore(payload) {
  const response = await fetch(API_BASE_URL + "/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = new Error("Request failed");
    error.status = response.status;
    try {
      error.body = await response.json();
    } catch (_) {
      error.body = null;
    }
    throw error;
  }

  return response.json();
}

/* ---------- 7. Loading state ---------- */
function setStatus(state) {
  statusDot.classList.remove("busy", "error", "done");
  if (state === "ready") {
    statusText.textContent = "AI Model Online";
  } else if (state === "busy") {
    statusDot.classList.add("busy");
    statusText.textContent = "Analyzing";
  } else if (state === "done") {
    statusDot.classList.add("done");
    statusText.textContent = "Prediction Complete";
  } else if (state === "error") {
    statusDot.classList.add("error");
    statusText.textContent = "Connection Error";
  }
}

function showLoading() {
  submitBtn.disabled = true;
  btnLabel.textContent = "Analyzing your inputs\u2026";
  btnSpinner.hidden = false;
  errorInline.hidden = true;
  resultActions.hidden = true;
  interpEl.hidden = true;
  liveCaption.textContent = "Processing your inputs\u2026";
  scoreCaption.textContent = "Analyzing inputs";
  scoreValueEl.textContent = "\u2013\u2013";
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
  setStatus("busy");
}

function hideLoading() {
  submitBtn.disabled = false;
  btnSpinner.hidden = true;
}

/* ---------- 8. Result rendering ---------- */
function getInterpretation(score) {
  if (score < 3)   return { label: "Needs Attention", cls: "attention" };
  if (score < 5)   return { label: "Below Average",   cls: "below" };
  if (score < 7)   return { label: "Moderate",        cls: "moderate" };
  if (score < 8.5) return { label: "Good",            cls: "good" };
  return { label: "Excellent", cls: "excellent" };
}

function animateScoreNumber(target) {
  if (REDUCE_MOTION) {
    scoreValueEl.textContent = target.toFixed(2);
    return;
  }
  const duration = 700;
  const start = performance.now();

  function tick(now) {
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    scoreValueEl.textContent = (target * eased).toFixed(2);
    if (elapsed < 1) requestAnimationFrame(tick);
    else scoreValueEl.textContent = target.toFixed(2);
  }
  requestAnimationFrame(tick);
}

function showResult(score) {
  setStatus("done");
  liveCaption.textContent = "Your assessment is complete.";
  scoreCaption.textContent = "Prediction complete";

  animateScoreNumber(score);

  const clamped = Math.max(0, Math.min(SCORE_SCALE_MAX, score));
  const percent = clamped / SCORE_SCALE_MAX;
  const offset = RING_CIRCUMFERENCE * (1 - percent);
  ringProgress.style.strokeDashoffset = offset;

  const interp = getInterpretation(clamped);
  interpBadgeEl.textContent = interp.label;
  interpBadgeEl.className = "score-interp-badge " + interp.cls;
  interpEl.hidden = false;

  resultActions.hidden = false;
  btnLabel.textContent = "Recalculate Score \u2192";
}

/* ---------- 9. Error handling ---------- */
function describeError(error) {
  if (!error.status) {
    return {
      title: "Prediction service unavailable",
      message: "Make sure the FastAPI server is running on port 8000 and try again.",
    };
  }
  if (error.status === 422) {
    return {
      title: "Input rejected by server",
      message: "Please double-check the highlighted fields and try again.",
    };
  }
  if (error.status >= 500) {
    return {
      title: "Server error",
      message: "The prediction server ran into a problem. Please try again in a moment.",
    };
  }
  return {
    title: "Something went wrong",
    message: "The prediction could not be completed. Please try again.",
  };
}

function showError(error) {
  const { title, message } = describeError(error);
  errorTitleEl.textContent = title;
  errorTextEl.textContent = message;
  errorInline.hidden = false;
  resultActions.hidden = true;
  interpEl.hidden = true;

  setStatus("error");
  liveCaption.textContent = "Complete the inputs to generate your behavioral score.";
  scoreCaption.textContent = "Connection error";
  scoreValueEl.textContent = "\u2013\u2013";
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
  btnLabel.textContent = "Calculate My Score \u2192";
}

/* ---------- 10. Reset / Recalculate ---------- */
function resetLivePanel() {
  errorInline.hidden = true;
  resultActions.hidden = true;
  interpEl.hidden = true;
  liveCaption.textContent = "Complete the inputs to generate your behavioral score.";
  scoreCaption.textContent = "Awaiting input";
  scoreValueEl.textContent = "\u2013\u2013";
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
  setStatus("ready");
}

function resetForm() {
  form.reset();
  clearAllErrors();
  countryOtherRow.hidden = true;
  refreshTracker();
  resetLivePanel();
  btnLabel.textContent = "Calculate My Score \u2192";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

recalcBtn.addEventListener("click", () => {
  document.querySelector(".panel-inputs").scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("age").focus();
});

resetBtn.addEventListener("click", resetForm);

errorRetryBtn.addEventListener("click", () => {
  errorInline.hidden = true;
  setStatus("ready");
  scoreCaption.textContent = "Awaiting input";
  document.querySelector(".panel-inputs").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------- Submit ---------- */
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    formErrorEl.hidden = false;
    formErrorEl.textContent = "Please fix the highlighted fields above.";
    return;
  }

  const payload = getFormData();
  showLoading();

  try {
    const data = await predictScore(payload);
    showResult(data.predicted_mental_health_score);
  } catch (error) {
    showError(error);
  } finally {
    hideLoading();
  }
});

/* ---------- Init ---------- */
refreshTracker();
