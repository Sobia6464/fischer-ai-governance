/* chart-setup.js — Chart.js configuration, data definitions, custom plugins
   Space-themed — full-screen galaxy map visualization */

const DEFAULT_COMPANIES = [
  {
    label: "OpenClaw", x: 92, y: 92, gov: 2, type: "tool", active: false, notes: "",
    gaps: ["No built-in analytics or KPIs", "Agent sharing requires manual effort", "Behavior not lockable without code changes"]
  },
  {
    label: "Web Scraper (Custom)", x: 82, y: 78, gov: 3, type: "tool", active: true, notes: "Built internally by IT team",
    gaps: ["Custom instrumentation needed for metrics", "No department-wide config management", "Hard to replicate across teams"]
  },
  {
    label: "Claude Code", x: 75, y: 72, gov: 2, type: "tool", active: false, notes: "",
    gaps: ["Highly individual, no standardization surface", "No usage analytics for IT", "Each user configures independently"]
  },
  {
    label: "ChatGPT Codex", x: 68, y: 70, gov: 2, type: "tool", active: false, notes: "",
    gaps: ["Developer-scoped, not IT-governed", "No org-level behavior controls", "Usage invisible to IT by default"]
  },
  {
    label: "CrewAI", x: 63, y: 82, gov: 2, type: "tool", active: false, notes: "",
    gaps: ["No built-in KPIs or dashboards", "Agent sharing is code-level", "Requires custom observability stack"]
  },
  {
    label: "Claude Cowork", x: 88, y: 38, gov: 6, type: "tool", active: false, notes: "",
    gaps: ["Some org config, but analytics limited", "Agent sharing still maturing"]
  },
  {
    label: "Glean", x: 90, y: 14, gov: 9, type: "tool", active: false, notes: "",
    gaps: []
  },
  {
    label: "Claude for Excel", x: 65, y: 28, gov: 8, type: "tool", active: true, notes: "Deployed to Finance and Accounting teams",
    gaps: ["Analytics surface still maturing"]
  },
  {
    label: "Claude for PowerPoint", x: 65, y: 22, gov: 8, type: "tool", active: true, notes: "Used for board deck automation",
    gaps: ["Analytics surface still maturing"]
  },
  {
    label: "ChatGPT Agent Mode", x: 55, y: 12, gov: 7, type: "tool", active: false, notes: "",
    gaps: ["Agent sharing not yet enterprise-grade"]
  },
  {
    label: "Meta Llama", x: 16, y: 86, gov: 1, type: "model", active: false, notes: "",
    gaps: ["Self-hosted, fully custom \u2014 zero governance tooling", "No analytics, no behavior locks", "IT owns everything including the gaps"]
  },
  {
    label: "GPT 5.4 (API)", x: 30, y: 76, gov: 3, type: "model", active: false, notes: "",
    gaps: ["API access, minimal org-level controls", "Usage tracking requires custom build", "No native KPI surface"]
  },
  {
    label: "ChatGPT 3.5", x: 22, y: 38, gov: 8, type: "model", active: false, notes: "",
    gaps: []
  },
];

// Load from localStorage or use defaults
var COMPANIES = (function() {
  try {
    const saved = localStorage.getItem('fischer-gov-data');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_COMPANIES));
})();

function saveData() {
  try { localStorage.setItem('fischer-gov-data', JSON.stringify(COMPANIES)); } catch(e) {}
  updateActiveBadge();
  showSaveToast();
}

function showSaveToast() {
  let toast = document.getElementById('save-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'save-toast';
    toast.className = 'save-toast';
    toast.textContent = 'Auto-saved';
    document.body.appendChild(toast);
  }
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 1500);
}

function updateActiveBadge() {
  const activeNames = COMPANIES.filter(p => p.active).map(p => p.label);
  const badge = document.querySelector('.active-badge');
  if (badge) badge.textContent = activeNames.length
    ? 'Fischer Active: ' + activeNames.join(' \u00B7 ')
    : 'No Fischer Active tools';
}

function govColor(score) {
  if (score <= 3) return "#7a8098";
  if (score <= 6) return "#ffb020";
  return "#00e8a2";
}

function govLabel(score) {
  if (score <= 2) return "Very Low";
  if (score <= 4) return "Low";
  if (score <= 6) return "Medium";
  if (score <= 8) return "High";
  return "Very High";
}

function getQuadrant(p) {
  if (p.x > 50 && p.y > 50) return "tr";
  if (p.x <= 50 && p.y > 50) return "tl";
  if (p.x > 50 && p.y <= 50) return "br";
  return "bl";
}

function isItemVisible(p, fs) {
  if (p.gov < (fs.governanceMin || 1)) return false;
  if (fs.fischerActiveOnly && !p.active) return false;
  if (fs.typeFilter && fs.typeFilter !== 'all' && p.type !== fs.typeFilter) return false;
  if (fs.quadrantFilter && fs.quadrantFilter !== 'all' && getQuadrant(p) !== fs.quadrantFilter) return false;
  if (fs.complexityFilter && fs.complexityFilter !== 'all') {
    const isHigh = p.y > 50;
    if (fs.complexityFilter === 'high' && !isHigh) return false;
    if (fs.complexityFilter === 'low' && isHigh) return false;
  }
  return true;
}

function buildDatasets(mode, filterState) {
  return COMPANIES.map((p, i) => {
    const isTool = p.type === "tool";
    const baseColor = isTool ? "#00e8a2" : "#7b8ab8";
    const color = p.active ? "#4d9fff" : baseColor;

    // 3D depth: governance score determines Z-depth
    // High gov = close (large, bright), Low gov = far (small, dim)
    const depthFactor = 0.4 + (p.gov / 10) * 0.6; // 0.4 (far) to 1.0 (close)
    let r = (mode === "size") ? (4 + p.gov * 2.2) : (5 + depthFactor * 6);

    let visible = isItemVisible(p, filterState);

    const alphaBase = visible ? (0.5 + depthFactor * 0.4) : 0.08;
    const alphaHex = Math.round(alphaBase * 255).toString(16).padStart(2, '0');

    return {
      label: p.label,
      data: [{ x: p.x, y: p.y }],
      backgroundColor: color + alphaHex,
      borderColor: p.active ? "#80bfff" : color,
      borderWidth: p.active ? 2.5 : (0.8 + depthFactor * 1.2),
      pointRadius: r,
      pointHoverRadius: r + 4,
      pointStyle: 'circle',
      _meta: p,
      _index: i,
      _visible: visible,
      _depth: depthFactor,
    };
  });
}

/* quadPlugin — draws quadrant backgrounds, grid, axis labels, and models line */
const quadPlugin = {
  id: "quads",
  beforeDraw(ch) {
    const ctx = ch.ctx;
    const area = ch.chartArea;
    if (!area) return;
    const mx = ch.scales.x.getPixelForValue(50);
    const my = ch.scales.y.getPixelForValue(50);

    // Four distinct quadrant backgrounds
    ctx.save();
    // Top-left: Technical Assistants — warm pink
    ctx.fillStyle = "rgba(255, 50, 80, 0.04)";
    ctx.fillRect(area.left, area.top, mx - area.left, my - area.top);
    // Top-right: Custom-Built Agents — stronger pink/red
    ctx.fillStyle = "rgba(255, 50, 80, 0.07)";
    ctx.fillRect(mx, area.top, area.right - mx, my - area.top);
    // Bottom-left: Simple Chat Assistants — cool green
    ctx.fillStyle = "rgba(0, 232, 162, 0.03)";
    ctx.fillRect(area.left, my, mx - area.left, area.bottom - my);
    // Bottom-right: No-Code Agentic Tools — stronger green
    ctx.fillStyle = "rgba(0, 232, 162, 0.06)";
    ctx.fillRect(mx, my, area.right - mx, area.bottom - my);
    ctx.restore();

    // ─── Fischer Group Sun at center — animated with solar flares ───
    const sunTime = typeof animState !== 'undefined' ? animState.time : Date.now();
    ctx.save();

    // Pulsing corona
    const coronaPulse = 0.9 + Math.sin(sunTime / 2000) * 0.1;
    const corona3 = ctx.createRadialGradient(mx, my, 0, mx, my, 85 * coronaPulse);
    corona3.addColorStop(0, 'rgba(255, 180, 50, 0.07)');
    corona3.addColorStop(0.4, 'rgba(255, 140, 30, 0.025)');
    corona3.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(mx, my, 85 * coronaPulse, 0, Math.PI * 2);
    ctx.fillStyle = corona3; ctx.fill();

    // Inner glow
    const corona2 = ctx.createRadialGradient(mx, my, 0, mx, my, 35);
    corona2.addColorStop(0, 'rgba(255, 200, 80, 0.2)');
    corona2.addColorStop(0.6, 'rgba(255, 160, 40, 0.06)');
    corona2.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(mx, my, 35, 0, Math.PI * 2);
    ctx.fillStyle = corona2; ctx.fill();

    // Rotating sun core
    const coreShift = Math.sin(sunTime / 3000) * 2;
    const sunCore = ctx.createRadialGradient(mx + coreShift, my - 1, 0, mx, my, 14);
    sunCore.addColorStop(0, 'rgba(255, 250, 220, 0.92)');
    sunCore.addColorStop(0.4, 'rgba(255, 200, 70, 0.65)');
    sunCore.addColorStop(0.8, 'rgba(255, 160, 40, 0.25)');
    sunCore.addColorStop(1, 'rgba(255, 130, 20, 0.08)');
    ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fillStyle = sunCore; ctx.fill();

    // Label
    ctx.fillStyle = "rgba(255, 220, 150, 0.65)";
    ctx.font = "600 11px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("THE FISCHER GROUP", mx, my + 28);
    ctx.restore();

    // Divider lines — glowing blue
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "rgba(100, 160, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, area.top); ctx.lineTo(mx, area.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(area.left, my); ctx.lineTo(area.right, my); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Models enabler line
    ctx.save();
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
    ctx.lineWidth = 1;
    const lineY = ch.scales.y.getPixelForValue(52);
    ctx.beginPath(); ctx.moveTo(area.left + 30, lineY); ctx.lineTo(area.right, lineY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(175, 195, 230, 0.35)";
    ctx.font = "11px 'DM Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("MODELS (Enablers): ChatGPT 3.5 \u00B7 Meta Llama \u00B7 GPT 5.4 \u00B7 Claude Opus 4.5 \u2014 power both Assistants & Agents", area.left + 34, lineY - 6);
    ctx.restore();
  }
};

/* labelPlugin — renders dot labels with outline, depth, and subtle alive pulse */
const labelPlugin = {
  id: "labels",
  afterDatasetsDraw(ch) {
    const ctx = ch.ctx;
    const time = typeof animState !== 'undefined' ? animState.time : Date.now();

    ch.data.datasets.forEach((ds, i) => {
      const meta = ch.getDatasetMeta(i);
      const pt = meta.data[0];
      if (!pt) return;
      const p = ds._meta;
      const visible = ds._visible;
      const depth = ds._depth || 0.5;
      const fontSize = 11 + depth * 3;

      // Subtle alive pulse — each label breathes slightly
      const breathe = Math.sin(time / 2000 + i * 0.7) * 0.08;

      ctx.save();
      ctx.globalAlpha = visible ? (0.5 + depth * 0.5 + breathe) : 0.08;
      ctx.font = `${p.active ? "700" : "600"} ${fontSize}px 'Syne', sans-serif`;
      ctx.textAlign = "center";

      const labelY = pt.y - (14 + depth * 6);

      // Dark outline/stroke for readability against any background
      ctx.strokeStyle = "rgba(3, 5, 16, 0.7)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText(p.label, pt.x, labelY);

      // Fill with glow
      if (p.active) {
        ctx.fillStyle = "#80bfff";
        ctx.shadowColor = "rgba(77, 159, 255, 0.6)";
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = `rgba(215, 225, 248, ${0.55 + depth * 0.35})`;
        ctx.shadowColor = `rgba(100, 160, 255, ${0.08 + depth * 0.06})`;
        ctx.shadowBlur = 6;
      }
      ctx.fillText(p.label, pt.x, labelY);
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }
};

/* govRingPlugin — governance rings with space glow effects */
function createGovRingPlugin(getAnimState) {
  return {
    id: "govRings",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      const animState = getAnimState();

      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (!meta.visible) return;
        const pt = meta.data[0];
        if (!pt) return;
        const p = ds._meta;
        const visible = ds._visible;
        const gc = govColor(p.gov);
        const mode = animState.currentMode;

        const pulseDuration = 2000 - (p.gov / 10) * 1500;
        const pulsePhase = ((animState.time % pulseDuration) / pulseDuration) * Math.PI * 2;
        const pulse = Math.sin(pulsePhase) * 0.5 + 0.5;

        ctx.save();
        ctx.globalAlpha = visible ? 1 : 0.06;

        if (mode === "ring") {
          // Outer pulsing ring
          const baseR = 12 + p.gov * 2.2;
          const ringR = baseR + pulse * 5;
          const alpha = 0.3 + pulse * 0.3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = gc;
          ctx.lineWidth = 1.5 + pulse * 0.5;
          ctx.globalAlpha *= alpha;
          ctx.stroke();

          // Inner glow halo
          if (p.gov >= 5) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ringR * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = gc;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = visible ? 0.1 + pulse * 0.08 : 0.02;
            ctx.stroke();
          }
        } else if (mode === "glow") {
          // Aggressive halo — strong glow that scales dramatically with governance
          const govIntensity = p.gov / 10;
          const alpha = 0.1 + govIntensity * 0.4 + pulse * 0.15;
          const radius = 14 + p.gov * 4.5 + pulse * 6;
          // Multi-layer glow for intensity
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
          grad.addColorStop(0, gc);
          grad.addColorStop(0.3, gc);
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.globalAlpha *= alpha;
          ctx.fill();
        } else if (mode === "size") {
          const ringR = 12 + p.gov * 1.8 + pulse * 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = gc;
          ctx.lineWidth = 1;
          ctx.globalAlpha *= 0.15 + pulse * 0.1;
          ctx.stroke();
        }

        ctx.restore();
      });
    }
  };
}

function createChart(canvasEl, mode, filterState, animStateGetter) {
  const chart = new Chart(canvasEl, {
    type: "bubble",
    data: { datasets: buildDatasets(mode, filterState) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 100, right: 80, bottom: 100, left: 80 } },
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: "rgba(100, 160, 255, 0.03)", lineWidth: 0.5 },
          border: { color: "rgba(100, 160, 255, 0.06)" }
        },
        y: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: "rgba(100, 160, 255, 0.03)", lineWidth: 0.5 },
          border: { color: "rgba(100, 160, 255, 0.06)" }
        }
      },
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
    },
    plugins: [quadPlugin, createGovRingPlugin(animStateGetter), labelPlugin]
  });
  return chart;
}
