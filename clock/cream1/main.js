const STORAGE_KEY = "clockface-ink.settings.v1";

const DEFAULTS = {
  analog: false,
  is24h: false,
  showSeconds: true,
  showDate: true,
  scale: 0.9,
  opacity: 0.3,
  blur: 8,
  cornerRadius: 20,
  text: "#2c1810",
  accent: "#c41e3a",
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      scale: clamp(Number(parsed.scale ?? DEFAULTS.scale), 0.5, 2.5),
      opacity: clamp(Number(parsed.opacity ?? DEFAULTS.opacity), 0, 1),
      blur: clamp(Number(parsed.blur ?? DEFAULTS.blur), 0, 30),
      cornerRadius: clamp(Number(parsed.cornerRadius ?? DEFAULTS.cornerRadius), 0, 120),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyTheme(settings) {
  const root = document.documentElement;
  root.style.setProperty("--scale", String(settings.scale));
  root.style.setProperty("--panel-opacity", String(settings.opacity));
  root.style.setProperty("--panel-blur", `${settings.blur}px`);
  root.style.setProperty("--panel-radius", `${settings.cornerRadius}px`);
  root.style.setProperty("--text", settings.text);
  root.style.setProperty("--accent", settings.accent);
}

function formatTime(now, settings) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: settings.showSeconds ? "2-digit" : undefined,
    hour12: !settings.is24h,
  }).format(now);
}

function formatDate(now) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(now);
}

function nextBoundaryDelayMs(now, settings) {
  if (settings.showSeconds) {
    return 1000 - now.getMilliseconds();
  }
  return (60 - now.getSeconds()) * 1000 + (1000 - now.getMilliseconds());
}

// Paint splash effect generator
function generatePaintSplash(canvas, color, opacity) {
  const ctx = canvas.getContext("2d");
  const centerX = Math.random() * canvas.width;
  const centerY = Math.random() * canvas.height;
  const splashRadius = 20 + Math.random() * 40;
  const particleCount = 15 + Math.floor(Math.random() * 25);

  ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const distance = Math.random() * splashRadius;
    const particleX = centerX + Math.cos(angle) * distance;
    const particleY = centerY + Math.sin(angle) * distance;
    const particleSize = Math.random() * 4 + 1;
    
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main splash circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, splashRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSplashBackground(canvas, settings) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Convert hex to rgb
  const textRgb = hexToRgb(settings.text);
  const accentRgb = hexToRgb(settings.accent);
  
  const textColor = `rgb(${textRgb.r}, ${textRgb.g}, ${textRgb.b})`;
  const accentColor = `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
  
  // Generate random splashes
  for (let i = 0; i < 3; i++) {
    generatePaintSplash(canvas, textColor, 0.15);
  }
  for (let i = 0; i < 2; i++) {
    generatePaintSplash(canvas, accentColor, 0.12);
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function drawHand(ctx, cx, cy, angle, length, width, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawAnalogClock(canvas, settings) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 12;

  ctx.clearRect(0, 0, W, H);

  const now = new Date();
  const hh = now.getHours() % 12;
  const mm = now.getMinutes();
  const ss = now.getSeconds();
  const ms = now.getMilliseconds();

  const secFrac = ss + ms / 1000;
  const minFrac = mm + secFrac / 60;
  const hrFrac  = hh + minFrac / 60;

  const secAngle = (secFrac / 60) * Math.PI * 2 - Math.PI / 2;
  const minAngle = (minFrac / 60) * Math.PI * 2 - Math.PI / 2;
  const hrAngle  = (hrFrac  / 12) * Math.PI * 2 - Math.PI / 2;

  const textColor   = settings.text;
  const accentColor = settings.accent;

  // Draw hour markers with ink brush style
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const outerR = R - 3;
    const innerR = outerR - (isMajor ? 14 : 6);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.lineTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.strokeStyle = textColor;
    ctx.lineWidth   = isMajor ? 2.5 : 1.2;
    ctx.lineCap     = "round";
    ctx.globalAlpha = isMajor ? 0.85 : 0.35;
    ctx.stroke();
    ctx.restore();
  }

  // Draw hands
  drawHand(ctx, cx, cy, hrAngle,  R * 0.50, 5, textColor);
  drawHand(ctx, cx, cy, minAngle, R * 0.72, 3.5, textColor);

  if (settings.showSeconds) {
    drawHand(ctx, cx, cy, secAngle, R * 0.82, 2, accentColor);
  }

  // Draw center dot with ink style
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(242, 235, 225, 0.8)";
  ctx.fill();
}

window.addEventListener("DOMContentLoaded", () => {
  const widgetEl       = document.getElementById("widget");
  const timeEl         = document.getElementById("time");
  const dateEl         = document.getElementById("date");
  const analogCanvas   = document.getElementById("clockAnalog");
  const splashCanvas   = document.getElementById("splashCanvas");

  const settingsPanel  = document.getElementById("settings");
  const settingsToggle = document.getElementById("settingsToggle");
  const closeSettings  = document.getElementById("closeSettings");

  const optAnalog       = document.getElementById("optAnalog");
  const opt24h          = document.getElementById("opt24h");
  const optSeconds      = document.getElementById("optSeconds");
  const optDate         = document.getElementById("optDate");
  const optScale        = document.getElementById("optScale");
  const optOpacity      = document.getElementById("optOpacity");
  const optBlur         = document.getElementById("optBlur");
  const optCornerRadius = document.getElementById("optCornerRadius");
  const optText         = document.getElementById("optText");
  const optAccent       = document.getElementById("optAccent");
  const resetBtn        = document.getElementById("reset");

  const ALL_CONTROLS = [
    optAnalog, opt24h, optSeconds, optDate,
    optScale, optOpacity, optBlur, optCornerRadius,
    optText, optAccent,
  ];

  let settings = loadSettings();
  applyTheme(settings);
  drawSplashBackground(splashCanvas, settings);

  function openSettingsPanel() {
    settingsPanel.hidden = false;
    widgetEl.classList.add("settings-open");
    settingsToggle.setAttribute("aria-label", "Close settings");
  }

  function closeSettingsPanel() {
    settingsPanel.hidden = true;
    widgetEl.classList.remove("settings-open");
    settingsToggle.setAttribute("aria-label", "Open settings");
  }

  function toggleSettings() {
    if (settingsPanel.hidden) openSettingsPanel();
    else closeSettingsPanel();
  }

  settingsToggle.addEventListener("click", toggleSettings);
  closeSettings.addEventListener("click", closeSettingsPanel);

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === ",") { e.preventDefault(); toggleSettings(); }
    if (e.key === "Escape" && !settingsPanel.hidden) { e.preventDefault(); closeSettingsPanel(); }
    if ((e.key === "b" || e.key === "B") && !e.ctrlKey && !e.altKey && !e.metaKey) {
      document.body.classList.toggle("bg-visible");
    }
  });

  function syncControlsFromSettings() {
    optAnalog.checked     = Boolean(settings.analog);
    opt24h.checked        = Boolean(settings.is24h);
    optSeconds.checked    = Boolean(settings.showSeconds);
    optDate.checked       = Boolean(settings.showDate);
    optScale.value        = String(settings.scale);
    optOpacity.value      = String(settings.opacity);
    optBlur.value         = String(settings.blur);
    optCornerRadius.value = String(settings.cornerRadius);
    optText.value         = settings.text;
    optAccent.value       = settings.accent;
  }

  function updateSettingsFromControls() {
    settings = {
      ...settings,
      analog:      optAnalog.checked,
      is24h:       opt24h.checked,
      showSeconds: optSeconds.checked,
      showDate:    optDate.checked,
      scale:       Number(optScale.value),
      opacity:     Number(optOpacity.value),
      blur:        Number(optBlur.value),
      cornerRadius: Number(optCornerRadius.value),
      text:        optText.value,
      accent:      optAccent.value,
    };
    applyTheme(settings);
    saveSettings(settings);
    drawSplashBackground(splashCanvas, settings);
    applyAnalogMode();
    render();
    if (!settings.analog) scheduleTick();
  }

  for (const el of ALL_CONTROLS) {
    el.addEventListener("input",  updateSettingsFromControls);
    el.addEventListener("change", updateSettingsFromControls);
  }

  resetBtn.addEventListener("click", () => {
    settings = { ...DEFAULTS };
    saveSettings(settings);
    applyTheme(settings);
    syncControlsFromSettings();
    drawSplashBackground(splashCanvas, settings);
    applyAnalogMode();
    render();
    if (!settings.analog) scheduleTick();
  });

  syncControlsFromSettings();

  let rafId = null;

  function startAnalogLoop() {
    if (rafId !== null) return;
    function loop() {
      drawAnalogClock(analogCanvas, settings);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopAnalogLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function applyAnalogMode() {
    if (settings.analog) {
      widgetEl.classList.add("analog");
      stopTick();
      startAnalogLoop();
    } else {
      widgetEl.classList.remove("analog");
      stopAnalogLoop();
    }
  }

  let tickTimer = null;

  function stopTick() {
    if (tickTimer !== null) {
      window.clearTimeout(tickTimer);
      tickTimer = null;
    }
  }

  function scheduleTick() {
    stopTick();
    const now   = new Date();
    const delay = nextBoundaryDelayMs(now, settings);
    tickTimer = window.setTimeout(() => {
      render();
      scheduleTick();
    }, delay);
  }

  function render() {
    const now = new Date();
    timeEl.textContent = formatTime(now, settings);
    if (settings.showDate) {
      dateEl.textContent = formatDate(now);
      dateEl.hidden = false;
    } else {
      dateEl.textContent = "";
      dateEl.hidden = true;
    }
    if (settings.analog) {
      drawAnalogClock(analogCanvas, settings);
    }
  }

  applyAnalogMode();
  render();
  if (!settings.analog) scheduleTick();
});
