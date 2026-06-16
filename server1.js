import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://10.177.44.58:4423/api";

/* ─── Avatar Colors ─────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "#1a56db", "#7c3aed", "#dc2626", "#059669", "#d97706",
  "#db2777", "#0891b2", "#65a30d",
];
const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const getInitials = (name = "") =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

/* ─── Status Config ─────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  "Pending":     { color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  "In Progress": { color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  "Completed":   { color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
};

/* ─── Format Helpers ────────────────────────────────────────────────────────── */
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
  }) + " " + d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

/* ─── Global CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f3f4f6; font-family: 'Inter', sans-serif; }

  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes shimmer { 0% { background-position:-400px 0; } 100% { background-position:400px 0; } }

  .tr-hover:hover { background: #f8fafc !important; }
  .action-btn:hover { background: #f1f5f9 !important; }
  .nav-item:hover { background: rgba(255,255,255,.15) !important; }
  .nav-item.active { background: rgba(255,255,255,.2) !important; }
  .stat-card { cursor:pointer; transition: box-shadow .18s, border-color .18s, transform .18s; }
  .stat-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1) !important; transform: translateY(-2px); }
  .dropdown:hover { border-color: #93c5fd !important; }
  .new-task-btn:hover { background: #1d4ed8 !important; }
  .del-btn:hover { color: #dc2626 !important; border-color: #fca5a5 !important; background: #fef2f2 !important; }
  .edit-link:hover { background: #f3f4f6 !important; }
  .pagination-btn:hover:not(:disabled) { background: #f3f4f6 !important; }
  .pagination-btn:disabled { opacity: .4; cursor: not-allowed; }
  .clear-btn:hover { background: #f3f4f6 !important; }

  .skeleton-row {
    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }

  input::placeholder { color: #9ca3af; }
  select { appearance: none; -webkit-appearance: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #f3f4f6; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
`;

/* ─── Spinner ───────────────────────────────────────────────────────────────── */
const Spinner = ({ size = 16, color = "#1a56db" }) => (
  <span style={{
    display:"inline-block", width:size, height:size,
    border:`2px solid #e5e7eb`, borderTopColor:color,
    borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0,
  }} />
);

/* ─── Avatar ────────────────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 32 }) => (
  <div style={{
    width:size, height:size, borderRadius:"50%",
    background: getAvatarColor(name || "?"),
    display:"flex", alignItems:"center", justifyContent:"center",
    color:"#fff", fontSize: size * 0.38, fontWeight:700, flexShrink:0,
    userSelect:"none",
  }}>
    {name ? getInitials(name) : "?"}
  </div>
);

/* ─── Status Badge ──────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG["Pending"];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding:"3px 12px", borderRadius:20,
      background:cfg.bg, color:cfg.color,
      border:`1px solid ${cfg.border}`,
      fontSize:12, fontWeight:600, whiteSpace:"nowrap",
    }}>{status}</span>
  );
};

/* ─── Connection Banner ─────────────────────────────────────────────────────── */
function ConnectionBanner({ apiUrl }) {
  return (
    <div style={{
      background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10,
      padding:"12px 16px", margin:"0 28px 16px", display:"flex",
      alignItems:"center", gap:10, fontSize:13, color:"#991b1b",
    }}>
      <span style={{ fontSize:16 }}>⚠</span>
      <div>
        <strong>Cannot reach backend</strong> at <code style={{ background:"#fee2e2", padding:"1px 6px", borderRadius:4 }}>{apiUrl}</code>.
        Check that the Node service is running (<code style={{ background:"#fee2e2", padding:"1px 6px", borderRadius:4 }}>systemctl status node</code>) and reachable on port 4423.
      </div>
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────────────────────────── */
function Toasts({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          padding:"12px 16px", borderRadius:10, cursor:"pointer",
          background: t.type==="error" ? "#fef2f2" : "#f0fdf4",
          border:`1px solid ${t.type==="error" ? "#fca5a5" : "#86efac"}`,
          color: t.type==="error" ? "#dc2626" : "#16a34a",
          fontSize:13, fontWeight:500, minWidth:280, maxWidth:380,
          boxShadow:"0 4px 20px rgba(0,0,0,.12)",
          animation:"toastIn .25s ease", display:"flex", alignItems:"center", gap:8,
        }}>
          <span>{t.type==="error" ? "✕" : "✓"}</span> {t.msg}
        </div>
      ))}
    </div>
  );
}
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

/* ─── Add/Edit Modal ────────────────────────────────────────────────────────── */
function Modal({ mode, activity, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    name:          isEdit ? activity.name           : "",
    reason:        isEdit ? activity.reason         : "",
    scheduledDate: isEdit ? activity.scheduledDate   : "",
    assignee:      isEdit ? (activity.assignee||"") : "",
    status:        isEdit ? activity.status         : "Pending",
  });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name = "Required";
    if (!form.reason.trim()) e.reason = "Required";
    if (!form.scheduledDate) e.scheduledDate = "Required";
    setErrs(e); return !Object.keys(e).length;
  };
  const submit = async () => {
    if (!validate()) return;
    setBusy(true); await onSave(form); setBusy(false);
  };

  const inp = (err) => ({
    width:"100%", background:"#fff",
    border:`1.5px solid ${err ? "#f87171" : "#e5e7eb"}`,
    borderRadius:8, padding:"9px 12px", fontSize:14,
    color:"#111827", outline:"none", fontFamily:"inherit",
  });
  const labelStyle = {
    fontSize:12, fontWeight:600, color:"#374151",
    display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".05em",
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:500,
        boxShadow:"0 24px 80px rgba(0,0,0,.2)",
        animation:"slideUp .22s ease", maxHeight:"90vh", overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{
          padding:"20px 24px 16px", borderBottom:"1px solid #f3f4f6",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, background:"#fff", borderRadius:"16px 16px 0 0",
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:"#111827" }}>
              {isEdit ? "Edit Task" : "New Task"}
            </div>
            <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>
              {isEdit ? "Update the task details" : "Fill in the details to add a new task"}
            </div>
          </div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:8,
            border:"1px solid #e5e7eb", background:"none",
            cursor:"pointer", fontSize:18, color:"#9ca3af",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={labelStyle}>Task Name *</label>
            <input ref={ref} value={form.name} onChange={set("name")}
              placeholder="e.g. Deploy ACE BAR to EISUATEXP02"
              style={inp(errs.name)} />
            {errs.name && <span style={{ fontSize:12, color:"#dc2626" }}>{errs.name}</span>}
          </div>

          <div>
            <label style={labelStyle}>Why are we doing this? *</label>
            <textarea value={form.reason} onChange={set("reason")} rows={3}
              placeholder="e.g. New CR for fund transfer flow fix"
              style={{ ...inp(errs.reason), resize:"vertical", minHeight:75, lineHeight:1.5 }} />
            {errs.reason && <span style={{ fontSize:12, color:"#dc2626" }}>{errs.reason}</span>}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Scheduled Date *</label>
              <input type="date" value={form.scheduledDate} onChange={set("scheduledDate")}
                style={{ ...inp(errs.scheduledDate), colorScheme:"light" }} />
              {errs.scheduledDate && <span style={{ fontSize:12, color:"#dc2626" }}>{errs.scheduledDate}</span>}
            </div>
            <div>
              <label style={labelStyle}>Assignee</label>
              <input value={form.assignee} onChange={set("assignee")}
                placeholder="e.g. Ankit" style={inp(false)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={set("status")}
              style={{ ...inp(false), cursor:"pointer",
                backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
                backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", appearance:"none" }}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"14px 24px 20px", display:"flex", justifyContent:"flex-end", gap:10,
          borderTop:"1px solid #f3f4f6",
        }}>
          <button onClick={onClose} style={{
            padding:"9px 20px", borderRadius:8,
            border:"1px solid #e5e7eb", background:"none",
            color:"#6b7280", cursor:"pointer", fontSize:13, fontWeight:500,
          }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{
            padding:"9px 24px", borderRadius:8, border:"none",
            background: busy ? "#93c5fd" : "#1a56db",
            color:"#fff", cursor: busy ? "not-allowed" : "pointer",
            fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:8,
          }}>
            {busy && <Spinner size={14} color="#fff" />}
            {isEdit ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ────────────────────────────────────────────────────────── */
function DeleteConfirm({ activity, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:420, padding:28,
        boxShadow:"0 24px 80px rgba(0,0,0,.2)", animation:"slideUp .22s ease",
      }}>
        <div style={{ width:44, height:44, borderRadius:12,
          background:"#fef2f2", border:"1px solid #fca5a5",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, marginBottom:16 }}>🗑</div>
        <div style={{ fontSize:17, fontWeight:700, color:"#111827", marginBottom:6 }}>
          Delete Task?
        </div>
        <div style={{ fontSize:13, color:"#6b7280", marginBottom:14 }}>
          You're about to permanently delete:
        </div>
        <div style={{
          background:"#f9fafb", border:"1px solid #e5e7eb",
          borderRadius:8, padding:"10px 14px", marginBottom:20,
        }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#111827" }}>{activity.name}</div>
          <div style={{ fontSize:12, color:"#9ca3af", marginTop:3 }}>{fmtDate(activity.scheduledDate)}</div>
        </div>
        <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>
          This will permanently remove it from data.txt. This cannot be undone.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{
            padding:"9px 20px", borderRadius:8,
            border:"1px solid #e5e7eb", background:"none",
            color:"#6b7280", cursor:"pointer", fontSize:13,
          }}>Cancel</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }} style={{
            padding:"9px 20px", borderRadius:8, border:"none",
            background:"#dc2626", color:"#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:8,
          }}>
            {busy && <Spinner size={14} color="#fff" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon:"🏠", label:"Dashboard" },
  { icon:"✅", label:"Active Tasks", active:true },
  { icon:"📊", label:"CacheHit" },
  { icon:"🔌", label:"API Search" },
  { icon:"💻", label:"CurlUI" },
  { icon:"📋", label:"Check" },
];

function Sidebar() {
  return (
    <div style={{
      width:200, background:"#1a56db", minHeight:"100vh",
      display:"flex", flexDirection:"column",
      position:"fixed", left:0, top:0, bottom:0, zIndex:50,
    }}>
      <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"rgba(255,255,255,.2)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
          }}>🏦</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>EIS Dashboard</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>SBI UAT</div>
          </div>
        </div>
      </div>

      <nav style={{ padding:"12px 8px", flex:1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.label} className={`nav-item${item.active?" active":""}`} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"9px 12px", borderRadius:8, marginBottom:2,
            cursor:"pointer", color: item.active ? "#fff" : "rgba(255,255,255,.7)",
            fontWeight: item.active ? 600 : 400, fontSize:13,
            background: item.active ? "rgba(255,255,255,.2)" : "none",
          }}>
            <span style={{ fontSize:15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px" }}>
          <Avatar name="Ankit Jha" size={30} />
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>Ankit Jha</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>TCS · SBI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Row ──────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"2.5fr 130px 140px 180px 100px",
      padding:"14px 20px", alignItems:"center", gap:8,
      borderBottom:"1px solid #f3f4f6",
    }}>
      <div className="skeleton-row" style={{ height:16, width:"70%" }} />
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div className="skeleton-row" style={{ height:28, width:28, borderRadius:"50%" }} />
        <div className="skeleton-row" style={{ height:13, width:50 }} />
      </div>
      <div className="skeleton-row" style={{ height:22, width:80, borderRadius:20 }} />
      <div className="skeleton-row" style={{ height:13, width:110 }} />
      <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
        <div className="skeleton-row" style={{ height:30, width:30, borderRadius:6 }} />
        <div className="skeleton-row" style={{ height:30, width:30, borderRadius:6 }} />
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 8;

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState({ total:0, pending:0, inProgress:0, completed:0 });
  const [loading,    setLoading]    = useState(true);
  const [connError,  setConnError]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterDate,   setFilterDate]   = useState("All Dates");
  const [page,        setPage]        = useState(1);
  const [modal,      setModal]      = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);
  const [menuOpen,   setMenuOpen]   = useState(null);
  const { toasts, add: toast, remove: removeToast } = useToast();

  /* fetch */
  const fetchAll = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filterStatus !== "All Status") p.set("status", filterStatus);
      if (search.trim()) p.set("search", search.trim());

      const [aRes, sRes] = await Promise.all([
        fetch(`${API}/activities?${p}`),
        fetch(`${API}/stats`),
      ]);
      const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
      if (aData.success) setActivities(aData.data);
      if (sData.success) setStats(sData.data);
      setConnError(false);
    } catch {
      setConnError(true);
      toast("Cannot reach backend at " + API, "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [filterStatus, filterDate, search]);

  useEffect(() => {
    const h = () => setMenuOpen(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  /* CRUD */
  const handleSave = async (form) => {
    try {
      const isEdit = modal.mode === "edit";
      const res = await fetch(
        isEdit ? `${API}/activities/${modal.activity.id}` : `${API}/activities`,
        { method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast(isEdit ? "Task updated." : "Task added.");
      setModal(null); fetchAll();
    } catch { toast("Save failed. Check network.", "error"); }
  };

  const handleDelete = async () => {
    try {
      const res  = await fetch(`${API}/activities/${delTarget.id}`, { method:"DELETE" });
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast("Task deleted.");
      setDelTarget(null); fetchAll();
    } catch { toast("Delete failed.", "error"); }
  };

  const handleStatusChange = async (activity, status) => {
    try {
      const res  = await fetch(`${API}/activities/${activity.id}/status`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast(`Marked as ${status}.`);
      fetchAll();
    } catch { toast("Status update failed.", "error"); }
  };

  /* date filter */
  const filterByDate = (list) => {
    if (filterDate === "All Dates") return list;
    const now   = new Date();
    const today = now.toISOString().split("T")[0];
    if (filterDate === "Today")
      return list.filter(a => a.scheduledDate === today);
    if (filterDate === "This Week") {
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
      return list.filter(a => a.scheduledDate >= today && a.scheduledDate <= weekEnd.toISOString().split("T")[0]);
    }
    if (filterDate === "This Month") {
      const month = today.slice(0, 7);
      return list.filter(a => a.scheduledDate.startsWith(month));
    }
    return list;
  };

  const displayed   = filterByDate(activities);
  const totalPages  = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageItems    = displayed.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const dropStyle = {
    background:"#fff", border:"1px solid #e5e7eb", borderRadius:8,
    padding:"7px 32px 7px 12px", fontSize:13, color:"#374151",
    cursor:"pointer", outline:"none", fontFamily:"inherit", fontWeight:500,
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
    backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", appearance:"none",
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f3f4f6", fontFamily:"'Inter', sans-serif" }}>
      <style>{CSS}</style>
      <Sidebar />

      <div style={{ marginLeft:200, flex:1, display:"flex", flexDirection:"column" }}>

        {/* Topbar */}
        <div style={{
          background:"#fff", borderBottom:"1px solid #e5e7eb",
          padding:"0 28px", height:58,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:40,
        }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#111827" }}>Prod Dashboard</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avatar name="Ankit Jha" size={34} />
            <span style={{ fontSize:14, fontWeight:600, color:"#111827" }}>Ankit Jha</span>
          </div>
        </div>

        {connError && !loading && <ConnectionBanner apiUrl={API} />}

        <div style={{ padding:"24px 28px" }}>

          {/* Section title + toolbar */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:20, flexWrap:"wrap", gap:12,
          }}>
            <div style={{ fontSize:18, fontWeight:700, color:"#111827" }}>Active Tasks</div>

            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:10, top:"50%",
                  transform:"translateY(-50%)", color:"#9ca3af", fontSize:14 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  style={{
                    width:220, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8,
                    padding:"7px 12px 7px 32px", fontSize:13, color:"#111827",
                    outline:"none", fontFamily:"inherit",
                  }} />
                {search && (
                  <button onClick={() => setSearch("")} style={{
                    position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:15,
                  }}>×</button>
                )}
              </div>

              <select className="dropdown" value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)} style={dropStyle}>
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>

              <select className="dropdown" value={filterDate}
                onChange={e => setFilterDate(e.target.value)} style={dropStyle}>
                <option>All Dates</option>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>

              <button className="new-task-btn" onClick={() => setModal({ mode:"add" })} style={{
                background:"#1a56db", color:"#fff", border:"none",
                borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600,
                cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                boxShadow:"0 2px 8px rgba(26,86,219,.35)",
              }}>
                <span style={{ fontSize:16, lineHeight:1 }}>+</span> New Task
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            {[
              { label:"Total Tasks",  value:stats.total,      key:"All Status"   },
              { label:"In Progress",  value:stats.inProgress, key:"In Progress"  },
              { label:"Completed",    value:stats.completed,  key:"Completed"    },
              { label:"Pending",      value:stats.pending,    key:"Pending"      },
            ].map(s => (
              <div key={s.key} className="stat-card"
                onClick={() => setFilterStatus(f => f===s.key ? "All Status" : s.key)}
                style={{
                  background:"#fff",
                  border:`2px solid ${filterStatus===s.key ? "#1a56db" : "#e5e7eb"}`,
                  borderRadius:12, padding:"20px 24px",
                  boxShadow: filterStatus===s.key ? "0 0 0 3px #dbeafe" : "0 1px 4px rgba(0,0,0,.06)",
                }}>
                <div style={{ fontSize:36, fontWeight:800, color:"#1a56db", fontVariantNumeric:"tabular-nums" }}>
                  {loading ? "—" : s.value}
                </div>
                <div style={{ fontSize:13, color:"#6b7280", marginTop:4, fontWeight:500 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{
            background:"#fff", borderRadius:12, border:"1px solid #e5e7eb",
            boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden",
          }}>
            <div style={{
              display:"grid", gridTemplateColumns:"2.5fr 130px 140px 180px 100px",
              padding:"11px 20px", borderBottom:"1px solid #f3f4f6", background:"#f9fafb",
            }}>
              {["Task","Assignee","Status","Created At","Actions"].map((h, i) => (
                <div key={h} style={{
                  fontSize:12, fontWeight:600, color:"#6b7280",
                  letterSpacing:".05em", textTransform:"uppercase",
                  textAlign: i === 4 ? "center" : "left",
                }}>{h}</div>
              ))}
            </div>

            {loading ? (
              [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
            ) : pageItems.length === 0 ? (
              <div style={{ padding:"56px 32px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <div style={{ fontSize:16, fontWeight:600, color:"#374151", marginBottom:6 }}>
                  No tasks found
                </div>
                <div style={{ fontSize:13, color:"#9ca3af", marginBottom:20 }}>
                  {search || filterStatus !== "All Status" || filterDate !== "All Dates"
                    ? "Try adjusting your filters."
                    : "Click '+ New Task' to add your first one."}
                </div>
                {(search || filterStatus !== "All Status" || filterDate !== "All Dates") ? (
                  <button className="clear-btn" onClick={() => { setSearch(""); setFilterStatus("All Status"); setFilterDate("All Dates"); }} style={{
                    padding:"8px 18px", borderRadius:8,
                    border:"1px solid #e5e7eb", background:"none",
                    color:"#6b7280", cursor:"pointer", fontSize:13,
                  }}>Clear filters</button>
                ) : (
                  <button onClick={() => setModal({ mode:"add" })} style={{
                    padding:"9px 22px", borderRadius:8, border:"none",
                    background:"#1a56db", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600,
                  }}>+ New Task</button>
                )}
              </div>
            ) : (
              pageItems.map((a, i) => (
                <div key={a.id} className="tr-hover" style={{
                  display:"grid", gridTemplateColumns:"2.5fr 130px 140px 180px 100px",
                  padding:"14px 20px",
                  borderBottom: i < pageItems.length-1 ? "1px solid #f3f4f6" : "none",
                  alignItems:"center",
                  animation:`fadeIn .2s ease ${i*.03}s both`,
                }}>
                  {/* Task */}
                  <div style={{ paddingRight:16, minWidth:0 }}>
                    <div style={{ fontSize:14, color:"#111827", fontWeight:500, lineHeight:1.4 }}>
                      {a.name}
                    </div>
                    {a.reason && (
                      <div style={{
                        fontSize:12, color:"#9ca3af", marginTop:2,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      }} title={a.reason}>{a.reason}</div>
                    )}
                    <div style={{ fontSize:11, color:"#c4c9d1", marginTop:3 }}>
                      📅 Scheduled: {fmtDate(a.scheduledDate)}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Avatar name={a.assignee} size={28} />
                    <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>
                      {a.assignee || "—"}
                    </span>
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={a.status} /></div>

                  {/* Created At */}
                  <div style={{ fontSize:13, color:"#6b7280" }}>
                    {fmtDateTime(a.createdAt)}
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                    <div style={{ position:"relative" }}>
                      <button className="action-btn"
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen===a.id ? null : a.id); }}
                        style={{
                          width:30, height:30, borderRadius:6,
                          border:"1px solid #e5e7eb", background:"none",
                          cursor:"pointer", fontSize:16, color:"#6b7280",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>⋮</button>

                      {menuOpen === a.id && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position:"absolute", right:0, top:34, zIndex:200,
                          background:"#fff", border:"1px solid #e5e7eb",
                          borderRadius:10, boxShadow:"0 8px 32px rgba(0,0,0,.15)",
                          minWidth:170, overflow:"hidden", animation:"fadeIn .15s ease",
                        }}>
                          <div style={{ padding:"6px 0" }}>
                            <button className="edit-link" onClick={() => { setModal({ mode:"edit", activity:a }); setMenuOpen(null); }}
                              style={{
                                width:"100%", padding:"9px 16px", background:"none",
                                border:"none", textAlign:"left", fontSize:13,
                                color:"#374151", cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                              }}>✎ Edit Task</button>

                            <div style={{ height:1, background:"#f3f4f6", margin:"4px 0" }} />

                            {["Pending","In Progress","Completed"]
                              .filter(s => s !== a.status)
                              .map(s => (
                                <button key={s} className="edit-link"
                                  onClick={() => { handleStatusChange(a,s); setMenuOpen(null); }}
                                  style={{
                                    width:"100%", padding:"9px 16px", background:"none",
                                    border:"none", textAlign:"left", fontSize:13,
                                    color:"#374151", cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                                  }}>→ Mark as {s}</button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button className="del-btn action-btn" onClick={() => setDelTarget(a)} style={{
                      width:30, height:30, borderRadius:6,
                      border:"1px solid #e5e7eb", background:"none",
                      cursor:"pointer", fontSize:14, color:"#9ca3af",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: count + pagination */}
          {displayed.length > 0 && (
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              marginTop:14, flexWrap:"wrap", gap:10,
            }}>
              <div style={{ fontSize:12, color:"#9ca3af" }}>
                Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, displayed.length)} of {displayed.length} tasks
                {(filterStatus !== "All Status" || filterDate !== "All Dates" || search) && " · filtered"}
              </div>
              {totalPages > 1 && (
                <div style={{ display:"flex", gap:6 }}>
                  <button className="pagination-btn" disabled={page===1}
                    onClick={() => setPage(p => p-1)}
                    style={{
                      padding:"6px 12px", borderRadius:7, border:"1px solid #e5e7eb",
                      background:"#fff", color:"#374151", fontSize:12, cursor:"pointer",
                    }}>← Prev</button>
                  <span style={{ fontSize:12, color:"#6b7280", padding:"6px 4px" }}>
                    Page {page} of {totalPages}
                  </span>
                  <button className="pagination-btn" disabled={page===totalPages}
                    onClick={() => setPage(p => p+1)}
                    style={{
                      padding:"6px 12px", borderRadius:7, border:"1px solid #e5e7eb",
                      background:"#fff", color:"#374151", fontSize:12, cursor:"pointer",
                    }}>Next →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal mode={modal.mode} activity={modal.activity}
          onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {delTarget && (
        <DeleteConfirm activity={delTarget}
          onClose={() => setDelTarget(null)} onConfirm={handleDelete} />
      )}
      <Toasts toasts={toasts} remove={removeToast} />
    </div>
  );
}
