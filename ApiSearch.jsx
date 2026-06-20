import { useState, useEffect, useCallback, useRef } from "react";
import "./Activities.css";

const API = "http://10.177.44.58:4423/api";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;

const AV_COLORS = [
  "#6a11cb","#7c3aed","#2575fc","#0891b2",
  "#059669","#d97706","#db2777","#dc2626",
];

const STATUS_CFG = {
  "Pending":     { color: "#7c3aed", bg: "#f3e8ff", border: "#d8b4fe" },
  "In Progress": { color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  "Completed":   { color: "#065f46", bg: "#d1fae5", border: "#6ee7b7" },
};

/* ─── Pure helpers ───────────────────────────────────────────────────────── */
function getAvatarColor(name = "") {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AV_COLORS[Math.abs(hash) % AV_COLORS.length];
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getDueLabel(scheduledDate, status) {
  if (status === "Completed") return null;
  const diff = Math.ceil(
    (new Date(scheduledDate + "T00:00:00") - new Date()) / 86400000
  );
  if (diff < 0)  return { txt: `${Math.abs(diff)}d overdue`, color: "#dc2626", bg: "#fef2f2" };
  if (diff === 0) return { txt: "Due today",              color: "#d97706", bg: "#fef3c7" };
  if (diff <= 3)  return { txt: `Due in ${diff}d`,        color: "#d97706", bg: "#fef3c7" };
  return null;
}

/* ─── Tiny UI atoms ──────────────────────────────────────────────────────── */
function Spinner({ size = 16, color = "#fff" }) {
  return (
    <span
      className="spinner"
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.3)`,
        borderTopColor: color,
      }}
    />
  );
}

function Avatar({ name = "", size = 30 }) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: getAvatarColor(name),
        fontSize: size * 0.38,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG["Pending"];
  return (
    <span
      className="badge"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {status}
    </span>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toasts({ toasts, remove }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => remove(t.id)}
        >
          <span>{t.type === "error" ? "✕" : "✓"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

/* ─── Skeleton row ───────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="skel-row">
      <div className="skeleton" style={{ height: 15, width: "65%" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="skeleton skel-circle" style={{ height: 26, width: 26 }} />
        <div className="skeleton" style={{ height: 12, width: 44 }} />
      </div>
      <div className="skeleton skel-pill" style={{ height: 22, width: 80 }} />
      <div className="skeleton" style={{ height: 12, width: 100 }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <div className="skeleton" style={{ height: 28, width: 28, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 28, width: 28, borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ─── Detail Panel ───────────────────────────────────────────────────────── */
function DetailPanel({ activity, onEdit, onDelete, onStatusChange }) {
  const isOverdue =
    activity.scheduledDate < new Date().toISOString().split("T")[0] &&
    activity.status !== "Completed";

  const nextStatuses = ["Pending", "In Progress", "Completed"].filter(
    s => s !== activity.status
  );

  return (
    <div className="detail-panel">
      <div className="detail-panel__inner">

        {/* ── Why this task ── */}
        <div className="detail-panel__reason">
          <div className="detail-panel__section-label">
            <span>💡</span> Why this task?
          </div>
          <div className="detail-panel__reason-box">
            {activity.reason
              ? activity.reason
              : <span className="detail-panel__reason-empty">No reason provided.</span>
            }
          </div>
        </div>

        {/* ── Meta + actions ── */}
        <div className="detail-panel__meta">
          <div className="detail-panel__section-label">Details</div>

          <div className="detail-panel__info-card">
            {/* Scheduled */}
            <div className="detail-panel__info-row">
              <span className="detail-panel__info-label">Scheduled</span>
              <span className={`detail-panel__info-value${isOverdue ? " detail-panel__info-value--overdue" : ""}`}>
                {fmtDate(activity.scheduledDate)}
              </span>
            </div>

            <div className="detail-panel__info-divider" />

            {/* Assignee */}
            <div className="detail-panel__info-row">
              <span className="detail-panel__info-label">Assignee</span>
              <div className="detail-panel__assignee-val">
                <Avatar name={activity.assignee} size={20} />
                {activity.assignee || "—"}
              </div>
            </div>

            <div className="detail-panel__info-divider" />

            {/* Created */}
            <div className="detail-panel__info-row">
              <span className="detail-panel__info-label">Created</span>
              <span className="detail-panel__info-value detail-panel__info-value--small">
                {fmtDateTime(activity.createdAt)}
              </span>
            </div>

            {activity.updatedAt !== activity.createdAt && (
              <>
                <div className="detail-panel__info-divider" />
                <div className="detail-panel__info-row">
                  <span className="detail-panel__info-label">Updated</span>
                  <span className="detail-panel__info-value detail-panel__info-value--small">
                    {fmtDateTime(activity.updatedAt)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="detail-panel__actions">
            <button
              className="detail-panel__btn detail-panel__btn--edit"
              onClick={e => { e.stopPropagation(); onEdit(activity); }}
            >
              ✎ Edit
            </button>

            {nextStatuses.map(s => (
              <button
                key={s}
                className="detail-panel__btn detail-panel__btn--status"
                onClick={e => { e.stopPropagation(); onStatusChange(activity, s); }}
              >
                → {s}
              </button>
            ))}

            <button
              className="detail-panel__btn detail-panel__btn--del"
              onClick={e => { e.stopPropagation(); onDelete(activity); }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Add / Edit Modal ───────────────────────────────────────────────────── */
function Modal({ mode, activity, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    name:          isEdit ? activity.name           : "",
    reason:        isEdit ? activity.reason         : "",
    scheduledDate: isEdit ? activity.scheduledDate  : "",
    assignee:      isEdit ? (activity.assignee||"") : "",
    status:        isEdit ? activity.status         : "Pending",
  });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const firstRef = useRef();

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name = "Required";
    if (!form.reason.trim()) e.reason = "Required";
    if (!form.scheduledDate) e.scheduledDate = "Required";
    setErrs(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    await onSave(form);
    setBusy(false);
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-header__title">
              {isEdit ? "Edit Task" : "New Task"}
            </div>
            <div className="modal-header__sub">
              {isEdit ? "Update the task details" : "Schedule a new activity"}
            </div>
          </div>
          <button className="modal-header__close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Task Name *</label>
            <input
              ref={firstRef}
              className={`form-input${errs.name ? " form-input--err" : ""}`}
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Deploy ACE BAR to EISUATEXP02"
            />
            {errs.name && <span className="form-error">{errs.name}</span>}
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Why are we doing this? *</label>
            <textarea
              className={`form-textarea${errs.reason ? " form-textarea--err" : ""}`}
              rows={3}
              value={form.reason}
              onChange={set("reason")}
              placeholder="e.g. New CR for fund transfer flow fix in UAT environment"
            />
            {errs.reason && <span className="form-error">{errs.reason}</span>}
          </div>

          {/* Date + Assignee */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Scheduled Date *</label>
              <input
                type="date"
                className={`form-input${errs.scheduledDate ? " form-input--err" : ""}`}
                style={{ colorScheme: "light" }}
                value={form.scheduledDate}
                onChange={set("scheduledDate")}
              />
              {errs.scheduledDate && <span className="form-error">{errs.scheduledDate}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <input
                className="form-input"
                value={form.assignee}
                onChange={set("assignee")}
                placeholder="e.g. Ankit"
              />
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={set("status")}
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy && <Spinner size={14} />}
            {isEdit ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────────────────────── */
function DeleteConfirm({ activity, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 420, padding: 28 }}>
        <div className="del-icon-wrap">🗑</div>
        <div className="del-modal__title">Delete Task?</div>
        <div className="del-modal__sub">Permanently deleting:</div>
        <div className="del-modal__card">
          <div className="del-modal__card-name">{activity.name}</div>
          <div className="del-modal__card-date">{fmtDate(activity.scheduledDate)}</div>
        </div>
        <div className="del-modal__warn">
          This will remove it from data.txt permanently. This cannot be undone.
        </div>
        <div className="del-modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(); }}
          >
            {busy && <Spinner size={14} color="#fff" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function Activities() {
  const [activities,   setActivities]   = useState([]);
  const [stats,        setStats]        = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [loading,      setLoading]      = useState(true);
  const [connErr,      setConnErr]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterDate,   setFilterDate]   = useState("All Dates");
  const [page,         setPage]         = useState(1);
  const [expanded,     setExpanded]     = useState(null);
  const [modal,        setModal]        = useState(null);
  const [delTarget,    setDelTarget]    = useState(null);

  const { toasts, add: toast, remove: removeToast } = useToast();

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "All Status") params.set("status", filterStatus);
      if (search.trim())                 params.set("search", search.trim());

      const [aRes, sRes] = await Promise.all([
        fetch(`${API}/activities?${params}`),
        fetch(`${API}/stats`),
      ]);
      const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
      if (aData.success) setActivities(aData.data);
      if (sData.success) setStats(sData.data);
      setConnErr(false);
    } catch {
      setConnErr(true);
      toast("Cannot reach backend at " + API, "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); setExpanded(null); }, [filterStatus, filterDate, search]);

  /* ── CRUD ── */
  const handleSave = async form => {
    try {
      const isEdit = modal.mode === "edit";
      const res = await fetch(
        isEdit ? `${API}/activities/${modal.activity.id}` : `${API}/activities`,
        {
          method:  isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast(isEdit ? "Task updated." : "Task added.");
      setModal(null);
      fetchAll();
    } catch { toast("Save failed.", "error"); }
  };

  const handleDelete = async () => {
    try {
      const res  = await fetch(`${API}/activities/${delTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast("Task deleted.");
      setDelTarget(null);
      setExpanded(null);
      fetchAll();
    } catch { toast("Delete failed.", "error"); }
  };

  const handleStatusChange = async (activity, status) => {
    try {
      const res  = await fetch(`${API}/activities/${activity.id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) { toast(data.message, "error"); return; }
      toast(`Marked as ${status}.`);
      fetchAll();
    } catch { toast("Status update failed.", "error"); }
  };

  /* ── Date filter ── */
  const applyDateFilter = list => {
    if (filterDate === "All Dates") return list;
    const today = new Date().toISOString().split("T")[0];
    if (filterDate === "Today") return list.filter(a => a.scheduledDate === today);
    if (filterDate === "This Week") {
      const end = new Date(); end.setDate(end.getDate() + 7);
      return list.filter(a => a.scheduledDate >= today && a.scheduledDate <= end.toISOString().split("T")[0]);
    }
    if (filterDate === "This Month") return list.filter(a => a.scheduledDate.startsWith(today.slice(0, 7)));
    return list;
  };

  const displayed  = applyDateFilter(activities);
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageItems  = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter  = search || filterStatus !== "All Status" || filterDate !== "All Dates";

  const clearAll = () => { setSearch(""); setFilterStatus("All Status"); setFilterDate("All Dates"); };

  /* ── Render ── */
  return (
    <div className="act-page">

      {/* ── Topbar ── */}
      <header className="act-topbar">
        <div className="act-topbar__brand">
          <div className="act-topbar__icon">📋</div>
          <div>
            <div className="act-topbar__title">Activity Tracker</div>
            <div className="act-topbar__sub">EIS UAT Operations · SBI · {API}</div>
          </div>
        </div>

        <div className="act-topbar__right">
          {connErr && (
            <div className="act-topbar__conn-err">⚠ Server unreachable</div>
          )}
          <button className="act-topbar__refresh" onClick={fetchAll}>
            {loading ? <Spinner size={13} color="#fff" /> : "↻"} Refresh
          </button>
          <div className="act-topbar__user">
            <Avatar name="Ankit Jha" size={26} />
            <span className="act-topbar__username">Ankit Jha</span>
          </div>
        </div>
      </header>

      <div className="act-body">

        {/* ── Stat cards ── */}
        <div className="act-stats">
          {[
            { label: "Total Tasks",  value: stats.total,      key: "All Status",  icon: "◈" },
            { label: "In Progress",  value: stats.inProgress, key: "In Progress", icon: "◎" },
            { label: "Completed",    value: stats.completed,  key: "Completed",   icon: "◉" },
            { label: "Pending",      value: stats.pending,    key: "Pending",     icon: "◷" },
          ].map(s => (
            <div
              key={s.key}
              className={`stat-card${filterStatus === s.key ? " active" : ""}`}
              onClick={() => setFilterStatus(f => f === s.key ? "All Status" : s.key)}
            >
              <div className="stat-card__top">
                <div className="stat-card__icon">{s.icon}</div>
                {filterStatus === s.key && (
                  <span className="stat-card__active-pill">ACTIVE</span>
                )}
              </div>
              <div className="stat-card__value">{loading ? "—" : s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="act-toolbar">
          <div className="act-search-wrap">
            <span className="act-search-icon">🔍</span>
            <input
              className="act-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks or assignees..."
            />
            {search && (
              <button className="act-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>

          <select
            className="act-dropdown"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>

          <select
            className="act-dropdown"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          >
            <option>All Dates</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>

          {hasFilter && (
            <button className="act-clear-btn" onClick={clearAll}>× Clear</button>
          )}

          <button className="act-new-btn" onClick={() => setModal({ mode: "add" })}>
            <span className="act-new-btn__plus">+</span> New Task
          </button>
        </div>

        {/* ── Table ── */}
        <div className="act-table">

          {/* Head */}
          <div className="act-table__head">
            <div className="act-table__th">Task  (click to expand)</div>
            <div className="act-table__th">Assignee</div>
            <div className="act-table__th">Status</div>
            <div className="act-table__th">Created At</div>
            <div className="act-table__th act-table__th--center">Actions</div>
          </div>

          {/* Loading */}
          {loading && [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}

          {/* Empty */}
          {!loading && pageItems.length === 0 && (
            <div className="act-empty">
              <div className="act-empty__icon">📭</div>
              <div className="act-empty__title">No tasks found</div>
              <div className="act-empty__sub">
                {hasFilter
                  ? "Try adjusting your filters."
                  : "Click '+ New Task' to add your first one."}
              </div>
              {hasFilter
                ? <button className="act-empty__clear-btn" onClick={clearAll}>Clear filters</button>
                : <button className="act-empty__add-btn" onClick={() => setModal({ mode: "add" })}>+ New Task</button>
              }
            </div>
          )}

          {/* Rows */}
          {!loading && pageItems.map((activity, i) => {
            const isExp = expanded === activity.id;
            const dl    = getDueLabel(activity.scheduledDate, activity.status);

            return (
              <div
                key={activity.id}
                className={`act-row-wrap${isExp ? " expanded" : ""}`}
              >
                {/* Grid row */}
                <div
                  className={`act-row${isExp ? " expanded" : ""}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => setExpanded(isExp ? null : activity.id)}
                >
                  {/* Task */}
                  <div className="act-row__task">
                    <div className="act-row__task-name">
                      <span className={`act-row__chevron${isExp ? " open" : ""}`}>▶</span>
                      <span className="act-row__name">{activity.name}</span>
                    </div>
                    <div className="act-row__meta">
                      {dl && (
                        <span
                          className="act-row__due-chip"
                          style={{ color: dl.color, background: dl.bg }}
                        >
                          {dl.txt}
                        </span>
                      )}
                      <span className="act-row__date">📅 {fmtDate(activity.scheduledDate)}</span>
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="act-row__assignee">
                    <Avatar name={activity.assignee} size={26} />
                    <span className="act-row__assignee-name">{activity.assignee || "—"}</span>
                  </div>

                  {/* Status */}
                  <div><Badge status={activity.status} /></div>

                  {/* Created */}
                  <div className="act-row__created">{fmtDateTime(activity.createdAt)}</div>

                  {/* Actions */}
                  <div className="act-row__actions">
                    <button
                      className="act-action-btn"
                      title="Edit"
                      onClick={e => {
                        e.stopPropagation();
                        setModal({ mode: "edit", activity });
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="act-action-btn act-action-btn--del"
                      title="Delete"
                      onClick={e => {
                        e.stopPropagation();
                        setDelTarget(activity);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Detail panel */}
                {isExp && (
                  <DetailPanel
                    activity={activity}
                    onEdit={act => setModal({ mode: "edit", activity: act })}
                    onDelete={act => setDelTarget(act)}
                    onStatusChange={handleStatusChange}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {displayed.length > 0 && (
          <div className="act-footer">
            <span className="act-footer__count">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayed.length)} of {displayed.length} tasks
              {hasFilter && " · filtered"}
            </span>

            {totalPages > 1 && (
              <div className="act-pagination">
                <button
                  className="pg-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`pg-num${n === page ? " active" : ""}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}

                <button
                  className="pg-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <Modal
          mode={modal.mode}
          activity={modal.activity}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {delTarget && (
        <DeleteConfirm
          activity={delTarget}
          onClose={() => setDelTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toasts toasts={toasts} remove={removeToast} />
    </div>
  );
}
