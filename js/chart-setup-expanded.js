/* chart-setup-expanded.js — Expanded dataset: original 13 Fischer tools + 46 suggested tools from landscape research
   Drop-in replacement for chart-setup.js — uses a separate localStorage key so it never conflicts with the original.
   Space-themed — full-screen galaxy map visualization */

const DEFAULT_COMPANIES = [

  // ── ORIGINAL FISCHER GROUP TOOLS (13) ────────────────────────────────────
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

  // ── SUGGESTED TOOLS FROM LANDSCAPE RESEARCH (46) ────────────────────────

  // Models / Infrastructure
  {
    label: "Claude Opus 4.5 (API)", x: 26, y: 70, gov: 3, type: "model", active: false,
    notes: "Anthropic's most capable reasoning model; used as backbone for agentic pipelines and deep analysis tasks",
    gaps: ["No org-level admin controls", "Usage requires custom logging", "No built-in data retention or behavior lockdown"]
  },
  {
    label: "GPT-4o (API)", x: 24, y: 72, gov: 3, type: "model", active: false,
    notes: "OpenAI flagship multimodal model handling text/vision/audio; widely used backbone for custom agents and apps",
    gaps: ["API-only; usage monitoring requires custom build", "No org-level behavior controls or policy enforcement"]
  },
  {
    label: "Gemini 1.5 Pro (API)", x: 22, y: 68, gov: 3, type: "model", active: false,
    notes: "Google long-context model (1M+ token window); suited for document-heavy and multi-file analysis workflows",
    gaps: ["Requires GCP project setup", "No native enterprise governance layer", "Usage tracking is manual"]
  },
  {
    label: "Mistral Large (API)", x: 20, y: 62, gov: 3, type: "model", active: false,
    notes: "European frontier model with data residency options; strong reasoning and code generation capabilities",
    gaps: ["Governance depends on hosting choice", "No built-in IT admin controls in SaaS mode", "Limited enterprise support tier"]
  },
  {
    label: "DeepSeek R1", x: 10, y: 92, gov: 1, type: "model", active: false,
    notes: "Open-weight Chinese reasoning model with strong math and code; can be deployed fully on-premise for data privacy",
    gaps: ["Fully self-hosted; zero native governance", "Data sovereignty concerns", "IT owns every layer including all gaps"]
  },
  {
    label: "Llama 3.3 (self-hosted)", x: 15, y: 90, gov: 1, type: "model", active: false,
    notes: "Meta latest open-weight model; capable on modern hardware; used for private on-prem or air-gapped deployments",
    gaps: ["Full IT ownership required; no vendor SLA or support", "No analytics, no behavior locks"]
  },

  // Agent Frameworks (high code / high agent)
  {
    label: "LangChain", x: 85, y: 88, gov: 2, type: "tool", active: false,
    notes: "Python framework for building LLM-powered applications and multi-step agents; most widely adopted agent starting point",
    gaps: ["No built-in observability", "Governance must be built from scratch", "Requires dedicated engineering to maintain"]
  },
  {
    label: "LangGraph", x: 88, y: 90, gov: 2, type: "tool", active: false,
    notes: "Graph-based stateful agent orchestration built on LangChain; handles complex looping and branching agentic workflows",
    gaps: ["Same governance gaps as LangChain", "LangSmith required for observability at additional cost"]
  },
  {
    label: "AutoGen (Microsoft)", x: 82, y: 86, gov: 2, type: "tool", active: false,
    notes: "Microsoft Research multi-agent framework enabling autonomous collaborative agent conversations and task delegation",
    gaps: ["No production governance tooling included", "Agent behavior hard to audit", "Requires dedicated engineering support"]
  },
  {
    label: "LlamaIndex", x: 78, y: 84, gov: 2, type: "tool", active: false,
    notes: "RAG-focused framework for connecting LLMs to enterprise data sources; commonly paired with LangChain",
    gaps: ["Governance requires fully custom implementation", "No built-in RBAC or audit logs", "Ingestion pipeline complexity"]
  },
  {
    label: "Cursor (Team)", x: 58, y: 80, gov: 3, type: "tool", active: false,
    notes: "AI-first IDE with aggressive agent mode capable of autonomously editing multiple files and running terminal commands",
    gaps: ["Each user configures independently", "No IT admin dashboard", "Agent behavior not lockable without explicit org policy"]
  },

  // Mid-code / visual builders
  {
    label: "Flowise", x: 70, y: 60, gov: 3, type: "tool", active: false,
    notes: "Open-source visual LangChain builder with drag-and-drop interface; reduces coding overhead for agent workflow construction",
    gaps: ["No enterprise SSO or RBAC out of box", "Self-hosted required for data control", "Limited enterprise support"]
  },
  {
    label: "Dify", x: 68, y: 50, gov: 4, type: "tool", active: false,
    notes: "Open-source LLMOps platform with visual workflow builder and RAG pipeline support; faster than full-code frameworks",
    gaps: ["Self-hosted required for data privacy", "Limited enterprise support tier", "Governance must be layered on"]
  },
  {
    label: "n8n (AI nodes)", x: 65, y: 45, gov: 4, type: "tool", active: false,
    notes: "Low-code workflow automation with native AI/LLM nodes; bridges traditional automation and emerging agentic patterns",
    gaps: ["Self-hosted model limits IT visibility", "Limited compliance certifications", "Behavior auditing requires manual configuration"]
  },

  // Developer / cloud coding tools
  {
    label: "GitHub Copilot Biz", x: 42, y: 75, gov: 6, type: "tool", active: false,
    notes: "AI pair programmer integrated into VS Code, JetBrains, and other IDEs; measurably accelerates developer output",
    gaps: ["Developer-focused governance only", "Limited IT admin surface", "Usage analytics require Copilot dashboard access"]
  },
  {
    label: "Amazon Q Developer", x: 40, y: 70, gov: 7, type: "tool", active: false,
    notes: "AWS AI coding assistant with enterprise security scanning, automated code reviews, and native AWS service integration",
    gaps: ["Deeper value within AWS ecosystem", "Governance tied to IAM and AWS account structure", "Limited outside AWS workloads"]
  },
  {
    label: "Tabnine Enterprise", x: 38, y: 72, gov: 6, type: "tool", active: false,
    notes: "AI code completion with on-premise model deployment option; strong governance story for data-sensitive environments",
    gaps: ["Smaller model than Copilot or Cursor", "Less capable on complex tasks", "On-prem governance advantage trades off against capability"]
  },

  // Cloud AI platforms / infrastructure
  {
    label: "Azure OpenAI Service", x: 32, y: 60, gov: 8, type: "tool", active: false,
    notes: "Microsoft enterprise API access to GPT-4o and other models with M365-aligned data governance and private endpoints",
    gaps: ["Requires Azure subscription and technical engineering setup", "Model costs managed separately from M365 licensing"]
  },
  {
    label: "AWS Bedrock", x: 38, y: 62, gov: 7, type: "tool", active: false,
    notes: "AWS managed API for multiple foundation models including Anthropic Claude, Llama, and Amazon Titan; pay-per-use",
    gaps: ["Requires AWS expertise", "Governance tooling varies per model provider", "Multi-model management adds operational complexity"]
  },
  {
    label: "Google Vertex AI", x: 30, y: 60, gov: 7, type: "tool", active: false,
    notes: "Google Cloud managed AI platform with Gemini models, MLOps tooling, and enterprise deployment infrastructure",
    gaps: ["GCP ecosystem dependency", "Technical setup required", "Less turnkey than Azure OpenAI for Microsoft-stack orgs"]
  },

  // Enterprise no-code / low-code automation
  {
    label: "Zapier AI", x: 72, y: 18, gov: 6, type: "tool", active: false,
    notes: "No-code automation platform with AI-powered actions and Zap steps; connects thousands of SaaS apps",
    gaps: ["Org-level controls are limited", "No granular per-user analytics", "Data passing between apps requires security review"]
  },
  {
    label: "Make (Integromat)", x: 68, y: 22, gov: 5, type: "tool", active: false,
    notes: "Visual workflow automation platform with AI modules; more powerful than Zapier for complex multi-step data flows",
    gaps: ["Less mature enterprise governance than Zapier", "Limited SSO on lower tiers", "Audit trail gaps on standard plans"]
  },
  {
    label: "Power Automate AI", x: 75, y: 15, gov: 8, type: "tool", active: false,
    notes: "Microsoft low-code automation with AI Builder models; deeply integrated with M365, Dataverse, and SharePoint",
    gaps: ["AI Builder model accuracy varies by use case", "Advanced features require premium per-user licensing"]
  },
  {
    label: "Salesforce Agentforce", x: 80, y: 20, gov: 8, type: "tool", active: false,
    notes: "Salesforce native agentic AI platform; agents operate within CRM data workflows and customer lifecycle automation",
    gaps: ["Requires existing Salesforce investment", "Limited value outside CRM ecosystem", "Licensing overhead is significant"]
  },
  {
    label: "ServiceNow AI Agents", x: 80, y: 12, gov: 9, type: "tool", active: false,
    notes: "Enterprise IT and HR workflow automation with AI agents; strong governance audit trail and native ITSM integration",
    gaps: ["High licensing cost", "Implementation complexity", "Maximum value requires deep ServiceNow platform adoption"]
  },
  {
    label: "UiPath Autopilot", x: 82, y: 28, gov: 8, type: "tool", active: false,
    notes: "Enterprise RPA platform with AI-powered agent capabilities and mature compliance and governance tooling",
    gaps: ["RPA maintenance overhead", "High licensing cost", "Requires ongoing bot lifecycle management"]
  },
  {
    label: "Automation Anywhere", x: 78, y: 24, gov: 7, type: "tool", active: false,
    notes: "Cloud-first enterprise RPA with AI and ML agent capabilities; direct competitor to UiPath for enterprise automation",
    gaps: ["Requires deep platform expertise", "Governance strong but complex to administer", "Duplicate investment if UiPath already present"]
  },

  // Enterprise chat / productivity assistants
  {
    label: "Moveworks", x: 63, y: 10, gov: 8, type: "tool", active: false,
    notes: "AI platform for IT and HR service desk automation; employees resolve requests via natural language without tickets",
    gaps: ["Purpose-built for IT/HR; limited extensibility", "Requires ITSM integration work"]
  },
  {
    label: "Copilot Studio", x: 62, y: 20, gov: 8, type: "tool", active: false,
    notes: "Microsoft no-code platform for building custom Copilot agents integrated with M365, Teams, and Power Platform",
    gaps: ["Custom agent behavior requires careful testing", "Advanced skills require premium license upgrade"]
  },
  {
    label: "Microsoft Copilot M365", x: 28, y: 10, gov: 9, type: "tool", active: false,
    notes: "Microsoft AI assistant embedded across Teams, Outlook, Word, Excel, and PowerPoint; enterprise-grade admin controls",
    gaps: ["Requires M365 E3/E5 licensing tier", "Adoption requires change management investment", "Feature rollout cadence varies"]
  },
  {
    label: "Google Workspace Gemini", x: 25, y: 12, gov: 8, type: "tool", active: false,
    notes: "Google AI assistant embedded across Gmail, Docs, Sheets, and Meet; strong fit for Google-stack organizations",
    gaps: ["Less relevant on Microsoft M365 stack", "Data residency options vary by tier", "Admin controls less mature than M365 Copilot"]
  },
  {
    label: "ChatGPT Enterprise", x: 35, y: 15, gov: 8, type: "tool", active: false,
    notes: "OpenAI enterprise chat platform with data privacy protections, admin console, and usage analytics dashboard",
    gaps: ["OpenAI vendor dependency", "Usage analytics less mature than M365 Copilot", "Policy required to prevent shadow IT sprawl"]
  },

  // Knowledge / writing / comms tools
  {
    label: "Notion AI", x: 18, y: 15, gov: 7, type: "tool", active: false,
    notes: "AI writing and knowledge management features built into Notion; widely used by operations and project management teams",
    gaps: ["Not a primary enterprise system of record", "Limited org-level governance controls", "Data lives in Notion not internal systems"]
  },
  {
    label: "Slack AI", x: 20, y: 8, gov: 8, type: "tool", active: false,
    notes: "AI-powered channel search summaries and meeting recaps built into Slack; reduces information overload for async teams",
    gaps: ["Requires Business+ or Enterprise Grid tier", "Value tightly coupled to Slack platform adoption"]
  },
  {
    label: "Zoom AI Companion", x: 16, y: 8, gov: 8, type: "tool", active: false,
    notes: "AI meeting summaries, transcription, and conversation intelligence embedded natively in Zoom Meetings and Clips",
    gaps: ["Meeting recording consent requirements vary by state", "Zoom platform dependency", "Data governance review recommended"]
  },
  {
    label: "Grammarly Business", x: 8, y: 5, gov: 9, type: "tool", active: false,
    notes: "AI writing assistant with tone, clarity, and compliance suggestions; strong admin controls and brand policy enforcement",
    gaps: ["Writing and communication contexts only", "Limited to text use cases", "Brand voice configuration requires initial investment"]
  },
  {
    label: "Otter.ai Business", x: 14, y: 8, gov: 7, type: "tool", active: false,
    notes: "AI meeting transcription with notes, action items, and CRM integrations; popular for field and sales team workflows",
    gaps: ["Consent requirements for recording vary by jurisdiction", "Meeting data stored externally", "Limited SIEM integration"]
  },
  {
    label: "Perplexity Enterprise", x: 22, y: 12, gov: 7, type: "tool", active: false,
    notes: "AI-powered research and web search with cited sources; enterprise tier includes data privacy and SSO controls",
    gaps: ["Answers sourced from public web only", "Hallucination risk on proprietary topics", "Not a knowledge base"]
  },
  {
    label: "Writer Enterprise", x: 15, y: 18, gov: 8, type: "tool", active: false,
    notes: "Enterprise AI platform for brand-consistent content generation with compliance guardrails and governance controls",
    gaps: ["Content generation use case primarily", "Limited value outside communications and marketing functions"]
  },
  {
    label: "Adobe Firefly Ent.", x: 14, y: 20, gov: 8, type: "tool", active: false,
    notes: "Commercially safe generative AI for images and creative assets with IP indemnification; integrated into Creative Cloud",
    gaps: ["Creative workflow-specific", "Limited applicability outside design and marketing teams", "Requires Creative Cloud licensing"]
  },

  // Construction-specific tools
  {
    label: "Procore AI", x: 30, y: 16, gov: 8, type: "tool", active: false,
    notes: "AI-powered insights and document analysis within the Procore construction management platform; RFI assistance and cost forecasting",
    gaps: ["Value limited to Procore customers", "Several AI features still on product roadmap", "No standalone AI offering outside Procore"]
  },
  {
    label: "Autodesk Build AI", x: 35, y: 25, gov: 7, type: "tool", active: false,
    notes: "AI features in Autodesk Build for RFI automation, document analysis, and schedule risk identification in construction workflows",
    gaps: ["Autodesk platform dependency", "Some AI features still in preview", "Adoption requires substantial user training"]
  },
  {
    label: "Buildertrend AI", x: 26, y: 12, gov: 7, type: "tool", active: false,
    notes: "AI features in Buildertrend homebuilder CRM and project management platform; smart scheduling and automated client communication",
    gaps: ["Homebuilder-specific use case", "Limited standalone governance controls", "AI features tied to Buildertrend platform subscription"]
  },
  {
    label: "Bluebeam Revu AI", x: 22, y: 28, gov: 7, type: "tool", active: false,
    notes: "AI-assisted markup review and document collaboration for construction drawings, specifications, and plan review workflows",
    gaps: ["Construction document-specific use case", "AI features still maturing", "Primarily desktop-based with limited mobile support"]
  },

  // Analytics / contracts / business intelligence
  {
    label: "Power BI Copilot", x: 28, y: 22, gov: 8, type: "tool", active: false,
    notes: "AI natural language data analysis and automated visualization within Microsoft Power BI; Q&A over business data",
    gaps: ["Requires Power BI Premium Per User license", "Answer quality depends on underlying data model quality", "Not a BI analyst replacement"]
  },
  {
    label: "DocuSign AI", x: 18, y: 10, gov: 8, type: "tool", active: false,
    notes: "AI contract analysis, clause extraction, and agreement intelligence within the DocuSign IAM platform",
    gaps: ["Use case limited to contract workflows", "Requires DocuSign platform adoption", "CLM integration adds complexity"]
  },
];

// ── Persistence — uses a SEPARATE key from the original so the two never conflict ──
var COMPANIES = (function() {
  try {
    const saved = localStorage.getItem('fischer-gov-data-expanded');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_COMPANIES));
})();

function saveData() {
  try { localStorage.setItem('fischer-gov-data-expanded', JSON.stringify(COMPANIES)); } catch(e) {}
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

    const depthFactor = 0.4 + (p.gov / 10) * 0.6;
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

    ctx.save();
    ctx.fillStyle = "rgba(255, 50, 80, 0.04)";
    ctx.fillRect(area.left, area.top, mx - area.left, my - area.top);
    ctx.fillStyle = "rgba(255, 50, 80, 0.07)";
    ctx.fillRect(mx, area.top, area.right - mx, my - area.top);
    ctx.fillStyle = "rgba(0, 232, 162, 0.03)";
    ctx.fillRect(area.left, my, mx - area.left, area.bottom - my);
    ctx.fillStyle = "rgba(0, 232, 162, 0.06)";
    ctx.fillRect(mx, my, area.right - mx, area.bottom - my);
    ctx.restore();

    // Fischer Group Sun
    const sunTime = typeof animState !== 'undefined' ? animState.time : Date.now();
    ctx.save();
    const coronaPulse = 0.9 + Math.sin(sunTime / 2000) * 0.1;
    const corona3 = ctx.createRadialGradient(mx, my, 0, mx, my, 85 * coronaPulse);
    corona3.addColorStop(0, 'rgba(255, 180, 50, 0.07)');
    corona3.addColorStop(0.4, 'rgba(255, 140, 30, 0.025)');
    corona3.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(mx, my, 85 * coronaPulse, 0, Math.PI * 2);
    ctx.fillStyle = corona3; ctx.fill();

    const corona2 = ctx.createRadialGradient(mx, my, 0, mx, my, 35);
    corona2.addColorStop(0, 'rgba(255, 200, 80, 0.2)');
    corona2.addColorStop(0.6, 'rgba(255, 160, 40, 0.06)');
    corona2.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(mx, my, 35, 0, Math.PI * 2);
    ctx.fillStyle = corona2; ctx.fill();

    const coreShift = Math.sin(sunTime / 3000) * 2;
    const sunCore = ctx.createRadialGradient(mx + coreShift, my - 1, 0, mx, my, 14);
    sunCore.addColorStop(0, 'rgba(255, 250, 220, 0.92)');
    sunCore.addColorStop(0.4, 'rgba(255, 200, 70, 0.65)');
    sunCore.addColorStop(0.8, 'rgba(255, 160, 40, 0.25)');
    sunCore.addColorStop(1, 'rgba(255, 130, 20, 0.08)');
    ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fillStyle = sunCore; ctx.fill();

    // Smart label: reposition when sun lands at a corner during quadrant zoom
    const edgeThreshX = (area.right - area.left) * 0.12; // ~12% of chart width
    const edgeThreshY = (area.bottom - area.top) * 0.12;
    const nearRight  = (area.right - mx)  < edgeThreshX;
    const nearLeft   = (mx - area.left)   < edgeThreshX;
    const nearBottom = (area.bottom - my) < edgeThreshY;

    const labelY = nearBottom ? my - 18 : my + 28;
    ctx.fillStyle = "rgba(255, 220, 150, 0.65)";
    ctx.font = "600 11px 'DM Mono', monospace";
    if (nearRight) {
      ctx.textAlign = "right";
      ctx.fillText("THE FISCHER GROUP", mx - 6, labelY);
    } else if (nearLeft) {
      ctx.textAlign = "left";
      ctx.fillText("THE FISCHER GROUP", mx + 6, labelY);
    } else {
      ctx.textAlign = "center";
      ctx.fillText("THE FISCHER GROUP", mx, labelY);
    }
    ctx.restore();

    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "rgba(100, 160, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, area.top); ctx.lineTo(mx, area.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(area.left, my); ctx.lineTo(area.right, my); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Models enabler line — only draw when y=52 is within the visible scale range
    const yScale = ch.scales.y;
    const lineY = yScale.getPixelForValue(52);
    if (lineY >= area.top && lineY <= area.bottom) {
      ctx.save();
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(area.left + 30, lineY); ctx.lineTo(area.right, lineY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(175, 195, 230, 0.35)";
      ctx.font = "11px 'DM Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("MODELS (Enablers) \u2014 power both Assistants & Agents", area.left + 34, lineY - 6);
      ctx.restore();
    }
  }
};

/* labelPlugin — renders dot labels with depth and subtle alive pulse */
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
      // Slightly smaller font for expanded view to reduce crowding
      const fontSize = 9 + depth * 2;
      const breathe = Math.sin(time / 2000 + i * 0.7) * 0.08;

      ctx.save();
      ctx.globalAlpha = visible ? (0.5 + depth * 0.5 + breathe) : 0.08;
      ctx.font = `${p.active ? "700" : "600"} ${fontSize}px 'Syne', sans-serif`;
      ctx.textAlign = "center";

      const labelY = pt.y - (12 + depth * 5);

      ctx.strokeStyle = "rgba(3, 5, 16, 0.7)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText(p.label, pt.x, labelY);

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
          const baseR = 12 + p.gov * 2.2;
          const ringR = baseR + pulse * 5;
          const alpha = 0.3 + pulse * 0.3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = gc;
          ctx.lineWidth = 1.5 + pulse * 0.5;
          ctx.globalAlpha *= alpha;
          ctx.stroke();

          if (p.gov >= 5) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ringR * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = gc;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = visible ? 0.1 + pulse * 0.08 : 0.02;
            ctx.stroke();
          }
        } else if (mode === "glow") {
          const govIntensity = p.gov / 10;
          const alpha = 0.1 + govIntensity * 0.4 + pulse * 0.15;
          const radius = 14 + p.gov * 4.5 + pulse * 6;
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
