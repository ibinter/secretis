import { usePage } from '@inertiajs/react';
export default function ParametresIndex() {
  const { organization={}, user={} } = usePage().props;
  return (
    <div style={{padding:24,fontFamily:'Inter,sans-serif'}}>
      <h1 style={{fontSize:24,fontWeight:700,color:'#0b1220',margin:'0 0 24px'}}>Paramètres</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:900}}>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:24}}>
          <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 16px'}}>Organisation</h2>
          {[{l:'Nom',v:organization.name},{l:'Email',v:organization.email},{l:'Pays',v:organization.country||'CI'},{l:'Fuseau horaire',v:organization.timezone||'Africa/Abidjan'}].map(f=>(
            <div key={f.l} style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{f.l}</label>
              <input readOnly value={f.v||''} style={{width:'100%',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,background:'#f8fafc',boxSizing:'border-box'}}/>
            </div>
          ))}
        </div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:24}}>
          <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 16px'}}>Mon compte</h2>
          {[{l:'Nom',v:user.name},{l:'Email',v:user.email},{l:'Rôle',v:user.role}].map(f=>(
            <div key={f.l} style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{f.l}</label>
              <input readOnly value={f.v||''} style={{width:'100%',padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:14,background:'#f8fafc',boxSizing:'border-box'}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
