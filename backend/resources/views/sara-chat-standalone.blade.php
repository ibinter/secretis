<!DOCTYPE html>
<html lang=fr>
<head>
<meta charset=UTF-8>
<meta name=viewport content=width=device-width,initial-scale=1>
<title>SARA — Assistante SECRETIS ERP</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f9fafb;display:flex;flex-direction:column;height:100vh;overflow:hidden}
#sara-header{background:#7c3aed;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0}
#sara-header .avatar{font-size:28px}
#sara-header .name{font-weight:700;font-size:1rem}
#sara-header .status{font-size:.75rem;color:#4ade80}
#messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.msg-bot{background:#fff;color:#1f2937;padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:.9rem;line-height:1.5;max-width:85%;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.msg-user{background:#7c3aed;color:#fff;padding:10px 14px;border-radius:12px 12px 2px 12px;font-size:.9rem;line-height:1.5;max-width:85%;align-self:flex-end}
#input-bar{border-top:1px solid #e5e7eb;padding:12px;display:flex;gap:8px;background:#fff;flex-shrink:0}
#user-input{flex:1;padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:.9rem;outline:none}
#user-input:focus{border-color:#7c3aed}
#send-btn{background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-weight:700;font-size:.95rem}
#send-btn:hover{background:#6d28d9}
</style>
</head>
<body>
<div id=sara-header>
  <div class=avatar>&#129302;</div>
  <div>
    <div class=name>SARA — Assistante SECRETIS ERP</div>
    <div class=status>&#9679; En ligne</div>
  </div>
</div>
<div id=messages>
  <div class=msg-bot>Bonjour ! Je suis SARA, l'assistante intelligente de SECRETIS ERP. Comment puis-je vous aider aujourd'hui ?</div>
</div>
<div id=input-bar>
  <input id=user-input type=text placeholder=Votre message... autocomplete=off>
  <button id=send-btn>&#9658;</button>
</div>
<script>
var history = [];
function appendMsg(text, role) {
  var box = document.getElementById('messages');
  var d = document.createElement('div');
  d.className = role === 'user' ? 'msg-user' : 'msg-bot';
  d.textContent = text;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
  return d;
}
function send() {
  var inp = document.getElementById('user-input');
  var msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  appendMsg(msg, 'user');
  var typing = appendMsg('...', 'bot');
  fetch('/api/sara/chat', {
    method: 'POST',
    headers: {'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify({message: msg, history: history.slice(-8)})
  }).then(function(r){return r.json();}).then(function(d){
    var reply = (d && d.reply) ? d.reply : Je rencontre un souci. Ecrivez-nous a secretis@ibigsoft.com !;
    history.push({role:'user',content:msg});
    history.push({role:'assistant',content:reply});
    typing.textContent = reply;
  }).catch(function(){
    typing.textContent = Je rencontre un souci. Ecrivez-nous a secretis@ibigsoft.com !;
  });
}
document.getElementById('send-btn').addEventListener('click', send);
document.getElementById('user-input').addEventListener('keydown', function(e){ if(e.key==='Enter') send(); });
</script>
</body>
</html>
