/* ════════════════════════════════════════════
   QUIZ / FLASHCARDS
════════════════════════════════════════════ */
let quizMode='flash'; // 'flash' | 'mc'
let quizFilter='all';
let quizIdx=0;
let quizCards=[];
let quizCorrect=0;
let quizWrong=0;
let cardFlipped=false;
let quizDeck=null; // shuffled copy of the current deck, or null for source order

function setQuizMode(mode){
  quizMode=mode;quizDeck=null;
  quizIdx=0;cardFlipped=false;quizCorrect=0;quizWrong=0;
  document.getElementById('qmode-flash').classList.toggle('active',mode==='flash');
  document.getElementById('qmode-mc').classList.toggle('active',mode==='mc');
  renderQuiz();
}

function setQuizFilter(wk){
  quizFilter=wk;quizDeck=null;quizIdx=0;cardFlipped=false;quizCorrect=0;quizWrong=0;
  document.querySelectorAll('.quiz-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.week===wk));
  renderQuiz();
}

function getFilteredCards(){
  if(quizDeck)return quizDeck;
  const cards=quizMode==='flash'?FLASHCARDS:MC_QUESTIONS;
  if(quizFilter==='all')return cards;
  return cards.filter(c=>c.week===parseInt(quizFilter));
}

function renderQuiz(){
  quizCards=getFilteredCards();
  updateQuizScore();
  const content=document.getElementById('quiz-content');if(!content)return;
  if(!quizCards.length){content.innerHTML='<p style="color:var(--muted);font-family:Crimson Pro,serif;padding:20px 0">No cards for this filter.</p>';return;}
  const prog=document.getElementById('quiz-prog-fill');
  if(prog)prog.style.width=(quizIdx/quizCards.length*100).toFixed(0)+'%';
  if(quizIdx>=quizCards.length){
    const pct=quizCorrect+quizWrong>0?Math.round(quizCorrect/(quizCorrect+quizWrong)*100):0;
    content.innerHTML='<div style="text-align:center;padding:40px 20px;">'+
      '<div style="font-family:Bebas Neue,sans-serif;font-size:64px;color:var(--green)">'+pct+'%</div>'+
      '<div style="font-family:Crimson Pro,serif;font-size:20px;color:var(--muted);margin-bottom:28px">Session complete! '+quizCorrect+' correct of '+(quizCorrect+quizWrong)+'</div>'+
      '<button class="quiz-btn" onclick="quizIdx=0;quizCorrect=0;quizWrong=0;cardFlipped=false;renderQuiz()">↺ Restart</button>'+
    '</div>';return;
  }
  if(quizMode==='flash')renderFlash(content);
  else renderMC(content);
}

function renderFlash(content){
  const card=quizCards[quizIdx];cardFlipped=false;
  content.innerHTML='';
  const fw=document.createElement('div');fw.className='flashcard-wrap';
  const fc=document.createElement('div');fc.className='flashcard';fc.id='fc-main';
  fc.innerHTML=
    '<div class="fc-face fc-front">'+
      '<div class="fc-tag">QUESTION '+(quizIdx+1)+' / '+quizCards.length+'</div>'+
      '<div class="fc-question">'+card.q+'</div>'+
      '<div class="fc-hint">tap to reveal answer</div>'+
    '</div>'+
    '<div class="fc-face fc-back">'+
      '<div class="fc-tag">ANSWER</div>'+
      '<div class="fc-answer">'+card.a+'</div>'+
      (card.formula?'<div class="fc-formula-box">'+card.formula+'</div>':'')+
    '</div>';
  fc.setAttribute('role','button');fc.tabIndex=0;fc.setAttribute('aria-pressed','false');
  fc.setAttribute('aria-label','Flashcard '+(quizIdx+1)+' of '+quizCards.length+'. Press to flip.');
  const flip=()=>{cardFlipped=!cardFlipped;fc.classList.toggle('flipped',cardFlipped);fc.setAttribute('aria-pressed',String(cardFlipped));};
  fc.addEventListener('click',flip);
  fc.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}});
  fw.appendChild(fc);content.appendChild(fw);
  const nav=document.createElement('div');nav.className='quiz-nav';
  nav.innerHTML=
    '<button class="quiz-btn wrong" onclick="markFlash(false)">✗ Still learning</button>'+
    '<div class="quiz-counter">'+(quizIdx+1)+' / '+quizCards.length+'</div>'+
    '<button class="quiz-btn correct" onclick="markFlash(true)">✓ Got it</button>';
  content.appendChild(nav);
}

function markFlash(correct){
  if(correct)quizCorrect++;else quizWrong++;
  quizIdx++;updateQuizScore();renderQuiz();
}

function renderMC(content){
  const q=quizCards[quizIdx];
  content.innerHTML='';
  const qDiv=document.createElement('div');qDiv.className='mc-question';qDiv.textContent=q.q;
  content.appendChild(qDiv);
  const opts=document.createElement('div');opts.className='mc-options';
  const letters=['A','B','C','D'];
  q.opts.forEach(function(opt,i){
    const btn=document.createElement('div');btn.className='mc-option';
    btn.setAttribute('role','button');btn.tabIndex=0;
    btn.innerHTML='<span class="mc-opt-letter">'+letters[i]+'</span><span>'+opt+'</span>';
    btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();btn.click();}});
    btn.addEventListener('click',function(){
      if(btn.classList.contains('disabled'))return;
      opts.querySelectorAll('.mc-option').forEach(b=>b.classList.add('disabled'));
      const exp=document.getElementById('mc-exp');
      if(i===q.correct){btn.classList.add('correct');quizCorrect++;}
      else{btn.classList.add('wrong');opts.querySelectorAll('.mc-option')[q.correct].classList.add('correct');quizWrong++;}
      if(exp)exp.classList.add('show');
      updateQuizScore();
    });
    opts.appendChild(btn);
  });
  content.appendChild(opts);
  const expDiv=document.createElement('div');expDiv.className='mc-explanation';expDiv.id='mc-exp';
  expDiv.innerHTML='<strong>Explanation:</strong> '+q.exp;
  content.appendChild(expDiv);
  const nav=document.createElement('div');nav.className='quiz-nav';
  nav.innerHTML='<div class="quiz-counter">'+(quizIdx+1)+' / '+quizCards.length+'</div>'+
    '<button class="quiz-btn" onclick="quizIdx++;renderQuiz()">Next →</button>';
  content.appendChild(nav);
}

function shuffleQuiz(){
  quizIdx=0;quizCorrect=0;quizWrong=0;cardFlipped=false;
  quizDeck=null;
  const deck=getFilteredCards().slice();
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  quizDeck=deck; // renderQuiz() reads the shuffled deck, so the order survives Next / Got it
  renderQuiz();
  showToast('🔀 Cards shuffled!');
}

function updateQuizScore(){
  const c=document.getElementById('qs-correct');if(c)c.textContent=quizCorrect;
  const w=document.getElementById('qs-wrong');if(w)w.textContent=quizWrong;
  const p=document.getElementById('qs-pct');
  if(p){const tot=quizCorrect+quizWrong;p.textContent=tot?Math.round(quizCorrect/tot*100)+'%':'—';}
}
