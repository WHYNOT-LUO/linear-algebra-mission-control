/* ════════════════════════════════════════════
   AI TUTOR
   Static site, no backend: the visitor supplies their own Anthropic API key,
   which is kept in this browser's localStorage and sent only to api.anthropic.com.
════════════════════════════════════════════ */
const AI_MODEL='claude-sonnet-5';
const AI_ENDPOINT='https://api.anthropic.com/v1/messages';
const AI_KEY_STORE='la30_apikey';
const AI_MAX_HISTORY=20;

let aiHistory=[];
let aiBusy=false;

function getAIKey(){return store.getObj(AI_KEY_STORE,'');}

function refreshAIKeyUI(){
  const key=getAIKey();
  const panel=document.getElementById('ai-key-panel');
  const note=document.getElementById('ai-demo-note');
  const status=document.getElementById('ai-key-status');
  const text=document.getElementById('ai-key-status-text');
  const input=document.getElementById('ai-input');
  const btn=document.getElementById('ai-send-btn');
  if(panel)panel.hidden=!!key;
  if(note)note.hidden=!!key;
  if(status)status.hidden=!key;
  if(text)text.textContent=key?'Key saved (ends …'+key.slice(-4)+')':'';
  if(input){input.disabled=!key;input.placeholder=key?'Ask anything about linear algebra... (Enter to send, Shift+Enter for newline)':'Add your API key above to start chatting';}
  if(btn)btn.disabled=!key||aiBusy;
  document.querySelectorAll('.ai-quick-btn').forEach(b=>{b.disabled=!key;});
}

function saveAIKey(e){
  e.preventDefault();
  const input=document.getElementById('ai-key-input');
  const key=(input.value||'').trim();
  if(!/^sk-ant-[\w-]{20,}$/.test(key)){showToast('That does not look like an Anthropic API key');return;}
  store.setObj(AI_KEY_STORE,key);
  input.value='';
  refreshAIKeyUI();
  showToast('API key saved in this browser');
}

function removeAIKey(){
  store.setObj(AI_KEY_STORE,'');
  aiHistory=[];
  refreshAIKeyUI();
  showToast('API key removed');
}

function aiQuick(q){
  const inp=document.getElementById('ai-input');if(inp)inp.value=q;
  sendAI();
}

function aiSystemPrompt(topicLabel){
  return `You are an expert linear algebra tutor specialising in geometric intuition, following Gilbert Strang's MIT 18.06 course.
Your job is to help a student on a 30-day linear algebra journey.
${topicLabel?'Current topic context: '+topicLabel+'.':''}

Rules:
- Prioritise GEOMETRIC intuition over algebraic manipulation
- Use concrete 2D/3D examples whenever possible
- Reference Strang's "column picture" and "row picture" frameworks
- When showing formulas, format them clearly on separate lines
- Keep explanations concise but complete — aim for 2-4 paragraphs max
- Use **bold** for key terms
- For formulas, use a clear text notation like: Av = λv
- Be encouraging — linear algebra is hard and the student is working hard`;
}

async function callAnthropic(key,system,messages){
  const response=await fetch(AI_ENDPOINT,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({model:AI_MODEL,max_tokens:1000,system,messages})
  });
  let data=null;
  try{data=await response.json();}catch(e){}
  if(!response.ok){
    const detail=data&&data.error&&data.error.message;
    const hint={401:'Your API key was rejected. Remove it and enter a valid one.',
                403:'Your key is not allowed to use this model.',
                429:'Rate limit reached. Wait a moment and try again.',
                529:'The API is overloaded. Try again shortly.'}[response.status];
    throw new Error(hint||detail||('Request failed ('+response.status+')'));
  }
  const text=(data&&Array.isArray(data.content)?data.content:[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
  if(!text)throw new Error('The model returned an empty response.');
  return text;
}

async function sendAI(){
  const input=document.getElementById('ai-input');
  const btn=document.getElementById('ai-send-btn');
  const chat=document.getElementById('ai-chat');
  const topicSel=document.getElementById('ai-topic-select');
  if(!input||!chat||aiBusy)return;
  const key=getAIKey();
  if(!key){showToast('Add your API key first');return;}
  const userMsg=input.value.trim();
  if(!userMsg)return;
  input.value='';
  aiBusy=true;btn.disabled=true;

  appendAIMsg('user',userMsg);
  const topicLabel=topicSel&&topicSel.value?topicSel.options[topicSel.selectedIndex].text:'';

  const typingDiv=document.createElement('div');typingDiv.className='ai-msg assistant';
  typingDiv.innerHTML='<div class="ai-msg-avatar">∑</div><div class="ai-msg-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
  chat.appendChild(typingDiv);chat.scrollTop=chat.scrollHeight;

  aiHistory.push({role:'user',content:userMsg});
  // the API requires the first message to be from the user
  let sendHistory=aiHistory.slice(-AI_MAX_HISTORY);
  while(sendHistory.length&&sendHistory[0].role!=='user')sendHistory.shift();

  try{
    const replyText=await callAnthropic(key,aiSystemPrompt(topicLabel),sendHistory);
    typingDiv.remove();
    appendAIMsg('assistant',replyText);
    aiHistory.push({role:'assistant',content:replyText});
    aiHistory=aiHistory.slice(-AI_MAX_HISTORY);
  }catch(err){
    typingDiv.remove();
    aiHistory.pop(); // drop the unanswered user turn so roles keep alternating
    const offline=err instanceof TypeError; // fetch rejects with TypeError on network failure
    appendAIMsg('assistant',(offline?'Could not reach the Anthropic API. Check your connection and try again.':err.message),true);
  }
  aiBusy=false;
  refreshAIKeyUI();
  chat.scrollTop=chat.scrollHeight;
}

// Minimal, XSS-safe formatting: **bold**, `code`, "- " bullets, and short "A = LU" style lines as formulas.
function formatAIText(text){
  const esc=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const isFormula=l=>l.length<70&&l.includes('=')&&!/[.?!:]$/.test(l.trim())&&l.trim().split(/\s+/).length<=9;
  return esc.split('\n').map(function(line){
    const inline=line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
    if(/^\s*[-*] /.test(line))return '<div class="ai-li">• '+inline.replace(/^\s*[-*] /,'')+'</div>';
    if(isFormula(line))return '<span class="formula">'+inline.trim()+'</span>';
    return inline;
  }).join('<br>').replace(/(<br>){3,}/g,'<br><br>');
}

function appendAIMsg(role,text,isError){
  const chat=document.getElementById('ai-chat');if(!chat)return;
  const div=document.createElement('div');div.className='ai-msg '+role;
  const avatar=document.createElement('div');avatar.className='ai-msg-avatar';
  avatar.textContent=role==='assistant'?'∑':'U';
  const bubble=document.createElement('div');bubble.className='ai-msg-bubble'+(isError?' ai-error':'');
  if(role==='user')bubble.textContent=text;else bubble.innerHTML=formatAIText(text);
  div.appendChild(avatar);div.appendChild(bubble);
  chat.appendChild(div);chat.scrollTop=chat.scrollHeight;
}

function initTutor(){
  const form=document.getElementById('ai-key-form');
  if(form)form.addEventListener('submit',saveAIKey);
  const rm=document.getElementById('ai-key-remove');
  if(rm)rm.addEventListener('click',removeAIKey);
  const inp=document.getElementById('ai-input');
  if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI();}});
  refreshAIKeyUI();
}
