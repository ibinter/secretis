import{r as a,a as w,j as e}from"./app-CJKVdEvI.js";import{u as M,a as P,L as k}from"./chunk-KS7C4IRE-Civgii5o.js";const i={ChevronRight:({s:t=16})=>e.jsx("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M9 5l7 7-7 7"})}),ChevronLeft:({s:t=16})=>e.jsx("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M15 18l-6-6 6-6"})}),Download:({s:t=16})=>e.jsxs("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"}),e.jsx("polyline",{points:"7 10 12 15 17 10"}),e.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),Check:({s:t=16})=>e.jsx("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}),Shield:({s:t=18})=>e.jsx("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})}),Alert:({s:t=18})=>e.jsxs("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"}),e.jsx("line",{x1:"12",y1:"9",x2:"12",y2:"13"}),e.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),Calendar:({s:t=14})=>e.jsxs("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"16",y1:"2",x2:"16",y2:"6"}),e.jsx("line",{x1:"8",y1:"2",x2:"8",y2:"6"}),e.jsx("line",{x1:"3",y1:"10",x2:"21",y2:"10"})]}),Tag:({s:t=14})=>e.jsxs("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"}),e.jsx("line",{x1:"7",y1:"7",x2:"7.01",y2:"7"})]})},I={general:"#2563EB",usage:"#7C3AED",commercial:"#065F46",privacy:"#B45309",support:"#BE185D"};function _({page:t,onAccepted:l}){var v;const[r,u]=a.useState(!1),[d,c]=a.useState(!1),[p,n]=a.useState(""),[s,x]=a.useState(!1);a.useRef(null),a.useEffect(()=>{const y=document.getElementById("legal-content-area");if(!y)return;const b=()=>{const{scrollTop:C,scrollHeight:m,clientHeight:f}=y;m-C-f<120&&x(!0)};return y.addEventListener("scroll",b),()=>y.removeEventListener("scroll",b)},[]);const h=a.useCallback(async()=>{u(!0),n("");try{await w.post("/api/v1/legal/accept",{slug:t.slug,version:t.version}),c(!0),l==null||l()}catch{n("Une erreur est survenue. Veuillez réessayer ou contacter le support.")}finally{u(!1)}},[t.slug,t.version,l]);return d?e.jsxs("div",{style:{background:"#D1FAE5",border:"1px solid #6EE7B7",borderRadius:"8px",padding:"14px 18px",display:"flex",alignItems:"center",gap:"10px",color:"#065F46",fontWeight:600,marginBottom:"24px"},children:[e.jsx(i.Check,{s:18}),"Vous avez accepté ce document. Votre consentement a été enregistré."]}):e.jsx("div",{style:{background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:"10px",padding:"16px 20px",marginBottom:"24px"},children:e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:"12px"},children:[e.jsx("span",{style:{color:"#92400E",flexShrink:0,marginTop:"2px"},children:e.jsx(i.Alert,{s:20})}),e.jsxs("div",{style:{flex:1},children:[e.jsx("p",{style:{margin:"0 0 8px",fontWeight:700,color:"#78350F",fontSize:"14px"},children:"Ce document requiert votre acceptation explicite."}),e.jsx("p",{style:{margin:"0 0 14px",color:"#92400E",fontSize:"13px",lineHeight:1.5},children:"Lisez attentivement le contenu ci-dessous dans son intégralité avant d'accepter. Votre acceptation, avec votre adresse IP et la date, sera enregistrée conformément au RGPD."}),!s&&e.jsx("p",{style:{margin:"0 0 10px",color:"#92400E",fontSize:"12px",fontStyle:"italic",opacity:.8},children:"Faites défiler le document jusqu'en bas pour activer le bouton d'acceptation."}),p&&e.jsx("p",{style:{margin:"0 0 10px",color:"#DC2626",fontSize:"13px"},children:p}),e.jsxs("button",{onClick:h,disabled:r||!s,style:{display:"inline-flex",alignItems:"center",gap:"8px",background:s?"#1E3A8A":"#9CA3AF",color:"#fff",border:"none",padding:"9px 20px",borderRadius:"7px",fontWeight:700,fontSize:"14px",cursor:r||!s?"not-allowed":"pointer",transition:"background 0.15s, opacity 0.15s",opacity:r?.7:1},children:[e.jsx(i.Check,{s:15}),r?"Enregistrement…":`J'accepte — ${(v=t.title)==null?void 0:v.fr}`]})]})]})})}function H({pages:t,currentSlug:l,onNavigate:r}){const u={general:"Général",usage:"Utilisation",commercial:"Commercial",privacy:"Confidentialité",support:"Support"},d=Object.keys(u).reduce((c,p)=>{const n=t.filter(s=>s.category===p);return n.length>0&&(c[p]=n),c},{});return e.jsx("nav",{"aria-label":"Pages légales",style:{width:"240px",flexShrink:0},children:e.jsxs("div",{style:{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:"10px",overflow:"hidden",position:"sticky",top:"80px",maxHeight:"calc(100vh - 120px)",overflowY:"auto"},children:[e.jsx("div",{style:{padding:"14px 16px",borderBottom:"1px solid var(--border)",fontSize:"12px",fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.07em",textTransform:"uppercase"},children:"Documents légaux"}),Object.entries(d).map(([c,p])=>e.jsxs("div",{children:[e.jsx("div",{style:{padding:"10px 16px 4px",fontSize:"10px",fontWeight:700,color:I[c],letterSpacing:"0.08em",textTransform:"uppercase"},children:u[c]}),p.map(n=>{var s;return e.jsx("button",{onClick:()=>r(n.slug),style:{display:"block",width:"100%",textAlign:"left",padding:"7px 16px",fontSize:"13px",fontWeight:n.slug===l?700:400,color:n.slug===l?"#1E3A8A":"var(--text-secondary)",background:n.slug===l?"#EFF6FF":"transparent",border:"none",cursor:"pointer",borderLeft:n.slug===l?"3px solid #1E3A8A":"3px solid transparent",transition:"background 0.12s, color 0.12s",lineHeight:1.4},onMouseEnter:x=>{n.slug!==l&&(x.currentTarget.style.background="var(--surface)",x.currentTarget.style.color="var(--text-primary)")},onMouseLeave:x=>{n.slug!==l&&(x.currentTarget.style.background="transparent",x.currentTarget.style.color="var(--text-secondary)")},"aria-current":n.slug===l?"page":void 0,children:(s=n.title)==null?void 0:s.fr},n.slug)})]},c))]})})}function q(){var z,T,R,W,A;const{slug:t}=M(),l=P(),[r,u]=a.useState(null),[d,c]=a.useState([]),[p,n]=a.useState(!0),[s,x]=a.useState(null),[h,v]=a.useState(!1),[y,b]=a.useState(!1);a.useEffect(()=>{n(!0),x(null),Promise.all([w.get(`/api/v1/legal/${t}`),w.get("/api/v1/legal").catch(()=>({data:{data:[]}}))]).then(([o,j])=>{var g,D,F,B;u(((g=o.data)==null?void 0:g.data)??null),c(((D=j.data)==null?void 0:D.data)??[]),v(((B=(F=o.data)==null?void 0:F.data)==null?void 0:B.user_accepted)??!1),window.scrollTo({top:0,behavior:"smooth"})}).catch(()=>x("Page légale introuvable.")).finally(()=>n(!1))},[t]);const C=a.useCallback(async()=>{try{const o=await w.get(`/api/v1/legal/${t}/pdf`,{responseType:"blob"}),j=window.URL.createObjectURL(new Blob([o.data])),g=document.createElement("a");g.href=j,g.setAttribute("download",`SECRETIS-${t}.pdf`),document.body.appendChild(g),g.click(),g.parentNode.removeChild(g),window.URL.revokeObjectURL(j)}catch{alert("Le téléchargement PDF n'est pas disponible pour le moment.")}},[t]),m=a.useCallback(o=>{l(`/legal/${o}`),b(!1)},[l]),f=d.findIndex(o=>o.slug===t),S=f>0?d[f-1]:null,L=f<d.length-1?d[f+1]:null;if(p)return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"50vh"},children:e.jsx("p",{style:{color:"var(--text-muted)"},children:"Chargement…"})});if(s||!r)return e.jsxs("div",{style:{padding:"24px",textAlign:"center",color:"#DC2626"},children:[e.jsx("p",{children:s??"Page introuvable."}),e.jsx(k,{to:"/legal",style:{color:"var(--accent)"},children:"← Retour aux pages légales"})]});const E=I[r.category]??"#6B7280";return e.jsxs("div",{style:{maxWidth:"1200px",margin:"0 auto",padding:"24px 16px"},children:[e.jsxs("nav",{"aria-label":"Fil d'Ariane",style:{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",color:"var(--text-muted)",marginBottom:"20px",flexWrap:"wrap"},children:[e.jsx(k,{to:"/",style:{color:"var(--accent)",textDecoration:"none"},children:"Accueil"}),e.jsx(i.ChevronRight,{s:12}),e.jsx(k,{to:"/legal",style:{color:"var(--accent)",textDecoration:"none"},children:"Légal"}),e.jsx(i.ChevronRight,{s:12}),e.jsx("span",{children:(z=r.title)==null?void 0:z.fr})]}),e.jsxs("div",{style:{display:"flex",gap:"28px",alignItems:"flex-start"},children:[e.jsx("div",{className:"legal-sidebar-desktop",style:{display:"block"},children:d.length>0&&e.jsx(H,{pages:d,currentSlug:t,onNavigate:m})}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:"12px",padding:"24px",marginBottom:"20px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"16px",flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{display:"inline-block",background:`${E}15`,color:E,fontSize:"11px",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"3px 10px",borderRadius:"12px",marginBottom:"10px"},children:r.category}),e.jsx("h1",{style:{margin:"0 0 12px",fontSize:"22px",fontWeight:700,color:"var(--text-primary)",lineHeight:1.3},children:(T=r.title)==null?void 0:T.fr}),e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:"16px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"},children:[e.jsx(i.Tag,{s:13}),"Version ",r.version]}),r.effective_date&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"},children:[e.jsx(i.Calendar,{s:13}),"En vigueur depuis le"," ",new Date(r.effective_date).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})]}),r.updated_at&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"},children:[e.jsx(i.Calendar,{s:13}),"Mis à jour le"," ",new Date(r.updated_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})]})]})]}),e.jsxs("button",{onClick:C,style:{display:"inline-flex",alignItems:"center",gap:"7px",background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text-secondary)",fontSize:"13px",fontWeight:600,padding:"8px 14px",borderRadius:"7px",cursor:"pointer",flexShrink:0,transition:"background 0.15s"},onMouseEnter:o=>{o.currentTarget.style.background="var(--border)"},onMouseLeave:o=>{o.currentTarget.style.background="var(--surface)"},"aria-label":"Télécharger ce document en PDF",children:[e.jsx(i.Download,{s:15}),"Télécharger PDF"]})]}),r.requires_acceptance&&!h&&e.jsx("div",{style:{marginTop:"20px"},children:e.jsx(_,{page:r,onAccepted:()=>v(!0)})}),r.requires_acceptance&&(h||r.user_accepted)&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"16px",background:"#D1FAE5",color:"#065F46",borderRadius:"7px",padding:"10px 14px",fontSize:"13px",fontWeight:600},children:[e.jsx(i.Check,{s:16}),"Vous avez accepté ce document (version ",r.version,")."]})]}),e.jsx("div",{id:"legal-content-area",style:{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:"12px",padding:"32px",marginBottom:"20px",maxHeight:r.requires_acceptance&&!h?"600px":"none",overflowY:r.requires_acceptance&&!h?"auto":"visible"},children:e.jsx("div",{className:"legal-content",dangerouslySetInnerHTML:{__html:((R=r.content)==null?void 0:R.fr)??""},style:{lineHeight:1.75,color:"var(--text-primary)",fontSize:"15px"}})}),e.jsxs("div",{style:{display:"flex",gap:"12px",flexWrap:"wrap"},children:[S&&e.jsxs("button",{onClick:()=>m(S.slug),style:{display:"inline-flex",alignItems:"center",gap:"8px",background:"var(--card-bg)",border:"1px solid var(--border)",color:"var(--text-secondary)",fontSize:"13px",fontWeight:600,padding:"10px 16px",borderRadius:"8px",cursor:"pointer",transition:"border-color 0.15s",flex:1,minWidth:"200px"},onMouseEnter:o=>{o.currentTarget.style.borderColor="var(--accent)"},onMouseLeave:o=>{o.currentTarget.style.borderColor="var(--border)"},children:[e.jsx(i.ChevronLeft,{s:15}),e.jsx("span",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:(W=S.title)==null?void 0:W.fr})]}),e.jsx(k,{to:"/legal",style:{display:"inline-flex",alignItems:"center",justifyContent:"center",background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text-muted)",fontSize:"13px",padding:"10px 16px",borderRadius:"8px",textDecoration:"none",fontWeight:500,flexShrink:0},children:"Tous les documents"}),L&&e.jsxs("button",{onClick:()=>m(L.slug),style:{display:"inline-flex",alignItems:"center",justifyContent:"flex-end",gap:"8px",background:"var(--card-bg)",border:"1px solid var(--border)",color:"var(--text-secondary)",fontSize:"13px",fontWeight:600,padding:"10px 16px",borderRadius:"8px",cursor:"pointer",transition:"border-color 0.15s",flex:1,minWidth:"200px"},onMouseEnter:o=>{o.currentTarget.style.borderColor="var(--accent)"},onMouseLeave:o=>{o.currentTarget.style.borderColor="var(--border)"},children:[e.jsx("span",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:(A=L.title)==null?void 0:A.fr}),e.jsx(i.ChevronRight,{s:15})]})]}),e.jsxs("div",{style:{marginTop:"24px",padding:"16px",background:"#EFF6FF",borderRadius:"8px",fontSize:"13px",color:"#1E40AF",display:"flex",alignItems:"center",gap:"10px"},children:[e.jsx(i.Shield,{s:16}),e.jsxs("span",{children:["Questions sur ce document ?"," ",e.jsx("a",{href:"mailto:legal@ibigsoft.com",style:{color:"#1D4ED8",fontWeight:600},children:"legal@ibigsoft.com"})," ","— IBIG SARL, Abidjan – Côte d'Ivoire"]})]})]})]}),e.jsx("style",{children:`
        .legal-content h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--border);
        }
        .legal-content h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 24px 0 10px;
        }
        .legal-content h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          margin: 18px 0 8px;
        }
        .legal-content p {
          margin: 0 0 14px;
          color: var(--text-secondary);
        }
        .legal-content ul, .legal-content ol {
          margin: 0 0 14px;
          padding-left: 24px;
          color: var(--text-secondary);
        }
        .legal-content li {
          margin-bottom: 6px;
          line-height: 1.7;
        }
        .legal-content a {
          color: #1D4ED8;
          font-weight: 500;
        }
        .legal-content strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        .legal-content em {
          color: var(--text-muted);
          font-style: italic;
          font-size: 13px;
        }
        .legal-content code {
          font-family: 'Courier New', monospace;
          background: var(--surface);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #7C3AED;
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 13px;
          overflow-x: auto;
          display: block;
        }
        .legal-content th {
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 700;
          padding: 10px 14px;
          text-align: left;
          border: 1px solid var(--border);
        }
        .legal-content td {
          padding: 9px 14px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .legal-content tr:nth-child(even) td {
          background: var(--surface);
        }
        @media (prefers-color-scheme: dark) {
          .legal-content a { color: #60A5FA; }
          .legal-content code { color: #A78BFA; }
        }
      `})]})}export{q as LegalShow,q as default};
