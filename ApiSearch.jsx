@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Reset ─────────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background: #f7f5ff;
}

input, textarea, select {
  font-family: 'Inter', sans-serif;
}

select {
  appearance: none;
  -webkit-appearance: none;
}

input::placeholder,
textarea::placeholder {
  color: #9ca3af;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #f0ebff; }
::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }

/* ── Animations ─────────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
@keyframes expandIn {
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 500px; }
}
@keyframes chevronRotate {
  to { transform: rotate(90deg); }
}

/* ── Page wrapper ───────────────────────────────────────────────── */
.act-page {
  min-height: 100vh;
  background: #f7f5ff;
  font-family: 'Inter', sans-serif;
}

/* ── Topbar ─────────────────────────────────────────────────────── */
.act-topbar {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(106, 17, 203, 0.3);
}

.act-topbar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.act-topbar__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.act-topbar__title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.act-topbar__sub {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
}

.act-topbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.act-topbar__conn-err {
  background: rgba(220,38,38,0.3);
  border: 1px solid rgba(255,100,100,0.5);
  color: #fca5a5;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}

.act-topbar__refresh {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  padding: 7px 14px;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s;
}
.act-topbar__refresh:hover { background: rgba(255,255,255,0.25); }

.act-topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 8px;
  padding: 5px 12px;
}

.act-topbar__username {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

/* ── Body container ─────────────────────────────────────────────── */
.act-body {
  padding: 28px 32px;
}

/* ── Stat cards ─────────────────────────────────────────────────── */
.act-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 2px solid #e8e0ff;
  border-radius: 14px;
  padding: 20px 22px;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(106,17,203,0.07);
  transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
}
.stat-card:hover {
  box-shadow: 0 6px 24px rgba(106,17,203,0.15);
  transform: translateY(-2px);
}
.stat-card.active {
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px #e8d5ff;
}

.stat-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f9f8ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #6a11cb;
  transition: background 0.15s;
}
.stat-card.active .stat-card__icon { background: #f4f0ff; }

.stat-card__active-pill {
  font-size: 10px;
  font-weight: 700;
  color: #6a11cb;
  background: #f4f0ff;
  border: 1px solid #e8e0ff;
  border-radius: 20px;
  padding: 2px 8px;
  letter-spacing: 0.06em;
}

.stat-card__value {
  font-size: 34px;
  font-weight: 800;
  color: #6a11cb;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.stat-card__label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
  font-weight: 500;
}

/* ── Toolbar ────────────────────────────────────────────────────── */
.act-toolbar {
  background: #fff;
  border: 1px solid #e8e0ff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.act-search-wrap {
  position: relative;
  flex: 1 1 200px;
  max-width: 280px;
}

.act-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 14px;
  pointer-events: none;
}

.act-search {
  width: 100%;
  background: #f4f0ff;
  border: 1.5px solid #e8e0ff;
  border-radius: 8px;
  padding: 8px 12px 8px 32px;
  font-size: 13px;
  color: #1a1033;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.act-search:focus {
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px #e8d5ff;
}

.act-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}

.act-dropdown {
  background: #fff;
  border: 1px solid #e8e0ff;
  border-radius: 8px;
  padding: 7px 32px 7px 12px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a11cb' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  appearance: none;
  transition: border-color 0.15s;
}
.act-dropdown:hover { border-color: #c4b5fd; }
.act-dropdown:focus { border-color: #6a11cb; outline: none; }

.act-clear-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e8e0ff;
  background: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.act-clear-btn:hover { background: #f4f0ff; }

.act-new-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 4px 14px rgba(106,17,203,0.35);
  font-family: 'Inter', sans-serif;
  transition: opacity 0.15s, transform 0.15s;
}
.act-new-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.act-new-btn__plus { font-size: 17px; line-height: 1; }

/* ── Table ──────────────────────────────────────────────────────── */
.act-table {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e8e0ff;
  box-shadow: 0 2px 12px rgba(106,17,203,0.07);
  overflow: hidden;
}

.act-table__head {
  display: grid;
  grid-template-columns: 2.5fr 120px 140px 170px 90px;
  padding: 11px 20px;
  background: linear-gradient(135deg, #f8f5ff, #f0ebff);
  border-bottom: 1px solid #e8e0ff;
}

.act-table__th {
  font-size: 11px;
  font-weight: 700;
  color: #6a11cb;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.act-table__th--center { text-align: center; }

/* Row wrapper */
.act-row-wrap {
  border-bottom: 1px solid #e8e0ff;
  border-left: 3px solid transparent;
  transition: border-color 0.15s;
}
.act-row-wrap:last-child { border-bottom: none; }
.act-row-wrap.expanded { border-left-color: #6a11cb; }

/* Row grid */
.act-row {
  display: grid;
  grid-template-columns: 2.5fr 120px 140px 170px 90px;
  padding: 13px 20px;
  align-items: center;
  cursor: pointer;
  transition: background 0.12s;
  animation: fadeIn 0.2s ease both;
}
.act-row:hover { background: #faf7ff; }
.act-row.expanded { background: #f3eeff; }

/* Task cell */
.act-row__task { padding-right: 12px; min-width: 0; }

.act-row__task-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.act-row__chevron {
  font-size: 11px;
  color: #9ca3af;
  transition: transform 0.2s, color 0.15s;
  flex-shrink: 0;
}
.act-row__chevron.open {
  transform: rotate(90deg);
  color: #6a11cb;
}

.act-row__name {
  font-size: 14px;
  color: #1a1033;
  font-weight: 600;
  line-height: 1.4;
}

.act-row__meta {
  padding-left: 19px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.act-row__due-chip {
  font-size: 11px;
  border-radius: 20px;
  padding: 1px 8px;
  font-weight: 600;
}

.act-row__date {
  font-size: 11px;
  color: #9ca3af;
}

/* Assignee cell */
.act-row__assignee {
  display: flex;
  align-items: center;
  gap: 7px;
}

.act-row__assignee-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Created cell */
.act-row__created {
  font-size: 12px;
  color: #6b7280;
}

/* Action buttons in row */
.act-row__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.act-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #e8e0ff;
  background: none;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  color: #6a11cb;
}
.act-action-btn:hover { background: #f3eeff; }

.act-action-btn--del { color: #9ca3af; }
.act-action-btn--del:hover {
  color: #dc2626;
  border-color: #fca5a5;
  background: #fef2f2;
}

/* ── Detail Panel ───────────────────────────────────────────────── */
.detail-panel {
  padding: 20px 24px 20px 36px;
  background: linear-gradient(135deg, #faf7ff 0%, #f0ebff 100%);
  border-top: 1px dashed #d8b4fe;
  animation: expandIn 0.2s ease;
  overflow: hidden;
}

.detail-panel__inner {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

/* Reason section */
.detail-panel__reason { flex: 2 1 280px; }

.detail-panel__section-label {
  font-size: 11px;
  font-weight: 700;
  color: #6a11cb;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-panel__reason-box {
  background: #fff;
  border: 1px solid #e8e0ff;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 14px;
  color: #1a1033;
  line-height: 1.7;
  border-left: 4px solid #6a11cb;
}

.detail-panel__reason-empty {
  color: #9ca3af;
  font-style: italic;
}

/* Meta section */
.detail-panel__meta {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-panel__info-card {
  background: #fff;
  border: 1px solid #e8e0ff;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.detail-panel__info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-panel__info-label { color: #6b7280; }

.detail-panel__info-value {
  font-weight: 600;
  color: #1a1033;
}
.detail-panel__info-value--overdue { color: #dc2626; }
.detail-panel__info-value--small { font-weight: 500; font-size: 12px; }

.detail-panel__info-divider {
  height: 1px;
  background: #e8e0ff;
}

.detail-panel__assignee-val {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #1a1033;
}

/* Quick actions in panel */
.detail-panel__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-panel__btn {
  flex: 1;
  padding: 7px 4px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: opacity 0.15s, transform 0.15s;
  white-space: nowrap;
  text-align: center;
}
.detail-panel__btn:hover { opacity: 0.85; transform: translateY(-1px); }

.detail-panel__btn--edit {
  border: 1px solid #6a11cb;
  background: none;
  color: #6a11cb;
}

.detail-panel__btn--status {
  border: 1px solid #e8e0ff;
  background: #fff;
  color: #6b7280;
  font-weight: 500;
  font-size: 11px;
}

.detail-panel__btn--del {
  padding: 7px 10px;
  border: 1px solid #fca5a5;
  background: none;
  color: #dc2626;
  flex: 0;
}

/* ── Empty state ────────────────────────────────────────────────── */
.act-empty {
  padding: 56px 32px;
  text-align: center;
}
.act-empty__icon { font-size: 44px; margin-bottom: 12px; }
.act-empty__title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1033;
  margin-bottom: 6px;
}
.act-empty__sub { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }

.act-empty__clear-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid #e8e0ff;
  background: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.act-empty__clear-btn:hover { background: #f4f0ff; }

.act-empty__add-btn {
  padding: 9px 22px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
}

/* ── Skeleton ───────────────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, #f0ebff 25%, #e8dfff 50%, #f0ebff 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.skel-row {
  display: grid;
  grid-template-columns: 2.5fr 120px 140px 170px 90px;
  padding: 14px 20px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e8e0ff;
}
.skel-circle { border-radius: 50% !important; }
.skel-pill   { border-radius: 20px !important; }

/* ── Footer / Pagination ────────────────────────────────────────── */
.act-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.act-footer__count { font-size: 12px; color: #6b7280; }

.act-pagination { display: flex; gap: 6px; align-items: center; }

.pg-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #e8e0ff;
  background: #fff;
  color: #6a11cb;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s, border-color 0.15s;
}
.pg-btn:hover:not(:disabled) { background: #f3eeff; border-color: #c4b5fd; }
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.pg-num {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e8e0ff;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.pg-num:hover   { background: #f4f0ff; }
.pg-num.active  { background: #f4f0ff; border-color: #6a11cb; color: #6a11cb; }

/* ── Avatar ─────────────────────────────────────────────────────── */
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}

/* ── Status Badge ───────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid;
}

/* ── Spinner ────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

/* ── Toast ──────────────────────────────────────────────────────── */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  animation: toastIn 0.25s ease;
  font-size: 13px;
  font-weight: 500;
  min-width: 280px;
  max-width: 380px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast--success { background:#f0fdf4; border:1px solid #86efac; color:#16a34a; }
.toast--error   { background:#fef2f2; border:1px solid #fca5a5; color:#dc2626; }

/* ── Modal Overlay ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-box {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 24px 80px rgba(106,17,203,0.25);
  animation: slideUp 0.22s ease;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  border-radius: 16px 16px 0 0;
}

.modal-header__title { font-size: 16px; font-weight: 700; color: #fff; }
.modal-header__sub   { font-size: 12px; color: rgba(255,255,255,0.75); }

.modal-header__close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.15);
  cursor: pointer;
  font-size: 18px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.modal-footer {
  padding: 14px 24px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #e8e0ff;
}

/* ── Form fields ─────────────────────────────────────────────────── */
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  background: #fff;
  border: 1.5px solid #e8e0ff;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  color: #1a1033;
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px #e8d5ff;
}
.form-input--err,
.form-textarea--err { border-color: #f87171; }
.form-input--err:focus,
.form-textarea--err:focus { box-shadow: 0 0 0 3px #fee2e2; }

.form-textarea { resize: vertical; min-height: 80px; line-height: 1.6; }

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a11cb' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.form-error { font-size: 12px; color: #dc2626; }

/* ── Buttons ─────────────────────────────────────────────────────── */
.btn-cancel {
  padding: 9px 20px;
  border-radius: 8px;
  border: 1px solid #e8e0ff;
  background: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.btn-cancel:hover { background: #f4f0ff; }

.btn-primary {
  padding: 9px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;
}
.btn-primary:disabled { background: #c4b5fd; cursor: not-allowed; }

.btn-danger {
  padding: 9px 20px;
  border-radius: 8px;
  border: none;
  background: #dc2626;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Delete Confirm Modal ────────────────────────────────────────── */
.del-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 16px;
}

.del-modal__title  { font-size: 17px; font-weight: 700; color: #1a1033; margin-bottom: 6px; }
.del-modal__sub    { font-size: 13px; color: #6b7280; margin-bottom: 14px; }

.del-modal__card {
  background: #f4f0ff;
  border: 1px solid #e8e0ff;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
}
.del-modal__card-name { font-size: 14px; font-weight: 600; color: #1a1033; }
.del-modal__card-date { font-size: 12px; color: #9ca3af; margin-top: 3px; }

.del-modal__warn { font-size: 12px; color: #9ca3af; margin-bottom: 22px; }

.del-modal__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .act-stats { grid-template-columns: repeat(2, 1fr); }
  .act-table__head,
  .act-row,
  .skel-row {
    grid-template-columns: 1fr 100px 120px;
  }
  .act-table__th:nth-child(4),
  .act-table__th:nth-child(5),
  .act-row__created,
  .act-row__actions { display: none; }
}

@media (max-width: 600px) {
  .act-body     { padding: 16px; }
  .act-topbar   { padding: 0 16px; }
  .act-stats    { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .act-toolbar  { flex-direction: column; align-items: stretch; }
  .act-new-btn  { margin-left: 0; justify-content: center; }
}
