(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const startScreen=$("#startScreen");
  const gameScreen=$("#gameScreen");
  const resultScreen=$("#resultScreen");
  const studentNameInput=$("#studentName");
  const nameError=$("#nameError");
  const answersZone=$("#answersZone");
  const questionText=$("#questionText");
  const qNumber=$("#qNumber");
  const scoreEl=$("#score");
  const streakEl=$("#streak");
  const progressEl=$("#progress");
  const hudName=$("#hudName");
  const pageChip=$("#pageChip");
  const feedback=$("#feedback");
  const particleLayer=$("#particleLayer");
  const crosshair=$("#crosshair");
  const muzzleFlash=$("#muzzleFlash");
  const powerBar=$("#powerBar");
  const powerValue=$("#powerValue");

  let questions=[];
  let currentIndex=0;
  let score=0;
  let streak=0;
  let bestStreak=0;
  let correctCount=0;
  let shots=0;
  let questionPower=100;
  let locked=false;
  let playerName="";

  const cheerWords=["أحسنت!","رائع!","بطل!","ممتاز!","إجابة صحيحة!"];
  const retryWords=["حاول مرة أخرى","قريب جدًا","ركّز وصوّب من جديد"];

  function shuffle(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function shuffledQuestion(q){
    const entries=q.choices.map((text,idx)=>({text,correct:idx===q.a}));
    const mixed=shuffle(entries);
    return {...q,choices:mixed.map(x=>x.text),a:mixed.findIndex(x=>x.correct)};
  }

  function showScreen(el){
    [startScreen,gameScreen,resultScreen].forEach(s=>s.classList.remove("active"));
    el.classList.add("active");
  }

  function init(){
    const savedName=localStorage.getItem("omarGrade3Player");
    if(savedName) studentNameInput.value=savedName;

    $("#startBtn").addEventListener("click",startGame);
    studentNameInput.addEventListener("keydown",e=>{if(e.key==="Enter") startGame();});
    $("#playAgainBtn").addEventListener("click",()=>showScreen(startScreen));
    $("#printBtn").addEventListener("click",()=>window.print());
    $("#fullscreenBtn").addEventListener("click",toggleFullscreen);

    document.addEventListener("pointermove",e=>{
      crosshair.style.left=e.clientX+"px";
      crosshair.style.top=e.clientY+"px";
    });
  }

  function startGame(){
    playerName=studentNameInput.value.trim();
    if(playerName.length<2){
      nameError.textContent="اكتب اسمك أولًا حتى نبدأ ✍️";
      studentNameInput.focus();
      return;
    }

    nameError.textContent="";
    localStorage.setItem("omarGrade3Player",playerName);
    hudName.textContent=playerName;

    // Keep the 15 questions in a logical learning sequence.
    questions=QUESTION_BANK.map(shuffledQuestion);

    currentIndex=0;
    score=0;
    streak=0;
    bestStreak=0;
    correctCount=0;
    shots=0;

    showScreen(gameScreen);
    renderQuestion();
  }

  function renderQuestion(){
    locked=false;
    questionPower=100;
    updatePower();

    const q=questions[currentIndex];
    qNumber.textContent=`السؤال ${currentIndex+1}`;
    progressEl.textContent=`${currentIndex+1}/${questions.length}`;
    pageChip.textContent=`من الصفحة ${q.page}`;
    questionText.textContent=q.q;
    scoreEl.textContent=score;
    streakEl.textContent=streak;
    answersZone.innerHTML="";
    feedback.classList.remove("show");

    const positions=shuffle([[18,25],[79,23],[30,72],[72,70]]);
    q.choices.forEach((choice,i)=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="answer-target";
      b.textContent=choice;
      b.style.left=positions[i][0]+"%";
      b.style.top=positions[i][1]+"%";
      b.style.setProperty("--float",(3.8+Math.random()*2.2).toFixed(2)+"s");
      b.style.animationDelay=(-Math.random()*2.5).toFixed(2)+"s";
      b.addEventListener("click",(ev)=>shoot(ev,b,i));
      answersZone.appendChild(b);
    });
  }

  function updatePower(){
    powerValue.textContent=questionPower;
    powerBar.style.width=questionPower+"%";
  }

  function shoot(ev,btn,index){
    if(locked || btn.classList.contains("disabled")) return;

    const q=questions[currentIndex];
    shots++;

    muzzleFlash.classList.remove("fire");
    void muzzleFlash.offsetWidth;
    muzzleFlash.classList.add("fire");
    crosshair.animate(
      [
        {transform:"translate(-50%,-50%) scale(1)"},
        {transform:"translate(-50%,-50%) scale(.65)"},
        {transform:"translate(-50%,-50%) scale(1)"}
      ],
      {duration:180}
    );

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

      scoreEl.textContent=score;
      streakEl.textContent=streak;

      flowerBurst(ev.clientX,ev.clientY,22);

      const cheer=cheerWords[Math.floor(Math.random()*cheerWords.length)];
      feedback.innerHTML=`${cheer} +${gained} ⭐<small>${q.fact}</small>`;
      feedback.classList.add("show");

      setTimeout(nextQuestion,1700);
    }else{
      btn.classList.add("wrong","disabled");
      setTimeout(()=>btn.classList.remove("wrong"),550);

      streak=0;
      streakEl.textContent=streak;
      questionPower=Math.max(20,questionPower-20);
      updatePower();

      const msg=retryWords[Math.floor(Math.random()*retryWords.length)];
      feedback.innerHTML=`${msg} 🎯<small>اختر إجابة أخرى.</small>`;
      feedback.classList.add("show");
      setTimeout(()=>feedback.classList.remove("show"),850);
    }
  }

  function flowerBurst(x,y,count=18){
    const emojis=["🌸","🌼","🌷","✨","⭐","🌺"];
    for(let i=0;i<count;i++){
      const p=document.createElement("span");
      p.className="particle";
      p.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      p.style.left=x+"px";
      p.style.top=y+"px";

      const angle=Math.random()*Math.PI*2;
      const dist=80+Math.random()*180;

      p.style.setProperty("--dx",Math.cos(angle)*dist+"px");
      p.style.setProperty("--dy",Math.sin(angle)*dist+"px");
      p.style.setProperty("--rot",(Math.random()*500-250)+"deg");

      particleLayer.appendChild(p);
      setTimeout(()=>p.remove(),1500);
    }
  }

  function nextQuestion(){
    currentIndex++;
    if(currentIndex>=questions.length){
      finishGame();
      return;
    }
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
    if(accuracy>=90) msg="ممتاز جدًا! دقة عالية ومعرفة رائعة 🌟";
    else if(accuracy>=75) msg="أداء جميل جدًا! اقتربت من مستوى الأبطال 🏆";
    else if(accuracy>=55) msg="أحسنت! أعد الجولة وحاول رفع دقة التصويب 🎯";
    else msg="راجع المعلومات ثم جرّب مرة أخرى 💪";

    $("#resultMessage").textContent=msg;

    for(let i=0;i<4;i++){
      setTimeout(()=>flowerBurst(innerWidth/2,innerHeight/2,20),i*220);
    }
  }

  function toggleFullscreen(){
    if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  init();
})();