import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://10.177.44.58:4423/api";

/* ─── Theme ──────────────────────────────────────────────────────────────────── */
const P = {
  grad:   "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
  purple: "#6a11cb",
  blue:   "#2575fc",
  light:  "#f4f0ff",
  border: "#e8e0ff",
  text:   "#1a1033",
  muted:  "#6b7280",
  bg:     "#f7f5ff",
};

/* ─── Avatar Colors ──────────────────────────────────────────────────────────── */
const AV_COLORS = ["#6a11cb","#7c3aed","#2575fc","#0891b2","#059669","#d97706","#db2777","#dc2626"];
const getColor  = (n="") => { let h=0; for(let c of n) h=c.charCodeAt(0)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length]; };
const getInit   = (n="") => n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";

/* ─── Status ─────────────────────────────────────────────────────────────────── */
const S_CFG = {
  "Pending":     { color:"#7c3aed", bg:"#f3e8ff", border:"#d8b4fe" },
  "In Progress": { color:"#1d4ed8", bg:"#dbeafe", border:"#93c5fd" },
  "Completed":   { color:"#065f46", bg:"#d1fae5", border:"#6ee7b7" },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmtDateTime = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US",{month:"numeric",day:"numeric",year:"numeric"})
    +" "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});
};
const fmtDate = d => {
  if (!d) return "—";
  return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
};
const daysLabel = (d, status) => {
  if (status === "Completed") return null;
  const diff = Math.ceil((new Date(d+"T00:00:00")-new Date())/86400000);
  if (diff < 0)  return { txt:`${Math.abs(diff)}d overdue`, c:"#dc2626", bg:"#fef2f2" };
  if (diff === 0) return { txt:"Due today",    c:"#d97706", bg:"#fef3c7" };
  if (diff <= 3)  return { txt:`Due in ${diff}d`, c:"#d97706", bg:"#fef3c7" };
  return null;
};

/* ─── CSS ────────────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${P.bg};font-family:'Inter',sans-serif;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:#f0ebff;}
  ::-webkit-scrollbar-thumb{background:#c4b5fd;border-radius:4px;}
  input::placeholder,textarea::placeholder{color:#9ca3af;}
  select{appearance:none;-webkit-appearance:none;}

  @keyframes fadeIn  {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp {from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes spin    {to{transform:rotate(360deg)}}
  @keyframes toastIn {from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes shimmer {0%{background-position:-400px 0}100%{background-position:400px 0}}
  @keyframes expandIn{from{opacity:0;max-height:0}to{opacity:1;max-height:400px}}

  .tr-row { cursor:pointer; transition:background .12s; }
  .tr-row:hover { background:#faf7ff !important; }
  .tr-row.expanded { background:#f3eeff !important; border-left:3px solid ${P.purple} !important; }
  .stat-card{cursor:pointer;transition:box-shadow .18s,transform .18s,border-color .18s;}
  .stat-card:hover{box-shadow:0 6px 24px rgba(106,17,203,.15)!important;transform:translateY(-2px);}
  .stat-card.active{border-color:${P.purple}!important;box-shadow:0 0 0 3px #e8d5ff!important;}
  .action-btn:hover{background:#f3eeff!important;}
  .del-btn:hover{color:#dc2626!important;border-color:#fca5a5!important;background:#fef2f2!important;}
  .new-btn:hover{opacity:.9;transform:translateY(-1px);}
  .new-btn{transition:opacity .15s,transform .15s;}
  .pg-btn:hover:not(:disabled){background:#f3eeff!important;border-color:#c4b5fd!important;}
  .pg-btn:disabled{opacity:.35;cursor:not-allowed;}
  .menu-item:hover{background:#f3eeff!important;}
  .inp-field:focus{border-color:${P.purple}!important;box-shadow:0 0 0 3px #e8d5ff!important;outline:none!important;}
  .dropdown:hover{border-color:#c4b5fd!important;}

  .skeleton{
    background:linear-gradient(90deg,#f0ebff 25%,#e8dfff 50%,#f0ebff 75%);
    background-size:400px 100%;
    animation:shimmer 1.4s infinite;
    border-radius:6px;
  }
`;

/* ─── Spinner ────────────────────────────────────────────────────────────────── */
const Spin = ({size=16,color="#fff"}) => (
  <span style={{display:"inline-block",width:size,height:size,border:`2px solid rgba(255,255,255,.3)`,
    borderTopColor:color,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>
);

/* ─── Avatar ─────────────────────────────────────────────────────────────────── */
const Avatar = ({name,size=30}) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:getColor(name||"?"),
    display:"flex",alignItems:"center",justifyContent:"center",
    color:"#fff",fontSize:size*.38,fontWeight:700,flexShrink:0,userSelect:"none"}}>
    {getInit(name)}
  </div>
);

/* ─── Badge ──────────────────────────────────────────────────────────────────── */
const Badge = ({status}) => {
  const c = S_CFG[status]||S_CFG["Pending"];
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 11px",
    borderRadius:20,background:c.bg,color:c.color,border:`1px solid ${c.border}`,
    fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{status}</span>;
};

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function Toasts({toasts,remove}){
  return(
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>remove(t.id)} style={{
          padding:"12px 16px",borderRadius:10,cursor:"pointer",animation:"toastIn .25s ease",
          background:t.type==="error"?"#fef2f2":"#f0fdf4",
          border:`1px solid ${t.type==="error"?"#fca5a5":"#86efac"}`,
          color:t.type==="error"?"#dc2626":"#16a34a",
          fontSize:13,fontWeight:500,minWidth:280,
          boxShadow:"0 4px 20px rgba(0,0,0,.12)",
          display:"flex",alignItems:"center",gap:8,
        }}><span>{t.type==="error"?"✕":"✓"}</span>{t.msg}</div>
      ))}
    </div>
  );
}
function useToast(){
  const [toasts,setToasts]=useState([]);
  const add=useCallback((msg,type="success")=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);
  const remove=useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  return{toasts,add,remove};
}

/* ─── Task Detail Panel (expanded row) ──────────────────────────────────────── */
function DetailPanel({activity,onEdit,onDelete,onStatusChange}){
  const od   = activity.scheduledDate < new Date().toISOString().split("T")[0] && activity.status!=="Completed";
  const next = ["Pending","In Progress","Completed"].filter(s=>s!==activity.status);

  return(
    <div style={{
      padding:"20px 24px 20px 36px",
      background:"linear-gradient(135deg,#faf7ff 0%,#f0ebff 100%)",
      borderTop:"1px dashed #d8b4fe",
      animation:"expandIn .2s ease",
    }}>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

        {/* Reason block */}
        <div style={{flex:"2 1 280px"}}>
          <div style={{fontSize:11,fontWeight:700,color:P.purple,letterSpacing:".08em",
            textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14}}>💡</span> Why this task?
          </div>
          <div style={{
            background:"#fff",border:`1px solid ${P.border}`,borderRadius:10,
            padding:"14px 16px",fontSize:14,color:P.text,lineHeight:1.7,
            borderLeft:`4px solid ${P.purple}`,
          }}>
            {activity.reason || <span style={{color:P.muted,fontStyle:"italic"}}>No reason provided.</span>}
          </div>
        </div>

        {/* Meta info */}
        <div style={{flex:"1 1 200px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:11,fontWeight:700,color:P.purple,letterSpacing:".08em",
            textTransform:"uppercase",marginBottom:0}}>Details</div>

          <div style={{background:"#fff",border:`1px solid ${P.border}`,borderRadius:10,padding:"12px 14px",
            display:"flex",flexDirection:"column",gap:8,fontSize:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:P.muted}}>Scheduled</span>
              <span style={{fontWeight:600,color:od?"#dc2626":P.text}}>{fmtDate(activity.scheduledDate)}</span>
            </div>
            <div style={{height:1,background:P.border}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:P.muted}}>Assignee</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Avatar name={activity.assignee} size={20}/>
                <span style={{fontWeight:600,color:P.text}}>{activity.assignee||"—"}</span>
              </div>
            </div>
            <div style={{height:1,background:P.border}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:P.muted}}>Created</span>
              <span style={{fontWeight:500,color:P.text,fontSize:12}}>{fmtDateTime(activity.createdAt)}</span>
            </div>
            {activity.updatedAt !== activity.createdAt && (
              <>
                <div style={{height:1,background:P.border}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:P.muted}}>Updated</span>
                  <span style={{fontWeight:500,color:P.text,fontSize:12}}>{fmtDateTime(activity.updatedAt)}</span>
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div style={{display:"flex",gap:6",flexWrap:"wrap"}}>
            <button onClick={e=>{e.stopPropagation();onEdit(activity);}} style={{
              flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${P.purple}`,
              background:"none",color:P.purple,cursor:"pointer",fontSize:12,fontWeight:600,
            }}>✎ Edit</button>
            {next.map(s=>(
              <button key={s} onClick={e=>{e.stopPropagation();onStatusChange(activity,s);}} style={{
                flex:1,padding:"7px 4px",borderRadius:8,border:`1px solid ${P.border}`,
                background:"#fff",color:P.muted,cursor:"pointer",fontSize:11,fontWeight:500,
                whiteSpace:"nowrap",
              }}>→ {s}</button>
            ))}
            <button onClick={e=>{e.stopPropagation();onDelete(activity);}} style={{
              padding:"7px 10px",borderRadius:8,border:"1px solid #fca5a5",
              background:"none",color:"#dc2626",cursor:"pointer",fontSize:12,
            }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────────── */
function Modal({mode,activity,onClose,onSave}){
  const isEdit=mode==="edit";
  const [form,setForm]=useState({
    name:          isEdit?activity.name:"",
    reason:        isEdit?activity.reason:"",
    scheduledDate: isEdit?activity.scheduledDate:"",
    assignee:      isEdit?(activity.assignee||""):"",
    status:        isEdit?activity.status:"Pending",
  });
  const [errs,setErrs]=useState({});
  const [busy,setBusy]=useState(false);
  const ref=useRef();
  useEffect(()=>ref.current?.focus(),[]);
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);
    return()=>document.removeEventListener("keydown",h);
  },[onClose]);

  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const validate=()=>{
    const e={};
    if(!form.name.trim())   e.name="Required";
    if(!form.reason.trim()) e.reason="Required";
    if(!form.scheduledDate) e.scheduledDate="Required";
    setErrs(e);return!Object.keys(e).length;
  };
  const submit=async()=>{if(!validate())return;setBusy(true);await onSave(form);setBusy(false);};

  const inp=err=>({
    width:"100%",background:"#fff",fontFamily:"inherit",
    border:`1.5px solid ${err?"#f87171":P.border}`,
    borderRadius:8,padding:"9px 12px",fontSize:14,color:P.text,
    outline:"none",transition:"border-color .15s,box-shadow .15s",
  });
  const lbl={fontSize:12,fontWeight:600,color:"#374151",display:"block",
    marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"};

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#fff",borderRadius:16,width:"100%",maxWidth:500,
        boxShadow:"0 24px 80px rgba(106,17,203,.25)",
        animation:"slideUp .22s ease",maxHeight:"90vh",overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{
          padding:"0 24px",height:60,display:"flex",alignItems:"center",
          justifyContent:"space-between",borderBottom:`1px solid ${P.border}`,
          background:P.grad,borderRadius:"16px 16px 0 0",
        }}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
              {isEdit?"Edit Task":"New Task"}
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.75)"}}>
              {isEdit?"Update the task details":"Schedule a new activity"}
            </div>
          </div>
          <button onClick={onClose} style={{
            width:28,height:28,borderRadius:8,border:"1px solid rgba(255,255,255,.3)",
            background:"rgba(255,255,255,.15)",cursor:"pointer",fontSize:18,
            color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:15}}>
          <div>
            <label style={lbl}>Task Name *</label>
            <input ref={ref} className="inp-field" value={form.name} onChange={set("name")}
              placeholder="e.g. Deploy ACE BAR to EISUATEXP02" style={inp(errs.name)}/>
            {errs.name&&<span style={{fontSize:12,color:"#dc2626"}}>{errs.name}</span>}
          </div>

          <div>
            <label style={lbl}>Why are we doing this? *</label>
            <textarea className="inp-field" value={form.reason} onChange={set("reason")} rows={3}
              placeholder="e.g. New CR for fund transfer flow fix in UAT environment"
              style={{...inp(errs.reason),resize:"vertical",minHeight:80,lineHeight:1.6}}/>
            {errs.reason&&<span style={{fontSize:12,color:"#dc2626"}}>{errs.reason}</span>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={lbl}>Scheduled Date *</label>
              <input type="date" className="inp-field" value={form.scheduledDate}
                onChange={set("scheduledDate")} style={{...inp(errs.scheduledDate),colorScheme:"light"}}/>
              {errs.scheduledDate&&<span style={{fontSize:12,color:"#dc2626"}}>{errs.scheduledDate}</span>}
            </div>
            <div>
              <label style={lbl}>Assignee</label>
              <input className="inp-field" value={form.assignee} onChange={set("assignee")}
                placeholder="e.g. Ankit" style={inp(false)}/>
            </div>
          </div>

          <div>
            <label style={lbl}>Status</label>
            <select className="inp-field" value={form.status} onChange={set("status")}
              style={{...inp(false),cursor:"pointer",
                backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a11cb' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
                backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",appearance:"none"}}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px 20px",display:"flex",justifyContent:"flex-end",
          gap:10,borderTop:`1px solid ${P.border}`}}>
          <button onClick={onClose} style={{
            padding:"9px 20px",borderRadius:8,border:`1px solid ${P.border}`,
            background:"none",color:P.muted,cursor:"pointer",fontSize:13,fontWeight:500,
          }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{
            padding:"9px 24px",borderRadius:8,border:"none",
            background:busy?"#c4b5fd":P.grad,
            color:"#fff",cursor:busy?"not-allowed":"pointer",
            fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,
          }}>
            {busy&&<Spin size={14}/>}
            {isEdit?"Save Changes":"Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────────────────────────── */
function DeleteConfirm({activity,onClose,onConfirm}){
  const [busy,setBusy]=useState(false);
  return(
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#fff",borderRadius:16,width:"100%",maxWidth:420,padding:28,
        boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"slideUp .22s ease",
      }}>
        <div style={{width:48,height:48,borderRadius:12,background:"#fef2f2",
          border:"1px solid #fca5a5",display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:22,marginBottom:16}}>🗑</div>
        <div style={{fontSize:17,fontWeight:700,color:P.text,marginBottom:6}}>Delete Task?</div>
        <div style={{fontSize:13,color:P.muted,marginBottom:14}}>Permanently deleting:</div>
        <div style={{background:P.light,border:`1px solid ${P.border}`,borderRadius:8,
          padding:"10px 14px",marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:600,color:P.text}}>{activity.name}</div>
          <div style={{fontSize:12,color:P.muted,marginTop:3}}>{fmtDate(activity.scheduledDate)}</div>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:22}}>
          This will remove it from data.txt permanently and cannot be undone.
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 20px",borderRadius:8,
            border:`1px solid ${P.border}`,background:"none",color:P.muted,cursor:"pointer",fontSize:13}}>
            Cancel
          </button>
          <button disabled={busy} onClick={async()=>{setBusy(true);await onConfirm();}} style={{
            padding:"9px 20px",borderRadius:8,border:"none",background:"#dc2626",
            color:"#fff",cursor:busy?"not-allowed":"pointer",
            fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,
          }}>
            {busy&&<Spin size={14} color="#fff"/>} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Row ───────────────────────────────────────────────────────────── */
function SkelRow(){
  return(
    <div style={{display:"grid",gridTemplateColumns:"2.5fr 120px 140px 170px 90px",
      padding:"14px 20px",alignItems:"center",gap:8,borderBottom:`1px solid ${P.border}`}}>
      <div className="skeleton" style={{height:15,width:"65%"}}/>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div className="skeleton" style={{height:28,width:28,borderRadius:"50%"}}/>
        <div className="skeleton" style={{height:12,width:44}}/>
      </div>
      <div className="skeleton" style={{height:22,width:80,borderRadius:20}}/>
      <div className="skeleton" style={{height:12,width:100}}/>
      <div style={{display:"flex",justifyContent:"center",gap:6}}>
        <div className="skeleton" style={{height:28,width:28,borderRadius:6}}/>
        <div className="skeleton" style={{height:28,width:28,borderRadius:6}}/>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;

export default function Activities(){
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState({total:0,pending:0,inProgress:0,completed:0});
  const [loading,    setLoading]    = useState(true);
  const [connErr,    setConnErr]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [fStatus,    setFStatus]    = useState("All Status");
  const [fDate,      setFDate]      = useState("All Dates");
  const [page,       setPage]       = useState(1);
  const [expanded,   setExpanded]   = useState(null);   // id of expanded row
  const [modal,      setModal]      = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);
  const {toasts,add:toast,remove:removeToast} = useToast();

  /* fetch */
  const fetchAll = useCallback(async()=>{
    try{
      const p = new URLSearchParams();
      if(fStatus!=="All Status") p.set("status",fStatus);
      if(search.trim())          p.set("search",search.trim());
      const [aRes,sRes] = await Promise.all([
        fetch(`${API}/activities?${p}`),
        fetch(`${API}/stats`),
      ]);
      const [aData,sData] = await Promise.all([aRes.json(),sRes.json()]);
      if(aData.success) setActivities(aData.data);
      if(sData.success) setStats(sData.data);
      setConnErr(false);
    }catch{
      setConnErr(true);
      toast("Cannot reach backend at "+API,"error");
    }finally{
      setLoading(false);
    }
  },[fStatus,search]);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{setPage(1);setExpanded(null);},[fStatus,fDate,search]);
  useEffect(()=>{
    const h=()=>{};
    document.addEventListener("click",h);
    return()=>document.removeEventListener("click",h);
  },[]);

  /* CRUD */
  const handleSave = async(form)=>{
    try{
      const isEdit=modal.mode==="edit";
      const res=await fetch(
        isEdit?`${API}/activities/${modal.activity.id}`:`${API}/activities`,
        {method:isEdit?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}
      );
      const data=await res.json();
      if(!data.success){toast(data.message,"error");return;}
      toast(isEdit?"Task updated.":"Task added.");
      setModal(null);fetchAll();
    }catch{toast("Save failed.","error");}
  };

  const handleDelete=async()=>{
    try{
      const res=await fetch(`${API}/activities/${delTarget.id}`,{method:"DELETE"});
      const data=await res.json();
      if(!data.success){toast(data.message,"error");return;}
      toast("Task deleted.");
      setDelTarget(null);setExpanded(null);fetchAll();
    }catch{toast("Delete failed.","error");}
  };

  const handleStatusChange=async(activity,status)=>{
    try{
      const res=await fetch(`${API}/activities/${activity.id}/status`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status}),
      });
      const data=await res.json();
      if(!data.success){toast(data.message,"error");return;}
      toast(`Marked as ${status}.`);fetchAll();
    }catch{toast("Status update failed.","error");}
  };

  /* date filter */
  const applyDateFilter=(list)=>{
    if(fDate==="All Dates") return list;
    const today=new Date().toISOString().split("T")[0];
    if(fDate==="Today") return list.filter(a=>a.scheduledDate===today);
    if(fDate==="This Week"){
      const end=new Date();end.setDate(end.getDate()+7);
      return list.filter(a=>a.scheduledDate>=today&&a.scheduledDate<=end.toISOString().split("T")[0]);
    }
    if(fDate==="This Month") return list.filter(a=>a.scheduledDate.startsWith(today.slice(0,7)));
    return list;
  };

  const displayed  = applyDateFilter(activities);
  const totalPages = Math.max(1,Math.ceil(displayed.length/PAGE_SIZE));
  const pageItems  = displayed.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const dropStyle={
    background:"#fff",border:`1px solid ${P.border}`,borderRadius:8,
    padding:"7px 32px 7px 12px",fontSize:13,color:"#374151",
    cursor:"pointer",outline:"none",fontFamily:"inherit",fontWeight:500,
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a11cb' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
    backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",appearance:"none",
  };

  return(
    <div style={{minHeight:"100vh",background:P.bg,fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>

      {/* ── Top Header ── */}
      <div style={{
        background:P.grad,padding:"0 32px",height:64,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        boxShadow:"0 4px 20px rgba(106,17,203,.3)",
        position:"sticky",top:0,zIndex:50,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:38,height:38,borderRadius:10,
            background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.3)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
          }}>📋</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"-.02em"}}>
              Activity Tracker
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>
              EIS UAT Operations · SBI · {API}
            </div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {connErr&&(
            <div style={{background:"rgba(220,38,38,.3)",border:"1px solid rgba(255,100,100,.5)",
              color:"#fca5a5",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600}}>
              ⚠ Server unreachable
            </div>
          )}
          <button onClick={fetchAll} style={{
            background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
            borderRadius:8,color:"#fff",cursor:"pointer",padding:"7px 14px",
            fontSize:13,display:"flex",alignItems:"center",gap:6,
          }}>↻ Refresh</button>
          <div style={{display:"flex",alignItems:"center",gap:8,
            background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",
            borderRadius:8,padding:"5px 12px"}}>
            <Avatar name="Ankit Jha" size={26}/>
            <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>Ankit Jha</span>
          </div>
        </div>
      </div>

      <div style={{padding:"28px 32px"}}>

        {/* ── Stat cards ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
          {[
            {label:"Total Tasks",  value:stats.total,      key:"All Status", icon:"◈"},
            {label:"In Progress",  value:stats.inProgress, key:"In Progress",icon:"◎"},
            {label:"Completed",    value:stats.completed,  key:"Completed",  icon:"◉"},
            {label:"Pending",      value:stats.pending,    key:"Pending",    icon:"◷"},
          ].map(s=>(
            <div key={s.key} className={`stat-card${fStatus===s.key?" active":""}`}
              onClick={()=>setFStatus(f=>f===s.key?"All Status":s.key)}
              style={{
                background:"#fff",
                border:`2px solid ${fStatus===s.key?P.purple:P.border}`,
                borderRadius:14,padding:"20px 22px",
                boxShadow:fStatus===s.key?"0 0 0 3px #e8d5ff":"0 1px 6px rgba(106,17,203,.07)",
              }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <span style={{
                  fontSize:22,width:40,height:40,borderRadius:10,
                  background:fStatus===s.key?P.light:"#f9f8ff",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:P.purple,
                }}>{s.icon}</span>
                {fStatus===s.key&&(
                  <span style={{fontSize:10,fontWeight:700,color:P.purple,
                    background:P.light,border:`1px solid ${P.border}`,
                    borderRadius:20,padding:"2px 8px",letterSpacing:".06em"}}>ACTIVE</span>
                )}
              </div>
              <div style={{fontSize:34,fontWeight:800,color:P.purple,
                fontVariantNumeric:"tabular-nums",letterSpacing:"-.03em"}}>
                {loading?"—":s.value}
              </div>
              <div style={{fontSize:13,color:P.muted,marginTop:2,fontWeight:500}}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          background:"#fff",border:`1px solid ${P.border}`,borderRadius:12,
          padding:"12px 16px",marginBottom:18,
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
        }}>
          <div style={{position:"relative",flex:"1 1 200px",maxWidth:280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
              color:P.muted,fontSize:14,pointerEvents:"none"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search tasks or assignees..."
              className="inp-field"
              style={{width:"100%",background:P.light,border:`1.5px solid ${P.border}`,
                borderRadius:8,padding:"8px 12px 8px 32px",fontSize:13,
                color:P.text,outline:"none",fontFamily:"inherit"}}/>
            {search&&(
              <button onClick={()=>setSearch("")} style={{position:"absolute",right:8,
                top:"50%",transform:"translateY(-50%)",background:"none",
                border:"none",color:P.muted,cursor:"pointer",fontSize:15}}>×</button>
            )}
          </div>

          <select className="dropdown" value={fStatus} onChange={e=>setFStatus(e.target.value)} style={dropStyle}>
            <option>All Status</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>

          <select className="dropdown" value={fDate} onChange={e=>setFDate(e.target.value)} style={dropStyle}>
            <option>All Dates</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>

          {(search||fStatus!=="All Status"||fDate!=="All Dates")&&(
            <button onClick={()=>{setSearch("");setFStatus("All Status");setFDate("All Dates");}} style={{
              padding:"7px 14px",borderRadius:8,border:`1px solid ${P.border}`,
              background:"none",color:P.muted,cursor:"pointer",fontSize:12,
            }}>× Clear</button>
          )}

          <button className="new-btn" onClick={()=>setModal({mode:"add"})} style={{
            marginLeft:"auto",background:P.grad,color:"#fff",border:"none",
            borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:600,
            cursor:"pointer",display:"flex",alignItems:"center",gap:7,
            boxShadow:"0 4px 14px rgba(106,17,203,.35)",
          }}>
            <span style={{fontSize:17,lineHeight:1}}>+</span> New Task
          </button>
        </div>

        {/* ── Table ── */}
        <div style={{
          background:"#fff",borderRadius:14,border:`1px solid ${P.border}`,
          boxShadow:"0 2px 12px rgba(106,17,203,.07)",overflow:"hidden",
        }}>
          {/* Head */}
          <div style={{
            display:"grid",gridTemplateColumns:"2.5fr 120px 140px 170px 90px",
            padding:"11px 20px",background:`linear-gradient(135deg,#f8f5ff,#f0ebff)`,
            borderBottom:`1px solid ${P.border}`,
          }}>
            {["Task  (click to expand)","Assignee","Status","Created At","Actions"].map((h,i)=>(
              <div key={h} style={{
                fontSize:11,fontWeight:700,color:P.purple,
                letterSpacing:".06em",textTransform:"uppercase",
                textAlign:i===4?"center":"left",
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {loading?(
            [1,2,3,4,5].map(i=><SkelRow key={i}/>)
          ):pageItems.length===0?(
            <div style={{padding:"56px 32px",textAlign:"center"}}>
              <div style={{fontSize:44,marginBottom:12}}>📭</div>
              <div style={{fontSize:16,fontWeight:600,color:P.text,marginBottom:6}}>No tasks found</div>
              <div style={{fontSize:13,color:P.muted,marginBottom:20}}>
                {search||fStatus!=="All Status"||fDate!=="All Dates"
                  ?"Try adjusting your filters."
                  :"Click '+ New Task' to add your first one."}
              </div>
              {(search||fStatus!=="All Status"||fDate!=="All Dates")
                ?<button onClick={()=>{setSearch("");setFStatus("All Status");setFDate("All Dates");}} style={{
                    padding:"8px 18px",borderRadius:8,border:`1px solid ${P.border}`,
                    background:"none",color:P.muted,cursor:"pointer",fontSize:13}}>
                    Clear filters
                  </button>
                :<button onClick={()=>setModal({mode:"add"})} style={{
                    padding:"9px 22px",borderRadius:8,border:"none",
                    background:P.grad,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>
                    + New Task
                  </button>
              }
            </div>
          ):(
            pageItems.map((a,i)=>{
              const isExp = expanded===a.id;
              const dl    = daysLabel(a.scheduledDate,a.status);
              return(
                <div key={a.id} style={{
                  borderBottom:i<pageItems.length-1?`1px solid ${P.border}`:"none",
                  borderLeft:isExp?`3px solid ${P.purple}`:"3px solid transparent",
                  transition:"border-color .15s",
                }}>
                  {/* Main row */}
                  <div className={`tr-row${isExp?" expanded":""}`}
                    onClick={()=>setExpanded(isExp?null:a.id)}
                    style={{
                      display:"grid",gridTemplateColumns:"2.5fr 120px 140px 170px 90px",
                      padding:"13px 20px",alignItems:"center",
                      animation:`fadeIn .2s ease ${i*.03}s both`,
                    }}>

                    {/* Task */}
                    <div style={{paddingRight:12,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{
                          fontSize:13,color:isExp?P.purple:P.muted,
                          transition:"transform .15s",
                          display:"inline-block",
                          transform:isExp?"rotate(90deg)":"rotate(0deg)",
                        }}>▶</span>
                        <span style={{fontSize:14,color:P.text,fontWeight:600,lineHeight:1.4}}>
                          {a.name}
                        </span>
                      </div>
                      <div style={{paddingLeft:22,marginTop:3,display:"flex",alignItems:"center",gap:8}}>
                        {dl&&(
                          <span style={{fontSize:11,color:dl.c,background:dl.bg,
                            borderRadius:20,padding:"1px 8px",fontWeight:600}}>
                            {dl.txt}
                          </span>
                        )}
                        <span style={{fontSize:11,color:P.muted}}>
                          📅 {fmtDate(a.scheduledDate)}
                        </span>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Avatar name={a.assignee} size={26}/>
                      <span style={{fontSize:13,color:"#374151",fontWeight:500,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {a.assignee||"—"}
                      </span>
                    </div>

                    {/* Status */}
                    <div><Badge status={a.status}/></div>

                    {/* Created */}
                    <div style={{fontSize:12,color:P.muted}}>{fmtDateTime(a.createdAt)}</div>

                    {/* Actions */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <button className="action-btn"
                        onClick={e=>{e.stopPropagation();setModal({mode:"edit",activity:a});}}
                        style={{width:30,height:30,borderRadius:6,border:`1px solid ${P.border}`,
                          background:"none",cursor:"pointer",fontSize:13,color:P.purple,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                      <button className="del-btn action-btn"
                        onClick={e=>{e.stopPropagation();setDelTarget(a);}}
                        style={{width:30,height:30,borderRadius:6,border:`1px solid ${P.border}`,
                          background:"none",cursor:"pointer",fontSize:13,color:P.muted,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExp&&(
                    <DetailPanel
                      activity={a}
                      onEdit={act=>{setModal({mode:"edit",activity:act});}}
                      onDelete={act=>setDelTarget(act)}
                      onStatusChange={handleStatusChange}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {displayed.length>0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            marginTop:14,flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:12,color:P.muted}}>
              Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,displayed.length)} of {displayed.length} tasks
              {(fStatus!=="All Status"||fDate!=="All Dates"||search)&&" · filtered"}
            </div>
            {totalPages>1&&(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button className="pg-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${P.border}`,
                    background:"#fff",color:P.purple,fontSize:12,cursor:"pointer",fontWeight:500}}>
                  ← Prev
                </button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                  <button key={n} onClick={()=>setPage(n)} style={{
                    width:32,height:32,borderRadius:8,fontSize:12,fontWeight:600,
                    border:`1px solid ${n===page?P.purple:P.border}`,cursor:"pointer",
                    background:n===page?P.light:"#fff",
                    color:n===page?P.purple:P.muted,
                  }}>{n}</button>
                ))}
                <button className="pg-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}
                  style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${P.border}`,
                    background:"#fff",color:P.purple,fontSize:12,cursor:"pointer",fontWeight:500}}>
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {modal&&<Modal mode={modal.mode} activity={modal.activity}
        onClose={()=>setModal(null)} onSave={handleSave}/>}
      {delTarget&&<DeleteConfirm activity={delTarget}
        onClose={()=>setDelTarget(null)} onConfirm={handleDelete}/>}
      <Toasts toasts={toasts} remove={removeToast}/>
    </div>
  );
}
