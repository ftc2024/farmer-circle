const $=(s,r=document)=>r.querySelector(s);
function boot(){console.log('account center ready')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
