/* ── Safe storage ──
   localStorage when available; otherwise an in-memory fallback (private mode, blocked storage).
   setObj returns true only when the value was actually persisted, so callers can warn about
   quota errors instead of silently losing data. */
const store=(()=>{
  const mem={};let ok=false;
  try{localStorage.setItem('_x','1');localStorage.removeItem('_x');ok=true;}catch(e){}
  return{
    getObj(k,d){if(ok){try{const s=localStorage.getItem(k);return s?JSON.parse(s):d;}catch(e){}}return k in mem?mem[k]:d;},
    setObj(k,v){if(ok){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){}}mem[k]=v;return false;}
  };
})();
