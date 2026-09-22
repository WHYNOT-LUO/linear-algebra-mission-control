document.addEventListener('DOMContentLoaded',function(){
  initParticles();
  buildWeeks();
  for(let i=0;i<4;i++){
    (function(i){const btn=document.getElementById('wbtn-'+i);if(btn)btn.addEventListener('click',()=>switchWeek(i));})(i);
  }
  document.getElementById('stats-nav-btn').addEventListener('click',()=>switchPage('stats'));
  document.getElementById('gallery-nav-btn').addEventListener('click',()=>switchPage('gallery'));
  document.getElementById('ai-nav-btn').addEventListener('click',()=>switchPage('ai'));
  document.getElementById('quiz-nav-btn').addEventListener('click',()=>switchPage('quiz'));
  document.getElementById('vis-nav-btn').addEventListener('click',()=>switchPage('vis'));
  document.getElementById('lb-close').addEventListener('click',closeLB);
  document.getElementById('lightbox').addEventListener('click',function(e){if(e.target===this)closeLB();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLB();});
  initTutor();
  // redraw visualizations on resize (debounced)
  let resizeTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(activePage==='vis')drawAllVisuals();},120);
  });
  renderQuiz();
});
