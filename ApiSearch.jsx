import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://10.177.44.58:5000/api";

/* ─── Design Tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg0:      "#070b10",
  bg1:      "#0d1117",
  bg2:      "#161b22",
  bg3:      "#1c2128",
  border:   "#21262d",
  border2:  "#30363d",
  text:     "#e6edf3",
  text2:    "#c9d1d9",
  muted:    "#7d8590",
  muted2:   "#484f58",
  blue:     "#388bfd",
  blueDim:  "#1a2a4a",
  green:    "#3fb950",
  greenDim: "#0d2a1a",
  yellow:   "#d29922",
  yellowDim:"#2a1f00",
  red:      "#f85149",
  redDim:   "#2a0e0e",
  purple:   "#a371f7",
  purpleDim:"#1e1040",
};

const STATUS = {
  "Pending":     { color: T.yellow, bg: T.yellowDim, icon: "◷", label: "Pending"     },
  "In Progress": { color: T.blue,   bg: T.blueDim,   icon: "◎", label: "In Progress" },
  "Completed":   { color: T.green,  bg: T.greenDim,  icon: "◉", label: "Completed"   },
};

/* ─── Utility ────────────────────────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const isOverdue = (d, status) =>
  status !== "Completed" && d < new Date().toISOString().split("T")[0];

const daysUntil = (d) => {
  const diff = Math.ceil((new Date(d + "T00:00:00") - new Date()) / 86400000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: T.red };
  if (diff === 0) return { label: "Today",                    color: T.yellow };
  if (diff === 1) return { label: "Tomorrow",                 color: T.yellow };
  return { label: `In ${diff} days`,                          color: T.muted };
};

/* ─── Global Styles ──────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg0}; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
  input, textarea, select { font-family: inherit; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastIn  { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  @keyframes shimmer  {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  .card-hover { transition: border-color .18s, box-shadow .18s, transform .18s; }
  .card-hover:hover {
    border-color: ${T.border2} !important;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
    transform: translateY(-1px);
  }
  .btn-ghost:hover { background: ${T.bg3} !important; border-color: ${T.border2} !important; color: ${T.text} !important; }
  .btn-icon:hover  { background: ${T.bg3} !important; }
  .pill-filter.active, .pill-filter:hover { border-color: ${T.blue} !important; color: ${T.text} !important; }
  .pill-filter.active { background: ${T.blueDim} !important; color: ${T.blue} !important; }
  .row-tr { transition: background .12s; }
  .row-tr:hover { background: ${T.bg3} !important; }
  .status-sel:hover { opacity: .85; }
  .del-btn:hover { background: ${T.redDim} !important; border-color: ${T.red} !important; color: ${T.red} !important; }
  .edit-btn:hover { border-color: ${T.blue} !important; color: ${T.blue} !important; }

  .skeleton {
    background: linear-gradient(90deg, ${T.bg2} 25%, ${T.bg3} 50%, ${T.bg2} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }
`;

/* ─── Spinner ────────────────────────────────────────────────────────────────── */
const Spinner = ({ size = 16, color = T.blue }) => (
  <span style={{
    display: "inline-block", width: size, height: size,
    border: `2px solid ${T.border2}`, borderTopColor: color,
    borderRadius: "50%", animation: "spin .7s linear infinite",
    flexShrink: 0,
  }} />
);

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"12px 16px", borderRadius:10,
          background: t.type==="error" ? T.redDim   : t.type==="warn" ? T.yellowDim : T.greenDim,
          border: `1px solid ${t.type==="error" ? T.red : t.type==="warn" ? T.yellow : T.green}`,
          color:  t.type==="error" ? T.red    : t.type==="warn" ? T.yellow  : T.green,
          fontSize:13, fontWeight:500, cursor:"pointer", maxWidth:340,
          boxShadow:"0 8px 32px rgba(0,0,0,.5)",
          animation:"toastIn .25s ease",
        }}>
          <span style={{fontSize:16}}>
            {t.type==="error" ? "✕" : t.type==="warn" ? "⚠" : "✓"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

/* ─── Field ──────────────────────────────────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label style={{ fontSize:11, fontWeight:600, color:T.muted, letterSpacing:".07em", textTransform:"uppercase" }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize:12, color:T.red }}>{error}</span>}
    </div>
  );
}

const inputCss = (focused, err) => ({
  background: T.bg1, border: `1.5px solid ${err ? T.red : focused ? T.blue : T.border}`,
  borderRadius: 8, padding:"10px 14px", color: T.text, fontSize:14,
  outline:"none", width:"100%", transition:"border-color .15s",
  lineHeight: 1.5,
});

function Input({ value, onChange, placeholder, type="text", error }) {
  const [f, setF] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ ...inputCss(f, error), colorScheme: type==="date" ? "dark" : undefined }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    />
  );
}

function Textarea({ value, onChange, placeholder, error }) {
  const [f, setF] = useState(false);
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
      style={{ ...inputCss(f, error), resize:"vertical", minHeight:80 }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    />
  );
}

function Select({ value, onChange, options, error }) {
  const [f, setF] = useState(false);
  return (
    <select value={value} onChange={onChange}
      style={{ ...inputCss(f, error), cursor:"pointer" }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    >
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────────── */
function Modal({ mode, activity, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    name:          isEdit ? activity.name          : "",
    reason:        isEdit ? activity.reason        : "",
    scheduledDate: isEdit ? activity.scheduledDate : "",
    status:        isEdit ? activity.status        : "Pending",
  });
  const [errs, setErrs]   = useState({});
  const [busy, setBusy]   = useState(false);
  const firstRef           = useRef();

  useEffect(() => { firstRef.current?.focus(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name = "Required";
    if (!form.reason.trim())  e.reason = "Required";
    if (!form.scheduledDate)  e.scheduledDate = "Required";
    setErrs(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    await onSave(form);
    setBusy(false);
  };

  const handleKey = (e) => { if (e.key === "Escape") onClose(); };

  return (
    <div onKeyDown={handleKey} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.75)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      animation:"fadeIn .2s ease",
    }} onClick={e => e.target===e.currentTarget && onClose()}>

      <div style={{
        background:T.bg2, border:`1px solid ${T.border2}`,
        borderRadius:16, width:"100%", maxWidth:520,
        boxShadow:"0 32px 96px rgba(0,0,0,.7)",
        animation:"fadeUp .22s ease",
      }}>
        {/* Header */}
        <div style={{
          padding:"22px 28px 18px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{
                width:32, height:32, borderRadius:8, fontSize:15,
                background: isEdit ? T.blueDim : T.purpleDim,
                border: `1px solid ${isEdit ? T.blue : T.purple}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: isEdit ? T.blue : T.purple,
              }}>
                {isEdit ? "✎" : "+"}
              </div>
              <span style={{ fontSize:17, fontWeight:700, color:T.text }}>
                {isEdit ? "Edit Activity" : "Schedule Activity"}
              </span>
            </div>
            <p style={{ fontSize:13, color:T.muted, paddingLeft:42 }}>
              {isEdit ? "Update the details below" : "Fill in the details to track a new activity"}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{
            background:"none", border:`1px solid ${T.border}`, borderRadius:7,
            color:T.muted, cursor:"pointer", width:30, height:30,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
            flexShrink:0,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:18 }}>
          <Field label="Activity Name" error={errs.name}>
            <input ref={firstRef} type="text" value={form.name} onChange={set("name")}
              placeholder="e.g. Deploy ACE BAR to EISUATEXP02"
              style={inputCss(false, errs.name)}
            />
          </Field>
          <Field label="Why are we doing this?" error={errs.reason}>
            <Textarea value={form.reason} onChange={set("reason")}
              placeholder="e.g. New CR for fund transfer flow fix in UAT environment"
              error={errs.reason}
            />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Scheduled Date" error={errs.scheduledDate}>
              <Input type="date" value={form.scheduledDate} onChange={set("scheduledDate")} error={errs.scheduledDate} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}
                options={["Pending","In Progress","Completed"]}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"16px 28px 22px",
          display:"flex", justifyContent:"flex-end", gap:10,
        }}>
          <button onClick={onClose} className="btn-ghost" style={{
            padding:"9px 20px", borderRadius:8, fontSize:13, fontWeight:500,
            border:`1px solid ${T.border}`, background:"none", color:T.muted, cursor:"pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{
            padding:"9px 24px", borderRadius:8, fontSize:13, fontWeight:600,
            border:"none", background: busy ? T.blueDim : T.blue,
            color:"#fff", cursor: busy ? "not-allowed" : "pointer",
            display:"flex", alignItems:"center", gap:8, transition:"background .15s",
          }}>
            {busy && <Spinner size={14} color="#fff" />}
            {isEdit ? "Save Changes" : "Add Activity"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────────────────────────── */
function DeleteConfirm({ activity, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,.8)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      animation:"fadeIn .2s ease",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:T.bg2, border:`1.5px solid ${T.red}`,
        borderRadius:16, width:"100%", maxWidth:420, padding:28,
        boxShadow:"0 32px 80px rgba(0,0,0,.7)",
        animation:"fadeUp .22s ease",
      }}>
        <div style={{ width:48, height:48, borderRadius:12, background:T.redDim,
          border:`1px solid ${T.red}`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:22, marginBottom:16 }}>⚠</div>
        <div style={{ fontSize:17, fontWeight:700, color:T.text, marginBottom:8 }}>Delete this activity?</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:16 }}>
          You're about to permanently delete:
        </div>
        <div style={{
          background:T.bg1, border:`1px solid ${T.border}`,
          borderRadius:8, padding:"10px 14px", marginBottom:20,
        }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{activity.name}</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{fmtDate(activity.scheduledDate)}</div>
        </div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:24 }}>
          This will remove it from <code style={{ color:T.yellow, fontSize:12 }}>data.txt</code> permanently.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} className="btn-ghost" style={{
            padding:"9px 18px", borderRadius:8, fontSize:13,
            border:`1px solid ${T.border}`, background:"none", color:T.muted, cursor:"pointer",
          }}>Cancel</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }} style={{
            padding:"9px 20px", borderRadius:8, fontSize:13, fontWeight:600,
            border:"none", background: T.red, color:"#fff",
            cursor: busy ? "not-allowed" : "pointer",
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

/* ─── Activity Card ──────────────────────────────────────────────────────────── */
function ActivityCard({ activity, onEdit, onDelete, onStatusChange, index }) {
  const s   = STATUS[activity.status] || STATUS["Pending"];
  const od  = isOverdue(activity.scheduledDate, activity.status);
  const due = daysUntil(activity.scheduledDate);

  return (
    <div className="card-hover" style={{
      background:T.bg2, border:`1px solid ${T.border}`,
      borderRadius:12, padding:"18px 20px",
      display:"flex", flexDirection:"column", gap:14,
      animation:`fadeUp .3s ease ${index * 0.04}s both`,
      position:"relative", overflow:"hidden",
    }}>
      {/* Left accent bar */}
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background: od ? T.red : s.color, borderRadius:"3px 0 0 3px",
      }}/>

      {/* Top row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.text,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {activity.name}
          </div>
          <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>
            Added {new Date(activity.createdAt).toLocaleDateString("en-IN",
              { day:"numeric", month:"short", year:"numeric" })}
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          display:"flex", alignItems:"center", gap:5, flexShrink:0,
          background:s.bg, border:`1px solid ${s.color}30`,
          borderRadius:20, padding:"4px 10px",
          fontSize:12, fontWeight:600, color:s.color,
        }}>
          <span style={{ animation: activity.status==="In Progress" ? "pulse 2s infinite" : "none" }}>
            {s.icon}
          </span>
          {s.label}
        </div>
      </div>

      {/* Reason */}
      <div style={{
        fontSize:13, color:T.muted, lineHeight:1.6,
        background:T.bg1, borderRadius:8, padding:"10px 12px",
        borderLeft:`3px solid ${T.border2}`,
      }}>
        {activity.reason}
      </div>

      {/* Bottom row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        {/* Date */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            background:T.bg1, border:`1px solid ${od ? T.red+"40" : T.border}`,
            borderRadius:7, padding:"5px 10px",
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span style={{ fontSize:12 }}>📅</span>
            <span style={{ fontSize:12, fontWeight:600, color: od ? T.red : T.text2 }}>
              {fmtDate(activity.scheduledDate)}
            </span>
          </div>
          <span style={{ fontSize:11, color:due.color, fontWeight:500 }}>{due.label}</span>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {/* Quick status cycle */}
          <select
            className="status-sel"
            value={activity.status}
            onChange={e => onStatusChange(activity, e.target.value)}
            style={{
              background:T.bg1, border:`1px solid ${T.border}`,
              borderRadius:7, padding:"5px 8px", fontSize:12,
              color:T.muted, cursor:"pointer", outline:"none",
            }}
          >
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>

          <button onClick={() => onEdit(activity)} className="edit-btn" style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:7, padding:"5px 12px", fontSize:12,
            color:T.muted, cursor:"pointer", fontWeight:500,
            display:"flex", alignItems:"center", gap:4,
          }}>✎ Edit</button>

          <button onClick={() => onDelete(activity)} className="del-btn" style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:7, padding:"5px 10px", fontSize:13,
            color:T.muted, cursor:"pointer",
          }}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Card ──────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1 }}>
          <div className="skeleton" style={{ height:16, width:"60%" }} />
          <div className="skeleton" style={{ height:11, width:"30%" }} />
        </div>
        <div className="skeleton" style={{ height:26, width:90, borderRadius:20 }} />
      </div>
      <div className="skeleton" style={{ height:52, width:"100%", marginBottom:14 }} />
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div className="skeleton" style={{ height:28, width:130 }} />
        <div style={{ display:"flex", gap:6 }}>
          <div className="skeleton" style={{ height:28, width:80 }} />
          <div className="skeleton" style={{ height:28, width:56 }} />
          <div className="skeleton" style={{ height:28, width:32 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:"1 1 0", minWidth:0, background: active ? color+"18" : T.bg2,
      border:`1.5px solid ${active ? color : T.border}`,
      borderRadius:12, padding:"16px 20px", cursor:"pointer",
      textAlign:"left", transition:"all .18s",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <span style={{
          fontSize:11, fontWeight:600, color: active ? color : T.muted,
          letterSpacing:".07em", textTransform:"uppercase",
        }}>{label}</span>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color: active ? color : T.text,
        fontVariantNumeric:"tabular-nums", letterSpacing:"-0.03em" }}>
        {value}
      </div>
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState({ total:0, pending:0, inProgress:0, completed:0 });
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("All");
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("date-desc");
  const [modal,      setModal]      = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);
  const [searchFocus,setSearchFocus]= useState(false);
  const { toasts, add: toast, remove: removeToast } = useToast();

  /* fetch */
  const fetchAll = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filter !== "All") p.set("status", filter);
      if (search.trim())    p.set("search", search.trim());
      const [aRes, sRes] = await Promise.all([
        fetch(`${API}/activities?${p}`),
        fetch(`${API}/stats`),
      ]);
      const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
      if (aData.success) setActivities(aData.data);
      if (sData.success) setStats(sData.data);
    } catch {
      toast("Cannot reach server. Is backend running on port 5000?", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* sort */
  const sorted = [...activities].sort((a, b) => {
    if (sortBy === "date-desc") return new Date(b.scheduledDate) - new Date(a.scheduledDate);
    if (sortBy === "date-asc")  return new Date(a.scheduledDate) - new Date(b.scheduledDate);
    if (sortBy === "name")      return a.name.localeCompare(b.name);
    if (sortBy === "created")   return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

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
      toast(isEdit ? "Activity updated successfully." : "Activity scheduled.");
      setModal(null);
      fetchAll();
    } catch { toast("Save failed. Check network.", "error"); }
  };

  const handleDelete = async () => {
    try {
      const res  = await fetch(`${API}/activities/${delTarget.id}`, { method:"DELETE" });
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast("Activity deleted.");
      setDelTarget(null);
      fetchAll();
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

  const overdueCount = activities.filter(a =>
    isOverdue(a.scheduledDate, a.status)).length;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:"100vh", background:T.bg0, color:T.text,
      fontFamily:"'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Topbar ── */}
      <div style={{
        background:`${T.bg1}f0`, backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${T.border}`,
        padding:"0 32px", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{
            width:36, height:36, borderRadius:10, fontSize:18,
            background:"linear-gradient(135deg, #1a3a6a 0%, #388bfd 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 16px ${T.blue}44`,
          }}>📋</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:T.text, letterSpacing:"-.02em" }}>
              Activity Tracker
            </div>
            <div style={{ fontSize:11, color:T.muted }}>EIS UAT Operations · SBI</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {overdueCount > 0 && (
            <div style={{
              background:T.redDim, border:`1px solid ${T.red}50`,
              color:T.red, borderRadius:20, padding:"4px 12px",
              fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5,
            }}>
              <span style={{ animation:"pulse 1.5s infinite" }}>⚠</span>
              {overdueCount} overdue
            </div>
          )}
          <button onClick={fetchAll} className="btn-ghost" style={{
            background:"none", border:`1px solid ${T.border}`, borderRadius:8,
            color:T.muted, cursor:"pointer", padding:"7px 12px", fontSize:13,
            display:"flex", alignItems:"center", gap:6,
          }}>
            {loading ? <Spinner size={13} /> : "↻"} Refresh
          </button>
          <button onClick={() => setModal({ mode:"add" })} style={{
            background:`linear-gradient(135deg, #1a5fd4, ${T.blue})`,
            color:"#fff", border:"none", borderRadius:8,
            padding:"8px 18px", fontSize:13, fontWeight:600,
            cursor:"pointer", display:"flex", alignItems:"center", gap:7,
            boxShadow:`0 4px 16px ${T.blue}44`,
          }}>
            <span style={{ fontSize:16, lineHeight:1 }}>+</span> Add Activity
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1180, margin:"0 auto", padding:"28px 28px 60px" }}>

        {/* ── Stat cards (clickable filters) ── */}
        <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
          {[
            { key:"All",         label:"Total",       value:stats.total,      color:T.blue,   icon:"◈" },
            { key:"Pending",     label:"Pending",     value:stats.pending,    color:T.yellow, icon:"◷" },
            { key:"In Progress", label:"In Progress", value:stats.inProgress, color:T.blue,   icon:"◎" },
            { key:"Completed",   label:"Completed",   value:stats.completed,  color:T.green,  icon:"◉" },
          ].map(s => (
            <StatCard key={s.key} label={s.label} value={s.value}
              color={s.color} icon={s.icon}
              active={filter === s.key}
              onClick={() => setFilter(f => f === s.key ? "All" : s.key)}
            />
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          background:T.bg2, border:`1px solid ${T.border}`,
          borderRadius:12, padding:"14px 18px",
          display:"flex", alignItems:"center", gap:10,
          marginBottom:20, flexWrap:"wrap",
        }}>
          {/* Search */}
          <div style={{ position:"relative", flex:"1 1 200px", maxWidth:300 }}>
            <span style={{
              position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
              fontSize:14, color:T.muted, pointerEvents:"none",
            }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search activities or reasons…"
              style={{
                width:"100%", background:T.bg1,
                border:`1.5px solid ${searchFocus ? T.blue : T.border}`,
                borderRadius:8, padding:"8px 14px 8px 36px",
                color:T.text, fontSize:13, outline:"none",
                transition:"border-color .15s",
              }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16,
              }}>×</button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["All","Pending","In Progress","Completed"].map(f => (
              <button key={f} className={`pill-filter${filter===f?" active":""}`}
                onClick={() => setFilter(f)} style={{
                  padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                  border:`1px solid ${T.border}`, background:"none",
                  color:T.muted, cursor:"pointer", transition:"all .15s",
                }}>{f}</button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            background:T.bg1, border:`1px solid ${T.border}`,
            borderRadius:8, padding:"7px 10px", color:T.muted,
            fontSize:12, cursor:"pointer", outline:"none", marginLeft:"auto",
          }}>
            <option value="date-desc">Date ↓</option>
            <option value="date-asc" >Date ↑</option>
            <option value="name"     >Name A–Z</option>
            <option value="created"  >Recently Added</option>
          </select>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))", gap:14 }}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{
            background:T.bg2, border:`1px dashed ${T.border2}`,
            borderRadius:16, padding:"64px 32px", textAlign:"center",
          }}>
            <div style={{ fontSize:48, marginBottom:16 }}>
              {search || filter !== "All" ? "🔍" : "📭"}
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8 }}>
              {search || filter !== "All" ? "No matching activities" : "No activities yet"}
            </div>
            <div style={{ fontSize:14, color:T.muted, marginBottom:24, maxWidth:340, margin:"0 auto 24px" }}>
              {search || filter !== "All"
                ? "Try adjusting your search or filter."
                : "Click '+ Add Activity' to schedule your first one."}
            </div>
            {(search || filter !== "All") ? (
              <button onClick={() => { setSearch(""); setFilter("All"); }} className="btn-ghost" style={{
                padding:"9px 20px", borderRadius:8, border:`1px solid ${T.border}`,
                background:"none", color:T.muted, cursor:"pointer", fontSize:13,
              }}>Clear filters</button>
            ) : (
              <button onClick={() => setModal({ mode:"add" })} style={{
                padding:"10px 24px", borderRadius:8, border:"none",
                background:T.blue, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600,
              }}>+ Add Activity</button>
            )}
          </div>
        ) : (
          <>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))",
              gap:14,
            }}>
              {sorted.map((a, i) => (
                <ActivityCard key={a.id} activity={a} index={i}
                  onEdit={act => setModal({ mode:"edit", activity:act })}
                  onDelete={act => setDelTarget(act)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
            <div style={{ textAlign:"right", marginTop:16, fontSize:12, color:T.muted }}>
              {sorted.length} {sorted.length === 1 ? "activity" : "activities"}
              {(filter !== "All" || search) && " · filtered"}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <Modal mode={modal.mode} activity={modal.activity}
          onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {delTarget && (
        <DeleteConfirm activity={delTarget}
          onClose={() => setDelTarget(null)} onConfirm={handleDelete} />
      )}
      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
