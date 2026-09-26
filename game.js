(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const startScreen = $("#startScreen");
  const gameScreen = $("#gameScreen");
  const resultScreen = $("#resultScreen");
  const studentNameInput = $("#studentName");
  const nameError = $("#nameError");
  const startBtn = $("#startBtn");
  const answersZone = $("#answersZone");
  const questionText = $("#questionText");
  const qNumber = $("#qNumber");
  const scoreEl = $("#score");
  const streakEl = $("#streak");
  const progressEl = $("#progress");
  const hudName = $("#hudName");
  const feedback = $("#feedback");
  const particleLayer = $("#particleLayer");
  const crosshair = $("#crosshair");
  const muzzleFlash = $("#muzzleFlash");
  const powerBar = $("#powerBar");
  const powerValue = $("#powerValue");

  let roundSize = 15;
  let soundOn = true;
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correctCount = 0;
  let shots = 0;
  let questionPower = 100;
  let locked = false;
  let playerName = "";
  let audioCtx = null;

  const cheerWords = ["أحسنت!", "رائع!", "بطل!", "ممتاز!", "إجابة موفقة!"];
  const retryWords = ["حاول مرة أخرى", "قريب جدًا", "ركّز وصوّب من جديد"];

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function shuffledQuestion(q){
    const entries = q.choices.map((text, idx)=>({text, correct: idx === q.a}));
    const mixed = shuffle(entries);
    return {...q, choices:mixed.map(x=>x.text), a:mixed.findIndex(x=>x.correct)};
  }

  function showScreen(el){
    [startScreen, gameScreen, resultScreen].forEach(s=>s.classList.remove("active"));
    el.classList.add("active");
  }

  function getAudioCtx(){
    if(!audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(AC) audioCtx = new AC();
    }
    if(audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq=440, duration=.12, type="sine", volume=.05, delay=0){
    if(!soundOn) return;
    const ctx=getAudioCtx(); if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,ctx.currentTime+delay);
    g.gain.exponentialRampToValueAtTime(volume,ctx.currentTime+delay+.01);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+delay+duration);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime+delay); o.stop(ctx.currentTime+delay+duration+.02);
  }

  function shotSound(){
    if(!soundOn) return;
    tone(150,.07,"square",.035);
    tone(95,.09,"sawtooth",.025,.025);
  }

  function successSound(){
    [523,659,784,1047].forEach((f,i)=>tone(f,.14,"sine",.055,i*.08));
  }

  function wrongSound(){
    tone(210,.12,"sawtooth",.035);
    tone(165,.17,"sawtooth",.03,.1);
  }

  function speak(text, rate=1.03, pitch=1.12){
    if(!soundOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    u.rate = rate;
    u.pitch = pitch;
    u.volume = .9;
    window.speechSynthesis.speak(u);
  }

  function setSound(on){
    soundOn = on;
    $("#soundToggle").textContent = on ? "🔊" : "🔇";
    $("#soundToggleStart").textContent = on ? "🔊 الصوت: مفعّل" : "🔇 الصوت: مكتوم";
    localStorage.setItem("omarGameSound", on ? "1" : "0");
  }

  function init(){
    const savedName=localStorage.getItem("omarGamePlayer");
    if(savedName) studentNameInput.value=savedName;
    setSound(localStorage.getItem("omarGameSound") !== "0");

    $$(".mode-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        $$(".mode-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        roundSize=Number(btn.dataset.count);
      });
    });

    $("#soundToggle").addEventListener("click",()=>setSound(!soundOn));
    $("#soundToggleStart").addEventListener("click",()=>setSound(!soundOn));
    $("#readQuestionBtn").addEventListener("click",()=>speak(questionText.textContent,.88,1.02));
    $("#playAgainBtn").addEventListener("click",()=>showScreen(startScreen));
    $("#printBtn").addEventListener("click",()=>window.print());
    $("#fullscreenBtn").addEventListener("click",toggleFullscreen);

    startBtn.addEventListener("click",startGame);
    studentNameInput.addEventListener("keydown",e=>{if(e.key==="Enter") startGame();});

    document.addEventListener("pointermove",e=>{
      crosshair.style.left=e.clientX+"px";
      crosshair.style.top=e.clientY+"px";
    });
  }

  function startGame(){
    playerName=studentNameInput.value.trim();
    if(playerName.length < 2){
      nameError.textContent="اكتب اسمك أولًا حتى نبدأ المغامرة ✍️";
      studentNameInput.focus();
      return;
    }
    nameError.textContent="";
    localStorage.setItem("omarGamePlayer",playerName);
    hudName.textContent=playerName;
    questions=shuffle(QUESTION_BANK).slice(0,Math.min(roundSize,QUESTION_BANK.length)).map(shuffledQuestion);
    currentIndex=0; score=0; streak=0; bestStreak=0; correctCount=0; shots=0;
    showScreen(gameScreen);
    getAudioCtx();
    tone(392,.15,"sine",.04); tone(523,.18,"sine",.04,.12); tone(659,.22,"sine",.05,.25);
    speak(`مرحبًا ${playerName}. استعد للتصويب على الإجابة الصحيحة`,1.02,1.1);
    renderQuestion();
  }

  function renderQuestion(){
    locked=false; questionPower=100;
    updatePower();
    const q=questions[currentIndex];
    qNumber.textContent=`السؤال ${currentIndex+1}`;
    progressEl.textContent=`${currentIndex+1}/${questions.length}`;
    questionText.textContent=q.q;
    scoreEl.textContent=score;
    streakEl.textContent=streak;
    answersZone.innerHTML="";
    feedback.classList.remove("show");

    const positions = makePositions(q.choices.length);
    q.choices.forEach((choice,i)=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="answer-target";
      b.textContent=choice;
      b.dataset.index=i;
      b.style.left=positions[i][0]+"%";
      b.style.top=positions[i][1]+"%";
      b.style.setProperty("--float",(3.8+Math.random()*2.2).toFixed(2)+"s");
      b.style.animationDelay=(-Math.random()*2.5).toFixed(2)+"s";
      b.addEventListener("click",(ev)=>shoot(ev,b,i));
      answersZone.appendChild(b);
    });
  }

  function makePositions(n){
    const base=[[18,26],[78,22],[30,72],[72,70]];
    return shuffle(base).slice(0,n);
  }

  function updatePower(){
    powerValue.textContent=questionPower;
    powerBar.style.width=questionPower+"%";
  }

  function shoot(ev,btn,index){
    if(locked || btn.classList.contains("disabled")) return;
    const q=questions[currentIndex];
    shots++;
    shotSound();
    muzzleFlash.classList.remove("fire"); void muzzleFlash.offsetWidth; muzzleFlash.classList.add("fire");
    pulseCrosshair(ev.clientX,ev.clientY);

    if(index===q.a){
      locked=true;
      btn.classList.add("correct");
      $$(".answer-target").forEach(x=>x.classList.add("disabled"));
      correctCount++;
      streak++;
      bestStreak=Math.max(bestStreak,streak);
      const bonus=Math.min(50,(streak-1)*10);
      const gained=questionPower+bonus;
      score+=gained;
      scoreEl.textContent=score; streakEl.textContent=streak;
      successSound();
      flowerBurst(ev.clientX,ev.clientY,22);
      const cheer=cheerWords[Math.floor(Math.random()*cheerWords.length)];
      feedback.innerHTML=`${cheer} +${gained} ⭐<small>${q.fact}</small>`;
      feedback.classList.add("show");
      speak(`${cheer} ${q.fact}`,.98,1.12);
      setTimeout(nextQuestion,2100);
    }else{
      btn.classList.add("wrong","disabled");
      setTimeout(()=>btn.classList.remove("wrong"),550);
      streak=0; streakEl.textContent=streak;
      questionPower=Math.max(20,questionPower-20);
      updatePower();
      wrongSound();
      const msg=retryWords[Math.floor(Math.random()*retryWords.length)];
      feedback.innerHTML=`${msg} 🎯<small>اختر هدفًا آخر.</small>`;
      feedback.classList.add("show");
      speak(msg,1.05,1.0);
      setTimeout(()=>feedback.classList.remove("show"),900);
    }
  }

  function pulseCrosshair(x,y){
    crosshair.animate(
      [{transform:"translate(-50%,-50%) scale(1)"},{transform:"translate(-50%,-50%) scale(.65)"},{transform:"translate(-50%,-50%) scale(1)"}],
      {duration:180}
    );
  }

  function flowerBurst(x,y,count=18){
    const emojis=["🌸","🌼","🌷","✨","⭐","🌺"];
    for(let i=0;i<count;i++){
      const p=document.createElement("span");
      p.className="particle";
      p.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      p.style.left=x+"px"; p.style.top=y+"px";
      const angle=Math.random()*Math.PI*2;
      const dist=80+Math.random()*180;
      p.style.setProperty("--dx",Math.cos(angle)*dist+"px");
      p.style.setProperty("--dy",Math.sin(angle)*dist+"px");
      p.style.setProperty("--rot",(Math.random()*500-250)+"deg");
      p.style.animationDelay=(Math.random()*.12)+"s";
      particleLayer.appendChild(p);
      setTimeout(()=>p.remove(),1500);
    }
  }

  function nextQuestion(){
    currentIndex++;
    if(currentIndex>=questions.length){finishGame();return;}
    renderQuestion();
  }

  function finishGame(){
    showScreen(resultScreen);
    $("#resultName").textContent=playerName;
    $("#finalScore").textContent=score;
    $("#finalCorrect").textContent=`${correctCount}/${questions.length}`;
    const accuracy=shots ? Math.round((correctCount/shots)*100) : 0;
    $("#finalAccuracy").textContent=accuracy+"%";
    $("#bestStreak").textContent=bestStreak;

    let msg;
    if(accuracy>=90) msg="مستوى رائع جدًا! دقة عالية وتصويب ممتاز 🌟";
    else if(accuracy>=75) msg="أداء جميل جدًا! أنت قريب من مستوى الأبطال 🏆";
    else if(accuracy>=55) msg="أحسنت! أعد الجولة وحاول رفع دقة التصويب 🎯";
    else msg="بداية جيدة. راجع المعلومات ثم جرّب مرة أخرى 💪";
    $("#resultMessage").textContent=msg;

    successSound(); setTimeout(successSound,450);
    for(let i=0;i<4;i++) setTimeout(()=>flowerBurst(innerWidth/2,innerHeight/2,20),i*240);
    speak(`أحسنت يا ${playerName}. حصلت على ${score} نقطة`,.98,1.12);
  }

  function toggleFullscreen(){
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen?.();
    }else{
      document.exitFullscreen?.();
    }
  }

  init();
})();
