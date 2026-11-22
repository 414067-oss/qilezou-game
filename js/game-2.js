const cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=960,H=540;
const $=id=>document.getElementById(id);
const hintB=$('hintB'),msg=$('msg'),nextB=$('next'),pal=$('pal'),cmp=$('cmp'),sl=$('sl');
let BAND=[395,495],bgImg=null,cust={obs:[],trash:[],place:[],sticker:[],walker:null};
let hints=3,hintT=null,hintUntil=0;
let dl=[],di=0,dlgOpen=false,npc=null,introRaf=false;
let TXT={}; // 自訂文字，依關卡索引覆蓋，例如 TXT[0]={who,where,open,need,reply,line}
const LOGO_SRC='images/logo/騎咧走_logo.webp'; // 遊戲 Logo（騎咧走字形 Logo，已去背）
const LOGO_VIDEO_SRC='video/開場logo動畫.mp4'; // 開場 Logo 動畫（由「10_25-Logo進場規劃.gif」轉成 MP4，3.4 秒，只播一次，停在最後一格）
const LOGO_POSTER_SRC='images/logo/開場動畫最後一格.webp'; // 動畫最後一格（瀏覽器不允許自動播放時顯示） // 預留：開場 Logo 影片（例如 'logo-intro.mp4'，放在同一個資料夾）。有填的話，開始畫面先播這段影片，播完停在最後一格
const LOADING_BG_SRC='images/backgrounds/載入畫面.jpg';
if(LOADING_BG_SRC)document.addEventListener('DOMContentLoaded',()=>{$('trans').style.backgroundImage=`url(${LOADING_BG_SRC})`;});
// 關卡背景素材（依序 Lv1/Lv2/Lv3；null 表示使用預設場景）。可替換成圖檔網址或 data URI
const LEVEL_BG_SRC=['images/backgrounds/第二關_住宅騎樓.jpg','images/backgrounds/第一關_麵攤.jpg',null,null];
const LVBG=[null,null,null,null];let userBg=false; // 預留：填入 Logo 圖檔網址或 data URI，即可取代預設文字 Logo
const CASE_PLACE=['小吃店騎樓','住宅騎樓','超市外騎樓','住宅區往公園的騎樓'];
const LEVELS=[
 {name:'小吃店騎樓',top:385,bh:125,stages:[1,3],items:[
  {e:'🍽️',name:'餐桌',s:60,w:64},{e:'🪑',name:'椅子',s:52,w:52},
  {e:'🍳',name:'工作檯',s:58,w:72},{e:'🗑️',name:'垃圾桶',s:52,w:52},
  {e:'🪧',name:'菜單／立牌',s:54,w:40}]},
 {name:'住宅騎樓',top:395,bh:100,stages:[3],items:[
  {e:'🪴',name:'盆栽',s:48,w:44},{e:'🌿',name:'花架',s:56,w:46},
  {e:'💺',name:'休閒椅',s:54,w:56},{e:'🧹',name:'掃把／畚箕',s:52,w:40},
  {e:'🛵',name:'機車',s:64,w:70}]},
 {name:'超市外騎樓',top:390,bh:110,stages:[2,3],items:[
  {e:'🛒',name:'購物推車',s:58,w:52},{e:'🛋️',name:'長椅',s:52,w:78},
  {e:'🗑️',name:'垃圾桶',s:52,w:52},{e:'🪴',name:'盆栽',s:48,w:44},
  {e:'📦',name:'商品／貨物箱',s:54,w:54}]},
 {name:'住宅區往公園的騎樓',top:400,bh:95,stages:[1,3],items:[
  {e:'🛵',name:'機車',s:64,w:70},{e:'📦',name:'紙箱',s:56,w:58},
  {e:'🗑️',name:'垃圾桶',s:52,w:52},{e:'🪴',name:'盆栽',s:48,w:44},
  {e:'🚲',name:'腳踏車',s:58,w:66}]}];
let LV=LEVELS[0],lvIdx=0;BAND=[LV.top,LV.top+LV.bh];
const zoneRect=()=>({x:520,y:BAND[0]-80,w:400,h:76});
const inZone=p=>{const z=zoneRect();return p.x>z.x+20&&p.x<z.x+z.w-20&&p.y>z.y+30&&p.y<=z.y+z.h+4};
const isBad=p=>p.f?false:(p.zone?!inZone(p):(p.y>BAND[0]&&p.y<BAND[1]));
const floorTop=()=>LV.zone?zoneRect().y-5:BAND[0]-45;
let phase2='trash',binShown=false;
const SHOVEL=`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g transform='rotate(-35 20 20)'><rect x='18' y='2' width='4' height='20' rx='2' fill='%238b5a2b'/><rect x='14' y='0' width='12' height='4' rx='2' fill='%238b5a2b'/><path d='M12 22h16l-2 14h-12z' fill='%23aab2ba' stroke='%23444' stroke-width='1.5'/></g></svg>") 10 34, auto`;
// ===== 音訊：背景音樂與遊戲音效分開控制（各自獨立的音量節點，互不影響；設定記在這個瀏覽器）=====
const AUD=(()=>{const d={mv:.6,sv:.8,mOn:true,sOn:true,cOn:true,mute:false,aOn:true,av:.5,vOn:false};try{Object.assign(d,JSON.parse(localStorage.getItem('qlz-audio')||'{}'));}catch(e){}return d;})();
function saveAud(){try{localStorage.setItem('qlz-audio',JSON.stringify(AUD));}catch(e){}}
let AC=null,musicGain=null,sfxGain=null,musicLevel=1,musicEl=null;
const MUSIC_SRC=''; // 預留：可換成「確定可公開使用」的音樂檔（自己創作、CC0 或取得授權的 mp3，放在同一個資料夾，例如 'bgm.mp3'）。留空＝使用本檔案內程式合成的原創配樂（無授權問題）
const MUSIC_BASE=.7;
function audioInit(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();musicGain=AC.createGain();sfxGain=AC.createGain();musicGain.gain.value=0;musicGain.connect(AC.destination);sfxGain.connect(AC.destination);applyAudio();startMusic();}catch(e){AC=null}}if(AC&&AC.state=='suspended')AC.resume();}
const sfxOK=()=>AC&&!AUD.mute&&AUD.sOn&&AUD.sv>0;
function applyAudio(){if(AC){const t=AC.currentTime;musicGain.gain.setTargetAtTime((AUD.mute||!AUD.mOn)?0:AUD.mv*musicLevel*MUSIC_BASE,t,.08);sfxGain.gain.setTargetAtTime((AUD.mute||!AUD.sOn)?0:AUD.sv,t,.02);}
 if(typeof audUI==='function')audUI();}
function setMusic(v){musicLevel=v;applyAudio();}
function tone(f,d,type='sine',v=.25,slide=0,delay=0){if(!sfxOK())return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+d+.02);}
function noise(d,v=.15,f=800,q=1,delay=0){if(!sfxOK())return;const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=AC.createBufferSource();s.buffer=b;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain(),t=AC.currentTime+delay;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(g);g.connect(sfxGain);s.start(t);}
const th=(fn,ms)=>{let l=0;return(...a)=>{const n=performance.now();if(n-l>ms){l=n;fn(...a);}}};
const sfx={
 grab:()=>tone(520,.06,'triangle',.07,150),
 drag:th(()=>noise(.08,.04,500,.7),260),
 shovel:th(()=>noise(.08,.07,1100,.6),130),
 drop:()=>{tone(130,.12,'sine',.22,-70);noise(.04,.07,300)},
 ding:()=>tone(880,.14,'sine',.1),
 done:()=>{[523,659,784].forEach((f,i)=>tone(f,.28,'sine',.13,0,i*.1));tone(262,.5,'triangle',.08)},
 allDone:()=>{[523,659,784,1047,1319].forEach((f,i)=>{tone(f,.4,'sine',.14,0,i*.12);tone(f/2,.5,'triangle',.06,0,i*.12)});[1568,2093].forEach((f,i)=>tone(f,.5,'sine',.06,0,.65+i*.1))},
 bin:()=>{tone(340,.1,'square',.06,-140);noise(.08,.1,1500,1)},
 fixed:()=>{tone(400,.12,'sine',.15,200);tone(600,.16,'sine',.12,0,.08)},
 poof:()=>noise(.12,.08,400,.5),
 err:()=>{tone(220,.12,'square',.06,-60);tone(180,.16,'square',.05,-40,.1);},
 move:th(()=>noise(.06,.03,600,.7),260),
 click:()=>tone(660,.05,'triangle',.07,120),
 // 對話與劇情的特殊音效（不會每句都響）
 talk:()=>{const f=[740,880,988][Math.random()*3|0];tone(f,.05,'sine',.05,80);tone(f*1.25,.05,'sine',.04,0,.06);},
 happy:()=>{[784,988,1319].forEach((f,i)=>tone(f,.14,'sine',.08,0,i*.07));},
 surprise:()=>{tone(523,.16,'triangle',.09,520);tone(1568,.08,'sine',.06,0,.14);noise(.05,.03,3500,1,.14);},
 question:()=>{tone(660,.22,'sine',.07,330);},
 thanks:()=>{[659,784,1047].forEach((f,i)=>{tone(f,.5,'sine',.07,0,i*.09);tone(f/2,.5,'triangle',.03,0,i*.09);});},
 sigh:()=>{tone(523,.35,'sine',.05,-180);},
 phase:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,.22,'triangle',.09,0,i*.08));tone(1568,.4,'sine',.06,0,.34);},
 event:()=>{tone(988,.18,'square',.05,0);tone(784,.3,'square',.05,0,.2);noise(.08,.03,2500,1,.02);},
 reward:()=>{[1047,1319,1568,2093,2637].forEach((f,i)=>tone(f,.3,'sine',.07,0,i*.06));noise(.6,.02,7000,.7,.3);},
 star:i=>{tone([880,1175,1568][i]||1568,.25,'sine',.11,200);noise(.12,.03,6000,1);},
 coinBuy:()=>{if(AUD.cOn===false)return;tone(1319,.07,'square',.03);tone(1976,.3,'sine',.08,0,.06);tone(2637,.25,'sine',.05,0,.11);noise(.12,.025,6500,1,.06);},
 coinGet:()=>{if(AUD.cOn===false)return;[1568,1760,2093,2637].forEach((f,i)=>{tone(f,.12,'sine',.07,0,i*.07);tone(f*2,.06,'sine',.018,0,i*.07);});noise(.3,.018,7000,.7,.26);},
 coinNo:()=>{if(AUD.cOn===false)return;tone(392,.12,'triangle',.07);tone(311,.2,'triangle',.07,0,.13);},
 shutter:()=>{noise(.04,.08,3200,.8);tone(1800,.03,'square',.025,0,.05);noise(.06,.05,2000,.8,.08);},
 // 機車喇叭「叭！叭！」：兩聲短促的雙音（鋸齒波＋低通），音量刻意壓低，不蓋過對話
 horn:()=>{if(!sfxOK())return;[0,.27].forEach(d=>{const t=AC.currentTime+d;[415,523].forEach(f=>{const o=AC.createOscillator(),g=AC.createGain(),fl=AC.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(f,t);fl.type='lowpass';fl.frequency.value=1700;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.04,t+.015);g.gain.setValueAtTime(.04,t+.15);g.gain.exponentialRampToValueAtTime(.0005,t+.21);o.connect(fl);fl.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+.23);});});},
 stamp:()=>{tone(110,.18,'sine',.2,-50);noise(.08,.08,600,.8);},
 place:t=>{if(t.f)noise(.08,.07,2200,.8);else if('🌱🪴'.includes(t.e||'#'))noise(.12,.08,1800,.6);
  else if(t.e=='🪑'||t.e=='🛵'){tone(140,.12,'sine',.22,-40);noise(.04,.06,500)}
  else if(t.e=='🗑️'){tone(880,.09,'triangle',.11);tone(660,.12,'triangle',.08,0,.05)}
  else if('🪧📌'.includes(t.e||'#')){tone(760,.05,'square',.05);tone(500,.07,'square',.05,0,.05)}
  else sfx.drop();}};
// 背景音樂：原創、程式即時合成（輕快可愛的木琴＋鐵琴＋彈跳貝斯，C 大調 C–Am–F–G，16 小節循環）。
// 由本專案自行創作，不使用任何外部音檔，可合法用於公開網站。音量刻意壓低，避免干擾閱讀與操作。
// ===== 背景音樂：依場景切換的原創合成配樂（首頁／劇情／遊戲／結算各一首；換場景時自然淡出淡入；每首有 A、B 段和隨機小變化，避免單調）=====
// 全部由程式即時合成，屬本專題原創，可公開使用。音量由「背景音樂」滑桿控制。
let mStep=0,mNext=0,song='play',songGain=null;
const mtof=m=>440*Math.pow(2,(m-69)/12),E8=60/116/2;
const CH=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]];
const MEL=[[[0,76],[1,79],[2,84],[3,79],[4,81],[5,79],[6,76]],[[0,76],[2,72],[3,74],[4,76],[6,79]],[[0,77],[1,81],[2,84],[4,83],[5,81],[6,79]],[[0,79],[2,74],[4,79],[5,81],[6,83]],
 [[0,84],[1,83],[2,84],[3,79],[4,76],[6,79]],[[0,81],[1,79],[2,76],[4,72],[5,74],[6,76]],[[0,77],[2,81],[3,79],[4,77],[5,76],[6,74]],[[0,79],[2,74],[3,76],[4,77],[6,74]]];
let mDest=null;
function mt(f,t,d,v,type='sine'){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.connect(g);g.connect(mDest||musicGain);o.start(t);o.stop(t+d+.05);}
function mn(t,d,v,f,type='highpass'){const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const q=AC.createBufferSource();q.buffer=b;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);q.connect(fl);fl.connect(g);g.connect(mDest||musicGain);q.start(t);}
function kick(t,v=.16){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(48,t+.14);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+.2);o.connect(g);g.connect(mDest||musicGain);o.start(t);o.stop(t+.22);}
const mar=(m,t,v)=>{const f=mtof(m);mt(f,t,.38,v);mt(f*4,t,.07,v*.3);}; // 木琴
const glk=(m,t,v)=>{const f=mtof(m);mt(f,t,.7,v);mt(f*2.76,t,.22,v*.28);}; // 鐵琴
const pad=(ms,t,d,v)=>ms.forEach((m,i)=>{mt(mtof(m),t+i*.01,d,v,'triangle');mt(mtof(m)*1.003,t+i*.01,d,v*.5,'sine');});
const rnd2=(a)=>a[Math.random()*a.length|0];
const SONGS={
 // 遊戲進行：輕快的木琴＋鐵琴＋彈跳貝斯（原本的曲子）
 play:{bpm:116,lvl:1,step:8,play(t,k){const bar=Math.floor(k/8)%16,st=k%8,ch=CH[bar%4],root=ch[0]-24;t+=st%2?E8*.1:0;
  if(st==0||st==4)kick(t);if(st==2||st==6)mn(t,.07,.045,1700,'bandpass');mn(t,.025,st%2?.016:.009,8000);
  if(st==0)mt(mtof(root),t,.32,.09,'triangle');if(st==3)mt(mtof(root+12),t,.14,.06,'triangle');if(st==4)mt(mtof(root+7),t,.3,.08,'triangle');if(st==6)mt(mtof(root+12),t,.14,.06,'triangle');
  if(st==2||st==6)ch.forEach((m,i)=>mt(mtof(m+12),t+i*.006,.13,.022,'triangle'));
  const ph=MEL[bar%8].find(n=>n[0]==st);
  if(bar<8){if(ph)mar(ph[1],t,.065);}else{if(ph&&st%2==0)glk(ph[1]+12,t,.035);if(st%2)mar(ch[(st>>1)%3]+12,t,.03);}
  if(st==7&&bar%4==3)glk(rnd2([96,93,91]),t,.02);}},
 // 首頁：音樂盒華爾滋（3/4 拍，鐵琴主旋律＋柔和和弦）
 title:{bpm:100,lvl:1.3,step:6,play(t,k){const bar=Math.floor(k/6)%16,st=k%6,C=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]][bar%4],v=Math.floor(k/96)%2;
  const M=[[[0,79],[2,84],[4,83]],[[0,81],[2,79],[4,74]],[[0,76],[2,81],[3,79],[4,76]],[[0,77],[2,76],[4,72]],[[0,79],[1,81],[2,84],[4,86]],[[0,83],[2,79],[4,74]],[[0,72],[2,76],[4,81]],[[0,77],[2,79],[4,72]]][(bar%8)];
  if(st==0){mt(mtof(C[0]-24),t,.9,.07);pad(C,t,1.6,.012);}if(st==2||st==4)C.forEach((m,i)=>mt(mtof(m+12),t+i*.01,.25,.012,'triangle'));
  const n=M.find(x=>x[0]==st);if(n)glk(n[1]+(v&&bar%2?12:0),t,.04);if(bar>=8&&st==5&&Math.random()<.5)glk(rnd2([88,91,96]),t,.015);}},
 // 劇情對話：溫柔慢板（Fmaj7–Em7–Dm7–Cmaj7，留白多，不干擾閱讀）
 story:{bpm:82,lvl:1.65,step:8,play(t,k){const bar=Math.floor(k/8)%8,st=k%8,C=[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]][bar%4];t+=st%2?60/82/2*.14:0;
  if(st==0){pad(C,t,2.4,.011);mt(mtof(C[0]-12),t,1.1,.06);}if(st==5)mt(mtof(C[0]-12+7),t,.6,.04);
  if(st%2==1)mn(t,.03,.006,9000);if(st==4)mn(t,.05,.012,2500,'bandpass');
  if(st%2==0&&Math.random()<(bar>=4?.38:.26))mar(rnd2([72,74,76,79,81,84]),t,.04);}},
 // 結算與收尾：開心明亮（拍手、彈跳貝斯、鐵琴琶音）
 result:{bpm:126,lvl:1.2,step:8,play(t,k){const bar=Math.floor(k/8)%8,st=k%8,C=[[60,64,67],[65,69,72],[67,71,74],[60,64,67]][bar%4],root=C[0]-24;
  if(st%4==0)kick(t,.13);if(st==4)mn(t,.09,.05,1500,'bandpass');if(st%2==1)mn(t,.02,.012,8500);
  if(st==0||st==3||st==6)mt(mtof(root+(st==3?12:0)),t,.2,.08,'triangle');
  glk(C[st%3]+12+(st>=4?12:0),t,.022);if(bar%4==3&&st==6)[84,88,91,96].forEach((m,i)=>glk(m,t+i*.06,.025));}}};
function mPlay(t){mDest=null;SONGS.play.play(t,mStep);mStep++;} // 相容舊測試
function playSong(name,fade){if(!SONGS[name])return;if(!AC||!songGain){song=name;return;}if(name===song)return;
 const now=AC.currentTime,old=songGain;old.gain.cancelScheduledValues(now);old.gain.setValueAtTime(old.gain.value,now);old.gain.linearRampToValueAtTime(0,now+(fade||1.2));setTimeout(()=>{try{old.disconnect();}catch(e){}},((fade||1.2)+2)*1000);
 song=name;songGain=AC.createGain();songGain.gain.setValueAtTime(0,now);songGain.gain.linearRampToValueAtTime(SONGS[name].lvl,now+1.6);songGain.connect(musicGain);mStep=0;mNext=now+.25;}
function startMusic(){if(MUSIC_SRC){try{musicEl=new Audio(MUSIC_SRC);musicEl.loop=true;AC.createMediaElementSource(musicEl).connect(musicGain);musicEl.play().catch(()=>{});return;}catch(e){musicEl=null;}}
 songGain=AC.createGain();songGain.gain.value=SONGS[song].lvl;songGain.connect(musicGain);mNext=AC.currentTime+.1;
 const ctx0=AC;setInterval(()=>{if(AC!==ctx0||AC.state!=='running')return;const S=SONGS[song],e8=60/S.bpm/2;mDest=songGain;while(mNext<AC.currentTime+.4){S.play(mNext,mStep);mStep++;mNext+=e8;}mDest=null;},100);}
let char=null,S,stage=1,tool=null,drag=null,before=null;
const mk=(e,x,y,s)=>({e,x,y,s,w:s});
function init(){
 const by=v=>BAND[0]+v-395;
 const spread=(arr,dy)=>arr.map((c,i)=>({img:c.img,s:c.s,w:c.w,x:arr.length>1?110+i*(W-220)/(arr.length-1):W/2,y:by(dy+(i%3)*24)}));
 let obs=[],trash=[],bumps=[],decor=[];
 if(lvIdx==0||lvIdx==3)obs=cust.obs.length?spread(cust.obs,440):[['📦',200,450,80],['🪑',360,470,70],['📦',520,440,90],['🛵',690,470,95],['🗃️',300,430,72],['📦',850,465,85],['🪑',610,495,70],['🗃️',120,470,70]].map(([e,x,y,z])=>mk(e,x,by(y),z));
 if(lvIdx==0)decor=[['🍽️',250],['🪑',315],['🍽️',590],['🪑',735]].map(([e,x])=>mk(e,x,BAND[0]-2,56));
 if(lvIdx==2){
  trash=cust.trash.length?spread(cust.trash,420):[['🥤',180,520],['🍾',610,405],['🥤',690,510],['📄',820,430]].map(([e,x,y])=>mk(e,x,by(y),26));
  bumps=[{x:210,y:by(470),r:38},{x:480,y:by(430),r:34},{x:650,y:by(485),r:40},{x:830,y:by(465),r:32}];}
 return{obs,trash,bumps,decor,placed:[]};
}
const cl=st=>({decor:(st.decor||[]).map(o=>({...o})),obs:st.obs.map(o=>({...o})),trash:st.trash.map(o=>({...o})),bumps:st.bumps.map(o=>({...o})),placed:st.placed.map(o=>({...o}))});
function scene(c){
 let g=c.createLinearGradient(0,0,0,360);g.addColorStop(0,'#d8c7a8');g.addColorStop(1,'#b9a27d');c.fillStyle=g;c.fillRect(0,0,W,360);
 [[20,'#7a2e2e','小吃店'],[340,'#2e5a4a','五金行'],[660,'#3c4a7a','水果攤']].forEach(([x,col,n])=>{c.fillStyle=col;c.fillRect(x,40,270,50);c.fillStyle='#fff';c.font='bold 26px "Noto Sans TC",sans-serif';c.textAlign='center';c.fillText(n,x+135,76);
  c.fillStyle='#3a3530';c.fillRect(x+20,120,230,220);c.fillStyle='rgba(180,210,220,.55)';c.fillRect(x+30,130,210,150);c.fillStyle='#8a8f94';c.fillRect(x+20,105,230,14);});
 g=c.createLinearGradient(0,0,0,150);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,150);
 g=c.createLinearGradient(0,340,0,H);g.addColorStop(0,'#9c9488');g.addColorStop(1,'#c9c2b4');c.fillStyle=g;c.fillRect(0,340,W,H-340);
 c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=1;
 for(let x=0;x<W;x+=60){c.beginPath();c.moveTo(x,340);c.lineTo(x-30,H);c.stroke();}
 for(let y=370;y<H;y+=45){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
 c.fillStyle='#6f6a62';c.fillRect(0,H-12,W,12);
}
function pillars(c){
 [0,330,650,940].forEach(x=>{let pg=c.createLinearGradient(x,0,x+26,0);pg.addColorStop(0,'#8d8577');pg.addColorStop(.5,'#cfc7b6');pg.addColorStop(1,'#7c7466');c.fillStyle=pg;c.fillRect(x,100,26,300);});
}
function lightWash(c){
 c.save();
 // 整體冷暖光：左上偏暖陽光，右下偏冷陰影，營造方向光立體感
 let g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(255,225,170,.16)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(10,15,40,.20)');
 c.globalCompositeOperation='overlay';c.fillStyle=g;c.fillRect(0,0,W,H);
 c.globalCompositeOperation='source-over';
 // 天花板陰影（縱深）
 g=c.createLinearGradient(0,0,0,170);g.addColorStop(0,'rgba(0,0,0,.4)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,170);
 // 地面反光暖色
 g=c.createLinearGradient(0,H-110,0,H);g.addColorStop(0,'rgba(255,235,195,0)');g.addColorStop(1,'rgba(255,230,180,.22)');c.fillStyle=g;c.fillRect(0,H-110,W,110);
 // 入口方向的一道光束，增加縱深感
 g=c.createLinearGradient(W*.42,0,W*.62,H);g.addColorStop(0,'rgba(255,245,210,.16)');g.addColorStop(1,'rgba(255,245,210,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
 // 暗角，讓畫面更立體聚焦
 const rg=c.createRadialGradient(W/2,H*.42,H*.25,W/2,H*.5,H*.95);rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(0,0,0,.28)');c.fillStyle=rg;c.fillRect(0,0,W,H);
 c.restore();
}
function fore(c){pillars(c);lightWash(c);}
function draw(c,st,o={}){
 c.clearRect(0,0,W,H);
 if(bgImg){const ar=bgImg.width/bgImg.height,tr=W/H;let sw=bgImg.width,sh=bgImg.height,sx=0,sy=0;if(ar>tr){sw=sh*tr;sx=(bgImg.width-sw)/2}else{sh=sw/tr;sy=bgImg.height-sh}c.drawImage(bgImg,sx,sy,sw,sh,0,0,W,H);}else scene(c);
 st.bumps.forEach(b=>{if(b.fixed)return;const p=b.p||0,R=b.r*(1-p*.75);c.save();c.translate(b.x,b.y);c.scale(1,.45);
  c.fillStyle='rgba(225,215,195,'+(.6*p)+')';c.beginPath();c.arc(0,0,b.r+4,0,7);c.fill();
  c.fillStyle='rgba(50,40,30,.45)';c.beginPath();c.arc(3,5,R,0,7);c.fill();
  let gg=c.createRadialGradient(-6,-6,4,0,0,R);gg.addColorStop(0,'#b5ac9c');gg.addColorStop(1,'#6e675b');c.fillStyle=gg;c.beginPath();c.arc(0,0,Math.max(1,R-4),0,7);c.fill();c.restore();
  if(o.hint&&stage==2&&phase2=='bump'){c.strokeStyle='#ffd24a';c.setLineDash([5,4]);c.lineWidth=2;c.beginPath();c.ellipse(b.x,b.y,b.r,b.r*.5,0,0,7);c.stroke();c.setLineDash([]);}});
 if(o.band){const h=BAND[1]-BAND[0];
  if(cust.band)c.drawImage(cust.band,0,BAND[0],W,h);
  else{c.fillStyle='rgba(255,196,0,.26)';c.fillRect(0,BAND[0],W,h);
   c.save();c.fillStyle='rgba(120,70,0,.45)';c.font='bold 22px "Noto Sans TC",sans-serif';c.textAlign='center';c.fillText(tr('騎樓通道 ・ 請保持暢通'),W/2,BAND[0]+h/2+8);c.restore();
   [BAND[0]-4,BAND[1]-4].forEach(y=>{c.save();c.beginPath();c.rect(0,y,W,8);c.clip();c.fillStyle='#f5c400';c.fillRect(0,y,W,8);c.fillStyle='#222';
    for(let x=-8;x<W;x+=16){c.beginPath();c.moveTo(x,y+8);c.lineTo(x+8,y+8);c.lineTo(x+16,y);c.lineTo(x+8,y);c.fill();}c.restore();});}}
 st.placed.filter(p=>p.f).forEach(p=>{c.save();c.translate(p.x,p.y);
  if(p.img)c.drawImage(p.img,-p.w/2,-p.s/2,p.w,p.s);
  else{c.scale(1,.55);
   if(p.tile){c.fillStyle='#f2c200';c.fillRect(-p.w/2,-p.s/2,p.w,p.s);c.fillStyle='rgba(90,60,0,.55)';for(let x=-p.w/2+9;x<p.w/2;x+=14)for(let y=-p.s/2+8;y<p.s/2;y+=12){c.beginPath();c.arc(x,y,3,0,7);c.fill();}}
   else{c.globalAlpha=.92;c.font=p.s+'px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(p.e,0,0);}}
  c.restore();});
 if(LV.zone){const z=zoneRect();c.save();c.fillStyle='rgba(70,130,220,.28)';c.fillRect(z.x,z.y,z.w,z.h);c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=3;c.strokeRect(z.x,z.y,z.w,z.h);c.lineWidth=2;for(let x=z.x+100;x<z.x+z.w;x+=100){c.beginPath();c.moveTo(x,z.y);c.lineTo(x,z.y+z.h);c.stroke();}c.fillStyle='#fff';c.font='bold 16px "Noto Sans TC",sans-serif';c.textAlign='left';c.fillText(tr('🛵 機車停放區'),z.x+8,z.y+20);c.restore();}
 if(o.bin){c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(W/2+6,H-18,50,10,0,0,7);c.fill();c.font='96px serif';c.fillText('🗑️',W/2,H-24);c.font='bold 15px "Noto Sans TC",sans-serif';c.fillStyle='#fff';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=4;c.strokeText(tr('拖到這裡'),W/2,H-125);c.fillText(tr('拖到這裡'),W/2,H-125);}
 const objs=[];
 st.trash.forEach(t=>{if(!t.got)objs.push(t)});
 (st.decor||[]).forEach(t=>objs.push(t));
 st.obs.forEach(t=>objs.push({...t,bad:t.y>BAND[0]-10&&t.y<BAND[1]+30,hitBad:drag&&drag.o===t&&hit2(t)}));
 st.placed.filter(p=>!p.f).forEach(p=>objs.push({...p,bad:isBad(p),hitBad:drag&&drag.p===p&&hit2(p)}));
 objs.slice().sort((a,b)=>a.y-b.y).forEach(k=>{
  c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(k.x+k.w*.1,k.y+k.s*.03,k.w*.45,Math.min(k.s,k.w)*.13,0,0,7);c.fill();
  const hg=c.createRadialGradient(k.x-k.w*.12,k.y-k.s*.72,2,k.x,k.y-k.s*.55,k.w*.65);hg.addColorStop(0,'rgba(255,250,230,.35)');hg.addColorStop(1,'rgba(255,250,230,0)');c.fillStyle=hg;c.beginPath();c.ellipse(k.x,k.y-k.s*.5,k.w*.6,k.s*.6,0,0,7);c.fill();
  if(k.img)c.drawImage(k.img,k.x-k.w/2,k.y-k.s,k.w,k.s);
  else{c.font=k.s+'px serif';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(k.e,k.x,k.y);}
  if(o.band){const st=k.zone&&k.bad?'no':(k.bad||k.hitBad)?'warn':(drag&&drag.p&&drag.p.x===k.x&&drag.p.y===k.y)?'ok':'';if(st)mark2(c,k,st);}});
 if(!bgImg){pillars(c);}
 lightWash(c);
}
const snap=st=>{const o=document.createElement('canvas');o.width=W;o.height=H;draw(o.getContext('2d'),cl(st));return o};
const blocked=()=>S.obs.filter(o=>o.y>BAND[0]-10&&o.y<BAND[1]+30);
function setNext(){const last=LV.stages.indexOf(stage)==LV.stages.length-1;nextB.innerHTML=last?icon('check')+esc(tr('完成')):esc(tr('下一階段'))+icon('next');}
let msgFn=null;function setMsg(fn){msgFn=fn;msg.textContent=fn();}
function status(){
 cv.style.cursor=(stage==2&&phase2=='bump')?SHOVEL:(drag?GC.g:'');
 if(stage==0){hintB.style.display='none';setMsg(()=>tr('走進騎樓了。點一下前面的人，和他聊聊看。'));nextB.disabled=true;return;}
 hintB.style.display=stage==2?'':'none';const left=S.trash.some(x=>!x.got)||S.bumps.some(x=>!x.fixed);hintB.innerHTML=icon('hint')+esc(tr('提示（剩 {n} 次）',{n:hints}));hintB.disabled=hints<=0||!left;
 if(stage==1){const n=blocked().length;setMsg(()=>tr('第一階段｜把擋住通道的大型物品拖到通道外，往上靠牆放（剩 {n} 件）',{n}));nextB.disabled=false;}
 else if(stage==2){const t=S.trash.filter(x=>!x.got).length,b=S.bumps.filter(x=>!x.fixed).length;setMsg(()=>phase2=='trash'?tr('第二階段 ①｜把游標移到垃圾上，拖到下方垃圾桶（剩 {n}）',{n:t}):tr('第二階段 ②｜用鏟子在凹凸處來回刮，把路面鋪平（剩 {n}）',{n:b}));nextB.disabled=t+b>0;}
 else if(stage==3){const n=S.placed.filter(isBad).length;setMsg(()=>n?tr('第三階段｜有 {n} 個物件擋住通道或停錯位置（紅框），請移開',{n}):tr('第三階段｜選物件後點擊地面擺放；拖曳已擺的物件可移動，拖出地面就會移除。地面指引貼可貼在通道上，其他物件要保持黃色通道暢通！')+(LV.zone?tr(' 機車只能停在藍色停放區。'):''));nextB.disabled=false;}
 if(stage>=1&&stage<4)setNext();
}
function render(){
 if(story){storyRender();return;}
 if(stage<4){draw(ctx,S,{band:stage==1||stage==3,hint:true,bin:binShown&&stage==2});
  if(stage==0){intro();return;}
  const now=performance.now();
  if(hintT&&now<hintUntil&&stage==2&&!hintT.got&&!hintT.fixed){
   const cy=hintT.r?hintT.y:hintT.y-hintT.s/2,k=(now%700)/700,r=(hintT.r?hintT.r:Math.max(24,hintT.s*.6))+8+k*22;
   ctx.save();ctx.strokeStyle='rgba(255,60,60,'+(1-k)+')';ctx.lineWidth=5;ctx.beginPath();ctx.arc(hintT.x,cy,r,0,7);ctx.stroke();
   ctx.strokeStyle='#ffd24a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hintT.x,cy,(hintT.r?hintT.r*.6:Math.max(24,hintT.s*.6))+6,0,7);ctx.stroke();ctx.restore();
   requestAnimationFrame(render);}
  return;}
 const p=sl.value/100*W;ctx.clearRect(0,0,W,H);ctx.drawImage(before,0,0);
 const a=snap(S);ctx.save();ctx.beginPath();ctx.rect(p,0,W-p,H);ctx.clip();ctx.drawImage(a,0,0);ctx.restore();
 ctx.fillStyle='#fff';ctx.fillRect(p-2,0,4,H);ctx.beginPath();ctx.arc(p,H/2,18,0,7);ctx.fill();ctx.fillStyle='#333';ctx.font='16px "Noto Sans TC",sans-serif';ctx.textAlign='center';ctx.fillText('↔',p,H/2+6);
}
function pos(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]}
const inBand=o=>o.y>BAND[0]-10&&o.y<BAND[1]+30;
// 2D 碰撞：用物件底部的佔地範圍判斷（寬約物件寬的 80%，深度約高度的 30%）；地面指引貼不算
const foot2=o=>{const w=o.w*.4,d=Math.max(10,o.s*.16);return{x0:o.x-w,x1:o.x+w,y0:o.y-d,y1:o.y+d};};
const ov2=(a,b)=>a.x0<b.x1&&b.x0<a.x1&&a.y0<b.y1&&b.y0<a.y1;
function hit2(o){if(o.f)return null;const f=foot2(o);const pool=stage==1?S.obs.concat(S.decor||[]):S.placed.filter(p=>!p.f).concat(S.decor||[]);for(const q of pool){if(q===o)continue;if(ov2(f,foot2(q)))return q;}return null;}
let fails2=0;
function toast2(t,k){const e=$('toast2');e.textContent=t;e.className='toast show '+(k||'');clearTimeout(toast2.t);toast2.t=setTimeout(()=>{e.className='toast';},2600);}
const EMO_NAME={'📦':'紙箱','🪑':'椅子','🛵':'機車','🗃️':'櫃子','🍽️':'餐桌'};
const nm2=o=>o.name?tr(o.name):(EMO_NAME[o.e]?tr(EMO_NAME[o.e]):(o.e||tr('物件')));
const trashAt=(x,y,pad=0)=>S.trash.find(t=>!t.got&&Math.hypot(x-t.x,y-(t.y-t.s/2))<Math.max(24,t.s*.6)+pad);
const overBin=(x,y)=>Math.abs(x-W/2)<70&&y>H-140;
cv.onpointerdown=e=>{const[x,y]=pos(e);audioInit();if(story){storyClick(x,y);return;}const pad=e.pointerType==='mouse'?0:22*W/cv.getBoundingClientRect().width;
 if(stage==0){if(openMode){nextOpen();return;}if(dlgOpen)nextLine();else if(Math.abs(x-780)<60&&y>370&&y<485)openDlg();return;}
 if(stage==1){for(let i=S.obs.length-1;i>=0;i--){const o=S.obs[i];if(Math.abs(x-o.x)<o.w/2+pad&&y>o.y-o.s-pad&&y<o.y+10+pad){drag={k:'obs',o,dx:x-o.x,dy:y-o.y,was:inBand(o),ox:o.x,oy:o.y};(()=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}})();sfx.grab();break;}}}
 else if(stage==2){
  if(phase2=='trash'){const t=trashAt(x,y,pad);if(t){drag={k:'trash',t};binShown=true;(()=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}})();sfx.grab();}}
  else{drag={k:'dig',lx:x,ly:y};(()=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}})();digAt(x,y,0);}}
 else if(stage==3){let i=-1;for(let j=S.placed.length-1;j>=0;j--){const p=S.placed[j];if(p.f?(Math.abs(x-p.x)<p.w/2+pad&&Math.abs(y-p.y)<p.s*.35+pad):(Math.abs(x-p.x)<p.w/2+pad&&y>p.y-p.s-pad&&y<p.y+8+pad)){i=j;break;}}
  if(i>=0){const p=S.placed[i];S.placed.splice(i,1);S.placed.push(p);drag={k:'place',p,dx:x-p.x,dy:y-p.y,ox:p.x,oy:p.y};(()=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}})();sfx.grab();}
  else if(tool&&y>floorTop()&&y<H-14){const np={e:tool.e,img:tool.img,x,y,s:tool.s,w:tool.w,f:tool.f,tile:tool.tile,zone:tool.zone,name:tool.name};const h=hit2(np);S.placed.push(np);sfx.place(tool);if(h)toast2(tr('疊在「{n}」上面了（會影響評分）',{n:nm2(h)}),'warn');}}
 status();render();};
function digAt(x,y,d){let hit=false;S.bumps.forEach(b=>{if(b.fixed||Math.hypot(x-b.x,(y-b.y)*2.2)>b.r*1.1)return;hit=true;b.p=Math.min(1,(b.p||0)+d*.006);
  if(b.p>=1){b.fixed=true;sfx.fixed();if(S.bumps.every(q=>q.fixed))setTimeout(sfx.done,250);}});if(hit)sfx.shovel();}
cv.onpointermove=e=>{const[x,y]=pos(e);
 if(!drag){if(stage==2&&phase2=='trash'){const h=!!trashAt(x,y);cv.style.cursor=h?GC.h:'';if(h&&!binShown){binShown=true;render();}}
  else if(stage==1){cv.style.cursor=S.obs.some(o=>Math.abs(x-o.x)<o.w/2&&y>o.y-o.s&&y<o.y+10)?GC.h:'';}
  else if(stage==3){cv.style.cursor=S.placed.some(o=>Math.abs(x-o.x)<o.w/2&&y>o.y-o.s&&y<o.y+8)?GC.h:'';}
  return;}
 if(drag.k=='obs'){const o=drag.o;o.x=Math.max(30,Math.min(W-30,x-drag.dx));o.y=Math.max(BAND[0]-35,Math.min(H-16,y-drag.dy));sfx.drag();const h=hit2(o);warn2(h?tr('會疊在「{n}」上面（可以放，但會影響評分）',{n:nm2(h)}):'');}
 else if(drag.k=='trash'){const t=drag.t;t.x=Math.max(10,Math.min(W-10,x));t.y=Math.max(30,Math.min(H-8,y+t.s/2));}
 else if(drag.k=='dig'){digAt(x,y,Math.hypot(x-drag.lx,y-drag.ly));drag.lx=x;drag.ly=y;}
 else if(drag.k=='place'){const p=drag.p;p.x=Math.max(20,Math.min(W-20,x-drag.dx));p.y=y-drag.dy;sfx.move();const h=hit2(p);warn2(h?tr('會疊在「{n}」上面（可以放，但會影響評分）',{n:nm2(h)}):'');}
 status();render();};
function warn2(t){const w=$('warn2');w.textContent=t;w.style.display=t?'block':'none';}
cv.onpointerup=e=>{if(!drag)return;const[x,y]=pos(e),d=drag;drag=null;warn2('');
 if(d.k=='obs'){const h=hit2(d.o);sfx.drop();if(h)toast2(tr('疊在「{n}」上面了（會影響評分）',{n:nm2(h)}),'warn');else{if(d.was&&!inBand(d.o))sfx.ding();if(!blocked().length)setTimeout(sfx.done,250);}}
 else if(d.k=='trash'){const t=d.t;if(overBin(x,y)){t.got=true;sfx.bin();if(S.trash.every(q=>q.got)){binShown=false;phase2='bump';setTimeout(sfx.done,250);}}else{t.y=Math.min(t.y,H-16);sfx.drop();}}
 else if(d.k=='place'){const p=d.p;if(p.y<floorTop()||p.y>H-10){S.placed.splice(S.placed.indexOf(p),1);sfx.poof();}else{const h=hit2(p);sfx.place(p);if(h)toast2(tr('疊在「{n}」上面了（會影響評分）',{n:nm2(h)}),'warn');}}
 status();render();};
function buildPal(){
 const keep=tool;pal.innerHTML='';
 const add=t=>{const b=document.createElement('button');
  if(t.img){const i=document.createElement('img');i.src=t.img.src;b.appendChild(i);}else b.appendChild(document.createTextNode(t.e+' '));
  b.appendChild(document.createTextNode(tr(t.name)));b.className='btn chip';
  b.onclick=()=>{tool=t;[...pal.children].forEach(c=>c.classList.remove('on'));b.classList.add('on')};if(keep&&keep.name===t.name&&keep.e===t.e){tool=t;b.classList.add('on');}pal.appendChild(b)};
 LV.items.forEach(t=>add({e:t.e,name:t.name,s:t.s,w:t.w}));
 equippedFor(lvIdx).forEach(it=>add({e:it.e,name:it.name,s:it.s||50,w:it.w||50,shop:it.id}));
 cust.place.forEach(c=>add({img:c.img,name:c.name,s:c.s,w:c.w}));
 const lb=document.createElement('span');lb.textContent=tr('｜地面指引貼：');lb.style.cssText='align-self:center;font-size:13px;opacity:.7';pal.appendChild(lb);
 [['➡️','前進方向'],['🚶','行人通行'],['🚫','禁止堆放'],['⚠️','注意腳下']].forEach(([e,n])=>add({e,name:n,s:52,w:52,f:1}));
 add({e:'🟨',name:'導盲磚',s:34,w:110,f:1,tile:1});
 (cust.sticker||[]).forEach(c=>add({img:c.img,name:c.name,s:c.s,w:c.w,f:1}));
}
function enterStage(){pal.style.display=stage==3?'flex':'none';setNext();}
function reset(){
 dlgOpen=false;phase2='trash';binShown=false;fails2=0;S=init();hints=3;hintT=null;stage=LV.stages[0];tool=null;drag=null;before=snap(S);
 pal.style.display='none';cmp.style.display='none';nextB.style.display='';$('score2').innerHTML='';
 buildPal();enterStage();$('shot').style.display='none';status();render();
}
hintB.onclick=()=>{if(hints<=0||stage!=2)return;
 const t=phase2=='trash'?S.trash.find(x=>!x.got):S.bumps.find(x=>!x.fixed);if(!t)return;
 hints--;hintT=t;hintUntil=performance.now()+3500;status();render();};
nextB.onclick=()=>{audioInit();const nb=stage==1?blocked().length:stage==3?S.placed.filter(isBad).length:0;
 if(nb&&!nextB._ok){confirmBox(tr('還有 {n} 件物件擋在通道上或放錯位置，會影響評分。要先調整，還是就這樣繼續？',{n:nb}),tr('就這樣繼續'),tr('再調整一下'),()=>{nextB._ok=1;nextB.click();});return;}nextB._ok=0;
 const i=LV.stages.indexOf(stage);stage=LV.stages[i+1]||4;
 if(stage==4){pal.style.display='none';nextB.style.display='none';const last=lvIdx>=LEVELS.length-1;$('lvB').style.display=last?'none':'';
  const r2=score2(),rw=levelDone(lvIdx,r2.stars);closeNoteStamped(()=>{cmp.style.display='block';showScore2(r2,rw);setTimeout(()=>announce(rw),600);
   setMsg(()=>last?tr('🎉 全部通關！「{l}」拖動滑桿看看變化，也可以儲存成果圖。',{l:ovLine()}):tr('🎉 Lv{n} 完成！拖動滑桿看看變化，準備進入下一關。',{n:lvIdx+1}));sfx.allDone();render();});
  return;}
 enterStage();status();render();};
$('lvB').onclick=()=>{$('game').style.display='none';transition(()=>{$('game').style.display='';loadLevel(lvIdx+1);showPhone();},'Loading Lv'+(lvIdx+2),1400);};
sl.oninput=render;
// 匯入
const readImg=f=>new Promise(res=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=r.result};r.onerror=()=>res(null);r.readAsDataURL(f)});
$('bgf').onchange=async e=>{const f=e.target.files[0];if(!f)return;const i=await readImg(f);if(i){bgImg=i;userBg=true;reset();}};
$('bandf').onchange=async e=>{const f=e.target.files[0];if(!f)return;const i=await readImg(f);if(i){cust.band=i;render();}};
$('bandx').onclick=()=>{cust.band=null;$('bandf').value='';render();};
$('bgx').onclick=()=>{userBg=false;bgImg=LVBG[lvIdx]||null;$('bgf').value='';reset();};
$('objf').onchange=async e=>{
 const cat=$('cat').value,s=+$('sz').value;
 for(const f of e.target.files){const i=await readImg(f);if(i)cust[cat].push({img:i,s,w:Math.round(s*i.width/i.height),name:f.name.replace(/\.[^.]+$/,'').slice(0,8)});}
 e.target.value='';reset();};
$('cat').onchange=()=>{const v={obs:90,trash:30,place:70,sticker:70}[$('cat').value];$('sz').value=v;$('szv').textContent=v;};
$('sz').oninput=()=>$('szv').textContent=$('sz').value;
$('bandS').oninput=()=>{const v=+$('bandS').value;BAND=[v,v+LV.bh];reset();};
$('clr').onclick=()=>{cust={obs:[],trash:[],place:[],sticker:[],band:null,walker:null};$('objf').value='';reset();};
$('rst').onclick=reset;

// 角色選擇
const STUDENT={e:'🧑‍🎓',name:'高中生',tag:'⭐ 固定主角',note:'串連整個故事的固定主角，負責認識居民、了解問題。',line:'這條每天走的路，變好走了！',need:['我來看看，這裡最難走的是哪一段？','門口和路面，我先去看看。','我先看看路面哪裡最不好走。','我們一起想辦法，讓路暢通吧。']};
const CHARS=[
 {e:'👴',name:'老人',note:'腳步慢，最怕地面不平、通道被擋。',line:'地面平整了，我走起來安心多了。'},
 {e:'🧑‍💼',name:'上班族',note:'趕著上班，需要一條順暢的路。',line:'終於不用繞路，準時上班！'},
 {e:'👩‍🍼',name:'推嬰兒車的人',note:'嬰兒車需要寬敞又平整的通道。',line:'嬰兒車推得過去了，謝謝你！'},
 {e:'🧒🐕',name:'遛狗的小孩',note:'牽著狗，不想被雜物絆到。',line:'我和狗狗可以好好散步囉！'}];
const NEED={
 '老人':['他把桌椅擺得滿滿的，我都快走不過去了。','我家門口堆了好多盆栽雜物，每次出門都要繞路。','超市外的路也不好走，買個菜都要小心。','路上雜物和機車太多，我走得很慢也很怕摔。'],
 '上班族':['趕時間經過，常常被桌椅擋住。','路過這條巷子，門口東西堆太多了。','超市外面亂糟糟的，買完東西很難走。','機車擋住整條路，我根本過不去。'],
 '推嬰兒車的人':['嬰兒車根本擠不進你們店門口。','這條路坑坑疤疤的，嬰兒車很難推。','超市外面的路面高低差，嬰兒車過不去。','機車和紙箱擋著，嬰兒車完全進不去。'],
 '遛狗的小孩':['狗狗被你們的桌椅絆到了。','這條巷子雜物太多，狗狗一直被勾住。','超市外的紙箱和購物車擋住我們。','雜物太多，我和狗狗沒辦法好好走去公園。']};
CHARS.forEach(c=>c.need=NEED[c.name]);
// NPC 台詞：依「關卡 × NPC × 玩家角色」決定，之後可直接增修。每個陣列對應 Lv1~Lv4。
const NPCS=[
 {e:'🧑‍🍳',name:'小吃店老闆',open:['唉，桌椅雜物把騎樓都佔滿了，客人跟行人常常卡在一起。','我這小吃店生意好是好，但門口亂糟糟的，大家都走得很辛苦。','騎樓是大家的路，不能只顧我自己做生意。','幫我把店門口整理一下，讓客人跟行人都能走吧！'],reply:'對，桌椅該放哪裡，真的要好好想想。'},
 {e:'👴',name:'老人（住戶）',open:['我家門口堆了好多盆栽雜物，年紀大了走路要小心。','這條巷子是我每天散步的路，最近越來越難走。','騎樓也是我家生活的一部分，但也要讓大家走得過去。','幫我整理一下吧，讓巷子好走一點。'],reply:'對，盆栽放整齊一點就好走多了。'},
 {e:'👩‍🍼',name:'媽媽與寶寶',img:'mother',open:['超市外面常常堆滿貨箱和購物車，路都被擋住了。','買菜的人多，推車跟行人常常撞在一起。','超市外的路面高低不平，我推嬰兒車常常過不去。','幫忙把外面整理一下吧，讓大家買完東西方便走。'],reply:'對，先把路面弄平，推車跟嬰兒車都好走。'},
 {e:'🧒🐕',name:'鄰居小孩',open:['這條巷子通往公園，但雜物越堆越多。','機車和紙箱擋在路中間，我和狗狗常常要繞路。','大家都想走這條路去公園，應該讓它暢通一點。','幫忙整理一下，讓大家都能順利走到公園！'],reply:'對啊，整理好我就能帶狗狗去公園散步了！'}];
function start(c){char=c;$('av').textContent=c.e;$('pick').style.display='none';
 transition(()=>{$('game').style.display='';loadLevel(0);},'Loading',1400);}
function lvLabel(){$('lv').textContent='Lv'+(lvIdx+1)+' '+tr(LV.name);}
function loadLevel(i){lvIdx=i;LV=LEVELS[i];BAND=[LV.top,LV.top+LV.bh];if(!userBg)bgImg=(cust.lvBg&&cust.lvBg[i])||LVBG[i]||null;$('bandS').value=LV.top;lvLabel();reset();
 npc=NPCS[i];fillTxtPanel();stage=0;pal.style.display='none';status();render();}
function ov(k,def){const t=TXT[lvIdx];return(t&&t[k])?t[k]:tr(def);}
function ovWho(){return ov('who',npc.name);}
function ovWhere(){return ov('where',CASE_PLACE[lvIdx]);}
function ovOpen(){return ov('open',npc.open[lvIdx]);}
function ovNeed(){return ov('need',char.need[lvIdx]);}
function ovReply(){return ov('reply',npc.reply);}
function ovLine(){return ov('line',char.line);}
function buildLines(){const me=char.e+' '+tr(char.name),nn=char.e?npc.e+' '+ovWho():'';return[[nn,ovOpen(),0,780],[me,ovNeed(),0,170],[nn,ovReply(),0,780]];}
function openDlg(){dl=buildLines();di=0;dlgOpen=true;render();}
function nextLine(){di++;if(di>=dl.length){dlgOpen=false;stage=LV.stages[0];enterStage();status();if(!tut2Seen){tut2Seen=true;showTut('2d');}}render();}
let tut2Seen=false;
function openNote(){
 $('noteWho').textContent=ovWho();$('noteWhere').textContent=ovWhere();
 $('noteProb').textContent=ovOpen();$('noteNeed').textContent=ovReq();
 $('notePhoto').textContent=LVBG[lvIdx]?'':'📷';$('stamp').classList.remove('go');
 $('noteBtn').style.display='';$('noteBtn').textContent=tr('接受委託');
 $('noteBtn').onclick=()=>{$('note').style.display='none';stage=LV.stages[0];enterStage();status();render();};
 $('note').style.display='flex';
}
function closeNoteStamped(cb){
 $('noteWho').textContent=ovWho();$('noteWhere').textContent=ovWhere();
 $('noteProb').textContent=ovOpen();$('noteNeed').textContent=ovReq();
 $('notePhoto').textContent=LVBG[lvIdx]?'':'📷';
 $('noteBtn').style.display='none';$('note').style.display='flex';$('stamp').classList.remove('go');
 setTimeout(()=>{$('stamp').classList.add('go');sfx.fixed();},350);
 setTimeout(()=>{$('note').style.display='none';cb();},1900);
}
// 擺放符號（2D）：× 不能放（停錯區域）／! 要注意（擋通道、重疊）／✓ 可以放（拖曳中）
function mark2(c,k,st){const col={ok:['#e3f2e6','#7fb48e','#3f8a56','✓'],warn:['#fdf1cf','#e2b54f','#b07d10','!'],no:['#f9e1dc','#e09485','#c2483a','×']}[st];
 c.save();if(st!=='ok'){c.setLineDash([7,5]);c.strokeStyle=col[1];c.lineWidth=2.4;rr(c,k.x-k.w/2-3,k.y-k.s-3,k.w+6,k.s+9,10);c.stroke();c.setLineDash([]);}
 const cx=k.x+k.w/2-2,cy=k.y-k.s+2;c.fillStyle=col[0];c.strokeStyle=col[1];c.lineWidth=2.4;c.beginPath();c.arc(cx,cy,12,0,7);c.fill();c.stroke();
 c.fillStyle=col[2];c.font='900 16px "Noto Sans TC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(col[3],cx,cy+1);c.restore();}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function bubble(sx,headY,who,text,last){const n=$('dlg2');if(!n)return;who=tr(who);text=tr(text);const hint=last?tr('點一下開始 ▶'):tr('點一下繼續 ▶');
 const em=(who.match(/^\p{Extended_Pictographic}[\u200d\uFE0F\p{Extended_Pictographic}]*/u)||[''])[0],nm=who.slice(em.length).trim();
 talkX=sx;const key=who+'|'+text+'|'+hint;if(n._k!==key){n._k=key;n.classList.remove('nl');void n.offsetWidth;n.classList.add('nl');const wk=(/客人/.test(nm)?'customer':null)||{'👩‍🏫':'teacher','🧑‍🏫':'teacher','🧑‍🎓':'student','🧑‍🍳':'dad','👩‍🍼':'mother'}[em.replace(/\uFE0F/g,'')],wim=wk&&storyImg(wk),wh=n.querySelector('.who');if(wim)wh.innerHTML='<img alt="" src="'+headSrc(wim)+'">';else wh.textContent=em;n.querySelector('b').textContent=nm||who;n.querySelector('p').textContent=text;n.querySelector('small').textContent=hint;}
 n.classList.add('on');if(n._spk!==key){n._spk=key;speak(text,whoKey(nm||who));}
 requestAnimationFrame(()=>{if(n.parentElement&&n.parentElement.closest('#side2'))return;const r=cv.getBoundingClientRect(),b=n.getBoundingClientRect();if(!b.width)return;const x=r.left+sx/W*r.width-b.left;n.style.setProperty('--tail',Math.max(28,Math.min(b.width-28,x))+'px');});}
function bubbleOff(){talkX=null;const n=$('dlg2');if(n&&n.classList.contains('on')){n.classList.remove('on');n._k='';n._spk='';stopVoice();}}
let openMode=false;
const OPENLINES=[['🧑‍🎓 高中生','放學了，又走在這條老街的騎樓下。'],['🧑‍🎓 高中生','咦？這裡堆了好多東西，路都變窄了……'],['🧑‍🎓 高中生','等等，手機響了。是《騎咧走》平台的通知！']];
const REQ=['移開擋路的桌椅雜物，讓客人與行人都走得過','整理門口的雜物盆栽，讓出可以走的路','先把高低不平的路面鋪平，讓嬰兒車順利通過','清掉紙箱雜物，讓去公園的路暢通'];
function ovReq(){return ov('req',REQ[lvIdx]);}
function startStory(){char=STUDENT;setAv();$('game').style.display='';loadLevel(0);openMode=true;di=0;dl=OPENLINES.map(l=>[l[0],l[1],0,480]);dlgOpen=true;render();}
function nextOpen(){di++;if(di>=dl.length){openMode=false;dlgOpen=false;showPhone();}else render();}
function fillPhone(){$('phWho').textContent=ovWho();$('phWhere').textContent=ovWhere();$('phProb').textContent=ovOpen();$('phReq').textContent=ovReq();}
function fillNote(){$('noteWho').textContent=ovWho();$('noteWhere').textContent=ovWhere();$('noteProb').textContent=ovOpen();$('noteNeed').textContent=ovReq();}
function showPhone(){
 fillPhone();
 const im=$('phImg'),ph=$('phPh'),bg=(cust.phPhoto&&cust.phPhoto[lvIdx])||(cust.lvBg&&cust.lvBg[lvIdx])||LVBG[lvIdx];
 if(bg){im.src=bg.src;im.style.display='block';ph.style.display='none';}else{im.style.display='none';ph.style.display='';}
 const sh=document.querySelector('.phShell'),cd=$('phCard');
 $('phone').style.display='flex';cd.classList.remove('go');sh.classList.remove('buzz');void sh.offsetWidth;sh.classList.add('buzz');cd.classList.add('go');
 sfx.ding();setTimeout(sfx.done,450);}
$('phAccept').onclick=()=>{audioInit();sfx.ding();transition(()=>{$('phone').style.display='none';if(firstFlow){firstFlow=false;storyStart('walk');}else{stage=0;render();}},'Loading',1200);};
function intro(){
 const t=performance.now(),c=ctx;c.textAlign='center';c.textBaseline='alphabetic';
 c.font='bold 24px "Noto Sans TC",sans-serif';c.fillStyle='#fff';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=5;const ttl='Lv'+(lvIdx+1)+'｜'+tr(LV.name);c.strokeText(ttl,W/2,44);c.fillText(ttl,W/2,44);
 (openMode?[[480,char.e,'student']]:[[170,char.e,'student'],[780,npc.e,npc.img]]).forEach(([x,e,k])=>{const im=k&&storyImg(k);if(im){spr(c,im,e,x,492,96,0,0);return;}c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+8,488,54,12,0,0,7);c.fill();c.font='96px serif';c.fillText(e,x,485);});
 if(!dlgOpen)bubbleOff();else talkMood=null;if(dlgOpen){const l=dl[di];bubble(l[3],380,l[0]||char.e+' '+char.name,l[1],di==dl.length-1);}
 else{c.font='44px serif';c.fillText('❗',780,365+Math.sin(t/300)*7);c.font='bold 16px "Noto Sans TC",sans-serif';c.fillStyle='#fff';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=4;c.strokeText(tr('點我聊聊'),780,510);c.fillText(tr('點我聊聊'),780,510);}
 if(!introRaf){introRaf=true;requestAnimationFrame(()=>{introRaf=false;if(stage==0)render();});}
}

// 角色輪播
let capIdx=0;
$('capDots').innerHTML=CHARS.map(()=>'<span></span>').join('');
function capRender(dir){
 const c=CHARS[capIdx],port=$('capPortrait');
 if(dir){port.classList.add(dir=='l'?'out-r':'out-l');
  setTimeout(()=>{fill();port.classList.remove('out-l','out-r');port.classList.add(dir=='l'?'out-l':'out-r');
   requestAnimationFrame(()=>requestAnimationFrame(()=>port.classList.remove('out-l','out-r')));},160);
 }else fill();
 function fill(){$('capEm').textContent=c.e;$('capName').textContent=c.name;$('capDesc').textContent=c.note;
  const tag=$('capTag');if(c.tag){tag.textContent=c.tag;tag.style.display='';}else tag.style.display='none';
  [...$('capDots').children].forEach((d,i)=>d.classList.toggle('on',i==capIdx));}
}
capRender();
$('capL').onclick=()=>{capIdx=(capIdx-1+CHARS.length)%CHARS.length;capRender('l');};
$('capR').onclick=()=>{capIdx=(capIdx+1)%CHARS.length;capRender('r');};
$('startChar').onclick=()=>start(CHARS[capIdx]);
$('capRandom').onclick=()=>{capIdx=Math.floor(Math.random()*CHARS.length);capRender(Math.random()<.5?'l':'r');setTimeout(()=>start(CHARS[capIdx]),500);};
$('againB').onclick=()=>{$('game').style.display='none';transition(()=>{$('game').style.display='';loadLevel(0);showPhone();},'Loading',1000);};
// 成果圖
$('saveB').onclick=()=>{
 const o=document.createElement('canvas');o.width=1920;o.height=690;const c=o.getContext('2d');
 c.fillStyle='#f3efe8';c.fillRect(0,0,1920,690);c.fillStyle='#2b2a27';c.textAlign='left';c.textBaseline='middle';
 c.font='bold 34px "Noto Sans TC",sans-serif';const lg=document.querySelector('img.logoUse');let tx=24;if(lg&&lg.complete&&lg.naturalWidth){const lh=58,lw=lh*lg.naturalWidth/lg.naturalHeight;c.drawImage(lg,18,6,lw,lh);tx=30+lw;}c.fillText('Lv'+(lvIdx+1)+' '+tr(LV.name)+'｜'+char.e+' '+tr(char.name),tx,36);
 c.drawImage(before,0,70);c.drawImage(snap(S),960,70);
 [[tr('改造前'),0],[tr('改造後'),960]].forEach(([t,x])=>{c.fillStyle='rgba(0,0,0,.6)';c.fillRect(x+16,86,120,40);c.fillStyle='#fff';c.font='bold 22px "Noto Sans TC",sans-serif';c.textAlign='center';c.fillText(t,x+76,107);});
 c.fillStyle='#fff';c.fillRect(958,70,4,540);
 c.fillStyle='#2b2a27';c.textAlign='left';c.font='26px "Noto Sans TC",sans-serif';c.fillText('「'+tr(char.line)+'」',24,650);
 $('shotImg').src=o.toDataURL('image/png');$('shot').style.display='block';$('shot').scrollIntoView({behavior:'smooth'});};
function jingle(){tone(1319,.14,'triangle',.14);tone(1760,.3,'triangle',.14,0,.12);}
// 開始畫面與 Logo
const setLogo=src=>{$('logoImg').src=src||'';$('logoImg').style.display=src?'':'none';$('logoDef').style.display=src?'none':'';};
if(LOGO_SRC){setLogo(LOGO_SRC);document.querySelectorAll('img.logoUse').forEach(i=>i.src=LOGO_SRC);}
// 開場 Logo 影片：靜音自動播放（手機瀏覽器只允許靜音自動播放），播完停在最後一格；載入失敗就改顯示 Logo 圖片
let logoVidCustom=null;
// 開場 Logo 動畫的可愛音效（程式合成，與動畫節拍同步：小點→文字→屋簷飛入→「走」→「咧、騎」→細節→完成）
function introSfx(off){if(!sfxOK())return;const at=t=>Math.max(0,t-off),out=sfxGain,now=AC.currentTime;
 const tn=(f,d,v,type,slide,t)=>{if(t<0)return;tone(f,d,type,v,slide,t);};
 const pop=(t,f)=>{if(at(t)<0)return;tn(f,.1,.13,'sine',f*.9,at(t));noise(.03,.035,3200,1,at(t));};
 const whoosh=(t,d,f0,f1)=>{t=at(t);const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const sr=AC.createBufferSource();sr.buffer=b;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.Q.value=1.4;fl.frequency.setValueAtTime(f0,now+t);fl.frequency.exponentialRampToValueAtTime(f1,now+t+d);const g=AC.createGain();g.gain.setValueAtTime(.0001,now+t);g.gain.exponentialRampToValueAtTime(.09,now+t+d*.45);g.gain.exponentialRampToValueAtTime(.0001,now+t+d);sr.connect(fl);fl.connect(g);g.connect(out);sr.start(now+t);};
 if(off<.05)tn(1760,.07,.1,'sine',700,at(0)); // 小點「啵」
 [2093,2637,3136].forEach((f,i)=>tn(f,.16,.035,'sine',0,at(.12+i*.07))); // QI LE ZOU 亮晶晶
 whoosh(.72,.32,500,2600); // 屋簷咻～飛進來
 tn(330,.32,.11,'triangle',330,at(1.08)); // 「走」彈一下
 pop(1.32,880);
 pop(1.82,988);pop(1.95,1319); // 「咧」「騎」啵啵
 [2.24,2.45,2.66,2.87].forEach((t,i)=>pop(t,[1568,1760,1976,2349][i])); // 小細節冒泡泡
 [1047,1319,1568,2093].forEach((f,i)=>{tn(f,.45,.08,'sine',0,at(3.0+i*.07));tn(f*2.76,.2,.02,'sine',0,at(3.0+i*.07));}); // 完成：叮叮叮～
 noise(.5,.025,7000,.7,at(3.3));}
function setLogoVideo(src){const box=$('logoBox'),T=$('title');let v=$('logoVid');
 const done=()=>{if(T.classList.contains('vidIntro')){T.classList.remove('vidIntro');T.classList.add('vidDone');if(AC&&AC.state==='running'&&T.style.display!=='none'){playSong('title');setMusic(1);}}};
 if(!src){if(v)v.remove();done();if(LOGO_SRC)setLogo(LOGO_SRC);T.classList.remove('lightTitle');return;}
 if(!v){v=document.createElement('video');v.id='logoVid';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.setAttribute('muted','');v.preload='auto';v.disablePictureInPicture=true;box.insertBefore(v,box.firstChild);}
 if(LOGO_POSTER_SRC)v.poster=LOGO_POSTER_SRC;
 $('logoImg').style.display='none';$('logoDef').style.display='none';v.style.display='';T.classList.add('lightTitle','vidIntro');T.classList.remove('vidDone');
 v.onended=done;v.onclick=()=>{try{v.currentTime=v.duration||99;}catch(e){}done();}; // 點一下可略過
 v.onplaying=()=>{if(v._sfx)return;audioInit();setMusic(0);const tryPlay=()=>{if(v._sfx)return;if(AC&&AC.state==='running'){v._sfx=1;introSfx(v.currentTime);}};
  if(AC&&AC.resume)AC.resume().then(tryPlay,tryPlay);setTimeout(tryPlay,250);};
 v.onerror=()=>{v.remove();done();if(LOGO_SRC)setLogo(LOGO_SRC);};
 clearTimeout(setLogoVideo.t);setLogoVideo.t=setTimeout(done,5000); // 保險：最多 5 秒一定出現「開始遊戲」
 const go=u=>{v.src=u;const pr=v.play();if(pr&&pr.catch)pr.catch(()=>{done();});};
 // data: 影片先轉成 blob 網址（iPhone Safari 對 data: 影片支援不好）
 if(/^data:/.test(src)&&window.fetch)fetch(src).then(r=>r.blob()).then(b=>go(URL.createObjectURL(b))).catch(()=>go(src));else go(src);}
const SKIP_INTRO=(()=>{try{const v=sessionStorage.getItem('qlz-skipIntro');sessionStorage.removeItem('qlz-skipIntro');return v==='1';}catch(e){return false;}})();
if(LOGO_VIDEO_SRC){setLogoVideo(LOGO_VIDEO_SRC);
 // 從遊戲裡按 Logo 回來：開場動畫直接停在最後一格，馬上看到「開始遊戲」
 if(SKIP_INTRO){const v=$('logoVid'),T=$('title');if(v){v._sfx=1;v.muted=true;const end=()=>{try{v.pause();v.currentTime=Math.max(0,(v.duration||0)-.04);}catch(e){}};v.addEventListener('loadedmetadata',end,{once:true});v.addEventListener('playing',end,{once:true});end();}
  T.classList.remove('vidIntro');T.classList.add('vidDone');}}
// 瀏覽器還不允許出聲時：不顯示按鈕、不重播；玩家第一次點擊或按鍵時才開啟聲音，音效從動畫目前的進度接著播
(function(){const unlock=()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);
 const v=$('logoVid');audioInit();if(!AC)return;AC.resume().then(()=>{if(v&&!v._sfx&&!v.paused&&!v.ended){v._sfx=1;introSfx(v.currentTime);}});};
 document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);})();
let wDir='r';
function transition(next,label,ms){
 const t=$('trans'),w=$('walkerE'),fig=w.querySelector('.fig');
 $('transTxt').textContent=label||'Loading';if(typeof showTip==='function')showTip();
 if(cust.walker){fig.innerHTML='';const im=document.createElement('img');im.src=cust.walker.src;im.style.cssText='height:64px;display:block';fig.appendChild(im);}else fig.textContent=STUDENT.e;const wk=cust.walker||cust.student;if(!cust.walker&&wk){fig.innerHTML='';const im=document.createElement('img');im.src=wk.src;im.style.cssText='height:64px;display:block';fig.appendChild(im);}
 wDir=wDir=='r'?'l':'r'; // 每次切換方向，朝向跟著翻轉
 w.classList.remove('idle');
 w.style.animation='none';w.offsetHeight; // 強制重置，確保動畫從頭播放
 w.classList.remove('dir-l','dir-r');w.classList.add('dir-'+wDir);
 w.style.animation='';
 t.style.display='flex';
 setTimeout(()=>{w.classList.add('idle');},(ms||1400)-200);
 setTimeout(()=>{next();t.style.display='none';},ms||1400);
}
$('startB').onclick=()=>{audioInit();jingle();$('title').style.display='none';
 transition(()=>{beginStory();},'Loading',1200);};
$('muteB').onclick=()=>{audioInit();AUD.mute=!AUD.mute;saveAud();applyAudio();};
$('logof').onchange=async e=>{const f=e.target.files[0];if(!f)return;const i=await readImg(f);if(i)setLogo(i.src);};
$('logox').onclick=()=>{$('logof').value='';setLogo(LOGO_SRC);};
$('logoVf').onchange=e=>{const f=e.target.files[0];if(!f)return;setLogoVideo(URL.createObjectURL(f));};
$('logoVx').onclick=()=>{$('logoVf').value='';setLogoVideo(LOGO_VIDEO_SRC);};
$('walkf').onchange=async e=>{const f=e.target.files[0];if(!f)return;const i=await readImg(f);if(i)cust.walker=i;};
$('walkx').onclick=()=>{cust.walker=null;$('walkf').value='';};
const STORY_SRC={clsBg:'',clsSeq:[],teacher:'images/characters/老師.webp',student:'images/characters/主角_高中生.webp',dad:'images/characters/老闆.png',walkBg:'',mother:'images/characters/媽媽與寶寶.webp',customer:'images/characters/客人.webp'}; // 主角、老師、母親：使用者提供的角色圖（assets/characters） // 預留：之後可填入圖檔網址或 data URI，所有玩家都會看到
$('introVf').onchange=e=>{const f=e.target.files[0];if(f)introCustom=URL.createObjectURL(f);};$('introVx').onclick=()=>{introCustom=null;$('introVf').value='';};
$('clsBgf').onchange=async e=>{const i=e.target.files[0]&&await readImg(e.target.files[0]);if(i)cust.clsBg=i;};
$('clsSeqf').onchange=async e=>{const fs=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,'zh',{numeric:true}));cust.clsSeq=(await Promise.all(fs.map(readImg))).filter(Boolean);};
[['teacherf','teacher'],['studentf','student'],['dadf','dad'],['walkBgf','walkBg']].forEach(([id,k])=>{$(id).onchange=async e=>{const i=e.target.files[0]&&await readImg(e.target.files[0]);if(i)cust[k]=i;};});
$('storyClr').onclick=()=>{['clsBg','clsSeq','teacher','student','dad','walkBg'].forEach(k=>{cust[k]=null;});['clsBgf','clsSeqf','teacherf','studentf','dadf','walkBgf'].forEach(id=>$(id).value='');};
const PHONE_SRC=[null,null,null,null]; // 預留：每關手機「現場照片」的檔名或 data URI
(function(){const box=document.createElement('div');box.id='lvImp';box.style.cssText='margin-top:8px;font-size:13px';box.innerHTML='<b>每一關的背景圖與手機現場照片</b>';
 LEVELS.forEach((L,i)=>{const r=document.createElement('div');r.className='row';r.innerHTML='Lv'+(i+1)+'｜'+L.name+' 背景<input type="file" accept="image/*" data-k="bg" data-i="'+i+'"> 手機現場照片<input type="file" accept="image/*" data-k="ph" data-i="'+i+'">';box.appendChild(r);});
 const c=document.createElement('div');c.className='row';c.innerHTML='<button id="lvClr">清除每關背景／現場照片</button> <span style="opacity:.7">（手機現場照片沒放時，會自動使用該關背景）</span>';box.appendChild(c);$('imp').appendChild(box);
 box.querySelectorAll('input[type=file]').forEach(inp=>{inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;const im=await readImg(f);if(!im)return;const i=+inp.dataset.i;
  if(inp.dataset.k==='bg'){(cust.lvBg=cust.lvBg||[])[i]=im;if(!userBg&&lvIdx===i){bgImg=im;render();}}else{(cust.phPhoto=cust.phPhoto||[])[i]=im;}};});
 $('lvClr').onclick=()=>{cust.lvBg=[];cust.phPhoto=[];box.querySelectorAll('input[type=file]').forEach(x=>x.value='');if(!userBg){bgImg=LVBG[lvIdx]||null;render();}};
 PHONE_SRC.forEach((src,i)=>{if(!src)return;const im=new Image();im.onload=()=>{(cust.phPhoto=cust.phPhoto||[])[i]=im;};im.src=src;});})();
(function(){const ld=(src,cb)=>{if(!src)return;const i=new Image();i.onload=()=>cb(i);i.src=src;};ld(STORY_SRC.clsBg,i=>cust.clsBg=i);['teacher','student','dad','walkBg','mother','customer'].forEach(k=>ld(STORY_SRC[k],i=>{cust[k]=i;if(k==='student')setAv();}));(STORY_SRC.clsSeq||[]).forEach((src,n)=>ld(src,i=>{cust.clsSeq=cust.clsSeq||[];cust.clsSeq[n]=i;}));})();
function storyImg(k){return cust[k]||null;}
// 資訊列左邊的主角小頭像：有主角圖就用圖
function setAv(){const a=$('av');if(!a)return;const im=storyImg('student');if(im)a.innerHTML='<img alt="" src="'+im.src+'">';else a.textContent=STUDENT.e;}
function fillTxtPanel(){
 $('txtLvName').textContent='Lv'+(lvIdx+1)+' '+LV.name;
 $('txWho').value=npc?ovWho():'';$('txWhere').value=ovWhere();
 $('txOpen').value=npc?ovOpen():'';$('txNeed').value=ovNeed();
 $('txReply').value=npc?ovReply():'';$('txLine').value=ovLine();
}
$('txSave').onclick=()=>{TXT[lvIdx]={who:$('txWho').value,where:$('txWhere').value,open:$('txOpen').value,need:$('txNeed').value,reply:$('txReply').value,line:$('txLine').value};};
$('txReset').onclick=()=>{delete TXT[lvIdx];fillTxtPanel();};
[LEVEL_BG_SRC[0],LEVEL_BG_SRC[1]]=[LEVEL_BG_SRC[1],LEVEL_BG_SRC[0]];
LEVEL_BG_SRC.forEach((src,i)=>{if(!src)return;const im=new Image();im.onload=()=>{LVBG[i]=im;if(!userBg&&lvIdx==i){bgImg=(cust.lvBg&&cust.lvBg[i])||im;if(stage<=LV.stages[0]&&S)before=snap(S);render();}};im.src=src;});

// ===== 新主線：2D 教室 → 手機 → 騎樓行走 → 老闆 → 3D 第一關 =====
let story=null,sT=0,sDl=[],sDi=0,sDlg=false,notifReady=false,firstFlow=false,dadHeard=false;
const CLS=[['👩‍🏫 老師','同學們，這次的暑期作業是「走訪台灣的騎樓」。',700],['👩‍🏫 老師','騎樓是大家共用的路，也是店家和住家的門口。你們要觀察哪裡不好走，想辦法改善。',700],['🧑‍🎓 高中生','老師，我們要怎麼知道該去哪裡？',260],['👩‍🏫 老師','手機上的「騎咧走」平台會派委託給你，記得親自去現場看看。',700],['🧑‍🎓 高中生','好的，我會努力！',260]];
const DAD=[['🧑‍🍳 老闆','你就是平台上接委託的同學吧？謝謝你來！',600],['🧑‍🎓 高中生','我是來了解情況的，這裡最困擾的是什麼呢？',380],['🧑‍🍳 老闆','我的小吃店生意好，桌椅、紙箱就越擺越外面，連走道都被佔滿了。',600],['🧑‍🍳 老闆','昨天有位推嬰兒車的客人差點擠不過去，我也很過意不去。',600],['🧑‍🎓 高中生','我們先把擋路的東西移到靠牆，再想想桌椅怎麼擺，客人和行人才都方便。',380],['🧑‍🍳 老闆','太好了，那就麻煩你了！',600]];
const VIDEO_SRC={intro:''}; // 預留：「老師與學生對話」影片的檔名或網址（例如 'intro.mp4'，放在同一個資料夾）。有填的話，整段教室對話就由這支影片取代，播完直接進入手機畫面
let introCustom=null;
function playIntro(cb){const src=introCustom||VIDEO_SRC.intro;if(!src){cb();return;}
 const box=$('introVid'),v=$('ivEl');let done=false;
 const fin=()=>{if(done)return;done=true;v.pause();v.removeAttribute('src');v.load();box.style.display='none';cb();};
 setMusic(0);box.style.display='block';v.src=src;v.muted=false;v.onended=fin;v.onerror=fin;$('ivSkip').onclick=fin;
 const pr=v.play();if(pr&&pr.catch)pr.catch(()=>{v.muted=true;const p2=v.play();if(p2&&p2.catch)p2.catch(fin);});}
function beginStory(){char=STUDENT;setAv();$('game').style.display='';loadLevel(0);
 if(introCustom||VIDEO_SRC.intro){playIntro(()=>{story=null;ctx.fillStyle='#16120e';ctx.fillRect(0,0,W,H);showHome();});}else storyStart('cls');}
function storyStart(k){window._exSnd=0;story=k;sT=performance.now();sDi=0;dadHeard=false;nextB.style.display='none';hintB.style.display='none';pal.style.display='none';
 if(k=='cls'){sDl=CLS;sDlg=true;playSong('story');setMusic(.9);sfx.talk();setMsg(()=>tr('教室｜點一下畫面繼續對話'));}
 else{sDl=[];sDlg=false;playSong('story');setMusic(1);setMsg(()=>tr('前往現場｜騎樓裡，有人迎面走來……'));}
 render();}
function walkT(){return(performance.now()-sT)/1000;}
function walkDone(){return walkT()>3;}
function ch(c,e,x,y,size,flip,tilt){c.save();c.translate(x,y);c.rotate(tilt||0);c.scale(flip?-1:1,1);c.font=size+'px serif';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(e,x*0,0);c.restore();}
function shd(c,x,y){c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+6,y+4,56,12,0,0,7);c.fill();}
function coverDraw(c,im){const ar=im.width/im.height,tr=W/H;let sw=im.width,sh=im.height,sx=0,sy=0;if(ar>tr){sw=sh*tr;sx=(im.width-sw)/2}else{sh=sw/tr;sy=(im.height-sh)/2}c.drawImage(im,sx,sy,sw,sh,0,0,W,H);}
function spr(c,img,em,x,y,es,flip,tilt){if(img){const h=280,w=h*img.width/img.height,fx=charFx(c,img,x,y,h);c.save();c.globalAlpha=fx.alpha;c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+fx.dx+6,y+4,Math.min(w*.4,90),12,0,0,7);c.fill();c.translate(x+fx.dx,y+fx.dy);c.rotate((tilt||0)+fx.rot);c.scale((flip?-1:1)*fx.sx,fx.sy);c.drawImage(img,-w/2,-h,w,h);c.restore();if(talkX!=null&&Math.abs(x-talkX)<70)drawEmote(c,x+fx.dx,y-h+fx.dy);}else{shd(c,x,y);ch(c,em,x,y,es,flip,tilt);}}
function drawCls(c){
 const seq=(cust.clsSeq||[]).filter(Boolean),bgI=seq.length?seq[Math.min(sDi,seq.length-1)]:cust.clsBg;
 if(bgI)coverDraw(c,bgI);else{
 c.fillStyle='#e8dcc0';c.fillRect(0,0,W,H);
 c.fillStyle='#b98f62';c.fillRect(0,420,W,120);
 c.fillStyle='#8a6d3b';c.fillRect(194,64,572,182);c.fillStyle='#2f4a3c';c.fillRect(204,74,552,162);
 c.fillStyle='#eee';c.font='bold 30px "Noto Sans TC",sans-serif';c.textAlign='center';c.fillText(tr('暑期作業：走訪騎樓'),480,140);c.font='20px "Noto Sans TC",sans-serif';c.fillText(tr('觀察・記錄・改善'),480,180);
 [[30,90],[800,90]].forEach(([x,y])=>{c.fillStyle='#9ec6dd';c.fillRect(x,y,130,150);c.fillStyle='#fff';c.fillRect(x+63,y,4,150);c.fillRect(x,y+73,130,4);});
 c.fillStyle='#fff';c.beginPath();c.arc(480,34,22,0,7);c.fill();c.strokeStyle='#333';c.lineWidth=3;c.beginPath();c.moveTo(480,34);c.lineTo(480,20);c.moveTo(480,34);c.lineTo(490,38);c.stroke();
 [[60,440],[390,470],[700,480]].forEach(([x,y])=>{c.fillStyle='#a07a4c';c.fillRect(x,y,180,16);c.fillStyle='#7a5a34';c.fillRect(x+10,y+16,8,60);c.fillRect(x+160,y+16,8,60);});
 }
 spr(c,cust.teacher,'👩‍🏫',700,470,120,0,0);spr(c,cust.student,'🧑‍🎓',260,480,120,0,0);lightWash(c);}
function drawWalk(c){
 const wb=cust.walkBg||LVBG[0];if(wb)coverDraw(c,wb);else{scene(c);pillars(c);}const fy=cust.walkBg?478:442;
 const t=walkT(),sx=Math.min(-60+t*150,380),dx=Math.max(1020-t*150,600),mv=t<3,bob=mv?Math.abs(Math.sin(t*9))*9:0,tl=mv?Math.sin(t*9)*.07:0;
 if(cust.customer){const im=cust.customer,h=196,w=h*im.width/im.height,cx=915;c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(cx+4,fy+3,w*.38,10,0,0,7);c.fill();c.drawImage(im,cx-w/2,fy-h,w,h);}
 spr(c,cust.student,'🧑‍🎓',sx,fy-bob,110,0,tl);spr(c,cust.dad,'🧑‍🍳',dx,fy-bob,110,0,tl);lightWash(c);
 if(walkDone()&&!sDlg&&!dadHeard){const y=(cust.dad?190:330)+Math.sin(performance.now()/260)*8;c.font='56px serif';c.textAlign='center';c.fillText('❗',600,y);c.font='bold 16px "Noto Sans TC",sans-serif';c.fillStyle='#fff';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=4;const ty=cust.dad?228:360;c.strokeText(tr('點擊驚嘆號'),600,ty);c.fillText(tr('點擊驚嘆號'),600,ty);}
 if(walkDone()&&!window._exSnd){window._exSnd=1;tone(1175,.12,'sine',.18);tone(1568,.18,'sine',.16,0,.1);}}
function storyRender(){ctx.clearRect(0,0,W,H);(story=='cls'?drawCls:drawWalk)(ctx);
 if(!(sDlg&&sDl[sDi]))bubbleOff();else talkMood=(story=='cls'?CLS_MOOD:DAD_MOOD)[sDi]||null;if(sDlg&&sDl[sDi]){const l=sDl[sDi];bubble(l[2],story=='cls'?((cust.teacher||cust.student)?200:330):((cust.dad||cust.student)?225:345),l[0],l[1],sDi==sDl.length-1);}
 requestAnimationFrame(()=>{if(story)render();});}
function storyClick(x,y){
 if(story=='cls'){sDi++;if(sDi>=sDl.length){sfx.grab();story=null;sDlg=false;showHome();}else moodSfx(CLS_MOOD[sDi]);return;}
 if(story=='walk'){
  if(sDlg){sDi++;if(sDi>=sDl.length){sfx.happy();sDlg=false;dadHeard=true;setMusic(1);placeGo(),$('goBtn').style.display='block';}else moodSfx(DAD_MOOD[sDi]);return;}
  if(walkDone()&&!dadHeard&&Math.abs(x-600)<80&&y>150&&y<420){sfx.talk();sDl=DAD;sDi=0;sDlg=true;setMusic(.55);}}}
// 依對話情緒播放的音效（null＝這句不放音效，避免每句都響）
const CLS_MOOD=[null,null,'question',null,'happy'],DAD_MOOD=[null,'question','sigh','surprise',null,'thanks'];
function moodSfx(m){if(m&&sfx[m])sfx[m]();else sfx.grab();}
function showHome(){setMusic(.3);const d=new Date();$('hClock').textContent=d.toLocaleTimeString(LOC(),{hour:'2-digit',minute:'2-digit',hour12:false});$('hDate').textContent=d.toLocaleDateString(LOC(),{month:'long',day:'numeric',weekday:'long'});
 const n=$('hNotif');n.classList.remove('in');notifReady=false;$('phH').style.display='flex';
 setTimeout(()=>{n.classList.add('in');notifReady=true;sfx.ding();setTimeout(sfx.done,180);const s=$('hShell');s.classList.remove('buzz');void s.offsetWidth;s.classList.add('buzz');},900);}
$('hNotif').onclick=()=>{if(!notifReady)return;audioInit();sfx.grab();$('phH').style.display='none';firstFlow=true;showPhone();};
$('goBtn').onclick=()=>{audioInit();sfx.ding();$('goBtn').style.display='none';playSong('play');transition(()=>{story=null;$('game').style.display='none';setMusic(1);Stage3D.start();},'Loading',1300);};

// ===== 3D 第一關（Three.js，固定偏正面斜俯視；所有物件／地板／背景牆都可由創作者匯入） =====
const Stage3D=(()=>{
 const EL=33*Math.PI/180,rnd=Math.random;
 const SHOP_SRC='';
 let R,sc,cam,walker,built=false,drag=null,done=false,tableG,floorM,wallM,floorDef,wallDef,shopPl,shop0Parts=[],shopSign=[],bd,bdReg=[0,0,1,1],procWall=[];
 const tables=[];
 const chairs=[],objs=[],meshes=[],start=[],inst={},cust={};
 const wrap=$('wrap3'),hud=$('hud3'),fin=$('fin3'),res=$('res3');
 // 區域（世界座標，單位約 1 公尺）：黃色通道、靠馬路的紅色禁放區、藍色機車停車格；STATIC 是不能移動但有碰撞的東西
 const DOOR={x0:.9,x1:3.3,z0:-5.95,z1:-1};
 const WALK={x0:-12,x1:12,z0:-1,z1:3},FRONT={x0:-12,x1:7.2,z0:3.2,z1:6.2},PARK={x0:7.4,x1:11.0,z0:3.3,z1:5.95};
 const STATIC=[{x0:-11.9,x1:-11.1,z0:5.0,z1:5.8,label:'柱子'},{x0:11.1,x1:11.9,z0:5.0,z1:5.8,label:'柱子'},{x0:-11.95,x1:-11.05,z0:-5.65,z1:-4.75,label:'盆栽'},{x0:11.05,x1:11.95,z0:-5.65,z1:-4.75,label:'盆栽'}];
 const NAMES={shop:'物件',carton:'紙箱',chair:'紅色塑膠椅',table:'不鏽鋼桌',scooter:'機車',cabinet:'櫃子',pillar:'柱子',custom:'自訂物件'};
 let ring=null,parkTex=null,fails=0,tutSeen3=false;
 function drawDoor(g,w,h){g.clearRect(0,0,w,h);g.fillStyle='rgba(255,236,170,.35)';g.fillRect(0,0,w,h);g.setLineDash([22,14]);g.strokeStyle='rgba(194,87,26,.95)';g.lineWidth=10;g.strokeRect(8,8,w-16,h-16);g.setLineDash([]);
  g.save();g.translate(w/2,h/2);g.rotate(-Math.PI/2);g.font='900 40px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle='#fff';const t=tr('店門口・出餐的路');g.strokeText(t,0,0,h-40);g.fillStyle='#9c3a22';g.fillText(t,0,0,h-40);g.restore();}
 let frontTex=null,frontMesh=null;
 function drawPark(g,w,h){g.clearRect(0,0,w,h);g.fillStyle='rgba(55,120,225,.62)';g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=12;g.strokeRect(6,6,w-12,h-12);
  const t='🛵 '+tr('機車停車格');g.font='900 42px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=6;g.strokeStyle='rgba(20,40,80,.7)';g.strokeText(t,w/2,h/2,w-30);g.fillStyle='#fff';g.fillText(t,w/2,h/2,w-30);}
 const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
 const reg=(t,g)=>{(inst[t]=inst[t]||[]).push(g);};
 function B(w,h,d,c,x,y,z,p){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(p||sc).add(m);return m;}
 function drawFront(g,w,h){g.clearRect(0,0,w,h);g.fillStyle='rgba(224,120,105,.22)';g.fillRect(0,0,w,h);
  g.setLineDash([30,20]);g.strokeStyle='rgba(205,95,80,.75)';g.lineWidth=8;g.strokeRect(10,10,w-20,h-20);g.setLineDash([]);
  const r=h*.2,step=w/8;for(let x=step/2;x<w;x+=step){const cy=h/2;g.fillStyle='rgba(255,250,244,.85)';g.beginPath();g.arc(x,cy,r,0,7);g.fill();
   g.strokeStyle='rgba(205,95,80,.85)';g.lineWidth=7;g.beginPath();g.arc(x,cy,r,0,7);g.stroke();g.lineCap='round';g.lineWidth=10;const k=r*.45;g.beginPath();g.moveTo(x-k,cy-k);g.lineTo(x+k,cy+k);g.moveTo(x+k,cy-k);g.lineTo(x-k,cy+k);g.stroke();}}
 function zone(w,d,c,a,x,z,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:a,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);sc.add(m);return m;}
 function cvs(w,h,fn,rx,ry){const k=document.createElement('canvas');k.width=w;k.height=h;fn(k.getContext('2d'),w,h);const t=new THREE.CanvasTexture(k);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rx)t.repeat.set(rx,ry);t.anisotropy=4;return t;}
 // ---- 精緻程式貼圖 ----
 const floorTex=()=>cvs(512,512,(g,w,h)=>{g.fillStyle='#c9ab8a';g.fillRect(0,0,w,h);
  for(let i=0;i<70;i++){const x=rnd()*w,y=rnd()*h,r=20+rnd()*70;const c=rnd()<.5?'255,240,215':'150,110,70';const al=.035+rnd()*.04;for(const ox of[-w,0,w])for(const oy of[-h,0,h]){const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,r);gr.addColorStop(0,`rgba(${c},${al})`);gr.addColorStop(1,`rgba(${c},0)`);g.fillStyle=gr;g.fillRect(x+ox-r,y+oy-r,2*r,2*r);}}
  g.globalAlpha=.05;for(let i=0;i<900;i++){g.fillStyle=rnd()<.5?'#fff':'#6b4a2a';g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2);}g.globalAlpha=1;},4,1.2);
 // 地面前緣：黑底＋白／淺綠斜紋色塊（仿插畫）
 const edgeTex=()=>cvs(2048,64,(g,w,h)=>{g.fillStyle='#1b1a18';g.fillRect(0,0,w,h);const n=22,sw=w/n;for(let i=0;i<n;i++){const x=i*sw+sw*.28;g.fillStyle=i<n/2?'#d2d1cf':'#d3d0a2';g.beginPath();g.moveTo(x+14,7);g.lineTo(x+sw*.5+14,7);g.lineTo(x+sw*.5-14,h-7);g.lineTo(x-14,h-7);g.closePath();g.fill();}});
 const wallTex=()=>cvs(512,128,(g,w,h)=>{g.fillStyle='#bfb49b';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=12){const o=(y/12)%2?16:0;for(let x=-o;x<w;x+=32){g.fillStyle=`hsl(${36+rnd()*8},${26+rnd()*12}%,${79+rnd()*7}%)`;g.fillRect(x+1,y+1,30,10);}}
  let gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(70,55,40,.28)');gr.addColorStop(.3,'rgba(70,55,40,0)');gr.addColorStop(.8,'rgba(70,55,40,0)');gr.addColorStop(1,'rgba(60,45,30,.3)');g.fillStyle=gr;g.fillRect(0,0,w,h);},7.5,2);
 const slatTex=()=>cvs(128,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#9aa3a8');gr.addColorStop(.5,'#b9c0c4');gr.addColorStop(1,'#8c969c');g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=12){g.fillStyle='rgba(40,50,60,.45)';g.fillRect(0,y,w,2);g.fillStyle='rgba(255,255,255,.2)';g.fillRect(0,y+2,w,1);}
  g.fillStyle='rgba(120,70,30,.18)';for(let i=0;i<30;i++)g.fillRect(rnd()*w,rnd()*h,10,3);});
 function sign(txt,col,x){const t=cvs(512,100,(g)=>{g.fillStyle=col;g.fillRect(0,0,512,100);g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=4;g.strokeRect(6,6,500,88);g.fillStyle='#fff';g.font='900 62px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,256,54);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(5,.98),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,3.2,-5.83);sc.add(m);}
 // ---- 物件（皆可替換）----
 function G(hz,type,moveable,hx){const g=new THREE.Group();g.userData.hz=hz;g.userData.hx=hx||hz;g.userData.type=type;sc.add(g);if(moveable)objs.push(g);reg(type,g);return g;}
 function wheel(g,x){const w=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.2,16),M(0x222222));w.rotation.x=Math.PI/2;w.position.set(x,.3,0);w.castShadow=true;g.add(w);}
 function layoutBackdrop(a,hh){if(!bd||!bd.visible)return;const ut=.5*Math.cos(EL)+4.6*Math.sin(EL),ub=6*Math.sin(EL),Wp=2*hh*a+1,Hp=ut+hh-ub+.5;bd.scale.set(Wp,Hp,1);const t=bd.material.map,im=t&&t.image;if(!im)return;
  const iw=im.width,ih=im.height,rx=bdReg[0]*iw,ry=bdReg[1]*ih,rw=bdReg[2]*iw,rh=bdReg[3]*ih,T=Wp/Hp;let sx,sy,sw,sh;
  if(T>rw/rh){sw=rw;sh=rw/T;sx=rx;sy=ry+rh-sh;}else{sh=rh;sw=rh*T;sy=ry;sx=rx+(rw-sw)/2;}
  t.repeat.set(sw/iw,sh/ih);t.offset.set(sx/iw,1-(sy+sh)/ih);}
 function setBackdrop(img,reg){const t=new THREE.Texture(img);t.needsUpdate=true;t.anisotropy=4;bd.material.map=t;bd.material.needsUpdate=true;bdReg=reg;bd.visible=true;procWall.forEach(m=>m.visible=false);view();}
 function view(){const w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));R.setSize(w,h,false);const a=w/h,hh=Math.max(7.3,13.9/a),D=60;cam.left=-hh*a;cam.right=hh*a;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix();const TZ=-4.6;cam.position.set(0,Math.sin(EL)*D+.5,Math.cos(EL)*D+TZ);cam.lookAt(0,.5,TZ);layoutBackdrop(a,hh);}
 function build(){
  R=new THREE.WebGLRenderer({antialias:true,alpha:true});R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  wrap.insertBefore(R.domElement,wrap.firstChild);const cv=R.domElement;cv.style.cssText='width:100%;height:100%;display:block;touch-action:none';
  sc=new THREE.Scene();cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
  sc.add(new THREE.HemisphereLight(0xfff6e8,0xb0a28c,.82));
  const sun=new THREE.DirectionalLight(0xffe6c0,.32);sun.position.set(-8,14,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:12,bottom:-12,near:1,far:40});sc.add(sun);
  // 地板、街道、路緣、導盲磚
  floorDef=floorTex();floorM=new THREE.MeshStandardMaterial({map:floorDef,roughness:1,metalness:0});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(44,12),floorM);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;sc.add(fl);
  const st=new THREE.Mesh(new THREE.PlaneGeometry(60,9),new THREE.MeshBasicMaterial({color:0x3e3721}));st.rotation.x=-Math.PI/2;st.position.set(0,-.02,10.5);st.receiveShadow=true;sc.add(st);
  const ed=new THREE.Mesh(new THREE.PlaneGeometry(44,.75),new THREE.MeshBasicMaterial({map:edgeTex()}));ed.material.map.wrapS=THREE.ClampToEdgeWrapping;ed.rotation.x=-Math.PI/2;ed.position.set(0,.015,6.15);sc.add(ed);
  zone(44,.07,0x1b1a18,1,0,-5.97,.012);
  // 背景牆（二丁掛磁磚）
  const w0=sc.children.length;
  wallDef=wallTex();wallM=new THREE.MeshStandardMaterial({map:wallDef,roughness:.9});
  const wl=new THREE.Mesh(new THREE.PlaneGeometry(60,4),wallM);wl.position.set(0,2,-6);wl.receiveShadow=true;sc.add(wl);
  B(60,.3,.5,0xa59e90,0,4.05,-5.85);B(60,.18,.4,0x8f8777,0,.09,-5.85);
  [[0,0x9b2f2f,'小吃店',1]].forEach(([px,g,t,open])=>{
   B(4.8,3.5,.22,0x7a6f60,px,1.75,-5.9);
   if(open){const n0=sc.children.length;B(3.5,2.4,.1,0x2a211c,px,1.3,-5.8);B(3,.9,.5,0xc9ccd0,px,.45,-5.55);B(3.1,.08,.6,0xe6e8ea,px,.92,-5.55);
    [-1.1,1.1].forEach(o=>{const c=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.1),new THREE.MeshBasicMaterial({color:o<0?0xb3402f:0xd88a73,side:THREE.DoubleSide}));c.position.set(px+o,1.9,-5.72);sc.add(c);});
    for(let i=0;i<5;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:0xffd9a0}));l.position.set(px-1.4+i*.7,2.45,-5.7);sc.add(l);}shop0Parts=sc.children.slice(n0);}
   else{const sh=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.4),new THREE.MeshStandardMaterial({map:slatTex(),roughness:.6,metalness:.3}));sh.position.set(px,1.3,-5.77);sc.add(sh);B(.5,.1,.1,0x333333,px,.35,-5.7);}
   const sb=B(5,.8,.2,g,px,3.2,-5.95);const n1=sc.children.length;sign(t,'#'+g.toString(16).padStart(6,'0'),px);shopSign=[sb,sc.children[n1]];});
  shopPl=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.34),new THREE.MeshBasicMaterial());shopPl.position.set(0,1.75,-5.72);shopPl.visible=false;sc.add(shopPl);if(SHOP_SRC)new THREE.TextureLoader().load(SHOP_SRC,setShop);
  [[-9,2.9],[9,2.9]].forEach(([x,y])=>{B(.95,.6,.5,0xdedcd6,x,y,-5.7);const f=new THREE.Mesh(new THREE.CircleGeometry(.22,20),new THREE.MeshBasicMaterial({color:0x333333}));f.position.set(x,y,-5.44);sc.add(f);});
  [-6.5,6.5].forEach(x=>{B(.42,.55,.18,0x9aa09a,x,1.7,-5.82);});
  [].forEach(([x1,x2])=>{const cv2=new THREE.CatmullRomCurve3([new THREE.Vector3(x1,3.75,-5.78),new THREE.Vector3((x1+x2)/2,3.45,-5.78),new THREE.Vector3(x2,3.75,-5.78)]);sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cv2.getPoints(24)),new THREE.LineBasicMaterial({color:0x222222})));});
  [-11.5,11.5].forEach(x=>{const pot=new THREE.Mesh(new THREE.CylinderGeometry(.35,.28,.5,12),M(0xb5683a));pot.position.set(x,.25,-5.2);pot.castShadow=true;sc.add(pot);const pl=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10),M(0x3f7a3a));pl.position.set(x,.85,-5.2);pl.castShadow=true;sc.add(pl);});
  procWall=sc.children.slice(w0);
  bd=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,.5,0),new THREE.MeshBasicMaterial({color:0xffffff}));bd.rotation.x=-EL;bd.position.set(0,0,-6.02);bd.visible=false;sc.add(bd);
  // 柱子（可替換；也有碰撞範圍）
  [-11.5,11.5].forEach(px=>{const g=G(.4,'pillar',false,.4);g.position.set(px,0,5.4);B(.7,4,.7,0xf1e6d0,0,2,0,g);B(.78,.3,.78,0xd9ccb2,0,.15,0,g);});
  // 通道（黃）、禁放區（紅，靠馬路）、機車停車格（藍）
  zone(24,4,0xffc400,.22,0,1,.03);zone(24,.18,0xffc400,.9,0,-1,.045);zone(24,.18,0xffc400,.9,0,3,.045);frontTex=cvs(1920,280,drawFront);frontTex.wrapS=frontTex.wrapT=THREE.ClampToEdgeWrapping;frontMesh=new THREE.Mesh(new THREE.PlaneGeometry(FRONT.x1-FRONT.x0,FRONT.z1-FRONT.z0-.2),new THREE.MeshBasicMaterial({map:frontTex,transparent:true,depthWrite:false}));frontMesh.rotation.x=-Math.PI/2;frontMesh.position.set((FRONT.x0+FRONT.x1)/2,.03,4.6);sc.add(frontMesh);
  parkTex=cvs(360,260,drawPark);parkTex.wrapS=parkTex.wrapT=THREE.ClampToEdgeWrapping;
  const pk=new THREE.Mesh(new THREE.PlaneGeometry(PARK.x1-PARK.x0,PARK.z1-PARK.z0),new THREE.MeshBasicMaterial({map:parkTex,transparent:true,depthWrite:false}));pk.rotation.x=-Math.PI/2;pk.position.set((PARK.x0+PARK.x1)/2,.035,(PARK.z0+PARK.z1)/2);sc.add(pk);parkMesh=pk;pk.visible=false;
  doorTex=cvs(240,500,drawDoor);doorTex.wrapS=doorTex.wrapT=THREE.ClampToEdgeWrapping;doorMesh=new THREE.Mesh(new THREE.PlaneGeometry(DOOR.x1-DOOR.x0,DOOR.z1-DOOR.z0),new THREE.MeshBasicMaterial({map:doorTex,transparent:true,depthWrite:false}));doorMesh.rotation.x=-Math.PI/2;doorMesh.position.set((DOOR.x0+DOOR.x1)/2,.04,(DOOR.z0+DOOR.z1)/2);doorMesh.visible=false;sc.add(doorMesh);
  // 拖曳時的落點提示框（綠＝可以放，紅＝會重疊）
  ring=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x3bb273,transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;ring.visible=false;sc.add(ring);
  // 可移動物件（G 的參數：半深、類型、可移動、半寬 → 用來做碰撞判定）
  const carton=(px,pz,s)=>{const g=G(s/2,'carton',true,s/2);B(s,s*.85,s,0xc9a46c,0,s*.425,0,g);B(s*.18,.02,s*1.002,0xe8d3a0,0,s*.86,0,g);start.push([g,px,pz,(px*7)%1*.5]);return g;};
  const stool=(px,pz)=>{const g=G(.4,'chair',true,.4);
   const top=new THREE.Mesh(new THREE.CylinderGeometry(.34,.37,.1,8),M(0xc4322a));top.position.y=.63;top.castShadow=true;g.add(top);
   [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]].forEach(([a,b2])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.6,6),M(0xb02a24));l.position.set(a*1.3,.3,b2*1.3);l.castShadow=true;g.add(l);});
   B(.6,.05,.6,0xb02a24,0,.3,0,g);start.push([g,px,pz,0]);chairs.push(g);};
  const table=(px,pz)=>{const g=G(.63,'table',true,1.03);
   B(2,.08,1.2,0xd3d7da,0,.88,0,g);B(2.06,.03,1.26,0x9aa0a6,0,.82,0,g);
   [[-.9,-.5],[.9,-.5],[-.9,.5],[.9,.5]].forEach(([a,b2])=>B(.07,.82,.07,0x8a8f95,a,.41,b2,g));B(1.8,.04,.04,0x8a8f95,0,.3,.5,g);B(1.8,.04,.04,0x8a8f95,0,.3,-.5,g);
   [[-.5,.15],[.45,-.1]].forEach(([a,b2])=>{const bw=new THREE.Mesh(new THREE.CylinderGeometry(.2,.12,.14,14),M(0xf1f4f6));bw.position.set(a,1.0,b2);bw.castShadow=true;g.add(bw);const so=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.02,14),M(0xd9a441));so.position.set(a,1.04,b2);g.add(so);B(.02,.02,.3,0x7a5a34,a+.08,1.08,b2-.05,g);});
   start.push([g,px,pz,0]);tables.push(g);};
  const scooter=(px,pz)=>{const g=G(.45,'scooter',true,1.0);B(1.8,.45,.5,0x2f6fb5,0,.65,0,g);B(.8,.15,.45,0x222222,.25,.95,0,g);B(.3,.7,.5,0x2f6fb5,-.75,.85,0,g);B(.1,.1,.9,0x222222,-.8,1.25,0,g);wheel(g,-.7);wheel(g,.7);start.push([g,px,pz,0]);};
  const cab=(px,pz)=>{const g=G(.4,'cabinet',true,.65);B(1.3,1.5,.8,0x7d8a8f,0,.75,0,g);start.push([g,px,pz,0]);};
  carton(-6,.2,1.2);carton(-2.5,1.8,1.4);carton(5,.5,1.3);carton(0,2.6,1);table(2.8,1.7);stool(1.7,2.9);stool(3.9,2.9);table(-4.4,2.1);stool(-5.5,3.3);stool(-3.3,3.3);scooter(-8.5,1.5);cab(9,1.2);
  deliv=[carton(30,0,1.1),carton(32,0,1.0)];deliv.forEach(g=>{g.visible=false;g.userData.dlv=1;});
  walker=new THREE.Group();const wb=new THREE.Mesh(new THREE.CylinderGeometry(.3,.35,1.1,12),M(0x3b6ea5));wb.position.y=.75;wb.castShadow=true;const wh=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),M(0xf0c9a0));wh.position.y=1.55;wh.castShadow=true;walker.add(wb,wh);walker.position.z=1;walker.visible=false;walker.userData.type='walker';sc.add(walker);reg('walker',walker);
  if(LVBG[0])setBackdrop(LVBG[0],[0,0,1,.7016]);
  loadCustoms();rebuild();
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),pl=new THREE.Plane(new THREE.Vector3(0,1,0),0),pt=new THREE.Vector3();
  const nd=e=>{const r=cv.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);};
  cv.onpointerdown=e=>{audioInit();if(res.style.display==='flex'||trial||dlgQ||finished)return;nd(e);const h=ray.intersectObjects(meshes,false)[0];let g=h&&h.object.userData.root;
   if(!g&&e.pointerType!=='mouse'){let bd=44;objs.forEach(o=>{if(!o.visible)return;const[sx,sy]=projXY(o.position.x,.45,o.position.z),d=Math.hypot(sx-e.clientX,sy-e.clientY);if(d<bd){bd=d;g=o;}});}
   if(!g)return;if(!ray.ray.intersectPlane(pl,pt))return;
   objs.forEach(o=>{if(o.userData.stackOn===g){o.position.y=0;o.userData.stackOn=null;}});drag={g,dx:g.position.x-pt.x,dz:g.position.z-pt.z,lx:g.position.x,lz:g.position.z,ox:g.position.x,oz:g.position.z,ok:true,sx:e.clientX,sy:e.clientY,moved:e.pointerType==='mouse'};g.position.y=.25;sfx.grab();cv.style.cursor=GC.g;(()=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}})();showRing();};
  cv.onpointermove=e=>{nd(e);if(!drag){cv.style.cursor=ray.intersectObjects(meshes,false).length?(GC.h||GC.p):'';return;}if(!drag.moved){if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;drag.moved=true;}if(!ray.ray.intersectPlane(pl,pt))return;const g=drag.g;
   g.position.x=Math.max(-11,Math.min(11,pt.x+drag.dx));g.position.z=Math.max(-5.5,Math.min(5.2,pt.z+drag.dz));
   const hit=hitWith(g);drag.ok=!hit;if(!hit){drag.lx=g.position.x;drag.lz=g.position.z;warn('');}else warn('');showRing();refresh();};
  cv.onpointerup=cv.onpointercancel=()=>{if(!drag)return;const d=drag,g=d.g;drag=null;g.position.y=0;const bx=g.position.x,bz=g.position.z;g.position.x=d.ox??g.position.x;cv.style.cursor='';ring.visible=false;pmark(null);warn('');landFx(g);
   g.position.z=d.oz;const before=bad(g);g.position.x=bx;g.position.z=bz;
   if(!d.ok){const hit=hitWith(g);g.position.y=topOf(hit);g.userData.stackOn=hit;sfx.drop();toast(tr('疊在「{n}」上面了（會影響評分）',{n:nm(hit)}),'warn');onStack(g,hit);}
   else{g.userData.stackOn=null;sfx.drop();const b=bad(g);if(b==='front'&&phase<1)toast(tr('紅色禁放區靠近馬路，不能堆放東西喔！'),'warn');else if(b==='park')toast(tr('藍色機車格只能停機車喔！'),'warn');else if(isScooter(g)&&inside(fp(g),PARK)&&parkMesh.visible)toast(tr('👍 機車停進機車格了！'),'ok');onDrop(g,before,bad(g));}
   refresh();};
  new ResizeObserver(view).observe(wrap);mkUI();built=true;}
 function rebuild(){meshes.length=0;objs.filter(g=>g.visible).forEach(g=>g.children.forEach(k=>{if(k.visible)k.traverse(m=>{if(m.isMesh){m.userData.root=g;meshes.push(m);}});}));}
 // ---- 碰撞與區域判定（以物件在地面上的佔地矩形計算）----
 function projXY(x,y,z){const v=new THREE.Vector3(x,y,z).project(cam),r=R.domElement.getBoundingClientRect();return[r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height];}
 // 疊放：算出底下東西的頂端高度（含坐在椅子上的客人）
 function topOf(o){if(!o)return 0;if(!o.isObject3D)return o.label==='柱子'?4:1.25;const b=new THREE.Box3().setFromObject(o);return Math.max(.2,b.max.y-(o.position.y>0?0:0));}
 function fp(g){const x=g.position.x,z=g.position.z,r=g.rotation.y,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),a=g.userData.hx,b=g.userData.hz;const hx=c*a+s*b,hz=s*a+c*b;return{x0:x-hx,x1:x+hx,z0:z-hz,z1:z+hz};}
 const ov=(a,b,e=.02)=>a.x0<b.x1-e&&b.x0<a.x1-e&&a.z0<b.z1-e&&b.z0<a.z1-e;
 const inside=(a,b)=>a.x0>=b.x0-.05&&a.x1<=b.x1+.05&&a.z0>=b.z0-.05&&a.z1<=b.z1+.05;
 const isScooter=g=>g.userData.type==='scooter';
 function hitWith(g){const f=fp(g);for(const o of objs){if(o===g||!o.visible)continue;if(ov(f,fp(o)))return o;}for(const s of STATIC)if(ov(f,s))return s;return null;}
 function nm(o){if(!o)return '';if(o.label)return tr(o.label);if(o.userData&&o.userData.name)return o.userData.name;return tr(NAMES[o.userData.type]||'物件');}
 function bad(g){const f=fp(g);if(ov(f,WALK))return 'walk';if(ov(f,FRONT))return 'front';if(parkMesh&&parkMesh.visible&&ov(f,PARK)&&!isScooter(g))return 'park';if(phase>=2&&doorShown&&ov(f,DOOR))return 'door';return '';}
 function showRing(){if(!drag){ring.visible=false;pmark(null);return;}const f=fp(drag.g);ring.scale.set(f.x1-f.x0+.4,f.z1-f.z0+.4,1);ring.position.x=(f.x0+f.x1)/2;ring.position.z=(f.z0+f.z1)/2;
  // 只看現有判定結果來決定符號：禁放區／停錯機車格＝×；疊放、擋通道、擋出餐門＝!；其他＝✓
  const b=bad(drag.g),st=(b==='front'||b==='park')?'no':(!drag.ok||b==='walk'||b==='door')?'warn':'ok';ring.material.color.setHex(st==='ok'?0x7fc49a:st==='warn'?0xf2c25a:0xe48b7f);ring.visible=true;
  if(drag.moved){const[x,y]=projXY((f.x0+f.x1)/2,1.9,(f.z0+f.z1)/2),r=wrap.getBoundingClientRect();pmark(st,x-r.left,y-r.top);}else pmark(null);}
 function landFx(g){const t0=performance.now();(function f(n){const k=Math.min(1,(n-t0)/360),s=k<.35?1-.16*(k/.35):k<.7?.84+.22*((k-.35)/.35):1.06-.06*((k-.7)/.3);g.scale.set(2-s>1.1?1.1:2-s,s,2-s>1.1?1.1:2-s);if(k<1)requestAnimationFrame(f);else g.scale.set(1,1,1);})(t0);
  try{const[x,y]=projXY(g.position.x,g.position.y,g.position.z),r=wrap.getBoundingClientRect();if(typeof dustAt==='function')dustAt(wrap,x-r.left,y-r.top);}catch(e){}}
 function pmark(st,x,y){let m=$('pmark3');if(!m){m=document.createElement('div');m.id='pmark3';m.className='pmark';wrap.appendChild(m);}if(!st){m.classList.remove('on');return;}
  m.className='pmark on s-'+st;m.textContent=st==='ok'?'✓':st==='warn'?'!':'×';m.style.left=x+'px';m.style.top=y+'px';}
 function warn(t){const w=$('warn3');w.textContent=t;w.style.display=t?'block':'none';}
 let toastT=0;function toast(t,k){const e=$('toast3');e.textContent=t;e.className='toast show '+(k||'');clearTimeout(toastT);toastT=setTimeout(()=>{e.className='toast';},2600);}
 function tint(g,b){g.children.forEach(k=>{if(k.visible)k.traverse(m=>{if(!m.isMesh||m.userData.noTint)return;const mt=m.material;if(mt.emissive)mt.emissive.setHex(b?0x4a1a14:0);else if(mt.color)mt.color.setHex(b?0xffb3a8:0xffffff);});});}
 function refresh(){let n=0;objs.forEach(g=>{if(!g.visible)return;const b=!!bad(g)||(drag&&drag.g===g&&!drag.ok);if(bad(g)==='walk'||bad(g)==='front')n++;tint(g,b);});
  hud.textContent=phase>=1?tr('第一關・小吃店騎樓｜階段 {n}／4：{t}',{n:phase,t:tr(PH_T[phase])}):tr('第一關・小吃店騎樓');
  if(!n&&!done)sfx.done();done=!n;walker.visible=done&&!trial&&phase<4;if(typeof ui==='function')ui();
  if(phase==1&&!n&&!p1Done&&!drag&&!dlgQ){p1Done=true;setTimeout(finishP1,500);}}
 function reset(){resetLv1();if(trial){trial.list.forEach(n=>{n.g.visible=false;n.bub.classList.remove('show');});trial=null;$('walk3').disabled=false;}start.forEach(([g,x,z,r])=>{g.position.set(x,0,z);g.rotation.y=r;});syncShop3D();fails=0;res.style.display='none';$('stamp3').classList.remove('go');refresh();ui();}
 // ---- 評分：四項各 25 分，總分 100；分數會依實際擺放計算，並列出扣分原因 ----
 function clearWidth(){const F=objs.filter(g=>g.visible).map(fp);let best=0,run=0;for(let z=-6;z<=3.2;z+=.05){const blocked=F.some(f=>f.z0<z+.025&&f.z1>z-.025);if(blocked)run=0;else{run+=.05;best=Math.max(best,run);}}return Math.round(best*10)/10;}
 function score(){
  const C=[],cat=(k,name)=>{const c={k,name,score:25,max:25,reasons:[]};C.push(c);return c;},ded=(c,p,txt,v)=>{if(p<=0)return;c.score=Math.max(0,c.score-p);c.reasons.push(tr(txt,v));};
  const vis=objs.filter(g=>g.visible),B2=vis.map(g=>[g,bad(g),fp(g)]);
  const nW=B2.filter(x=>x[1]==='walk').length,w=clearWidth();
  // 1. 行人通行空間
  const c1=cat('pass','行人通行空間');
  if(nW)ded(c1,Math.min(15,nW*5),'有 {n} 件物件擋在黃色通道上，行人得繞路或側身通過。',{n:nW});
  if(w<3.5)ded(c1,w>=2.5?5:w>=1.5?10:w>=.9?15:20,'目前直線淨寬約 {w} 公尺，推嬰兒車、坐輪椅的人會很難通過（建議至少 1.5 公尺，最好保留整條 4 公尺通道）。',{w});
  if(lastTrial){if(lastTrial.stuck)ded(c1,lastTrial.stuck*6,'試走時有 {n} 位行人過不去。',{n:lastTrial.stuck});if(lastTrial.tight)ded(c1,lastTrial.tight*3,'試走時有 {n} 位行人覺得太擠。',{n:lastTrial.tight});}else ded(c1,4,'還沒有請行人試走，不知道大家走得順不順。');
  const edge=B2.filter(x=>!x[1]&&x[2].z1>-1.35&&x[2].z1<=-.98).length;if(edge)ded(c1,Math.min(6,edge*2),'有 {n} 件物件緊貼著通道邊緣，行人經過容易擦撞。',{n:edge});
  // 2. 擺放位置是否合理
  const c2=cat('place','物件擺放位置');
  const near=t=>chairs.filter(c=>c.visible&&Math.hypot(c.position.x-t.position.x,c.position.z-t.position.z)<2.6).length;
  const far=tables.filter(t=>t.position.z>=-3).length;if(far)ded(c2,far*6,'有 {n} 張桌子離店面太遠，老闆端麵、收碗都不方便。',{n:far});
  const lonely=tables.filter(t=>near(t)<2).length;if(lonely)ded(c2,lonely*5,'有 {n} 張桌子旁邊不到兩張椅子，客人沒地方坐。',{n:lonely});
  const stray=chairs.filter(c=>!tables.some(t=>Math.hypot(c.position.x-t.position.x,c.position.z-t.position.z)<2.6)).length;if(stray)ded(c2,Math.min(6,stray*2),'有 {n} 張椅子離桌子太遠，用不到又佔空間。',{n:stray});
  const nd=doorBlocked();if(nd)ded(c2,8,'店門口（老闆出餐的路）被擋住了，老闆端麵出不來。');
  const loose=vis.filter(g=>['carton','cabinet'].includes(g.userData.type)&&fp(g).z0>-5.0).length;if(loose)ded(c2,Math.min(8,loose*2),'有 {n} 件紙箱或櫃子沒有靠牆收好。',{n:loose});
  // 3. 是否符合騎樓使用規範
  const c3=cat('rule','騎樓使用規範');
  const nF=B2.filter(x=>x[1]==='front').length;if(nF)ded(c3,nF*8,'有 {n} 件物件放在靠馬路的紅色禁放區，會擋住從馬路走上騎樓的人。',{n:nF});
  const scs=vis.filter(isScooter),out=scs.filter(g=>!inside(fp(g),PARK)).length;if(out)ded(c3,10,'機車沒有停進藍色機車格，停在騎樓裡會佔用大家的路。');
  const nP=B2.filter(x=>x[1]==='park').length;if(nP)ded(c3,nP*6,'有 {n} 件不是機車的物件放進了機車格。',{n:nP});
  if(nW)ded(c3,5,'騎樓是公共通道，店家使用時一定要先留出行人通行的路。');
  // 4. 是否避免重疊及阻礙
  const c4=cat('overlap','避免重疊與阻礙');
  let stack=0;for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++)if(ov(fp(vis[i]),fp(vis[j]),.05))stack++;
  if(stack)ded(c4,Math.min(14,stack*4),'有 {n} 組物件疊在一起或擠在同一個位置，不穩又不好使用。',{n:stack});
  const tidy=['chair','table','carton','cabinet'];let tight=0;for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++){const a=vis[i],b=vis[j],ta=a.userData.type,tb=b.userData.type;if(ta==='chair'||tb==='chair')continue;if(['carton','cabinet'].includes(ta)&&['carton','cabinet'].includes(tb))continue;if(ta==='table'&&tb==='table')continue;
   const f=fp(a),g2=fp(b),gx=Math.max(f.x0-g2.x1,g2.x0-f.x1),gz=Math.max(f.z0-g2.z1,g2.z0-f.z1);if(Math.max(gx,gz)<.15)tight++;}
  if(tight)ded(c4,Math.min(8,tight*2),'有 {n} 組物件貼得太緊，客人入座或拿東西時會卡住。',{n:tight});
  if(nW)ded(c4,Math.min(10,nW*4),'通道上還有物件阻礙通行。');
  const total=C.reduce((s,c)=>s+c.score,0),stars=nW?1:total>=85?3:total>=65?2:1;
  return{C,total,stars,width:w,blocked:nW>0};}
 const COM=['路還沒完全暢通，或桌椅沒辦法好好使用，再想想怎麼擺。','路通了，不過還有幾個地方可以更好，看看下面的建議。','桌椅靠著店面、椅子圍著桌子，客人有地方坐，行人也走得順！'];

 // ---- 試走看看：三位不同需求的行人實際走過玩家的配置（依各位置的實際空隙減速／停下等待；NPC 不會幫玩家移動物件）----
 const NPC3=[{k:'stroller',name:'推嬰兒車的媽媽',need:1.3,sp:1.5,c:0xe28fb0},{k:'elder',name:'拄拐杖的長輩',need:1.0,sp:1.0,c:0x8a7bb0},{k:'kid',name:'牽狗的小孩',need:1.1,sp:1.9,c:0x5aa0d8}];
 let trial=null;
 function mkNpc(t){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.26,.32,1.0,12),M(t.c));b.position.y=.7;const h=new THREE.Mesh(new THREE.SphereGeometry(.25,14,10),M(0xf0c9a0));h.position.y=1.42;[b,h].forEach(m=>{m.castShadow=true;g.add(m);});
  if(t.k==='stroller'){const st=new THREE.Group();B(.8,.42,.5,0xf6d3e0,0,.55,0,st);B(.06,.5,.06,0x555555,-.42,.85,0,st);[[-.3,.2],[.3,.2],[-.3,-.2],[.3,-.2]].forEach(([a,c2])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.06,12),M(0x333333));w.rotation.x=Math.PI/2;w.position.set(a,.13,c2);st.add(w);});st.position.x=.8;g.add(st);}
  if(t.k==='elder'){B(.05,.9,.05,0x6b4a2a,.38,.45,.1,g);}
  if(t.k==='kid'){b.scale.set(.8,.75,.8);b.position.y=.55;h.position.y=1.12;const d=new THREE.Group();B(.5,.25,.22,0xc98a4a,0,.3,0,d);B(.2,.2,.2,0xc98a4a,.3,.45,0,d);d.position.set(.85,0,.3);g.add(d);}
  g.visible=false;sc.add(g);const bub=document.createElement('div');bub.className='npcBub';wrap.appendChild(bub);return{g,bub};}
 // 在 x 範圍 [xa,xb] 內，找出可走的空隙（z 方向），優先挑「站得下」又離目前位置最近的
 function laneGap(xa,xb,zNow,need){const iv=objs.filter(g=>g.visible).map(fp).concat(STATIC).filter(f=>f.x1>xa&&f.x0<xb).map(f=>[f.z0,f.z1]).sort((a,b)=>a[0]-b[0]);
  const gaps=[];let cur=-5.9;for(const[a,b]of iv){if(a>cur)gaps.push([cur,Math.min(a,3.2)]);cur=Math.max(cur,b);}if(cur<3.2)gaps.push([cur,3.2]);
  const L=gaps.filter(g=>g[1]-g[0]>0).map(([a,b])=>({a,b,w:b-a,d:zNow<a?a-zNow:zNow>b?zNow-b:0}));if(!L.length)return{a:zNow,b:zNow,w:0,d:0};
  const fit=L.filter(g=>g.w>=need).sort((p,q)=>p.d-q.d);return fit[0]||L.sort((p,q)=>q.w-p.w)[0];}
 function say(n,t,ms){n.bub.textContent=t;n.bub.classList.add('show');clearTimeout(n.bt);n.bt=setTimeout(()=>n.bub.classList.remove('show'),ms||2400);}
 function startTrial(){if(trial||!built||dlgQ)return;res.style.display='none';walker.visible=false;$('walk3').disabled=true;$('chk3').disabled=true;
  trial={list:NPC3.map((t,i)=>{const m=npcMeshes[i]||(npcMeshes[i]=mkNpc(t));return Object.assign(m,{t,x:-13.5,z:1,t0:i*1.2,state:'walk',wait:0,tight:false,stuck:false,saidTight:false});}),time:0};
  toast(tr('🚶 試走開始！看看大家走得順不順。'),'ok');}
 const npcMeshes=[];
 const TRIAL_K=1.45; // 試走速度倍率（保留展示，但少等一點）
 function trialStep(dt){if(!trial)return;dt*=TRIAL_K;trial.time+=dt;let alive=0;
  trial.list.forEach(n=>{if(n.state==='done')return;alive++;if(n.t0>0){n.t0-=dt;return;}n.g.visible=true;
   const look=laneGap(n.x-.7,n.x+1.5,n.z,n.t.need);let sp=n.t.sp;
   if(look.w<n.t.need){sp=0;n.wait+=dt;if(!n.stuck){n.stuck=true;say(n,tr('這裡好像有點擠……過不去，只好等等。'),4000);}if(n.wait>4.5){n.state='done';n.g.visible=false;n.bub.classList.remove('show');}}
   else{if(look.w<n.t.need*1.6){sp*=.45;if(!n.saidTight){n.saidTight=true;n.tight=true;say(n,tr('這裡好像有點擠。'));}}
    const lo=look.a+n.t.need/2,hi=look.b-n.t.need/2,zt=lo>hi?(look.a+look.b)/2:Math.max(lo,Math.min(hi,n.z));n.z+=Math.sign(zt-n.z)*Math.min(Math.abs(zt-n.z),dt*2.2);}
   n.x+=sp*dt;const t=trial.time;n.g.position.set(n.x,sp>0?Math.abs(Math.sin(t*8+n.t.sp))*.06:0,n.z);
   const[bx,by]=projXY(n.x,2.1,n.z),r=wrap.getBoundingClientRect();n.bub.style.left=(bx-r.left)+'px';n.bub.style.top=(by-r.top)+'px';
   if(n.x>13.5){n.state='done';n.g.visible=false;if(!n.tight&&!n.stuck)n.ok=true;}});
  if(!alive){const L=trial.list,stuck=L.filter(n=>n.stuck).length,tight=L.filter(n=>n.tight&&!n.stuck).length;trial=null;$('walk3').disabled=false;walker.visible=done;
   if(!stuck&&!tight)toast(tr('大家都順利走過去了：「這樣走起來舒服多了。」'),'ok');else toast(tr('{a} 位行人走得很辛苦、{b} 位過不去。看看哪裡太擠吧！',{a:tight,b:stuck}),stuck?'bad':'warn');onTrialEnd(stuck,tight);}}

 // ---- 物件商店：已配置、而且適用第一關的物件（通用＋第一關限定），每次開始／重新開始關卡時放到牆邊空地 ----
 const SHOP_FP={plant:[.4,.4],bin:[.32,.32],sign:[.38,.3],bench:[.85,.28],menu:[.4,.3],lantern:[.35,.35]};
 function shopMesh(k,g){
  if(k==='plant'){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.32,.25,.45,12),M(0xb5683a));pot.position.y=.225;const pl=new THREE.Mesh(new THREE.SphereGeometry(.42,14,10),M(0x4f8f45));pl.position.y=.8;[pot,pl].forEach(m=>{m.castShadow=true;g.add(m);});}
  else if(k==='bin'){const b=new THREE.Mesh(new THREE.CylinderGeometry(.3,.26,.8,14),M(0x3a9a78));b.position.y=.4;const l=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.07,14),M(0x2b7a5b));l.position.y=.83;[b,l].forEach(m=>{m.castShadow=true;g.add(m);});}
  else if(k==='sign'||k==='menu'){const c=k==='sign'?0xfff6e0:0x2d2a26;[-1,1].forEach(sd=>{const p=B(.7,1.0,.05,c,0,.5,sd*.12,g);p.rotation.x=sd*.22;});B(.72,.16,.06,k==='sign'?0x3a9a78:0xc2571a,0,.95,.14,g);}
  else if(k==='bench'){B(1.7,.1,.5,0xb07a4a,0,.46,0,g);B(1.7,.36,.08,0xb07a4a,0,.72,-.22,g);[[-.75,.18],[.75,.18],[-.75,-.18],[.75,-.18]].forEach(([a,b])=>B(.08,.44,.08,0x7a5232,a,.22,b,g));}
  else if(k==='lantern'){B(.06,1.7,.06,0x5a3a22,0,.85,0,g);B(.5,.06,.5,0x5a3a22,0,.03,0,g);const l=new THREE.Mesh(new THREE.SphereGeometry(.3,16,12),new THREE.MeshStandardMaterial({color:0xc8302a,emissive:0x661111}));l.scale.y=1.2;l.position.y=1.5;l.castShadow=true;g.add(l);}}
 function syncShop3D(){if(!built)return;
  shopObjs.forEach(g=>{sc.remove(g);const i=objs.indexOf(g);if(i>=0)objs.splice(i,1);const j=start.findIndex(s=>s[0]===g);if(j>=0)start.splice(j,1);});shopObjs=[];
  equippedFor(0).forEach(it=>{const [hx,hz]=SHOP_FP[it.m3]||[.4,.4];const g=G(hz,'shop',true,hx);g.userData.name=tr(it.name);g.userData.item=it.id;shopMesh(it.m3,g);
   const ok=(x,z)=>{g.position.set(x,0,z);return !hitWith(g)&&!bad(g)&&!ov(fp(g),DOOR);};let placed=false;
   for(const z of[-5.1,-4.2,-3.4,-2.5,-1.7]){for(let x=-10.5;x<=10.5;x+=.5){if(ok(x,z)){placed=true;break;}}if(placed)break;}
   if(!placed){sc.remove(g);objs.splice(objs.indexOf(g),1);return;}shopObjs.push(g);start.push([g,g.position.x,g.position.z,0]);});
  rebuild();}
 function fillResult(r){$('stars3').innerHTML=[0,1,2].map(i=>'<span data-i="'+i+'">'+(i<r.stars?'★':'☆')+'</span>').join('');const k=r.blocked?1:r.stars;
  $('react3').querySelector('.pp').innerHTML=ppHTML('boss');$('react3').querySelector('p').textContent=r.blocked?tr('走道還被擋著……我們再整理一下吧？'):tr(REACT[k]);
  const bd=BADGE[k];$('badge3').innerHTML=r.blocked?'':'<span class="medal">'+(typeof ART!=='undefined'&&ART.rank[k]?'<img alt="" src="'+ART.rank[k]+'">':bd[0])+'</span><span class="bt">'+esc(tr(bd[1]))+'<small>'+esc(tr(bd[2]))+'</small></span>';
  $('r3title').textContent=r.blocked?tr('還差一點！'):tr('第一關完成！');$('r3total').textContent=tr('總分 {n} / 100',{n:r.total});
  $('r3width').textContent=tr('主要通道淨寬：約 {w} 公尺',{w:r.width});
  $('r3cats').innerHTML=r.C.map(c=>`<div class="rc"><div class="rcH"><b>${esc(tr(c.name))}</b><span>${c.score} / ${c.max}</span></div><div class="bar"><i style="width:${c.score/c.max*100}%"></i></div>${c.reasons.length?'<ul>'+c.reasons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="okp">✓ '+esc(tr('做得很好！'))+'</p>'}</div>`).join('');
  $('com3').textContent=tr(COM[r.stars-1]);$('cont3').disabled=false;$('contNote3').style.display=r.blocked?'':'none';}
 function showResult(){if(dlgQ||trial)return;const r=score();fillResult(r);playSong('result');lastScore=r;
  {const rw=levelDone(0,r.stars,{trialOk:!!lastTrial&&!lastTrial.stuck&&!lastTrial.tight,noFail:!r.C[3].reasons.some(x=>/疊|stack/i.test(x)),doorSelf:p2DoorSelf});$('coin3').innerHTML=coinLine(rw);$('coin3')._rw=rw;setTimeout(()=>announce(rw),1700);}
  res.style.display='flex';const bg=$('badge3');bg.classList.remove('go');void bg.offsetWidth;if(!r.blocked){bg.classList.add('go');setTimeout(()=>sfx.reward(),950);}
  [...$('stars3').children].forEach((e,i)=>{e.classList.remove('lit');if(i<r.stars)setTimeout(()=>{e.classList.add('lit');sfx.star(i);},350+i*300);else setTimeout(()=>e.classList.add('lit'),350+i*300);});const st=$('stamp3');st.style.display=r.blocked?'none':'';st.classList.remove('go');void st.offsetWidth;if(!r.blocked){st.classList.add('go');setTimeout(sfx.stamp,500);setTimeout(sfx.allDone,1300);}else sfx.err();}
 let lastScore=null;
 fin.onclick=showResult;
 $('rst3').onclick=()=>{if(phase>=1&&!finished)confirmBox(tr('重新開始會清除這一關目前的擺放和進度（金幣、徽章不受影響）。確定嗎？'),tr('重新開始'),tr('取消'),reset);else reset();};$('redo3').onclick=()=>{res.style.display='none';playSong('play');};
 $('dlg3').onclick=e=>{e.stopPropagation();nextLine();};
 $('help3').onclick=()=>showTut('3d');
 $('walk3').onclick=startTrial;
 $('cont3').onclick=()=>{res.style.display='none';closing(lastScore?lastScore.stars:2);};
 // ===================== 第一關：四個任務階段＋劇情對話（第一關專屬）=====================
 // 階段 1 清出通道 → 2 午餐尖峰（擺好座位、留出餐的路）→ 3 送貨與停車（空間變擠、機車要停對地方）→ 4 請行人試走 → 評分、獎勵、收尾對話 → 下一關
 const SPK={boss:{n:'老闆',e:'🧑‍🍳',im:'dad'},stu:{n:'高中生',e:'🧑‍🎓',im:'student'},cus:{n:'客人',e:'🧑',im:'customer'},mom:{n:'推嬰兒車的媽媽',e:'👩‍🍼',im:'mother'},gma:{n:'拄拐杖的阿嬤',e:'👵'},kid:{n:'牽狗的小孩',e:'🧒'},dlv:{n:'送貨員',e:'🧑‍🔧'}};
 const PH_T=['','清出黃色通道','午餐尖峰時間','送貨與停車','請行人試走'];
 let p2DoorSelf=false,shopObjs=[];
 let phase=0,dlgQ=null,doorShown=false,doorFail=0,hintI=0,p1Done=false,lastTrial=null,customers=[],deliv=[],sayT=0,saidKeys={},doorMesh=null,doorTex=null,parkMesh=null,finished=false;
 function ppHTML(k){const S=SPK[k]||SPK.boss,im=S.im&&storyImg(S.im);return im?'<img alt="" src="'+headSrc(im)+'">':esc(S.e);}
 function talk(lines,cb){dlgQ={lines,i:0,cb,last:null};$('dlg3').classList.add('on');setMusic(.5);showLine();}
 function showLine(){const L=dlgQ.lines[dlgQ.i],[k,t,m]=L,d=$('dlg3');d.querySelector('.pp').innerHTML=ppHTML(k)+(m&&{happy:1,question:1,sigh:1,surprise:1,thanks:1}[m]?'<i class="emo emo-'+m+'">'+({happy:'★',question:'?',sigh:'💧',surprise:'!',thanks:'♥'})[m]+'</i>':'');d.classList.remove('nl');void d.offsetWidth;d.classList.add('nl');d.style.setProperty('--tail','36px');if(window.qSpeak)qSpeak(tr(t),({boss:'dad',stu:'student',mom:'mother',cus:'customer',gma:'gma',kid:'kid'})[k]||'npc',t);d.querySelector('b').textContent=tr(SPK[k].n);d.querySelector('p').textContent=tr(t);
  d.querySelector('small').textContent=dlgQ.i==dlgQ.lines.length-1?tr('點一下繼續 ▶'):tr('點一下繼續 ▶');
  if(m&&sfx[m])sfx[m]();else if(dlgQ.last!==k)sfx.talk();dlgQ.last=k;}
 function showLineText(){const[k,t]=dlgQ.lines[dlgQ.i],d=$('dlg3');d.querySelector('b').textContent=tr(SPK[k].n);d.querySelector('p').textContent=tr(t);d.querySelector('small').textContent=tr('點一下繼續 ▶');}
 function nextLine(){if(!dlgQ)return;dlgQ.i++;if(dlgQ.i>=dlgQ.lines.length){const cb=dlgQ.cb;dlgQ=null;$('dlg3').classList.remove('on');setMusic(1);ui();if(cb)cb();}else showLine();}
 // 進行中的即時反應（不擋操作；同一句話只說一次或間隔一段時間）
 function react(k,t,m,key,gap){const now=performance.now();if(dlgQ)return;if(key){if(saidKeys[key]&&(!gap||now-saidKeys[key]<gap))return;saidKeys[key]=now;}
  const e=$('say3');e.querySelector('.pp').innerHTML=ppHTML(k);e.querySelector('b').textContent=tr(SPK[k].n);e.querySelector('p').textContent=tr(t);e.classList.add('show');if(m&&sfx[m])sfx[m]();clearTimeout(sayT);sayT=setTimeout(()=>e.classList.remove('show'),3600);}
 function banner(t){const b=$('banner3');b.textContent=tr(t);b.classList.remove('go');void b.offsetWidth;b.classList.add('go');if(!/送貨/.test(t))sfx.event();}
 const visObjs=()=>objs.filter(g=>g.visible);
 const doorBlocked=()=>visObjs().filter(g=>ov(fp(g),DOOR)).length;
 const nearChairs=t=>chairs.filter(c=>c.visible&&Math.hypot(c.position.x-t.position.x,c.position.z-t.position.z)<2.6).length;
 function status1(){const V=visObjs(),B=V.map(g=>bad(g));return{nW:B.filter(b=>b==='walk').length,nF:B.filter(b=>b==='front').length,
  far:tables.filter(t=>t.position.z>=-3).length,lonely:tables.filter(t=>nearChairs(t)<2).length,door:doorBlocked(),scOut:V.filter(isScooter).filter(g=>!inside(fp(g),PARK)).length,dlvBad:deliv.filter(g=>g.visible&&bad(g)).length};}
 function checklist(){const s=status1();
  if(phase<=1)return[[tr('黃色通道上的東西都移開了（剩 {n} 件）',{n:s.nW}),!s.nW],[tr('靠馬路的紅色禁放區沒有放東西'),!s.nF]];
  if(phase==2)return[[tr('桌子靠近店面'),!s.far],[tr('每張桌子旁至少有兩張椅子'),!s.lonely],[tr('老闆出餐的路沒有被擋住'),!s.door],[tr('黃色通道仍然暢通'),!s.nW&&!s.nF]];
  if(phase==3)return[[tr('送來的貨物收好，不擋路'),!s.dlvBad],[tr('機車停到適合的地方'),!s.scOut],[tr('老闆出餐的路沒有被擋住'),!s.door],[tr('黃色通道與禁放區都淨空'),!s.nW&&!s.nF]];
  return[[tr('請三位行人試走'),!!lastTrial],[tr('大家都能順利通過'),!!lastTrial&&!lastTrial.stuck&&!lastTrial.tight]];}
 function ui(){const o=$('obj3');if(phase<1){o.classList.remove('on');return;}o.classList.add('on');
  o.innerHTML='<span class="obPh">'+esc(tr('階段 {n}／4',{n:phase}))+'</span><b>'+esc(tr(PH_T[phase]))+'</b><ul>'+checklist().map(([t,ok])=>'<li class="'+(ok?'ok':'')+'">'+esc(t)+'</li>').join('')+'</ul>';
  $('st3').classList.toggle('lvOn',phase>=2);const busy=!!dlgQ||finished;$('chk3').style.display=phase>=1&&phase<=3?'':'none';$('chk3').disabled=busy||!!trial;
  $('walk3').style.display=phase==4?'':'none';$('walk3').disabled=busy||!!trial;$('walk3').querySelector('span').textContent=lastTrial?tr('再試走一次'):tr('請行人試走');
  fin.style.display=phase==4&&lastTrial?'':'none';fin.disabled=busy||!!trial;$('hint3').disabled=busy;}
 const HINTS={1:['先看看黃色通道上有哪些東西。','東西可以先往後靠牆放；紅色那塊是靠馬路的禁放區，人要從那裡走上騎樓。','變成紅色的物件就是還在擋路的，一件一件移開吧！'],
  2:['老闆要從哪裡把麵端出來呢？看看背景裡的店門。','桌子離店面近一點，老闆比較好端麵；椅子要圍在桌子旁邊。','（已標出店門口）虛線框是老闆出餐的路，不要放東西。'],
  3:['送來的貨要找個不擋路、也不擋店門的地方收好。','機車停在騎樓會佔用大家的路……畫面裡有沒有專門停機車的地方？','空間有點擠的話，可以把紙箱靠牆排緊一點。'],
  4:['按「請行人試走」，看看大家走得順不順。','誰走得卡卡的，就看看他經過的地方哪裡太窄。']};
 function showDoor(){if(doorShown)return;doorShown=true;doorMesh.visible=true;refresh();}
 $('hint3').onclick=()=>{if(dlgQ||phase<1)return;const H=HINTS[phase],i=Math.min(hintI,H.length-1);hintI++;if(phase==2&&i==2)showDoor();react('stu',H[i],'question');};
 function advance(n,lines,cb){finished=false;talk(lines,()=>{phase=n;hintI=0;ui();refresh();if(cb)cb();});}
 // ---- 階段 1：開場 ----
 function beginLv1(){phase=1;p1Done=false;ui();
  talk([['boss','這就是我的店門口……桌椅、紙箱、機車全擠在走道上。','sigh'],['stu','黃色的地方是大家走的路吧？我先把它清出來！',null],['boss','拜託你了！東西可以先往牆邊靠，不過靠馬路那一塊紅色的不能放喔。',null]]);}
 function finishP1(){sfx.phase();talk([['boss','哇！走道一下子變寬了！','happy'],['stu','可是桌椅全擠在牆邊，客人要怎麼吃飯呢？','question']],()=>{banner('⏰ 午餐尖峰時間！');setTimeout(()=>advance(2,[['boss','糟糕，中午客人要來了！得幫他們準備位子。','surprise'],['boss','對了，我要從店裡把麵端出來，別讓我出不去啊！',null],['stu','讓客人坐得舒服、老闆出得來、路人也走得過……我想想看。',null]]),1900);});}
 // ---- 「完成這一步」：檢查目前階段 ----
 $('chk3').onclick=()=>{if(dlgQ||trial)return;const s=status1(),shake=()=>{const o=$('obj3');o.classList.remove('shake');void o.offsetWidth;o.classList.add('shake');};
  const goOn=(msg,fn)=>confirmBox(tr(msg),tr('就這樣繼續'),tr('再調整一下'),fn);
  if(phase==1){if(s.nW||s.nF){shake();react('boss',s.nW?'通道上還有東西擋著喔，再找找看。':'靠馬路的紅色區域不能放東西喔！','question');goOn('還有東西擋在通道或禁放區，會影響評分。要先調整，還是就這樣進入下一段？',()=>{if(!p1Done){p1Done=true;finishP1();}});}else if(!p1Done){p1Done=true;finishP1();}return;}
  if(phase==2){const P2='這樣擺好像還有些地方不太方便，會影響評分。要先調整，還是就這樣繼續？';if(s.nW||s.nF){shake();react('boss','咦？通道好像又被擋住了。','question');goOn(P2,p2Success);return;}
   if(s.far){shake();react('boss','桌子離店有點遠，我端麵要走好久……','sigh');goOn(P2,p2Success);return;}
   if(s.lonely){shake();react('cus','有的桌子沒地方坐耶，要站著吃嗎？','question');goOn(P2,p2Success);return;}
   if(s.door){shake();doorFail++;if(doorFail>=2&&!doorShown){showDoor();react('boss','你看，就是虛線這裡！我都從這個門出來。','surprise');}else react('boss','我要從哪裡出來呢……','question');goOn(P2,p2Success);return;}
   p2Success();return;}
  if(phase==3){const P3='還有地方會擋到人或停錯位置，會影響評分。要先調整，還是就這樣繼續？';if(s.dlvBad||s.nW){shake();react('boss','貨物還擋在路上喔。','question');goOn(P3,p3Success);return;}if(s.nF){shake();react('boss','靠馬路的紅色區域不能放東西喔！','question');goOn(P3,p3Success);return;}
   if(s.scOut){shake();react('stu','機車停在騎樓裡，還是會擋到人……','question');goOn(P3,p3Success);return;}if(s.door){shake();react('boss','我出餐的路又被擋住了啦！','surprise');goOn(P3,p3Success);return;}
   p3Success();}};
 function p2Success(){if(phase!==2)return;
   p2DoorSelf=!doorShown;sfx.phase();seatCustomers();talk([['cus','好香喔！這樣坐剛剛好，也不會擋到路人。','happy'],['boss','太棒了！客人有位子坐，我也端得出來！','happy']],()=>{banner('🚚 送貨來了！');deliveryArrive(()=>{spawnDeliveries();parkMesh.visible=true;refresh();
    advance(3,[['dlv','老闆，今天的貨放這邊喔！','surprise'],['boss','哎呀，又擋到路了……還有那台機車，一直停在騎樓也不是辦法。','sigh'],['stu','空間變擠了……貨要收在哪裡，機車又該停去哪呢？','question']],deliveryLeave);});});}
 function p3Success(){if(phase!==3)return;
   sfx.phase();advance(4,[['boss','東西收好了，機車也停好了，店門口好整齊！','happy'],['stu','最後，請不同的行人走走看，確認大家都能順利通過！',null],['boss','好，我們來看看大家走得順不順！',null]]);}
 // ---- 送貨機車：從右邊騎進來，進場時按兩聲喇叭「叭！叭！」，停好後送貨員才開口；對話結束再騎走 ----
 let dlvSc=null,dlvAnim=null;
 function mkDlvScooter(){const g=new THREE.Group();B(1.6,.4,.5,0xe0a020,0,.6,0,g);B(.7,.14,.45,0x222222,.25,.88,0,g);B(.28,.6,.5,0xe0a020,-.68,.8,0,g);B(.08,.08,.8,0x222222,-.72,1.18,0,g);wheel(g,-.62);wheel(g,.62);B(.6,.5,.6,0xc9a46c,.62,1.18,0,g);
  const r=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,.7,10),M(0x3b7a5a));r.position.set(.05,1.3,0);const h=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),M(0xf0c9a0));h.position.set(.05,1.8,0);const hel=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8,0,Math.PI*2,0,Math.PI/2),M(0xe5554a));hel.position.set(.05,1.84,0);[r,h,hel].forEach(m=>{m.castShadow=true;g.add(m);});g.visible=false;sc.add(g);return g;}
 function deliveryArrive(cb){if(!dlvSc)dlvSc=mkDlvScooter();dlvSc.position.set(14.5,0,4.6);dlvSc.visible=true;dlvAnim={from:14.5,to:8.6,t:0,dur:1.9,cb,horn:false};}
 function deliveryLeave(){if(!dlvSc||!dlvSc.visible)return;dlvAnim={from:dlvSc.position.x,to:15,t:0,dur:1.5,horn:true,cb:()=>{dlvSc.visible=false;}};}
 function dlvStep(dt){if(!dlvAnim||!dlvSc)return;const a=dlvAnim;a.t+=dt;const k=Math.min(1,a.t/a.dur),e=a.to<a.from?1-Math.pow(1-k,2):k*k;dlvSc.position.x=a.from+(a.to-a.from)*e;dlvSc.position.y=k<1?Math.abs(Math.sin(a.t*18))*.03:0;
  if(!a.horn&&dlvSc.position.x<12.8){a.horn=true;sfx.horn();}if(k>=1){const cb=a.cb;dlvAnim=null;if(cb)cb();}}
 function seatCustomers(){clearCustomers();const cols=[0x6aa6d8,0xe08a5a,0x8cc084,0xb28ad8];let k=0;
  tables.forEach(t=>{chairs.filter(c=>Math.hypot(c.position.x-t.position.x,c.position.z-t.position.z)<2.6).slice(0,2).forEach(c=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.22,.27,.62,12),M(cols[k++%4]));b.position.y=.98;const h=new THREE.Mesh(new THREE.SphereGeometry(.21,14,10),M(0xf0c9a0));h.position.y=1.5;[b,h].forEach(m=>{m.castShadow=true;m.userData.noTint=true;g.add(m);});c.add(g);customers.push([c,g]);});});rebuild();}
 function clearCustomers(){customers.forEach(([c,g])=>c.remove(g));customers=[];}
 function spawnDeliveries(){const spots=[[6.2,.6],[7.8,1.6],[5,1.9],[8.6,.4],[4,.5],[-7,1],[-9,2]];let si=0;
  deliv.forEach(g=>{g.visible=true;for(;si<spots.length;si++){g.position.set(spots[si][0],0,spots[si][1]);if(!hitWith(g)){si++;break;}}});rebuild();}
 // ---- 階段 4：試走結束後的反應 ----
 function onTrialEnd(stuck,tight){if(phase!==4)return;lastTrial={stuck,tight};ui();
  if(!stuck&&!tight){sfx.happy();talk([['mom','推車終於推得過去了！','thanks'],['gma','路平平順順的，走起來好安心。','happy'],['kid','狗狗也走得很開心！','happy'],['boss','看起來都沒問題了！按「完成配置，看評分」看看成果吧！',null]]);}
  else talk([['boss','好像還有人走得卡卡的……要不要再看看哪裡太擠？','question'],['stu','可以調整之後再試走一次，或是直接看評分。',null]]);}
 // ---- 評分後：角色反應、獎勵、收尾對話 ----
 const REACT={3:'太棒了！這樣通行方便多了！',2:'謝謝你！整體好走多了，還有一兩個地方可以再調整。',1:'辛苦了！不過有些地方還是卡卡的，要不要再試試看？'};
 const BADGE={3:['🏆','騎樓守護者','獲得獎勵：老闆招待的一碗麵 🍜'],2:['🏅','騎樓小幫手','獲得獎勵：老闆的感謝卡 💌'],1:['🎖️','騎樓見習生','再調整一下，就能拿到更高的評價！']};
 function closing(stars){finished=true;ui();playSong('result');
  const L={3:[['boss','太棒了！這樣通行方便多了！','happy'],['mom','謝謝你幫忙整理騎樓！推嬰兒車再也不用擠了。','thanks'],['gma','路變寬了，我走起來好安心。','happy'],['stu','原來保持騎樓暢通這麼重要！',null],['boss','騎樓是我家的門口，也是大家的路。以後我會記得把桌椅收好！','thanks'],['boss','來，這碗麵我請客！有空常來喔！','happy'],['stu','謝謝老闆！……咦？手機又響了，是新的委託！','surprise']],
   2:[['boss','謝謝你！店門口清爽多了，客人跟路人都走得過。','thanks'],['mom','比之前好走多了，謝謝你幫忙整理騎樓！','happy'],['stu','還有一點點可以更好……原來保持騎樓暢通這麼重要！',null],['boss','騎樓是大家的路，我以後也會多注意。辛苦你了！','happy'],['stu','……咦？手機又響了，是新的委託！','surprise']],
   1:[['boss','辛苦你了，雖然還有些地方卡卡的……','sigh'],['boss','但店門口已經比之前好太多了，謝謝你！','thanks'],['stu','下次我會想得更周到。原來保持騎樓暢通這麼重要！',null],['stu','……咦？手機又響了，是新的委託！','surprise']]}[stars];
  talk(L,()=>{Stage3D.stop();playSong('play');transition(()=>{$('st3').style.display='none';$('game').style.display='';loadLevel(1);showPhone();},'Loading Lv2',1200);});}
 function resetLv1(){p2DoorSelf=false;dlvAnim=null;if(dlvSc)dlvSc.visible=false;phase=1;p1Done=false;doorShown=false;doorFail=0;hintI=0;lastTrial=null;finished=false;saidKeys={};clearCustomers();deliv.forEach(g=>g.visible=false);if(doorMesh)doorMesh.visible=false;if(parkMesh)parkMesh.visible=false;
  if(dlgQ){dlgQ=null;$('dlg3').classList.remove('on');setMusic(1);}rebuild();}
 // 拖曳後的即時反應
 function onDrop(g,before,after){if(phase<1||dlgQ)return;
  if(after==='front'){react('boss','欸？那邊靠馬路，客人一走上騎樓就會撞到！','surprise','front',9000);return;}
  if(phase>=2&&ov(fp(g),DOOR)){react('boss','欸欸，這樣我端麵出不來啦！','surprise','door',9000);return;}
  if(phase>=2&&after==='walk'&&before!=='walk'){react('boss','咦？通道好像又被擋住了。','question','rewalk',9000);return;}
  if(phase==1&&before==='walk'&&!after){react('boss','對對，就是這樣！','happy','first');const s=status1();if(s.nW<=6&&s.nW>0)react('boss','已經清一半了，加油！','happy','half');}
  if(phase==2&&g.userData.type==='table'&&g.position.z<-3)react('boss','桌子靠近店面，我端麵就方便多了。','happy','tbl');
  if(phase==3&&isScooter(g)&&inside(fp(g),PARK))react('boss','停進機車格了，騎樓清爽多了！','happy','park');}
 function onStack(g,hit){if(phase<1)return;const onCus=hit&&hit.isObject3D&&customers.some(([c])=>c===hit);
  if(onCus)react('cus','欸？怎麼放到我頭上了啦！','surprise','headstack',8000);else react('boss','疊起來了……這樣好像不太穩喔。','question','stack',10000);}
 function onFail(){if(phase>=1)react('stu','嗯……這裡放不下，換個地方試試。','question','fail',12000);}

 // ---- 創作者匯入：圖片（立牌）或 .glb 模型，可縮放 ----
 const slots=[['carton','紙箱',1.3,1.2],['chair','紅色塑膠椅',.8,.75],['table','不鏽鋼桌',2.0,1.2],['scooter','機車',1.9,1.3],['cabinet','櫃子',1.3,1.5],['pillar','柱子',.8,4],['walker','行人',.8,1.8]];
 function fitModel(o,len,h,k0){const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());o.scale.multiplyScalar(Math.min(len/Math.max(s.x,s.z,1e-3),h/Math.max(s.y,1e-3))*k0);const b2=new THREE.Box3().setFromObject(o),c=b2.getCenter(new THREE.Vector3());o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b2.min.y;o.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});const w=new THREE.Group();w.add(o);return w;}
 function sprite(t,len,h,k0){const hh=h*k0,ww=hh*t.image.width/t.image.height,geo=new THREE.PlaneGeometry(ww,hh);geo.translate(0,hh/2,0);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.05,side:THREE.DoubleSide}));m.rotation.x=-EL;
  const sh=new THREE.Mesh(new THREE.CircleGeometry(Math.min(ww,len*k0)*.45,20),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=.02;sh.scale.y=.6;sh.userData.noTint=true;const u=new THREE.Group();u.add(m,sh);return u;}
 function apply(type){const c=cust[type];(inst[type]||[]).forEach(g=>{if(g.userData.u){g.remove(g.userData.u);g.userData.u=null;}if(!g.userData.defKids)g.userData.defKids=g.children.slice();g.userData.defKids.forEach(k=>k.visible=!c);if(c){const u=c.make();g.add(u);g.userData.u=u;}});rebuild();refresh();}
 function importSlot(type,file,k0){const sl=slots.find(s=>s[0]===type),url=URL.createObjectURL(file);
  if(/\.(glb|gltf)$/i.test(file.name)){if(!THREE.GLTFLoader){alert('GLTFLoader 未載入（需要網路）');return;}
   new THREE.GLTFLoader().load(url,gl=>{const src=fitModel(gl.scene,sl[2],sl[3],k0);cust[type]={make:()=>src.clone(true)};apply(type);},undefined,()=>alert('模型載入失敗，請使用 .glb'));}
  else new THREE.TextureLoader().load(url,t=>{cust[type]={make:()=>sprite(t,sl[2],sl[3],k0)};apply(type);});}
 function setShop(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;const a=t.image.width/t.image.height,pa=4.6/3.34;if(a>pa){t.repeat.set(pa/a,1);t.offset.set((1-pa/a)/2,0);}else{t.repeat.set(1,a/pa);t.offset.set(0,(1-a/pa)/2);}shopPl.material.map=t;shopPl.material.needsUpdate=true;shopPl.visible=true;shop0Parts.forEach(m=>m.visible=false);shopSign.forEach(m=>m.visible=false);}
 function importTex(key,file,rep){new THREE.TextureLoader().load(URL.createObjectURL(file),t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
  if(key==='wall'){setBackdrop(t.image,[0,0,1,1]);return;}
  if(key==='shop'){setShop(t);return;}if(key==='floor'){t.repeat.set(rep,rep/3.67);floorM.map=t;}else{t.repeat.set(rep,1);wallM.map=t;}floorM.needsUpdate=wallM.needsUpdate=true;});}
 function clear(key,isTex){if(key==='wall'){if(LVBG[0])setBackdrop(LVBG[0],[0,0,1,.7016]);else{bd.visible=false;procWall.forEach(m=>m.visible=true);}return;}if(key==='shop'){shopPl.visible=false;shop0Parts.forEach(m=>m.visible=true);shopSign.forEach(m=>m.visible=true);return;}if(isTex){if(key==='floor')floorM.map=floorDef;else wallM.map=wallDef;floorM.needsUpdate=wallM.needsUpdate=true;}else{delete cust[key];apply(key);}}
 // ---- 自訂物件（2.5D 立牌）：從電腦匯入 PNG／JPG／WEBP → 可自動去背或保留透明背景 → 加上黑色描邊 → 疊層做出厚度。
 //      這是「視覺立體化」，不是真正的 3D 建模；匯入的物件會「加入」物件清單，不會覆蓋原本的物件。
 const CUSTOM_OBJ_SRC=[]; // 預留：要讓所有玩家都看到的自訂物件，例如 [{name:'招牌',src:'data:image/png;base64,...',h:1.2}]
 const CK3='qlz-custom-objs-v1',customs=[];
 function standee(img,hgt){const k=1/Math.cos(EL),ww=hgt*img.width/img.height,hh=hgt*k,T=.14,N=7;const t=new THREE.Texture(img);t.needsUpdate=true;t.anisotropy=4;
  const geo=new THREE.PlaneGeometry(ww,hh);geo.translate(0,hh/2+.08,0);const u=new THREE.Group();
  for(let i=N;i>=0;i--){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.5,color:i===0?0xffffff:(i===N?0x5e4e40:0x9b8670)}));m.position.z=-i*T/N;m.userData.noTint=i>0;u.add(m);}
  const base=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.3,ww*.7),.08,T+.3),M(0x8a6a4a));base.position.set(0,.04,-T/2);base.castShadow=true;u.add(base);
  const sh=new THREE.Mesh(new THREE.CircleGeometry(.5,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.22,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(.08,.015,-T/2);sh.scale.set(Math.max(.4,ww*.55)*2,.7,1);sh.userData.noTint=true;u.add(sh);
  return{u,ww};}
 function prepImage(img,cut,line){const MX=512,s=Math.min(1,MX/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s)),P=6;
  const k=document.createElement('canvas');k.width=w;k.height=h;const g=k.getContext('2d');g.drawImage(img,0,0,w,h);const d=g.getImageData(0,0,w,h),a=d.data;
  if(cut){const border=[];for(let x=0;x<w;x++)border.push(x,(h-1)*w+x);for(let y=0;y<h;y++)border.push(y*w,y*w+w-1);
   let r=0,gg=0,b=0,n=0;border.forEach(i=>{if(a[i*4+3]>200){r+=a[i*4];gg+=a[i*4+1];b+=a[i*4+2];n++;}});
   if(n){r/=n;gg/=n;b/=n;const dist=i=>Math.hypot(a[i*4]-r,a[i*4+1]-gg,a[i*4+2]-b),TOL=48,seen=new Uint8Array(w*h),q=[];
    border.forEach(i=>{if(!seen[i]&&dist(i)<TOL){seen[i]=1;q.push(i);}});
    while(q.length){const i=q.pop();a[i*4+3]=0;const x=i%w,y=(i/w)|0;[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([u2,v])=>{if(u2<0||v<0||u2>=w||v>=h)return;const j=v*w+u2;if(seen[j])return;seen[j]=1;const dd=dist(j);if(dd<TOL)q.push(j);else if(dd<TOL*1.6)a[j*4+3]=Math.min(a[j*4+3],Math.round(255*(dd-TOL)/(TOL*.6)));});}
    g.putImageData(d,0,0);}}
  let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]>20){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return null;const cw=x1-x0+1,ch=y1-y0+1,o=document.createElement('canvas');o.width=cw+P*2;o.height=ch+P*2;const og=o.getContext('2d');
  if(line){const sl=document.createElement('canvas');sl.width=cw;sl.height=ch;const sg=sl.getContext('2d');sg.drawImage(k,x0,y0,cw,ch,0,0,cw,ch);sg.globalCompositeOperation='source-in';sg.fillStyle='#2a2018';sg.fillRect(0,0,cw,ch);
   for(let i=0;i<16;i++){const an=i/16*Math.PI*2;og.drawImage(sl,P+Math.cos(an)*3,P+Math.sin(an)*3);}}
  og.drawImage(k,x0,y0,cw,ch,P,P,cw,ch);return o.toDataURL('image/png');}
 const hasAlpha=img=>{const k=document.createElement('canvas'),w=k.width=Math.min(64,img.width),h=k.height=Math.min(64,img.height),g=k.getContext('2d');g.drawImage(img,0,0,w,h);const a=g.getImageData(0,0,w,h).data;for(let i=3;i<a.length;i+=4)if(a[i]<200)return true;return false;};
 function saveCustoms(){try{localStorage.setItem(CK3,JSON.stringify(customs.filter(c=>!c.embedded).map(({id,name,src,h})=>({id,name,src,h}))));return true;}catch(e){return false;}}
 function loadCustoms(){let a=[];try{a=JSON.parse(localStorage.getItem(CK3)||'[]');}catch(e){}CUSTOM_OBJ_SRC.map(o=>Object.assign({embedded:true},o)).concat(a).forEach(o=>addCustom(o,true));}
 function addCustom(o,place){const c={id:o.id||('c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),name:o.name||tr('自訂物件'),src:o.src,h:+o.h||1.2,embedded:!!o.embedded,inst:[]};customs.push(c);
  const im=new Image();im.onload=()=>{c.img=im;if(place)spawn(c);renderList();};im.src=c.src;return c;}
 function spawn(c){if(!c.img)return;const g=G(.25,'custom',true,.5);g.userData.name=c.name;const s=standee(c.img,c.h);g.add(s.u);g.userData.hx=Math.max(.2,s.ww/2);g.userData.hz=.28;
  const tryAt=(x,z)=>{g.position.set(x,0,z);return !hitWith(g)&&!bad(g);};let ok=false;
  for(const z of[-5.1,-4.2,-3.3,-2.4,-1.6]){for(let x=-10;x<=10;x+=.5){if(tryAt(x,z)){ok=true;break;}}if(ok)break;}
  if(!ok){sc.remove(g);objs.splice(objs.indexOf(g),1);inst.custom.splice(inst.custom.indexOf(g),1);toast(tr('場景太滿了，找不到不重疊的位置可以放「{n}」。',{n:c.name}),'bad');return;}
  start.push([g,g.position.x,g.position.z,0]);c.inst.push(g);rebuild();refresh();}
 function removeCustom(c){c.inst.forEach(g=>{sc.remove(g);objs.splice(objs.indexOf(g),1);inst.custom.splice(inst.custom.indexOf(g),1);const i=start.findIndex(s=>s[0]===g);if(i>=0)start.splice(i,1);});customs.splice(customs.indexOf(c),1);saveCustoms();rebuild();refresh();renderList();}
 function renderList(){const L=$('cList');if(!L)return;L.innerHTML='';customs.forEach(c=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<img alt="" style="height:40px;max-width:60px;object-fit:contain;background:#0001;border-radius:6px"><b></b><span style="opacity:.7">${c.h} m・場景中 ${c.inst.length} 個${c.embedded?'・已嵌入':''}</span><button>＋ 再放一個</button><button>移除</button>`;
  r.querySelector('img').src=c.src;r.querySelector('b').textContent=c.name;const[b1,b2]=r.querySelectorAll('button');b1.onclick=()=>{spawn(c);renderList();};b2.onclick=()=>{if(confirm('確定移除「'+c.name+'」？（場景中的這個物件也會一起移除）'))removeCustom(c);};if(c.embedded)b2.disabled=true;L.appendChild(r);});}
 function mkUI(){const box=$('slots3');
  const ci=document.createElement('div');ci.className='cimp';ci.innerHTML='<b>➕ 新增自訂物件（2.5D 立牌，不會覆蓋原有物件）</b>'+
   '<div class="row"><input type="file" id="cFile" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"> 名稱 <input type="text" id="cName" maxlength="12" style="width:120px"> 高度 <input type="range" id="cH" min=".3" max="3" step=".1" value="1.2"><span id="cHv">1.2</span> 公尺</div>'+
   '<div class="row"><label><input type="radio" name="cBg" value="cut" checked> 自動去背</label><label><input type="radio" name="cBg" value="keep"> 保留原圖／透明背景</label><label><input type="checkbox" id="cLine" checked> 黑色描邊（配合插畫風格）</label></div>'+
   '<div class="row"><canvas id="cPrev" width="200" height="140" style="width:200px;height:140px;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:8px"></canvas><button id="cAdd" disabled>加入物件清單並放進場景</button><span id="cMsg" style="opacity:.75"></span></div>'+
   '<div id="cList"></div><small>支援 PNG、JPG、WEBP。會保留原圖比例；去背是從圖片邊緣判斷背景顏色，背景越單純效果越好（複雜照片建議先用去背工具做成透明 PNG，再選「保留原圖」）。這是把圖片做成有厚度、有底座和影子的立牌，屬於視覺立體化，不是真正的 3D 模型。清單存在這個瀏覽器；要讓所有玩家看到，請把物件交給 Claude 嵌入程式的 CUSTOM_OBJ_SRC。</small><hr>';
  box.appendChild(ci);
  let srcImg=null,out=null;const prev=()=>{const cv2=$('cPrev'),g=cv2.getContext('2d');g.clearRect(0,0,cv2.width,cv2.height);out=null;$('cAdd').disabled=true;if(!srcImg)return;
   const u=prepImage(srcImg,ci.querySelector('input[name=cBg]:checked').value==='cut',$('cLine').checked);if(!u){$('cMsg').textContent='去背後沒有剩下任何內容，請改選「保留原圖」。';return;}
   const im=new Image();im.onload=()=>{const s=Math.min(cv2.width/im.width,cv2.height/im.height);g.drawImage(im,(cv2.width-im.width*s)/2,(cv2.height-im.height*s)/2,im.width*s,im.height*s);out=u;$('cAdd').disabled=false;$('cMsg').textContent='原圖 '+srcImg.width+'×'+srcImg.height+'（比例保留）';};im.src=u;};
  $('cFile').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!/^image\/(png|jpeg|webp)$/.test(f.type)&&!/\.(png|jpe?g|webp)$/i.test(f.name)){alert('只支援 PNG、JPG、WEBP 圖片。');e.target.value='';return;}
   const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{srcImg=im;$('cName').value=$('cName').value||f.name.replace(/\.[^.]+$/,'').slice(0,12);const keep=hasAlpha(im);ci.querySelector('input[value='+(keep?'keep':'cut')+']').checked=true;prev();};im.onerror=()=>alert('這張圖片無法讀取。');im.src=rd.result;};rd.readAsDataURL(f);};
  ci.querySelectorAll('input[name=cBg]').forEach(r=>r.onchange=prev);$('cLine').onchange=prev;$('cH').oninput=()=>{$('cHv').textContent=$('cH').value;};
  $('cAdd').onclick=()=>{if(!out)return;const c=addCustom({name:$('cName').value.trim()||'自訂物件',src:out,h:+$('cH').value},true);if(!saveCustoms())$('cMsg').textContent='已加入，但瀏覽器空間不足，重新整理後會消失。';else $('cMsg').textContent='已加入「'+c.name+'」。';srcImg=null;$('cFile').value='';$('cName').value='';prev();};
  const add=(label,tex,key,dv,mn,mx,st)=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<b style="min-width:84px">${label}</b><input type="file" accept="${tex?'image/*':'image/*,.glb'}"><span>${tex?'重複':'大小'}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${dv}" style="width:110px"><button>清除</button>`;box.appendChild(r);
   const fi=r.querySelector('input[type=file]'),rg=r.querySelector('input[type=range]'),bt=r.querySelector('button');
   const go=()=>{if(fi.files[0])tex?importTex(key,fi.files[0],+rg.value):importSlot(key,fi.files[0],+rg.value);};
   if(key==='shop'||key==='wall'){r.querySelector('span').style.display='none';rg.style.display='none';}fi.onchange=go;rg.onchange=go;bt.onclick=()=>{fi.value='';clear(key,tex);};};
  const h=document.createElement('b');h.textContent='🔁 替換原有物件的外觀（會覆蓋該類物件的樣子）';box.appendChild(h);
  add('地板貼圖',1,'floor',11,1,30,1);add('背景照片（整面牆）',1,'wall',1,1,1,1);slots.forEach(s=>add(s[1],0,s[0],1,.4,2.5,.05));renderList();}
 return{start(){if(typeof THREE==='undefined'){$('game').style.display='';alert(tr('無法載入 3D 引擎（需要網路連線）'));return;}
   $('st3').style.display='block';if(!built)build();view();reset();
   let lastMs=0;R.setAnimationLoop(ms=>{const t=ms/1000,dt=Math.min(.05,(ms-(lastMs||ms))/1000);lastMs=ms;trialStep(dt);dlvStep(dt);if(frontMesh)frontMesh.material.opacity=drag&&drag.moved?.78+.22*Math.sin(t*7):1;if(walker.visible){walker.position.x=((t*2.5)%26)-13;walker.position.y=Math.abs(Math.sin(t*9))*.08;walker.rotation.z=Math.sin(t*9)*.06;}R.render(sc,cam);});
   if(!tutSeen3){tutSeen3=true;showTut('3d',beginLv1);}else beginLv1();},
  stop(){if(R)R.setAnimationLoop(null);},
  snap(){if(!built)return null;R.render(sc,cam);return R.domElement;},
  busy(){return built&&phase>=1&&!finished;},
  relang(){if(!built)return;drawFront(frontTex.image.getContext('2d'),1920,280);frontTex.needsUpdate=true;drawPark(parkTex.image.getContext('2d'),360,260);parkTex.needsUpdate=true;drawDoor(doorTex.image.getContext('2d'),240,500);doorTex.needsUpdate=true;refresh();ui();if(dlgQ)showLineText();if(res.style.display==='flex')fillResult(score());},
  _dbg:()=>({shopObjs:()=>shopObjs,lv1:{force4(){if(dlgQ){dlgQ=null;$('dlg3').classList.remove('on');}phase=4;lastTrial={stuck:0,tight:0};ui();},phase:()=>phase,dlg:()=>!!dlgQ,next:nextLine,status:status1,trial:()=>lastTrial,deliv:()=>deliv,tables,chairs,DOOR},objs,fp,hitWith,bad,score,STATIC,drag:()=>drag,fails:()=>fails,proj:(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(cam),r=R.domElement.getBoundingClientRect();return[r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height];}})};
})();

// ===== 遊戲專屬游標（一般／可點擊／抓取）；創作者可匯入自己的圖，也可在 CURSOR_SRC 預留位置嵌入 =====
const CURSOR_SRC={d:'',p:'',g:'',h:''}; // 預留：游標圖檔網址或 data URI（建議 PNG，32×32，尖端在左上角）
const svgCur=(svg,x,y)=>'url("data:image/svg+xml;utf8,'+encodeURIComponent(svg)+'") '+x+' '+y+', auto';
const SV=(b)=>"<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>"+b+"</svg>";
const GC={
 d:svgCur(SV("<path d='M5 3 L5 25 L11 19.5 L15 28 L19 26.2 L15 17.8 L23 17.8 Z' fill='#c2571a' stroke='white' stroke-width='2' stroke-linejoin='round'/><path d='M5 3 L5 25 L11 19.5 L15 28 L19 26.2 L15 17.8 L23 17.8 Z' fill='none' stroke='#3a1d0b' stroke-width='.8'/>"),5,3),
 // 可點擊（按鈕）：標準的指向手勢（食指在左、拇指與其他手指可見，不會被誤認成不雅手勢）
 p:svgCur(SV("<path fill='#c2571a' stroke='white' stroke-width='1.8' stroke-linejoin='round' d='M11 4.6a1.9 1.9 0 0 1 3.8 0V13.6a1.8 1.8 0 0 1 3.6 0V15a1.8 1.8 0 0 1 3.6 0V16.2a1.8 1.8 0 0 1 3.6 0V21.2c0 4.3-3 7.3-7.4 7.3h-1.2c-3 0-4.8-1.6-6.3-3.9l-3.4-5.4a1.9 1.9 0 0 1 3.1-2.2L11 18.3Z'/><path fill='none' stroke='#3a1d0b' stroke-width='.9' stroke-linecap='round' d='M14.8 13.6V18M18.4 15V18.4M22 16.2V18.8'/>"),13,4),
 // 可拖曳的物件：張開的手（代表「可以抓起來」）
 h:svgCur(SV("<path fill='#c2571a' stroke='white' stroke-width='1.8' stroke-linejoin='round' d='M8.6 17V9.6a1.8 1.8 0 0 1 3.6 0V15V6.8a1.8 1.8 0 0 1 3.6 0V15V7.6a1.8 1.8 0 0 1 3.6 0V15.4V10.2a1.8 1.8 0 0 1 3.6 0V20.4c0 4.6-3 7.9-7.6 7.9h-1c-3 0-4.8-1.6-6.4-4l-3.4-5.4a1.9 1.9 0 0 1 3.1-2.2Z'/><path fill='none' stroke='#3a1d0b' stroke-width='.9' stroke-linecap='round' d='M12.2 11V15.6M15.8 9V15.6M19.4 11V15.8'/>"),16,15),
 // 拖曳中：握住的手
 g:svgCur(SV("<path fill='#c2571a' stroke='white' stroke-width='1.8' stroke-linejoin='round' d='M8.4 15.4a1.9 1.9 0 0 1 3.8-.6a1.9 1.9 0 0 1 3.8-.4a1.9 1.9 0 0 1 3.8 .2a1.9 1.9 0 0 1 3.8 .8V21.4c0 4-3 6.9-7.3 6.9h-1.2c-3 0-4.9-1.5-6.3-3.8l-2.4-3.8a1.9 1.9 0 0 1 3.2-2Z'/><path fill='none' stroke='#3a1d0b' stroke-width='.9' stroke-linecap='round' d='M12.2 14.8v2.6M16 14.4v2.6M19.8 14.6v2.6'/>"),16,18)};
function applyCursors(){const R2=document.documentElement;R2.classList.add('cur');R2.style.setProperty('--cur-d',GC.d);R2.style.setProperty('--cur-p',GC.p);R2.style.setProperty('--cur-g',GC.g);}
(function(){const st=document.createElement('style');st.textContent='html.cur,html.cur *{cursor:var(--cur-d)}html.cur a,html.cur button,html.cur summary,html.cur select,html.cur input[type=range],html.cur input[type=file],html.cur label{cursor:var(--cur-p)}';document.head.appendChild(st);
 const ld=(src,k)=>{if(src)GC[k]='url("'+src+'") 0 0, auto';};ld(CURSOR_SRC.d,'d');ld(CURSOR_SRC.p,'p');ld(CURSOR_SRC.g,'g');ld(CURSOR_SRC.h,'h');applyCursors();
 const cr=document.createElement('div');cr.className='row';cr.innerHTML='游標圖片（PNG，建議 32×32，尖端放左上角）：一般<input type="file" accept="image/*" data-c="d"> 可點擊<input type="file" accept="image/*" data-c="p"> 可拖曳物件<input type="file" accept="image/*" data-c="h"> 抓取中<input type="file" accept="image/*" data-c="g"> <button id="curClr">還原預設游標</button>';
 $('imp').appendChild(cr);
 cr.querySelectorAll('input[type=file]').forEach(inp=>{inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;const im=await readImg(f);if(!im)return;const k=document.createElement('canvas'),m=Math.min(64,Math.max(im.width,im.height)),sc2=m/Math.max(im.width,im.height);k.width=Math.round(im.width*sc2);k.height=Math.round(im.height*sc2);k.getContext('2d').drawImage(im,0,0,k.width,k.height);GC[inp.dataset.c]='url("'+k.toDataURL('image/png')+'") 0 0, auto';applyCursors();};});
 $('curClr').onclick=()=>{location.reload();};})();
// 創作者模式：連點標題 5 次（或網址加 #edit）才會顯示匯入面板，一般玩家看不到
// 只存密語的 SHA-256 雜湊（不是真正的安全機制，只是讓一般玩家看不到創作者工具）
const OWN_HASH='c7dc9c9f343f409b5ee35dfb7a35e523feee3fc113bcdfd64db1069c855dd317';
function sha256(str){const P=[];for(let c=2;P.length<64;c++)if(P.every(p=>c%p))P.push(c);const K=P.map(p=>(Math.cbrt(p)%1)*4294967296|0);let H=P.slice(0,8).map(p=>(Math.sqrt(p)%1)*4294967296|0);
 const b=new TextEncoder().encode(str),l=b.length,n=((l+9+63)>>6)<<6,m=new Uint8Array(n);m.set(b);m[l]=128;const dv=new DataView(m.buffer);dv.setUint32(n-4,l*8);const w=new Int32Array(64);
 for(let i=0;i<n;i+=64){for(let t=0;t<16;t++)w[t]=dv.getUint32(i+t*4);for(let t=16;t<64;t++){const a=w[t-15],c=w[t-2];w[t]=(w[t-16]+((a>>>7|a<<25)^(a>>>18|a<<14)^(a>>>3))+w[t-7]+((c>>>17|c<<15)^(c>>>19|c<<13)^(c>>>10)))|0;}
  let[A,B2,C,D,E,F,G,Hh]=H;for(let t=0;t<64;t++){const t1=(Hh+((E>>>6|E<<26)^(E>>>11|E<<21)^(E>>>25|E<<7))+((E&F)^(~E&G))+K[t]+w[t])|0,t2=(((A>>>2|A<<30)^(A>>>13|A<<19)^(A>>>22|A<<10))+((A&B2)^(A&C)^(B2&C)))|0;Hh=G;G=F;F=E;E=(D+t1)|0;D=C;C=B2;B2=A;A=(t1+t2)|0;}
  H=[A,B2,C,D,E,F,G,Hh].map((v,i)=>(v+H[i])|0);}return H.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');}
(()=>{try{const q=new URLSearchParams(location.search).get('owner');if(q&&q!=='off'&&sha256(q)===OWN_HASH){localStorage.setItem('qlz-owner','1');history.replaceState(null,'',location.pathname+location.hash);}else if(q==='off'){localStorage.removeItem('qlz-owner');history.replaceState(null,'',location.pathname+location.hash);}}catch(e){}})();
const IS_OWNER=(()=>{try{return localStorage.getItem('qlz-owner')==='1';}catch(e){return false;}})();
const showEdit=()=>{const d=$('imp');d.style.display=d.style.display=='none'?'':'none';$('imp3').style.display=d.style.display;};
if(IS_OWNER){const ob=document.createElement('button');ob.textContent='🛠️ 創作者';ob.style.cssText='position:fixed;left:10px;bottom:10px;z-index:1000;opacity:.85;padding:6px 10px;border-radius:999px;border:1px solid #8886;background:var(--card);color:var(--fg);font-size:12px;cursor:pointer';ob.onclick=showEdit;document.body.appendChild(ob);}// ===== 共用確認視窗（離開關卡、重新開始、不完美也要繼續時使用）=====
function confirmBox(text,okL,noL,onOk,onNo){$('cfmT').textContent=text;$('cfmOk').innerHTML=esc(okL||tr('確定'));$('cfmNo').innerHTML=icon('back')+esc(noL||tr('取消'));$('cfm').hidden=false;sfx.question();
 $('cfmOk').onclick=()=>{$('cfm').hidden=true;sfx.click();if(onOk)onOk();};$('cfmNo').onclick=()=>{$('cfm').hidden=true;sfx.click();if(onNo)onNo();};}
// ===================== 玩家存檔（全遊戲共用）=====================
// 金幣、各關最佳星數、完成紀錄、徽章、購買紀錄、物件擁有與配置，全部存在 localStorage 的 'qlz-save-v1'。
// 重新整理、換頁、重新進入遊戲都會保留；重玩關卡只會「更新最佳紀錄」，不會清掉徽章或物件。
const SAVE_KEY='qlz-save-v1';
const SAVE=(()=>{const d={v:1,coins:0,best:{},done:{},badges:{},owned:{},equip:{},log:[],ex:{}};try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&typeof s==='object')for(const k in d)if(s[k]!=null&&typeof s[k]===typeof d[k])d[k]=s[k];}catch(e){}return d;})();
function saveGame(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}updCoins();}
// 保險：關閉或重新整理頁面前再存一次
addEventListener('pagehide',()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE));}catch(e){}});
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&e.newValue){try{Object.assign(SAVE,JSON.parse(e.newValue));updCoins();}catch(_){}}});
// 關卡獎勵：依「最佳星數」發放，重玩只會補發「比之前更好」的差額，不能重複刷金幣
const LV_REWARD=[[0,60,100,150],[0,40,70,100],[0,40,70,100],[0,40,70,100]];
const LV_NAME=['小吃店騎樓','住宅騎樓','超市外騎樓','住宅區往公園的騎樓'];
function levelDone(i,stars,ctx){const prev=SAVE.best[i]||0,s=Math.max(0,Math.min(3,stars|0));const gain=Math.max(0,LV_REWARD[i][s]-LV_REWARD[i][prev]);
 SAVE.best[i]=Math.max(prev,s);if(!SAVE.done[i])SAVE.done[i]=Date.now();SAVE.coins+=gain;const nb=checkBadges(Object.assign({lv:i,stars:s},ctx||{}));saveGame();return{gain,nb,best:SAVE.best[i]};}
// ---- 徽章資料（可擴充：新增一筆即可；img 欄位預留給之後的正式徽章圖檔，目前用圖示代替）----
const BADGES=[
 {id:'lv1_done',ic:'🏮',img:null,name:'第一個委託',cond:'完成第一關「小吃店騎樓」',desc:'幫小吃店老闆把店門口整理好，踏出改善騎樓的第一步。',test:()=>!!SAVE.done[0]},
 {id:'lv1_2',ic:'🏅',img:null,name:'騎樓小幫手',cond:'第一關拿到 2 顆星以上',desc:'客人坐得下、行人走得過，你是騎樓的好幫手。',test:()=>(SAVE.best[0]||0)>=2},
 {id:'lv1_3',ic:'🏆',img:null,name:'騎樓守護者',cond:'第一關拿到 3 顆星',desc:'通道、座位、出餐的路、停車都照顧到了，完美的配置！',test:()=>(SAVE.best[0]||0)>=3},
 {id:'smooth',ic:'🚶',img:null,name:'一路暢通',cond:'第一關試走時，三位行人都順利通過',desc:'推嬰兒車的媽媽、拄拐杖的阿嬤、牽狗的小孩都走得很順。',test:c=>c.lv===0&&!!c.trialOk},
 {id:'careful',ic:'🎯',img:null,name:'眼明手快',cond:'完成第一關時，沒有任何物件疊在一起',desc:'每次放置前都先看好空間，一次就放對位置。',test:c=>c.lv===0&&!!c.noFail},
 {id:'door',ic:'🍜',img:null,name:'出餐好幫手',cond:'第一關午餐尖峰時，不靠虛線標記就找到老闆出餐的路',desc:'靠自己的觀察，發現店門口要留給老闆端麵。',test:c=>c.lv===0&&!!c.doorSelf},
 {id:'lv2_done',ic:'🌿',img:null,name:'長輩的好鄰居',cond:'完成第二關「住宅騎樓」',desc:'讓住在騎樓旁的長輩也能安心出門。',test:()=>!!SAVE.done[1]},
 {id:'lv3_done',ic:'🛒',img:null,name:'推車暢行',cond:'完成第三關「超市外騎樓」',desc:'把路面鋪平，嬰兒車和購物推車都推得過。',test:()=>!!SAVE.done[2]},
 {id:'lv4_done',ic:'🐕',img:null,name:'狗狗散步道',cond:'完成第四關「住宅區往公園的騎樓」',desc:'小孩和狗狗終於能順利走到公園。',test:()=>!!SAVE.done[3]},
 {id:'all',ic:'🗺️',img:null,name:'老街走透透',cond:'完成全部四個關卡',desc:'走過小吃店、住宅、超市到公園，每一段騎樓都更好走了。',test:()=>[0,1,2,3].every(i=>SAVE.done[i])},
 {id:'stars',ic:'⭐',img:null,name:'滿分達人',cond:'全部四個關卡都拿到 3 顆星',desc:'每一個委託都完成得漂漂亮亮！',test:()=>[0,1,2,3].every(i=>(SAVE.best[i]||0)>=3)},
 {id:'shop1',ic:'🛍️',img:null,name:'第一次採購',cond:'在物件商店買下第一件物件',desc:'用自己賺來的金幣，為騎樓添一件好物。',test:()=>Object.keys(SAVE.owned).length>=1},
 {id:'shop5',ic:'🎒',img:null,name:'收藏家',cond:'擁有 5 件以上的物件',desc:'物件庫越來越豐富，可以搭配出更多種騎樓。',test:()=>Object.keys(SAVE.owned).length>=5}];
function checkBadges(ctx){const nb=[];BADGES.forEach(b=>{if(!SAVE.badges[b.id]&&b.test(ctx||{})){SAVE.badges[b.id]=Date.now();nb.push(b);}});return nb;}
// ---- 商店物件（type：u＝通用，l＝關卡限定，lv＝適用關卡 0～3；m3＝第一關 3D 造型；s／w＝2D 關卡的大小）----
const ITEMS=[
 {id:'u_plant',e:'🪴',name:'綠意盆栽',type:'u',lv:null,price:60,s:48,w:44,m3:'plant',desc:'放在牆邊，讓騎樓多一點綠意。'},
 {id:'u_bin',e:'🗑️',name:'分類垃圾桶',type:'u',lv:null,price:70,s:52,w:52,m3:'bin',desc:'垃圾有地方丟，騎樓更乾淨。'},
 {id:'u_sign',e:'🪧',name:'「行人優先」立牌',type:'u',lv:null,price:80,s:54,w:40,m3:'sign',desc:'提醒大家：騎樓要先讓路給行人。'},
 {id:'u_bench',e:'🪵',name:'木頭休息長椅',type:'u',lv:null,price:120,s:46,w:78,m3:'bench',desc:'讓走累的人坐下來歇一會兒。'},
 {id:'l1_menu',e:'📋',name:'麵攤菜單看板',type:'l',lv:0,price:90,m3:'menu',desc:'把菜單立在牆邊，客人一看就知道要點什麼。'},
 {id:'l1_lantern',e:'🏮',name:'紅燈籠立架',type:'l',lv:0,price:100,m3:'lantern',desc:'小吃店門口的招牌燈籠，晚上也很好認。'},
 {id:'l2_orchid',e:'🌸',name:'阿公的蘭花架',type:'l',lv:1,price:80,s:56,w:46,desc:'把長輩照顧的蘭花整齊擺好，不擋門口。'},
 {id:'l3_stroller',e:'🚼',name:'嬰兒車停靠牌',type:'l',lv:2,price:90,s:50,w:44,desc:'告訴大家嬰兒車可以停在這裡等。'},
 {id:'l4_bowl',e:'🥣',name:'狗狗喝水碗',type:'l',lv:3,price:60,s:38,w:44,desc:'散步途中讓狗狗喝口水。'}];
const usableIn=(it,lv)=>it.type==='u'||it.lv===lv;
const lvTitle=i=>tr('第 {n} 關',{n:i+1})+'・'+tr(LV_NAME[i]);
const itemLevels=it=>it.type==='u'?tr('所有可以擺放物件的關卡'):lvTitle(it.lv);
// 2D 關卡：已配置、而且適用這一關的物件
const equippedFor=lv=>ITEMS.filter(it=>SAVE.owned[it.id]&&SAVE.equip[it.id]&&usableIn(it,lv));
function buyItem(id){const it=ITEMS.find(x=>x.id===id);if(!it)return{err:'none'};if(SAVE.owned[id])return{err:'owned'};if(SAVE.coins<it.price)return{err:'poor'};
 SAVE.coins-=it.price;SAVE.owned[id]=Date.now();SAVE.log.push({id,price:it.price,t:Date.now()});const nb=checkBadges({});saveGame();return{ok:1,nb};}
function setEquip(id,on){if(!SAVE.owned[id])return false;SAVE.equip[id]=!!on;saveGame();if(typeof buildPal==='function'&&S&&stage===3)buildPal();return true;}
// ---- 提示：獲得金幣、徽章 ----
let gToastQ=[],gToastOn=false;
function gToast(html,snd){gToastQ.push([html,snd]);if(!gToastOn)gNext();}
function gNext(){const it=gToastQ.shift();if(!it){gToastOn=false;return;}gToastOn=true;const e=$('gToast');e.innerHTML=it[0];e.classList.remove('show');void e.offsetWidth;e.classList.add('show');if(it[1]&&sfx[it[1]])sfx[it[1]]();setTimeout(()=>{e.classList.remove('show');setTimeout(gNext,300);},2600);}
function announce(r){if(r.gain)gToast(icon('coin')+esc(tr('獲得 {n} 金幣',{n:r.gain})),'coinGet');if((r.nb||[]).length)setTimeout(()=>confetti(false),400);(r.nb||[]).forEach(b=>gToast('<span class="gtB">'+bIc(b)+'</span>'+esc(tr('獲得徽章：{n}',{n:tr(b.name)})),'thanks'));}
function updCoins(){animCoins();}

// ===================== 闖關手帳（階段式關卡地圖）=====================
// 四個故事關卡依序解鎖：第 1 關一開始就能玩，完成第 N 關才開放第 N+1 關；四關全部完成後出現「無限探索」。
// 版面：筆記本紙張（橫線、紅色邊線、裝訂孔）＋中間一條手繪道路串起關卡，兩側是貼著紙膠帶的手寫便條和鉛筆塗鴉。
const MAP_MEMO=['幫老闆清出走道，擺好桌椅，讓客人和路人都走得過。','幫長輩整理門口的盆栽雜物，出門不用再繞路。','把超市外的路面整平、貨箱收好，推車也推得過去。','清出通往公園的騎樓，讓小孩和狗狗安心散步。'];
const MAP_WHO=['小吃店老闆','老人（住戶）','超市店員','鄰居小孩'];
const lvUnlocked=i=>i===0||!!SAVE.done[i-1];
const allStoryDone=()=>[0,1,2,3].every(i=>SAVE.done[i]);
// 目前正在玩哪一關（-1＝沒有在玩）
function curLevel(){if($('st3').style.display==='block'&&Stage3D.busy())return 0;if($('game').style.display!=='none'&&S&&!story&&stage>=1&&stage<4)return lvIdx;return -1;}
function pgMap(){setTimeout(mapFill,0);return '<div class="nbMap" id="nbMap"></div>';}
// 鉛筆塗鴉（簡單線條，套上「手抖」濾鏡）
const DOODLE={
 bowl:'<path d="M4 26h52c-2 16-12 24-26 24S6 42 4 26z"/><path d="M14 22c-3-5 3-8 0-13M28 22c-3-5 3-8 0-13M42 22c-3-5 3-8 0-13"/><path d="M36 30 58 6M42 32 62 12"/>',
 house:'<path d="M8 28 32 8l24 20"/><path d="M13 25v27h38V25"/><path d="M27 52V38h10v14"/><path d="M18 32h6v6h-6z"/>',
 cart:'<path d="M2 10h8l7 28h32l6-20H13"/><circle cx="22" cy="46" r="4"/><circle cx="44" cy="46" r="4"/><path d="M20 24h30M22 31h26"/>',
 tree:'<path d="M32 58V34"/><path d="M32 36c-14 2-22-6-18-15 2-9 12-12 18-8 6-6 18-2 19 6 7 5 2 17-8 16-3 2-7 2-11 1z"/><path d="M24 58h16"/>',
 cloud:'<path d="M10 34c-8 0-8-12 0-12 0-9 12-12 16-5 4-8 18-6 18 3 9-1 11 14 1 14z"/>',
 star:'<path d="M30 6l6 15 16 1-12 10 4 16-14-9-14 9 4-16L8 22l16-1z"/>',
 heart:'<path d="M30 50C10 36 6 26 12 18c5-7 14-5 18 2 4-7 13-9 18-2 6 8 2 18-18 32z"/>',
 spiral:'<path d="M30 30c0-3 4-3 4 0 0 6-9 6-9 0 0-9 14-9 14 0 0 12-19 12-19 0 0-15 24-15 24 0"/>',
 paw:'<ellipse cx="30" cy="38" rx="10" ry="8"/><circle cx="16" cy="24" r="4"/><circle cx="25" cy="17" r="4"/><circle cx="36" cy="17" r="4"/><circle cx="45" cy="24" r="4"/>'};
const LV_DOODLE=[['bowl','cloud'],['house','heart'],['cart','star'],['tree','paw']];
function doodle(k,x,y,s,rot,cls){return '<g class="ddl '+(cls||'')+'" transform="translate('+x+','+y+') rotate('+(rot||0)+') scale('+(s||1)+')">'+DOODLE[k]+'</g>';}
// 通過每個點的平滑曲線（Catmull-Rom → 貝茲曲線）
function smoothPath(P){let d='M'+P[0][0]+' '+P[0][1];for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;
 const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];d+=' C'+c1.map(Math.round)+' '+c2.map(Math.round)+' '+p2.map(Math.round);}return d;}
function mapFill(){const box=$('nbMap');if(!box)return;const W=Math.max(300,box.clientWidth),wide=W>=600;
 const done=[0,1,2,3].filter(i=>SAVE.done[i]).length,cur=curLevel(),all=allStoryDone();
 const nextI=[0,1,2,3].find(i=>!SAVE.done[i]);
 const Y0=wide?262:300,STEP=wide?205:235;
 const nx=i=>Math.round(W*(wide?(i%2?.585:.415):(i%2?.31:.2)));
 const N=[0,1,2,3].map(i=>[nx(i),Y0+i*STEP]);
 const EX=[Math.round(W*(wide?.5:.25)),Y0+4*STEP+20],H=EX[1]+(wide?170:250);
 const startP=[Math.round(W*(wide?.5:.25)),wide?178:222];
 const road=smoothPath([startP,...N,EX]);
 // 已經走過的那一段（到最後一個完成的關卡）
 const reach=all?5:(nextI||0)+1,road2=smoothPath([startP,...N,EX].slice(0,reach+1));
 let svg='<svg class="nbSvg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><defs>'+
  '<filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>'+
  '<filter id="pencil2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>'+
  '<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="7" fill="#d9cfc0"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b9ab97" stroke-width="2.2"/></pattern>'+
  '<pattern id="hatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="7" fill="#f6c98e"/><line x1="0" y1="0" x2="0" y2="7" stroke="#e7a65c" stroke-width="2.2"/></pattern></defs>'+
  '<g filter="url(#pencil)"><path d="'+road+'" class="rdEdge"/><path d="'+road+'" class="rdFill"/><path d="'+road2+'" class="rdDone"/><path d="'+road+'" class="rdMid"/></g>';
 // 起點小旗子
 svg+='<g filter="url(#pencil2)" class="flag" transform="translate('+(startP[0]-6)+','+(startP[1]-58)+')"><path d="M6 58V4"/><path d="M6 6c10-5 18 5 30 0v20c-12 5-20-5-30 0z" class="flagF"/></g>';
 // 兩側塗鴉
 svg+='<g filter="url(#pencil2)">';
 if(wide){N.forEach(([x,y],i)=>{const left=i%2===0;const dx=left?W*.27:W*.73,[a,b]=LV_DOODLE[i];svg+=doodle(a,Math.round(dx-34),y-60,1.15,left?-6:5)+doodle(b,Math.round(dx+(left?-W*.17:W*.13)),y+20,.8,left?8:-8,'lite');});
  svg+=doodle('spiral',Math.round(W*.86),60,.8,0,'lite')+doodle('star',Math.round(W*.12),70,.7,-10,'lite')+doodle('star',Math.round(W*.8),EX[1]-10,.9,12)+doodle('cloud',Math.round(W*.13),EX[1]-40,1,0,'lite');}
 else{svg+=doodle('spiral',Math.round(W*.78),40,.7,0,'lite')+doodle('star',Math.round(W*.32),EX[1]+60,.7,10,'lite');}
 svg+='</g></svg>';
 let html=svg;
 // 標題
 html+='<div class="nbHead"><h3>'+esc(tr('騎樓闖關手帳'))+'</h3><p>'+esc(tr('依序完成四個故事關卡，解鎖「無限探索」！'))+'</p><div class="nbProg"><span>'+esc(tr('已完成 {n} / 4 關',{n:done}))+'</span><i><b style="width:'+(done/4*100)+'%"></b></i></div></div>';
 html+='<span class="nbStart" style="left:'+(startP[0]+(wide?26:22))+'px;top:'+(startP[1]-44)+'px">START</span>';
 // 關卡節點＋便條
 N.forEach(([x,y],i)=>{const d=!!SAVE.done[i],un=lvUnlocked(i),st=d?'done':un?'now':'lock',playing=cur===i;
  const stars=d?SAVE.best[i]||0:0;
  html+='<button class="nbNode '+st+'" data-mapgo="'+i+'" style="left:'+x+'px;top:'+y+'px" aria-label="'+esc(lvTitle(i))+'"><span class="nbNum">'+(st==='lock'?icon('lock'):(d?'★':i+1))+'</span>'+(st==='now'?'<em>'+esc(playing?tr('進行中'):'GO!')+'</em>':'')+'</button>';
  const cw=wide?Math.round(W*.3):Math.round(W*.55),cl=wide?(i%2===0?Math.round(W*.66):Math.round(W*.04)):Math.round(W*.42),rot=[-2,1.6,-1.2,2][i];
  html+='<div class="nbNote '+st+'" style="left:'+cl+'px;top:'+(y-(wide?62:70))+'px;width:'+cw+'px;--r:'+rot+'deg"><small>'+esc(tr('第 {n} 關',{n:i+1}))+'</small><b>'+esc(tr(LV_NAME[i]))+'</b>'+
   '<p>'+esc(st==='lock'?tr('完成第 {n} 關後開放',{n:i}):tr(MAP_MEMO[i]))+'</p>'+
   '<div class="nbMeta">'+(d?'<span class="nbStars">'+'★'.repeat(stars)+'<i>'+'★'.repeat(3-stars)+'</i></span>':'<span class="nbWho">'+esc(tr('委託人：{w}',{w:tr(MAP_WHO[i])}))+'</span>')+
   (st==='lock'?'':'<button class="btn chip '+(d?'':'pri')+'" data-mapgo="'+i+'">'+(d?icon('restart')+esc(tr('再玩一次')):icon('play')+esc(playing?tr('回到關卡'):tr('開始')))+'</button>')+'</div></div>';});
 // 無限探索
 const left=4-done;
 html+='<button class="nbEx '+(all?'open':'lock')+'" data-mapex="1" style="left:'+EX[0]+'px;top:'+EX[1]+'px"><span class="nbExIc">'+icon(all?'map':'lock')+'</span><b>'+esc(tr('無限探索'))+'</b><small>'+esc(all?tr('出發探索！'):tr('還差 {n} 關',{n:left}))+'</small></button>';
 html+='<div class="nbNote ex '+(all?'open':'lock')+'" style="left:'+(wide?Math.round(W*.62):Math.round(W*.42))+'px;top:'+(EX[1]-(wide?40:56))+'px;width:'+(wide?Math.round(W*.32):Math.round(W*.55))+'px;--r:1.5deg"><b>'+esc(tr('無限探索模式'))+'</b><p>'+esc(all?tr('在手繪的台灣騎樓街道裡自由散步：和路人聊天、撿垃圾、幫忙解決騎樓問題。'):tr('完成四個故事關卡，就能自由走進手繪的騎樓街道。'))+'</p></div>';
 box.style.height=H+'px';box.classList.toggle('narrow',!wide);box.innerHTML=html;
 box.querySelectorAll('[data-mapgo]').forEach(b=>b.onclick=e=>{e.stopPropagation();mapGo(+b.dataset.mapgo,b);});
 box.querySelector('[data-mapex]').onclick=e=>{e.stopPropagation();mapEx(e.currentTarget);};
 // 第一次看到四關都完成：解鎖動畫
 if(all&&!SAVE.ex.unlockSeen){SAVE.ex.unlockSeen=Date.now();saveGame();const ex=box.querySelector('.nbEx');ex.classList.add('justOpen');setTimeout(()=>confetti(true),300);sfx.allDone&&sfx.allDone();gToast(esc(tr('🎉 「無限探索」解鎖了！')));setTimeout(()=>ex.scrollIntoView({block:'center',behavior:'smooth'}),350);}
 else if(!all){const n=box.querySelector('.nbNode.now');if(n&&nextI>0)setTimeout(()=>n.scrollIntoView({block:'center'}),0);}}
function mapToast(h){if(gToastQ.some(q=>q[0]===h)||(gToastOn&&$('gToast').innerHTML===h))return;gToast(h);}
function shake(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}
function mapGo(i,el){if(!lvUnlocked(i)){shake(el);sfx.err&&sfx.err();mapToast(esc(tr('先完成第 {n} 關，才會開放這一關喔！',{n:i})));return;}
 const cur=curLevel();
 if(cur===i){closeApp();closeTabletHome();sfx.click();return;}           // 正在玩這一關：直接回去
 if(i===0&&!SAVE.done[0]){closeApp();closeTabletHome();sfx.click();          // 第一關還沒玩過：從開場劇情開始
  if($('title').style.display!=='none')$('startB').click();return;}
 const go=()=>replayLevel(i,true);
 if(inLevel())confirmBox(tr('現在離開，這一關目前的擺放和進度不會保存（金幣、徽章不受影響）。確定要去玩別的關卡嗎？'),tr('確定離開'),tr('留在這一關'),go);else go();}
function mapEx(el){const preview=!allStoryDone()&&IS_OWNER;if(!allStoryDone()&&!IS_OWNER){shake(el);sfx.err&&sfx.err();mapToast(esc(tr('完成四個故事關卡，就能解鎖「無限探索」！')));return;}
 sfx.click();if(typeof Explore!=='undefined'&&Explore.ready){const go=()=>{gToastQ.length=0;closeApp();closeTabletHome();Explore.start();if(preview)gToast(esc(tr('創作者預覽：還沒解鎖也可以先進來看看。')));};if(inLevel())confirmBox(tr('現在離開，這一關目前的擺放和進度不會保存（金幣、徽章不受影響）。確定要去玩別的關卡嗎？'),tr('確定離開'),tr('留在這一關'),go);else go();return;}
 detail('<span class="dtIc">'+icon('map')+'</span><h3>'+esc(tr('無限探索模式'))+'</h3><p>'+esc(tr('手繪騎樓街道正在施工中，下一個版本就能進去散步！'))+'</p>');}
addEventListener('resize',()=>{if(tabPage==='map')mapFill();});

// ===================== 無限探索模式（手繪水彩騎樓街景，第一人稱、左右滑動）=====================
// 只在「四個故事關卡都完成」後從關卡地圖進入（創作者模式可以預覽）。圖層在進入時才畫、離開時釋放。
const Explore=(()=>{
// ===================== 基本設定 =====================
// 世界座標：高度固定 720，寬度 WORLD。畫面依視窗高度縮放，所以手機、平板、電腦看到的比例一樣。
const H=720,BAY=330,X0=90,NB=8,WORLD=X0*2+BAY*NB;
const FH=94,BEAM=392,FLOOR=618,EDGE=652;          // 每層樓高、騎樓樑底、店面底、騎樓邊緣
const P_FAR=.35,P_FG=1.18;                         // 視差速度
const cv=document.getElementById('exCv'),ctx=cv.getContext('2d');
let cssW=0,cssH=0,dpr=1,sc=1,viewW=1280,S=1,camX=600,vel=0,t0=performance.now();
const L={};                                        // 預先畫好的圖層
// 固定亂數：每次重畫都一樣
let rs=1;const seed=n=>{rs=n*9301+49297;};
const R=()=>{rs|=0;rs=rs+0x6D2B79F5|0;let t=Math.imul(rs^rs>>>15,1|rs);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const rnd=(a,b)=>a+(b-a)*R();
// ===================== 顏色 =====================
const hex=c=>{c=c.replace('#','');return[0,2,4].map(i=>parseInt(c.substr(i,2),16));};
const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const shade=(c,f)=>toHex(hex(c).map(v=>f<0?v*(1+f):v+(255-v)*f));
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t));};
const cool=(c,k)=>mix(shade(c,-k*.45),'#5b4c78',k*.42);   // 陰影用偏紫的冷色，比較像水彩
const INK='#5a4535';
// ===================== 水彩筆觸工具 =====================
function wob(P,amp=2,step=22){const o=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],n=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/step));
 for(let k=0;k<n;k++){const t=k/n;o.push([a[0]+(b[0]-a[0])*t+rnd(-amp,amp),a[1]+(b[1]-a[1])*t+rnd(-amp,amp)]);}}return o;}
function path(c,P,close=true){c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(close)c.closePath();}
const rectP=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
// 一層主色＋兩層半透明疊色＋邊緣加深＝水彩暈染的感覺
function wash(c,P,col,o={}){const amp=o.amp??2.2;c.fillStyle=col;
 c.globalAlpha=o.a??.92;path(c,wob(P,amp));c.fill();
 for(let k=0;k<(o.n??2);k++){c.globalAlpha=.16;c.fillStyle=k?shade(col,.18):shade(col,-.12);path(c,wob(P,amp*1.6));c.fill();}
 c.globalAlpha=o.edge??.42;c.strokeStyle=shade(col,-.3);c.lineWidth=o.ew??1.7;path(c,wob(P,amp*.8));c.stroke();c.globalAlpha=1;}
function wrect(c,x,y,w,h,col,o){wash(c,rectP(x,y,w,h),col,o);}
function blob(c,x,y,r,col,a=.85){const P=[];const n=14;for(let i=0;i<n;i++){const t=i/n*Math.PI*2,rr=r*rnd(.78,1.12);P.push([x+Math.cos(t)*rr,y+Math.sin(t)*rr*.86]);}wash(c,P,col,{a,amp:1.4,step:10});}
// 鉛筆／墨線：微微抖動、畫兩次
function ink(c,P,o={}){c.strokeStyle=o.col||INK;c.lineWidth=o.w||1.4;c.lineCap='round';c.lineJoin='round';
 for(let k=0;k<(o.n||2);k++){c.globalAlpha=(o.a??.62)*(k?.45:1);c.beginPath();
  const Q=o.raw?P:wob(P,o.amp??.7,o.step??18);Q.forEach((p,i)=>{const x=p[0]+rnd(-.6,.6),y=p[1]+rnd(-.6,.6);i?c.lineTo(x,y):c.moveTo(x,y);});if(o.close!==false&&!o.open)c.closePath();c.stroke();}c.globalAlpha=1;}
const line=(c,x1,y1,x2,y2,o={})=>ink(c,[[x1,y1],[x2,y2]],Object.assign({open:true,raw:false,step:14},o));
const inkRect=(c,x,y,w,h,o={})=>ink(c,rectP(x,y,w,h),o);
function txt(c,s,x,y,size,col,o={}){c.save();c.font=(o.w||'900')+' '+size+'px '+(o.f||'"Noto Sans TC",sans-serif');c.textAlign=o.al||'center';c.textBaseline='middle';c.fillStyle=col;
 c.translate(x,y);c.rotate((o.rot||0)+rnd(-.02,.02));c.globalAlpha=.9;c.fillText(s,0,0);c.globalAlpha=.25;c.fillText(s,rnd(-1,1),rnd(-1,1));c.restore();}
function vtxt(c,s,x,y,size,col){[...s].forEach((ch,i)=>txt(c,ch,x,y+i*size*1.05,size,col));}
// 紙張紋理（細顆粒）
const GRAIN=(()=>{const g=document.createElement('canvas');g.width=g.height=220;const x=g.getContext('2d'),d=x.createImageData(220,220);
 for(let i=0;i<d.data.length;i+=4){const v=Math.random();d.data[i]=96;d.data[i+1]=66;d.data[i+2]=38;d.data[i+3]=v<.5?v*30:v*12;}x.putImageData(d,0,0);
 x.globalAlpha=.08;x.strokeStyle='#6b4a2a';for(let i=0;i<70;i++){x.beginPath();const a=Math.random()*220,b=Math.random()*220;x.moveTo(a,b);x.quadraticCurveTo(a+Math.random()*20,b+Math.random()*8,a+Math.random()*30-5,b+Math.random()*16-8);x.stroke();}return g;})();
// 讓顏色深淺不均（水彩積色）＋紙紋，只作用在已經上色的地方
function texturize(c,w,h,k=1){c.save();c.globalCompositeOperation='source-atop';
 for(let i=0;i<w*h/7000*k;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(18,80),d=R()<.55,g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,d?'rgba(120,60,20,.07)':'rgba(255,248,225,.05)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
 c.globalAlpha=.5;c.fillStyle=c.createPattern(GRAIN,'repeat');c.fillRect(0,0,w,h);c.restore();}
function layer(w,h=H){const k=document.createElement('canvas');k.width=Math.ceil(w*S);k.height=Math.ceil(h*S);const c=k.getContext('2d');c.scale(S,S);c.lineCap='round';return{k,c,w,h};}
// ===================== 天空（螢幕座標）=====================
function drawSky(){const {k,c}=L.sky=layer(viewW+40);seed(3);
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#9cc9e3');g.addColorStop(.42,'#cfe0dd');g.addColorStop(.7,'#f8dfb4');g.addColorStop(1,'#f6c995');c.fillStyle=g;c.fillRect(0,0,viewW+40,H);
 const s=c.createRadialGradient(viewW*.18,60,10,viewW*.18,60,420);s.addColorStop(0,'rgba(255,240,190,.9)');s.addColorStop(.35,'rgba(255,226,160,.35)');s.addColorStop(1,'rgba(255,220,160,0)');c.fillStyle=s;c.fillRect(0,0,viewW+40,H);
 for(let i=0;i<7;i++){const x=rnd(0,viewW+40),y=rnd(40,230),w=rnd(90,190);c.globalAlpha=.55;for(let j=0;j<6;j++){const g2=c.createRadialGradient(x+j*w*.18,y+rnd(-8,8),2,x+j*w*.18,y,rnd(26,46));g2.addColorStop(0,'rgba(255,253,246,.9)');g2.addColorStop(1,'rgba(255,253,246,0)');c.fillStyle=g2;c.fillRect(x-80+j*w*.18,y-60,160,120);}c.globalAlpha=1;}
}
// ===================== 遠景：山和後面的房子 =====================
function drawFar(){const w=viewW+(WORLD-viewW)*P_FAR+60;const {c}=L.far=layer(w);seed(5);
 const ridge=(base,amp,col,a)=>{const P=[[0,H]];for(let x=0;x<=w;x+=40)P.push([x,base-Math.sin(x/260)*amp-Math.sin(x/97)*amp*.35-rnd(0,8)]);P.push([w,H]);wash(c,P,col,{a,amp:3});};
 ridge(250,46,'#a9bfcf',.55);ridge(285,30,'#b8c8c9',.6);
 let x=-20;while(x<w){const bw=rnd(70,150),bh=rnd(110,250),col=[ '#d9c3c9','#cdbfd8','#e3cbb3','#c9cfd9'][Math.floor(rnd(0,4))];
  wrect(c,x,392-bh,bw,bh+40,col,{a:.75,edge:.25});
  for(let yy=392-bh+16;yy<392;yy+=28)for(let xx=x+10;xx<x+bw-14;xx+=22){c.globalAlpha=.25;c.fillStyle='#8c7f9c';c.fillRect(xx,yy,9,12);}c.globalAlpha=1;
  if(R()<.55){const tx=x+rnd(10,bw-40);wrect(c,tx,392-bh-26,30,24,'#b4bfd0',{a:.8,edge:.25});line(c,tx+4,392-bh-2,tx+4,392-bh+6,{a:.3});line(c,tx+26,392-bh-2,tx+26,392-bh+6,{a:.3});}
  if(R()<.3){line(c,x+bw*.7,392-bh,x+bw*.7,392-bh-38,{a:.35});line(c,x+bw*.7-10,392-bh-30,x+bw*.7+10,392-bh-30,{a:.35});}
  x+=bw+rnd(-10,14);}
 texturize(c,w,H,.6);}
// ===================== 主街：街屋、騎樓、店面 =====================
const BLD=[ // 每一間街屋：顏色、樓層（騎樓上面幾層）、一樓類型
 {col:'#f3d6a8',fl:2,type:'home'},
 {col:'#f0a77d',fl:3,type:'shutter',vs:['水電行','#3d7a8c']},
 {col:'#f0c25a',fl:2,type:'noodleL',vs:['麵','#c23b22'],lamp:1},
 {col:'#f0c25a',fl:2,type:'noodleR'},
 {col:'#93ccbd',fl:3,type:'scooter',laundry:1},
 {col:'#ec9f90',fl:2,type:'boxes',roofAdd:1},
 {col:'#a9bde0',fl:3,type:'half',vs:['家庭理髮','#8a4fa0']},
 {col:'#f2d6a6',fl:2,type:'home2'}];
const bx=i=>X0+i*BAY;
const HOT=[];                                       // 可以點的東西（世界座標）
function window_(c,x,y,w,h,kind,col){
 // 鐵窗外框（台灣街屋常見）
 if(kind==='grille'){wrect(c,x-6,y-8,w+12,h+18,shade(col,-.08),{a:.5,edge:.2});}
 wrect(c,x,y,w,h,'#5e728a',{a:.9});
 c.globalAlpha=.35;c.fillStyle='#dfeaf0';path(c,[[x+w*.15,y+h],[x+w*.55,y],[x+w*.75,y],[x+w*.35,y+h]]);c.fill();c.globalAlpha=1;
 inkRect(c,x,y,w,h,{a:.55});line(c,x+w/2,y,x+w/2,y+h,{a:.45});
 if(kind==='grille'){for(let xx=x-3;xx<=x+w+3;xx+=8)line(c,xx,y-6,xx,y+h+8,{col:'#4b3c33',a:.38,w:1.1,n:1});line(c,x-6,y+h*.5,x+w+6,y+h*.5,{a:.35,w:1.1});
  wash(c,[[x-12,y-8],[x+w+12,y-8],[x+w+4,y-22],[x-4,y-22]],'#8fae9c',{a:.85,edge:.35});
  if(R()<.7){for(let i=0;i<3;i++){const px=x+8+i*(w-16)/2;wrect(c,px-7,y+h+2,14,10,'#c06b45',{a:.9});blob(c,px,y+h-4,rnd(9,13),R()<.5?'#6fa86a':'#88b85c');}}}
 if(kind==='louver'){wrect(c,x,y,w,h,shade(col,-.18),{a:.95});for(let yy=y+6;yy<y+h;yy+=7)line(c,x+3,yy,x+w-3,yy,{a:.35,w:1,n:1});}}
function acUnit(c,x,y){wrect(c,x,y,58,36,'#ebe7df',{a:.95});inkRect(c,x,y,58,36,{a:.5});c.strokeStyle=INK;c.globalAlpha=.4;c.beginPath();c.arc(x+38,y+18,12,0,7);c.stroke();for(let yy=y+6;yy<y+32;yy+=5)line(c,x+5,yy,x+22,yy,{a:.3,w:1,n:1});c.globalAlpha=1;
 line(c,x+10,y+36,x+6,y+44,{a:.4});line(c,x+48,y+36,x+52,y+44,{a:.4});}
function vsign(c,x,y,text,bg){const sz=30,h=text.length*sz*1.05+26;line(c,x-24,y+10,x,y+10,{a:.6});line(c,x-24,y+h-12,x,y+h-12,{a:.6});
 wrect(c,x,y,46,h,bg,{a:.95});inkRect(c,x+4,y+4,38,h-8,{col:'#fff6e6',a:.6,w:1.2});vtxt(c,text,x+23,y+12+sz/2,sz,'#fff8ec');}
function building(c,i){const b=BLD[i],x=bx(i),w=BAY,top=BEAM-b.fl*FH-30;
 wrect(c,x,top,w,BEAM-top+30,b.col,{a:.95});
 wrect(c,x-6,top-12,w+12,16,shade(b.col,-.14),{a:.95});
 for(let f=1;f<=b.fl;f++){const y=BEAM-f*FH+4;line(c,x+4,y+FH-6,x+w-4,y+FH-6,{a:.22,w:1.2});
  const kinds=['grille','grille','plain','louver'];for(let k=0;k<2;k++){const ww=w/2-62,wx=x+30+k*(w/2),kind=kinds[Math.floor(rnd(0,4))];window_(c,wx,y+14,ww,FH-46,kind,b.col);
   if(R()<.4&&k===1)acUnit(c,wx+ww-40,y+FH-40);}}
 if(b.laundry){const y=BEAM-2*FH+20;line(c,x+24,y,x+w-24,y+4,{a:.6,open:true});['#f2f2ec','#e98b7a','#7fb2d9','#f2d06b','#f2f2ec'].forEach((cc,j)=>{const lx=x+44+j*52;wrect(c,lx,y+2,30,j%2?44:30,cc,{a:.95});});}
 // 頂樓：水塔、加蓋鐵皮、天線
 if(b.roofAdd){wash(c,[[x+40,top-12],[x+w-60,top-12],[x+w-60,top-70],[x+40,top-58]],'#9fb2b8',{a:.95});for(let xx=x+48;xx<x+w-60;xx+=12)line(c,xx,top-14,xx,top-62,{a:.3,w:1,n:1});}
 if(i%3!==1){const tx=x+w-90;wrect(c,tx,top-56,44,40,i%2?'#d8dde3':'#5e8fc7',{a:.95});inkRect(c,tx,top-56,44,40,{a:.45});line(c,tx+6,top-16,tx+6,top-10,{a:.5});line(c,tx+38,top-16,tx+38,top-10,{a:.5});}
 if(i%4===2){line(c,x+60,top-12,x+60,top-70,{a:.5});line(c,x+46,top-58,x+74,top-58,{a:.5});line(c,x+50,top-46,x+70,top-46,{a:.5});}
 // 騎樓天花板（暗）與店面（陰影裡）
 wrect(c,x,BEAM,w,26,cool(b.col,.7),{a:.97,edge:.25});
 wrect(c,x,BEAM+26,w,FLOOR-BEAM-26,cool(b.col,.45),{a:.97,edge:.2});
 if(b.vs)vsign(c,x+w-60,BEAM-b.fl*FH+10,b.vs[0],b.vs[1]);}
function floorBand(c){const g=['#dcc8a8','#d4bea0'];for(let i=0;i<NB;i++)wrect(c,bx(i),FLOOR,BAY,EDGE-FLOOR,g[i%2],{a:.97,edge:.2});
 for(let x=X0;x<X0+BAY*NB;x+=34)line(c,x,FLOOR+2,x-8,EDGE-2,{a:.18,w:1,n:1});line(c,X0,FLOOR+17,X0+BAY*NB,FLOOR+17,{a:.18,w:1});
 wrect(c,X0-10,EDGE,BAY*NB+20,12,'#b9a68b',{a:.97});line(c,X0-10,EDGE,X0+BAY*NB+10,EDGE,{a:.4});}
// ---- 一樓各種店面 ----
function homeFront(c,x,col,v){const dx=x+60,dw=BAY-120;wrect(c,dx,BEAM+50,dw,FLOOR-BEAM-50,v?'#7aa58c':'#5f8f7a',{a:.97});
 for(let i=1;i<4;i++)line(c,dx+dw*i/4,BEAM+54,dx+dw*i/4,FLOOR-4,{a:.45});for(let y=BEAM+80;y<FLOOR;y+=36){ink(c,[[dx+dw/2,y-14],[dx+dw/2+14,y],[dx+dw/2,y+14],[dx+dw/2-14,y]],{a:.4,w:1.2});}
 inkRect(c,dx,BEAM+50,dw,FLOOR-BEAM-50,{a:.55});
 // 門口盆栽、拖鞋
 [[x+30,FLOOR+6,'#6fa86a'],[x+BAY-40,FLOOR+4,'#8bbf6a']].forEach(([px,py,g])=>{wrect(c,px-14,py-24,28,26,'#c26b45',{a:.95});blob(c,px,py-44,24,g);blob(c,px+10,py-58,14,shade(g,.15));});
 wrect(c,x+150,FLOOR+8,16,7,'#e05a4a',{a:.9});wrect(c,x+170,FLOOR+10,16,7,'#4a90c9',{a:.9});}
function shutter(c,x,half){const sx=x+40,sw=BAY-80,top=BEAM+40,bot=half?BEAM+150:FLOOR;
 if(half){wrect(c,sx,top,sw,FLOOR-top,'#4d4558',{a:.95});// 半開：裡面暗暗的，有一台腳踏車
  c.globalAlpha=.75;c.strokeStyle='#2f2a3a';c.lineWidth=3;[[x+120,FLOOR-24],[x+200,FLOOR-24]].forEach(([wx,wy])=>{c.beginPath();c.arc(wx,wy,22,0,7);c.stroke();});ink(c,[[x+120,FLOOR-24],[x+150,FLOOR-56],[x+190,FLOOR-56],[x+200,FLOOR-24],[x+160,FLOOR-24],[x+150,FLOOR-56]],{col:'#c9a64a',w:3,a:.9,open:true});c.globalAlpha=1;}
 wrect(c,sx,top,sw,bot-top,'#b9c3cc',{a:.96});for(let y=top+6;y<bot;y+=9)line(c,sx+2,y,sx+sw-2,y,{a:.3,w:1,n:1});inkRect(c,sx,top,sw,bot-top,{a:.5});
 wrect(c,sx-8,top-14,sw+16,18,'#8d98a3',{a:.95});
 if(!half){wrect(c,x+BAY/2-46,BEAM+120,92,62,'#fffaf0',{a:.97});txt(c,'店面出租',x+BAY/2,BEAM+151,21,'#c23b22');line(c,x+BAY/2-40,BEAM+118,x+BAY/2-30,BEAM+124,{col:'#e8d48a',w:5,a:.8});}}
function scooter(c,x,y,s=1,col='#e47d6a'){c.save();c.translate(x,y);c.scale(s,s);
 const wh=(wx)=>{c.globalAlpha=.9;c.fillStyle='#3c3532';c.beginPath();c.arc(wx,-20,20,0,7);c.fill();c.fillStyle='#cfc8c0';c.beginPath();c.arc(wx,-20,8,0,7);c.fill();c.globalAlpha=1;};
 wh(-62);wh(64);
 wash(c,[[-92,-36],[-30,-44],[10,-30],[40,-34],[60,-70],[80,-110],[96,-108],[84,-60],[90,-34],[40,-20],[-80,-22]],col,{a:.96});
 wash(c,[[-88,-48],[-20,-56],[-14,-44],[-86,-38]],'#3a3330',{a:.95});         // 座墊
 line(c,80,-110,66,-138,{w:3,a:.8});line(c,56,-140,82,-136,{w:4,a:.85});wrect(c,84,-102,14,12,'#fff3c4',{a:.95});   // 龍頭、車燈
 wrect(c,-104,-60,24,18,'#d8d2c8',{a:.9});c.restore();}
function boxes(c,x){const B=[[x+40,FLOOR+30,90,62],[x+130,FLOOR+30,74,54],[x+60,FLOOR-32,72,50],[x+210,FLOOR+30,60,44],[x+140,FLOOR-24,56,40]];
 B.forEach(([bx_,by,w,h])=>{wrect(c,bx_,by-h,w,h,'#d8a66a',{a:.97});line(c,bx_+w/2,by-h,bx_+w/2,by,{col:'#b9874e',a:.55,w:3});inkRect(c,bx_,by-h,w,h,{a:.5});});
 HOT.push({x:x+40,y:FLOOR-82,w:230,h:112,who:'think',lines:['紙箱堆了好久，走道只剩一半……','如果收進店裡或靠牆疊好，就好走多了。']});
 // 旁邊的大盆栽
 wrect(c,x+268,FLOOR+2,36,34,'#b65f3d',{a:.95});blob(c,x+286,FLOOR-36,30,'#5f9e64');blob(c,x+272,FLOOR-62,18,'#7cb867');}
// ---- 麵攤 ----
function noodle(c,x){const w=BAY*2;
 // 裡面亮亮的暖色牆
 wrect(c,x+14,BEAM+26,w-28,FLOOR-BEAM-26,'#efc68c',{a:.97,edge:.2});
 wrect(c,x+14,BEAM+26,w-28,22,'#d9a46a',{a:.95});
 // 菜單看板
 wrect(c,x+300,BEAM+56,190,120,'#8a5a36',{a:.97});wrect(c,x+308,BEAM+64,174,104,'#fdf3df',{a:.97});
 txt(c,'菜 單',x+395,BEAM+80,22,'#c23b22');[['陽春麵','35'],['乾　麵','40'],['餛飩湯','35'],['燙青菜','30']].forEach(([n,p],i)=>{txt(c,n,x+360,BEAM+102+i*18,16,'#4a3a2c');txt(c,p,x+452,BEAM+102+i*18,16,'#4a3a2c');});
 // 架子和碗
 wrect(c,x+520,BEAM+70,120,10,'#9b6b45',{a:.95});wrect(c,x+520,BEAM+120,120,10,'#9b6b45',{a:.95});
 for(let i=0;i<5;i++){wrect(c,x+528+i*22,BEAM+56,18,14,'#f6f1e8',{a:.95});wrect(c,x+528+i*22,BEAM+104,18,16,i%2?'#c9473a':'#e8dcc4',{a:.95});}
 // 飲料冰箱
 wrect(c,x+w-110,BEAM+60,84,FLOOR-BEAM-60,'#dfe8ec',{a:.97});wrect(c,x+w-102,BEAM+70,68,FLOOR-BEAM-100,'#9fc3d6',{a:.9});
 for(let r=0;r<4;r++)for(let k=0;k<4;k++){wrect(c,x+w-98+k*16,BEAM+78+r*32,10,24,['#e5574a','#f2c24c','#6fb36a','#f0f0e8'][(r+k)%4],{a:.95,edge:.2});}
 // 吊燈
 [x+200,x+430].forEach(lx=>{line(c,lx,BEAM+26,lx,BEAM+70,{a:.6});wash(c,[[lx-16,BEAM+86],[lx+16,BEAM+86],[lx+8,BEAM+70],[lx-8,BEAM+70]],'#d9533e',{a:.95});});
 // 老闆（站在攤車後面）
 person(c,x+130,FLOOR-30,SPEC.boss,0,1.02);
 HOT.push({x:x+90,y:FLOOR-200,w:90,h:120,who:'boss',name:'麵攤老闆',lines:['來喔！今天的湯頭熬了一整個早上！','桌子我都盡量靠牆擺，不要擋到大家走路。','吃麵嗎？陽春麵一碗三十五！']});
 // 攤車（不鏽鋼）
 wrect(c,x+50,FLOOR-110,200,140,'#c9cdd0',{a:.97});wrect(c,x+50,FLOOR-110,200,16,'#e7eaec',{a:.97});
 for(let i=0;i<6;i++)line(c,x+64+i*32,FLOOR-86,x+64+i*32,FLOOR+20,{col:'#ffffff',a:.45,w:2,n:1});
 wrect(c,x+62,FLOOR-80,90,40,'#f6efe0',{a:.9});for(let i=0;i<5;i++){c.globalAlpha=.7;c.strokeStyle='#e7b84a';c.lineWidth=2.4;c.beginPath();for(let k=0;k<6;k++)c.lineTo(x+70+i*16+Math.sin(k)*5,FLOOR-76+k*6);c.stroke();}c.globalAlpha=1;
 wrect(c,x+150,FLOOR-74,90,26,'#c23b22',{a:.95});txt(c,'現煮麵',x+195,FLOOR-61,20,'#fff4df');
 // 大鍋子
 [[x+92,'#9aa3a8'],[x+190,'#b8bec2']].forEach(([px,col])=>{wash(c,[[px-38,FLOOR-110],[px+38,FLOOR-110],[px+32,FLOOR-150],[px-32,FLOOR-150]],col,{a:.97});wrect(c,px-40,FLOOR-158,80,10,shade(col,.2),{a:.95});});
 STEAM.push([x+92,FLOOR-160],[x+190,FLOOR-160]);
 HOT.push({x:x+50,y:FLOOR-170,w:200,h:80,who:'think',lines:['好香！是大骨湯的味道。']});
 inkRect(c,x+50,FLOOR-110,200,140,{a:.5});
 // 騎樓上的桌椅（不鏽鋼桌＋紅色塑膠椅）
 [[x+330,0],[x+520,1]].forEach(([tx,k])=>{
  const stool=(sx,sy)=>{wash(c,[[sx-17,sy-34],[sx+17,sy-34],[sx+13,sy],[sx-13,sy]],'#d9473b',{a:.97});wrect(c,sx-19,sy-40,38,8,'#e85a48',{a:.97});};
  stool(tx-56,EDGE-6);stool(tx+56,EDGE-6);
  wrect(c,tx-58,FLOOR-24,116,9,'#d5dadd',{a:.97});line(c,tx-46,FLOOR-15,tx-52,EDGE-6,{w:2.6,a:.6});line(c,tx+46,FLOOR-15,tx+52,EDGE-6,{w:2.6,a:.6});
  wrect(c,tx-30,FLOOR-40,24,16,'#f4efe6',{a:.95});wrect(c,tx+8,FLOOR-38,22,14,'#f4efe6',{a:.95});line(c,tx-14,FLOOR-44,tx+8,FLOOR-56,{col:'#8a5a36',w:1.6,a:.7});
  if(k){wrect(c,tx-70,FLOOR-46,30,22,'#f0c94e',{a:.95});}});}
// ---- 柱子（另外一層，畫在路人前面）----
function columns(c){for(let i=0;i<=NB;i++){const x=bx(i)-18,col=BLD[Math.min(i,NB-1)].col;
  wrect(c,x,BEAM-8,36,EDGE-BEAM+6,shade(col,.12),{a:.97});
  wrect(c,x,BEAM-8,9,EDGE-BEAM+6,cool(col,.35),{a:.8,edge:.1});
  wrect(c,x,EDGE-74,36,72,i%2?'#a65c48':'#5f8a7c',{a:.95});   // 柱子下半部的磁磚
  for(let y=EDGE-70;y<EDGE;y+=10)line(c,x+2,y,x+34,y,{a:.25,w:1,n:1});
  inkRect(c,x,BEAM-8,36,EDGE-BEAM+6,{a:.5});}
 // 騎樓上方招牌（麵攤）
 const nx=bx(2)+40;wrect(c,nx,BEAM-70,BAY*2-80,58,'#c8402a',{a:.97});inkRect(c,nx+6,BEAM-64,BAY*2-92,46,{col:'#fff2dc',a:.7,w:1.6});
 txt(c,'巷 口 麵 攤',nx+(BAY*2-80)/2,BEAM-40,38,'#fff6e4');
 wrect(c,bx(1)+40,BEAM-58,BAY-80,42,'#4f8fa0',{a:.95});txt(c,'興隆水電',bx(1)+BAY/2,BEAM-37,28,'#f4fbff');
 wrect(c,bx(6)+40,BEAM-58,BAY-80,42,'#f0e6d2',{a:.95});txt(c,'理 髮',bx(6)+BAY/2,BEAM-37,28,'#7a3c8f');}
// ---- 光影：柱子投到地上和店面的影子、陽光 ----
function lightPass(c){c.save();c.globalCompositeOperation='multiply';c.fillStyle='#8b7aa6';
 for(let i=0;i<=NB;i++){const x=bx(i)+18;c.globalAlpha=.16;path(c,wob([[x,EDGE],[x,FLOOR],[x+60,FLOOR-120],[x+96,FLOOR-120],[x+52,FLOOR],[x+80,EDGE]],3));c.fill();}
 c.globalAlpha=.25;c.fillStyle='#9a88b8';c.fillRect(X0,BEAM,BAY*NB,40);c.restore();
 c.save();c.globalCompositeOperation='screen';for(let i=0;i<NB;i++){const x=bx(i)+90,g=c.createLinearGradient(x,FLOOR,x+120,EDGE);g.addColorStop(0,'rgba(255,214,140,.0)');g.addColorStop(.5,'rgba(255,214,140,.35)');g.addColorStop(1,'rgba(255,214,140,.0)');c.fillStyle=g;path(c,[[x,EDGE],[x+40,FLOOR],[x+190,FLOOR],[x+150,EDGE]]);c.fill();}
 [bx(2)+200,bx(2)+430].forEach(lx=>{const g=c.createRadialGradient(lx,BEAM+90,4,lx,BEAM+90,110);g.addColorStop(0,'rgba(255,214,140,.55)');g.addColorStop(1,'rgba(255,214,140,0)');c.fillStyle=g;c.fillRect(lx-110,BEAM-20,220,220);});c.restore();}
function drawMain(){HOT.length=0;STEAM.length=0;const {c}=L.main=layer(WORLD);seed(11);
 // 兩端的小巷
 wrect(c,0,250,X0+10,H,'#c9b9a3',{a:.95});blob(c,40,300,60,'#7fae6b');blob(c,20,240,44,'#93c07a');wrect(c,WORLD-X0-10,250,X0+10,H,'#c9b9a3',{a:.95});blob(c,WORLD-46,290,58,'#7fae6b');blob(c,WORLD-20,236,40,'#93c07a');
 for(let i=0;i<NB;i++)building(c,i);
 floorBand(c);
 BLD.forEach((b,i)=>{const x=bx(i);
  if(b.type==='home')homeFront(c,x,b.col,0);if(b.type==='home2')homeFront(c,x,b.col,1);
  if(b.type==='shutter')shutter(c,x,0);if(b.type==='half')shutter(c,x,1);
  if(b.type==='noodleL')noodle(c,x);
  if(b.type==='scooter'){homeFront(c,x,b.col,1);scooter(c,x+140,EDGE-2,1.05,'#7cc3b4');HOT.push({x:x+60,y:EDGE-150,w:220,h:150,who:'think',lines:['機車停在騎樓裡，行人只好走到馬路上……','之後的任務：幫忙把機車移到停車格！']});}
  if(b.type==='boxes'){homeFront(c,x,b.col,0);boxes(c,x);}});
 lightPass(c);texturize(c,WORLD,H);
 const k=layer(WORLD);L.cols=k;seed(21);columns(k.c);texturize(k.c,WORLD,H,.5);}
// ===================== 前景：馬路、電線桿、電線、停在路邊的機車 =====================
function drawFg(){const w=viewW+(WORLD-viewW)*P_FG+80;const {c}=L.fg=layer(w);seed(31);
 wash(c,[[0,664],[w,664],[w,H+10],[0,H+10]],'#8f929b',{a:.97,amp:1.5});
 for(let i=0;i<30;i++){c.globalAlpha=.08;c.fillStyle=R()<.5?'#fff':'#3b3a44';c.beginPath();c.ellipse(rnd(0,w),rnd(672,716),rnd(30,90),rnd(4,9),0,0,7);c.fill();}c.globalAlpha=1;
 for(let x=0;x<w;x+=120){wrect(c,x,660,120,12,(Math.floor(x/120)%5<2)?'#d9574a':'#e8c55a',{a:.95,amp:1});}
 line(c,0,660,w,660,{a:.5});
 for(let x=60;x<w;x+=260){wrect(c,x,700,110,8,'#f3efe6',{a:.8,amp:1});}
 // 電線桿＋電線
 const poles=[];for(let x=160;x<w;x+=1380)poles.push(x);
 const wires=(y0,sag,col)=>{for(let i=-1;i<poles.length;i++){const a=i<0?-200:poles[i],b=i+1<poles.length?poles[i+1]:w+200;c.strokeStyle=col;c.globalAlpha=.75;c.lineWidth=1.6;c.beginPath();c.moveTo(a,y0);c.quadraticCurveTo((a+b)/2,y0+sag,b,y0);c.stroke();}c.globalAlpha=1;};
 wires(46,60,'#3e3530');wires(62,70,'#3e3530');wires(30,48,'#5a4b40');
 poles.forEach(px=>{wash(c,[[px-12,-10],[px+12,-10],[px+16,H+10],[px-16,H+10]],'#b7b2aa',{a:.98,amp:1.2});wash(c,[[px-12,-10],[px-4,-10],[px-6,H+10],[px-16,H+10]],'#8f8a84',{a:.6,amp:1});
  wrect(c,px-60,40,120,10,'#6f6a66',{a:.95});wrect(c,px+14,90,34,56,'#9aa1a6',{a:.97});inkRect(c,px-16,-10,32,H+20,{a:.4});
  wrect(c,px-22,520,44,62,'#f6efe2',{a:.9});txt(c,'禁止',px,538,15,'#c23b22');txt(c,'停車',px,560,15,'#c23b22');});
 scooter(c,w*.63,726,1.25,'#f0a65a');
 // 左下角的大盆栽（前景，稍微暗一點）
 [[w*.12,H],[w*.78,H]].forEach(([px,py])=>{wrect(c,px-40,py-60,80,64,'#a75735',{a:.97});blob(c,px-20,py-100,44,'#4f8a58');blob(c,px+26,py-118,38,'#679e5f');blob(c,px,py-150,30,'#7bb06a');});
 texturize(c,w,H,.7);}
// ===================== 路人 =====================
const SPEC={
 boss:{skin:'#f3c9a0',hair:'#2f2622',top:'#f7f4ee',top2:'#5b8ac1',bot:'#4d5866',hat:'#ffffff',apron:1},
 gma:{skin:'#f2cba6',hair:'#c9c4c2',top:'#9b78b8',bot:'#5a5262',bun:1,cart:1},
 stu:{skin:'#f5cfa8',hair:'#2b2422',top:'#f8f8f2',bot:'#34507c',bag:'#f2c04a'}};
function person(c,x,y,s,frame,k=1){c.save();c.translate(x,y);c.scale(k,k);seedKeep(()=>{
 const sw=frame?6:-6;
 // 腿
 wash(c,rectP(-16+sw*.4,-58,13,56),s.bot,{a:.97,amp:1.2,step:10});wash(c,rectP(4-sw*.4,-58,13,56),shade(s.bot,-.1),{a:.97,amp:1.2,step:10});
 wrect(c,-19+sw*.4,-6,18,8,'#3a3330',{a:.95,amp:1});wrect(c,3-sw*.4,-6,18,8,'#3a3330',{a:.95,amp:1});
 if(s.bag)wrect(c,-36,-122,22,48,s.bag,{a:.97,amp:1.2});
 // 身體
 wash(c,[[-28,-126],[28,-126],[32,-56],[-32,-56]],s.top,{a:.97,amp:1.3,step:12});
 if(s.top2){wash(c,[[-28,-126],[-14,-126],[-16,-92],[-30,-92]],s.top2,{a:.95,amp:1});wash(c,[[14,-126],[28,-126],[30,-92],[16,-92]],s.top2,{a:.95,amp:1});}
 if(s.apron)wrect(c,-20,-104,40,48,'#f0ebe2',{a:.95,amp:1});
 // 手
 line(c,-30,-118,-38-sw*.5,-80,{col:s.skin,w:9,a:.95,n:1});line(c,30,-118,38+sw*.5,-80,{col:s.skin,w:9,a:.95,n:1});
 // 頭
 c.fillStyle=s.skin;c.globalAlpha=.97;c.beginPath();c.arc(0,-150,24,0,7);c.fill();c.globalAlpha=1;
 c.fillStyle=s.hair;c.globalAlpha=.95;c.beginPath();c.arc(0,-156,24.5,Math.PI*1.02,Math.PI*1.98);c.lineTo(22,-150);c.quadraticCurveTo(0,-168,-22,-150);c.fill();
 if(s.bun){c.beginPath();c.arc(0,-182,11,0,7);c.fill();}c.globalAlpha=1;
 if(s.hat){wrect(c,-22,-190,44,20,s.hat,{a:.97,amp:1});wrect(c,-25,-175,50,8,s.hat,{a:.97,amp:1});}
 c.fillStyle='#3a2a22';c.beginPath();c.arc(-8,-148,2.6,0,7);c.arc(8,-148,2.6,0,7);c.fill();
 c.fillStyle='rgba(240,120,110,.45)';c.beginPath();c.arc(-13,-140,4.5,0,7);c.arc(13,-140,4.5,0,7);c.fill();
 c.strokeStyle='#5a3a2c';c.lineWidth=1.6;c.beginPath();c.arc(0,-142,4,.2,Math.PI-.2);c.stroke();
 ink(c,[[-28,-126],[28,-126],[32,-56],[-32,-56]],{a:.35,w:1.2});
 c.strokeStyle=INK;c.globalAlpha=.4;c.lineWidth=1.3;c.beginPath();c.arc(0,-150,24,0,7);c.stroke();c.globalAlpha=1;
 if(s.cart){wash(c,rectP(36,-86,44,60),'#d9534a',{a:.95,amp:1.2});for(let i=0;i<4;i++)line(c,36,-80+i*14,80,-80+i*14,{col:'#fff',a:.5,w:2,n:1});line(c,40,-86,32,-118,{a:.7,w:2});
  c.fillStyle='#3a3330';c.beginPath();c.arc(46,-14,8,0,7);c.arc(72,-14,8,0,7);c.fill();blob(c,52,-94,10,'#6fb36a');blob(c,66,-96,9,'#88c26a');}
 });c.restore();}
// 畫人物時不要打亂場景的亂數
function seedKeep(f){const keep=rs;f();rs=keep;}
// 預先畫好路人的兩個走路影格
function sprite(spec,frame){const k=document.createElement('canvas'),w=200,h=230;k.width=w*S;k.height=h*S;const c=k.getContext('2d');c.scale(S,S);seed(frame?77:66);person(c,80,222,spec,frame);return{k,w,h,ax:80,ay:222};}
const WALK=[
 {spec:'gma',name:'推菜籃車的阿嬤',x:bx(5)+60,min:bx(3)+260,max:bx(6)+200,dir:-1,speed:26,stopAt:bx(4)+272,lines:['這台機車停在這裡，我都快沒辦法走路了！','推菜籃車還要繞到馬路上，好危險喔。']},
 {spec:'stu',name:'放學的學生',x:bx(0)+140,min:bx(0)+60,max:bx(2)+10,dir:1,speed:46,lines:['這些紙箱堆在那裡好久了。','下雨天這邊都會積水，好難走喔！','我每天都經過這家麵攤，好香喔！']}];
const STEAM=[];
// ===================== 版面與重畫 =====================
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);cssW=innerWidth;cssH=innerHeight;cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
 sc=cssH*dpr/H;viewW=cssW/cssH*H;S=Math.min(cssH*dpr/H,2,7600/WORLD);
 drawSky();drawFar();drawMain();drawFg();WALK.forEach(p=>{p.spr=[sprite(SPEC[p.spec],0),sprite(SPEC[p.spec],1)];});
 const pc=$('exPaper');pc.width=cssW;pc.height=cssH;const px=pc.getContext('2d');px.fillStyle=px.createPattern(GRAIN,'repeat');px.fillRect(0,0,cssW,cssH);
 clampCam();}
const maxCam=()=>Math.max(0,WORLD-viewW);
function clampCam(){camX=Math.max(0,Math.min(maxCam(),camX));}
// ===================== 每一幀 =====================
const motes=[...Array(46)].map(()=>({x:Math.random(),y:Math.random()*.7,r:Math.random()*2+1,s:Math.random()*.3+.1,p:Math.random()*7}));
let hold=0,last=performance.now(),walkPhase=0;
function frame(now){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-t0)/1000;
 if(hold)vel=hold*620;else if(!drag)vel*=Math.pow(.04,dt);
 const before=camX;camX+=vel*dt;clampCam();if(camX===0||camX===maxCam())vel*=.5;const moving=Math.abs(camX-before)/Math.max(dt,1e-3);
 walkPhase+=dt*Math.min(1,moving/300)*9;
 const bob=Math.sin(walkPhase)*1.6*Math.min(1,moving/300);
 ctx.setTransform(sc,0,0,sc,0,0);ctx.clearRect(0,0,viewW,H);
 ctx.drawImage(L.sky.k,-(camX*.04)%20,0,L.sky.w,H);
 ctx.drawImage(L.far.k,-camX*P_FAR,bob*.3,L.far.w,H);
 ctx.drawImage(L.main.k,-camX,bob,WORLD,H);
 // 麵攤蒸氣
 ctx.save();ctx.translate(-camX,bob);ctx.lineCap='round';
 STEAM.forEach(([sx,sy],j)=>{for(let k=0;k<3;k++){const ph=(t*.45+k/3+j*.17)%1;ctx.globalAlpha=(1-ph)*.75*Math.min(1,ph*5);ctx.strokeStyle='#fffaf2';ctx.lineWidth=7-ph*4;ctx.beginPath();
  for(let s=0;s<=10;s++){const yy=sy-ph*90-s*6,xx=sx+(k-1)*14+Math.sin(s*.7+t*2+k)*6*(1+ph);s?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}});
 ctx.globalAlpha=1;
 // 路人
 WALK.forEach(p=>{p.wait=Math.max(0,(p.wait||0)-dt);
  if(!p.wait&&!p.talk){p.x+=p.dir*p.speed*dt;if(p.x>p.max){p.x=p.max;p.dir=-1;p.wait=1.5;}if(p.x<p.min){p.x=p.min;p.dir=1;p.wait=1.5;}
   if(p.stopAt&&Math.abs(p.x-p.stopAt)<1.2&&!p.stopped){p.wait=3.2;p.stopped=1;setTimeout(()=>p.stopped=0,9000);}}
  const walking=!p.wait&&!p.talk,f=walking?Math.floor(t*4+p.min)%2:0,sp=p.spr[f],yb=walking?-Math.abs(Math.sin(t*8))*2.5:0;
  ctx.save();ctx.translate(p.x,EDGE-6+yb);ctx.scale(p.dir<0?-1:1,1);
  ctx.globalAlpha=.18;ctx.fillStyle='#3b2c4a';ctx.beginPath();ctx.ellipse(0,4-yb,38,7,0,0,7);ctx.fill();ctx.globalAlpha=1;
  ctx.drawImage(sp.k,-sp.ax,-sp.ay,sp.w,sp.h);ctx.restore();
  // 停下來時頭上冒「！」，提示可以點
  if(p.wait>0&&p.stopAt&&!p.talk){ctx.font='700 30px "Noto Sans TC",sans-serif';ctx.textAlign='center';ctx.fillStyle='#c2571a';ctx.fillText('！',p.x,EDGE-226+Math.sin(t*6)*3);}
  p.hit={x:p.x-40,y:EDGE-200,w:80,h:200};});
 ctx.restore();
 ctx.drawImage(L.cols.k,-camX,bob,WORLD,H);
 ctx.drawImage(L.fg.k,-camX*P_FG,bob*1.6,L.fg.w,H);
 // 陽光裡的灰塵亮點
 ctx.save();ctx.globalCompositeOperation='screen';motes.forEach(m=>{m.y-=m.s*dt*.03;if(m.y<-.02)m.y=.75;const x=((m.x*viewW*1.4-camX*.6*m.s)%(viewW+40)+viewW+40)%(viewW+40)-20;
  ctx.globalAlpha=.35+.35*Math.sin(t*1.7+m.p);ctx.fillStyle='#fff3c8';ctx.beginPath();ctx.arc(x,m.y*H,m.r,0,7);ctx.fill();});ctx.restore();
 // 左上角溫暖的光
 const g=ctx.createLinearGradient(0,0,viewW*.6,H*.7);g.addColorStop(0,'rgba(255,214,150,.22)');g.addColorStop(1,'rgba(255,214,150,0)');ctx.fillStyle=g;ctx.fillRect(0,0,viewW,H);
 placeBubble(bob);
 $('exL').classList.toggle('off',camX<=0.5);$('exR').classList.toggle('off',camX>=maxCam()-.5);
 raf=requestAnimationFrame(frame);}
// ===================== 對話泡泡 =====================
let bub=null,bubT=0;const cnt={};
function say(target,wx,wy){if(bub)bub.el.remove();const key=target.name||target.lines[0];cnt[key]=(cnt[key]||0);const line_=target.lines[cnt[key]%target.lines.length];cnt[key]++;
 const el=document.createElement('div');el.className='bub'+(target.who==='think'?' think':'');el.innerHTML=(target.name?'<b>'+esc(tr(target.name))+'</b>':'')+esc(tr(line_));$('exRoot').appendChild(el);
 bub={el,wx,wy,target};if(window.qSpeak&&target.who!=='think')qSpeak(tr(line_),whoKey(target.name||''),line_);clearTimeout(bubT);if(target.spec)target.talk=1;bubT=setTimeout(()=>{el.remove();if(bub&&bub.el===el){if(bub.target.spec)bub.target.talk=0;bub=null;}},3800);blip();}
function placeBubble(bob){if(!bub)return;const wx=bub.target.spec?bub.target.x:bub.wx;const sx=(wx-camX)*cssH/H,sy=(bub.wy+bob)*cssH/H;
 bub.el.style.left=Math.max(140,Math.min(cssW-140,sx))+'px';bub.el.style.top=Math.max(110,sy)+'px';const bw=bub.el.offsetWidth;if(bw)bub.el.style.setProperty('--tail',Math.max(26,Math.min(bw-26,sx-(cssW-bw)/2))+'px');}
// ===================== 操作 =====================
let drag=null;
cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,cx:camX,moved:0,t:performance.now(),lx:e.clientX};vel=0;cv.setPointerCapture(e.pointerId);cv.classList.add('drag');unlock();});
cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6)drag.moved=1;camX=drag.cx-dx*H/cssH;clampCam();const now=performance.now();vel=-(e.clientX-drag.lx)*H/cssH/Math.max(.008,(now-drag.t)/1000);drag.t=now;drag.lx=e.clientX;});
cv.addEventListener('pointerup',e=>{cv.classList.remove('drag');if(!drag)return;const d=drag;drag=null;if(d.moved)return;vel=0;
 const wx=e.clientX*H/cssH+camX,wy=e.clientY*H/cssH;
 const p=WALK.find(p=>p.hit&&wx>p.hit.x&&wx<p.hit.x+p.hit.w&&wy>p.hit.y&&wy<p.hit.y+p.hit.h);if(p){say(p,p.x,EDGE-215);return;}
 const h=HOT.find(h=>wx>h.x&&wx<h.x+h.w&&wy>h.y&&wy<h.y+h.h);if(h){say(h,h.x+h.w/2,h.y-6);return;}});
cv.addEventListener('pointercancel',()=>{drag=null;cv.classList.remove('drag');});
addEventListener('wheel',e=>{if(!active)return;vel+=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*6;},{passive:true});
addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){$('exBack').click();return;}if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')hold=1;if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')hold=-1;});
addEventListener('keyup',e=>{if(['ArrowRight','ArrowLeft','a','A','d','D'].includes(e.key))hold=0;});
const holdBtn=(id,d)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();hold=d;unlock();});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>{if(hold===d)hold=0;}));};
holdBtn('exL',-1);holdBtn('exR',1);
$('exBack').onclick=()=>{sfx.click();stop();openApp('map');};

// 小小的「啵」聲（程式合成，第一次觸碰後才會出聲）
function unlock(){audioInit();setTimeout(()=>{$('exHint').style.opacity=0;},4000);}
function blip(){sfx.talk&&sfx.talk();}
let rt=0;addEventListener('resize',()=>{if(!active)return;clearTimeout(rt);rt=setTimeout(()=>{if(active)resize();},200);});
// 等手寫字型載入後再畫（最多等 2.5 秒）
let active=false,raf=0;const fontReady=()=>Promise.race([Promise.all([document.fonts.load('900 30px "Noto Sans TC"'),document.fonts.load('16px "Noto Sans TC"')]).catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
function start(){if(active)return;active=true;document.body.classList.add('exploring');const root=$('exRoot');root.hidden=false;$('exLoad').classList.remove('hide');$('exHint').style.opacity=1;i18nDom();
 prevSong=typeof song!=='undefined'?song:null;playSong('story');
 fontReady().then(()=>{if(!active)return;resize();camX=bx(2)-120;clampCam();$('exLoad').classList.add('hide');last=performance.now();raf=requestAnimationFrame(frame);window.__exReady=true;});}
 function stop(){if(!active)return;active=false;cancelAnimationFrame(raf);window.__exReady=false;if(bub){bub.el.remove();bub=null;}hold=0;vel=0;for(const k in L)delete L[k];WALK.forEach(p=>{p.spr=null;p.talk=0;});$('exRoot').hidden=true;document.body.classList.remove('exploring');if(prevSong)playSong(prevSong);}
 let prevSong=null;
return {ready:true,start,stop,get active(){return active},canvas:()=>cv,dbg:{get camX(){return camX},set camX(v){camX=v;clampCam();},WALK,HOT,bx,WORLD}};
})();

// ===================== 第八輪：開始頁高度、停太久的引導 =====================
// 開始頁：量出標題區塊上方佔了多少空間，讓整個開始頁剛好放得進視窗
function fitTitle(){const t=$('title');if(!t||t.style.display==='none')return;t.style.setProperty('--tTop','0px');const top=t.getBoundingClientRect().top+scrollY;t.style.setProperty('--tTop',Math.max(0,Math.round(top))+'px');}
addEventListener('resize',fitTitle);setTimeout(fitTitle,0);setTimeout(fitTitle,600);
// 停太久沒操作：依目前的畫面給一句簡單、友善的提示；任何點擊或按鍵都會讓它消失，點擊本身照常生效
const IDLE_MS=7000;let idleT=Date.now(),idleOn=false;
const shown=id=>{const e=$(id);if(!e||!e.getClientRects().length)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&+cs.opacity>0.05;};
function idleMsg(){if(document.hidden||!$('cfm').hidden||!$('tabApp').hidden||(typeof Explore!=='undefined'&&Explore.active)||shown('introVid'))return null;
 if(shown('tut'))return '看完了嗎？按「開始！」就能動手囉！';
 if($('st3').style.display==='block'&&$('dlg3').classList.contains('on'))return '準備好了嗎？點一下對話框繼續！';
 if(shown('note'))return '準備好了嗎？按「接受委託」開始吧！';
 if(shown('phone')&&shown('phAccept'))return '準備好了嗎？按「接受委託」開始吧！';
 if($('phH').style.display==='flex'&&!phBrowse&&shown('hNotif'))return '有新的委託！點一下通知看看吧！';
 if(typeof story!=='undefined'&&story&&$('game').style.display!=='none')return '準備好了嗎？請點擊畫面繼續！';
 return null;}
function idleTick(){const m=idleMsg();const want=m&&Date.now()-idleT>IDLE_MS;const h=$('idleHint');
 if(want){h.querySelector('span').textContent=tr(m);if(!idleOn){idleOn=true;h.classList.add('on');}}else if(idleOn&&!m){idleOn=false;h.classList.remove('on');}}
function idleReset(){idleT=Date.now();if(idleOn){idleOn=false;$('idleHint').classList.remove('on');}}
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>addEventListener(ev,idleReset,{capture:true,passive:true}));
setInterval(idleTick,500);


// ===================== 第十一輪：版面配置（對話在下方、主要按鈕在右下、工具列在右上）=====================
// 2D：把「下一步、提示、玩法說明、靜音」搬到遊戲畫面下方右邊（同一個元素、同一個事件，只換位置）
(function(){const R=document.querySelector('#dock2 .dockR');['muteB','helpB','hintB','next'].forEach(id=>{const b=$(id);if(b&&R)R.appendChild(b);});
 $('dlg2').addEventListener('click',()=>{const r=cv.getBoundingClientRect();cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+r.width/2,clientY:r.top+r.height*.55,pointerType:'mouse',bubbles:true,isPrimary:true}));});})();
// 3D：對話便利貼放在遊戲畫面下方（手機橫放、高度不夠時放進右側任務欄）
function placeDlg3(){const d=$('dlg3');if(!d)return;if(innerHeight<=520){const sb=document.querySelector('#side3 .sideBody');if(sb&&d.parentElement!==sb)sb.prepend(d);}else{const c=document.querySelector('#st3 .ctl');if(c&&d.parentElement!==c)c.prepend(d);}}
placeDlg3();addEventListener('resize',placeDlg3);
// 2D：手機橫放（高度不夠）時，整條下方工具列（對話＋按鈕）移進右側任務欄
function placeDock2(){const d=$('dock2');if(!d)return;if(innerHeight<=520){const sb=document.querySelector('#side2 .sideBody');if(sb&&d.parentElement!==sb)sb.prepend(d);}else{const row=$('cWrap').closest('.playRow');if(row&&d.previousElementSibling!==row)row.after(d);}}
placeDock2();addEventListener('resize',placeDock2);
// 右上工具列不要蓋到資訊列：量出重疊的寬度，讓資訊列右邊留空
function fitFabs(){const f=$('fabs');if(!f)return;
 [document.querySelector('#st3 .hudRow'),$('hud')].forEach(h=>{if(!h)return;h.style.removeProperty('margin-left');h.style.removeProperty('max-width');if(!h.getClientRects().length||!f.getClientRects().length)return;
  const fr=f.getBoundingClientRect(),r=h.getBoundingClientRect();
  if(r.bottom>fr.top&&r.top<fr.bottom&&r.right>fr.left-8){h.style.setProperty('margin-left',Math.round(r.left)+'px','important');h.style.setProperty('max-width',Math.max(160,Math.floor(fr.left-10-r.left))+'px','important');}});
 // 關卡小貼紙
 const b=document.body;if($('st3').style.display==='block')b.dataset.lv='0';else if($('game').style.display!=='none'&&typeof S!=='undefined'&&S&&!story)b.dataset.lv=String(lvIdx);else delete b.dataset.lv;}
setInterval(fitFabs,400);addEventListener('resize',fitFabs);
// 「開始任務」按鈕放在遊戲框外：一般螢幕放在遊戲框正下方；高度不夠（手機橫放）時放進右側任務欄最下面
function placeGo(){const g=$('goBtn');if(innerHeight<=520){placeDock2();const R=document.querySelector('#dock2 .dockR');if(R&&g.parentElement!==R)R.appendChild(g);$('app').classList.remove('colSide');}
 else{const R=document.querySelector('#dock2 .dockR');if(R&&g.parentElement!==R)R.appendChild(g);}}
addEventListener('resize',()=>{if($('goBtn').style.display==='block')placeGo();});
// ===================== 左上角 Logo：回到主畫面（重新載入、跳過開場動畫；存檔在瀏覽器裡，不會不見）=====================
function goHome(){const go=()=>{try{sessionStorage.setItem('qlz-skipIntro','1');}catch(e){}try{saveGame();}catch(e){}location.reload();};
 sfx.click();if(inLevel())confirmBox(tr('要回到主畫面嗎？這一關目前的擺放和進度不會保存（金幣、徽章不受影響）。'),tr('回到主畫面'),tr('留在這裡'),go);else go();}
document.addEventListener('click',e=>{if(e.target.closest('.homeLogo')){e.preventDefault();goHome();}});
const ART={"badge": {"lv1_done": "images/icons/徽章_lv1_done.svg", "lv1_2": "images/icons/徽章_lv1_2.svg", "lv1_3": "images/icons/徽章_lv1_3.svg", "smooth": "images/icons/徽章_smooth.svg", "careful": "images/icons/徽章_careful.svg", "door": "images/icons/徽章_door.svg", "lv2_done": "images/icons/徽章_lv2_done.svg", "lv3_done": "images/icons/徽章_lv3_done.svg", "lv4_done": "images/icons/徽章_lv4_done.svg", "all": "images/icons/徽章_all.svg", "stars": "images/icons/徽章_stars.svg", "shop1": "images/icons/徽章_shop1.svg", "shop5": "images/icons/徽章_shop5.svg"}, "item": {"u_plant": "images/icons/物件_u_plant.svg", "u_bin": "images/icons/物件_u_bin.svg", "u_sign": "images/icons/物件_u_sign.svg", "u_bench": "images/icons/物件_u_bench.svg", "l1_menu": "images/icons/物件_l1_menu.svg", "l1_lantern": "images/icons/物件_l1_lantern.svg", "l2_orchid": "images/icons/物件_l2_orchid.svg", "l3_stroller": "images/icons/物件_l3_stroller.svg", "l4_bowl": "images/icons/物件_l4_bowl.svg"}, "rank": {"3": "images/icons/名次_3.svg", "2": "images/icons/名次_2.svg", "1": "images/icons/名次_1.svg"}};

// ===================== 第十三輪：精緻度升級（圖示、動畫、角色表現、音效、配音）=====================
// 這一段只加外觀、動畫和聲音；不改場景、擺放物件、關卡流程、判定與計分。
// ---- 徽章、商店物件改用手繪貼紙圖（tools/art.py 產生）----
BADGES.forEach(b=>{if(!b.img&&ART.badge[b.id])b.img=ART.badge[b.id];});
ITEMS.forEach(it=>{if(ART.item[it.id])it.img=ART.item[it.id];});
function bIc(b){return b.img?'<img alt="" src="'+b.img+'">':esc(b.ic);}
function iIc(it){return it.img?'<img alt="" src="'+it.img+'">':esc(it.e);}

// ---- 按鈕：按下時有點擊聲，放開時回彈（同一下點擊只響一次）----
(function(){const c0=sfx.click;let last=0;sfx.click=function(){const n=performance.now();if(n-last<120)return;last=n;return c0.apply(this,arguments);};
 const SEL='.btn,.fab,.hTile,.startBtn,#mapB,.nbNode,.nbEx,.homeLogo,.arr';
 document.addEventListener('pointerdown',e=>{const b=e.target.closest(SEL);if(b&&!b.disabled){audioInit();sfx.click();}},true);
 document.addEventListener('pointerup',e=>{const b=e.target.closest(SEL);if(!b)return;b.classList.remove('boing');void b.offsetWidth;b.classList.add('boing');setTimeout(()=>b.classList.remove('boing'),380);
  if(/hint/.test(b.id||'')){b.classList.remove('wiggle');void b.offsetWidth;b.classList.add('wiggle');}},true);})();

// ---- 特效層：金幣粒子、慶祝彩帶、灰塵 ----
function fxLayer(){let L=$('fxLayer');if(!L){L=document.createElement('div');L.id='fxLayer';L.className='fxLayer';document.body.appendChild(L);}return L;}
function coinBurst(n){const L=fxLayer(),t=$('coinFab');if(!t||!t.getClientRects().length)return;const tr_=t.getBoundingClientRect(),tx=tr_.left+tr_.width/2,ty=tr_.top+tr_.height/2;
 const sx=innerWidth/2,sy=innerHeight*.55,k=Math.max(4,Math.min(12,Math.round(n/12)));
 for(let i=0;i<k;i++){const c=document.createElement('div');c.className='fxCoin';c.innerHTML=icon('coin');c.style.left=sx+'px';c.style.top=sy+'px';L.appendChild(c);
  const ox=(Math.random()-.5)*220,oy=-60-Math.random()*120;
  const a=c.animate([{transform:'translate(0,0) scale(.4)',opacity:0},{transform:'translate('+ox+'px,'+oy+'px) scale(1.1)',opacity:1,offset:.35},{transform:'translate('+(tx-sx)+'px,'+(ty-sy)+'px) scale(.6)',opacity:.9}],{duration:900+i*60,easing:'cubic-bezier(.5,0,.6,1)',delay:i*45,fill:'forwards'});
  a.onfinish=()=>{c.remove();t.classList.remove('hit');void t.offsetWidth;t.classList.add('hit');};}}
function confetti(big){const L=fxLayer(),cols=['#f2c96b','#e48b7f','#8fbf9c','#9fc6e8','#d9a0e0','#d9774a'],n=big?70:28;
 for(let i=0;i<n;i++){const s=document.createElement('div');const star=i%7===0;s.className=star?'fxStar':'fxBit';if(!star)s.style.background=cols[i%cols.length];
  const x0=innerWidth*(big?Math.random():.35+Math.random()*.3);s.style.left=x0+'px';s.style.top='-20px';L.appendChild(s);
  const dx=(Math.random()-.5)*240,dur=1600+Math.random()*1400,rot=(Math.random()*720-360);
  const a=s.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+dx+'px,'+(innerHeight*.9)+'px) rotate('+rot+'deg)',opacity:.85}],{duration:dur,delay:Math.random()*400,easing:'cubic-bezier(.25,.6,.4,1)',fill:'forwards'});a.onfinish=()=>s.remove();}}
function dustAt(parent,x,y){for(let i=0;i<6;i++){const d=document.createElement('div');d.className='dust';d.style.left=x+'px';d.style.top=y+'px';parent.appendChild(d);
 const ang=Math.PI*(i/5),r=24+Math.random()*16;const a=d.animate([{transform:'translate(0,0) scale(.6)',opacity:.9},{transform:'translate('+(Math.cos(ang)*r*(i%2?1:-1))+'px,'+(-Math.sin(ang)*r*.5-6)+'px) scale(1.4)',opacity:0}],{duration:520,easing:'ease-out',fill:'forwards'});a.onfinish=()=>d.remove();}}
// 2D：放下物件時揚起一點灰塵（只是特效，不影響擺放）
document.addEventListener('pointerup',e=>{if(e.target===cv&&typeof drag!=='undefined'&&drag&&!story){const w=$('cWrap'),r=w.getBoundingClientRect();dustAt(w,e.clientX-r.left,e.clientY-r.top);}},true);
// 完成關卡、得到徽章、解鎖時的慶祝
(function(){const r3=$('res3'),cmp=$('cmp');let a=false,b=false;
 new MutationObserver(()=>{const on=r3.style.display==='flex';if(on&&!a){setTimeout(()=>confetti(true),250);}a=on;}).observe(r3,{attributes:true,attributeFilter:['style']});
 if(cmp)new MutationObserver(()=>{const on=cmp.style.display&&cmp.style.display!=='none';if(on&&!b){setTimeout(()=>confetti(true),250);}b=on;}).observe(cmp,{attributes:true,attributeFilter:['style']});})();

// ---- 載入畫面：騎樓小知識 ----
const TIPS=['騎樓台語叫「亭仔跤」，遮陽又擋雨。','騎樓的地是私人的，卻要開放給大家走。','機車請停進機車格，騎樓才走得過去。','推嬰兒車、坐輪椅的人，最需要平整的騎樓。','桌椅靠牆擺，客人有位子坐、路人也走得過。','日治時期起，騎樓就寫進了建築法規。'];
function showTip(){const t=$('transTip');if(!t)return;const s=TIPS[Math.floor(Math.random()*TIPS.length)];t.innerHTML='<b>'+esc(tr('騎樓小知識'))+'</b>'+esc(tr(s));}

// ---- 角色表現：呼吸、說話跳動、依情緒的反應動作、聽的人看向說話者、偶爾小跳、出場滑入、各角色的小動作 ----
let talkX=null,talkMood=null,lineKey='',lineT=0;
const EMO={happy:'★',question:'?',sigh:'💧',surprise:'!',thanks:'♥'};
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
function charFx(c,img,x,y,h){ // 在畫角色前呼叫，回傳 {dx,dy,sx,sy,rot,alpha}
 const now=performance.now(),t=now/1000,talking=talkX!=null&&Math.abs(x-talkX)<70,fx={dx:0,dy:0,sx:1,sy:1,rot:0,alpha:1};
 const k0=(typeof story!=='undefined'?story:'')+'|'+(typeof sDi!=='undefined'?sDi:'')+'|'+talkX;if(k0!==lineKey){lineKey=k0;lineT=now;}
 const tl=(now-lineT)/1000,face=x<480?1:-1;                                                          // 這句話開始了幾秒；角色面向畫面中間
 const br=Math.sin(t*2.4+x*.01);fx.sy=1+br*.012;fx.sx=1-br*.006;                                   // 呼吸
 if(talking){
  if(tl<.28){const k=Math.sin(tl/.28*Math.PI);fx.dy-=k*9;fx.sy*=1+k*.03;fx.sx*=1-k*.02;}            // 開口前先輕跳一下
  else fx.dy=-Math.abs(Math.sin(t*7))*4;                                                             // 說話時輕輕跳動
  const m=talkMood;
  if(m==='happy'&&tl<1){const k=Math.abs(Math.sin(tl*Math.PI*2.4))*(1-tl);fx.dy-=k*20;fx.sy*=1+k*.05;fx.sx*=1-k*.03;}   // 開心：連跳兩下
  if(m==='surprise'){if(tl<.4){const k=Math.sin(tl/.4*Math.PI);fx.dy-=k*26;fx.sy*=1+k*.07;fx.sx*=1-k*.05;}else if(tl<.9)fx.dx+=Math.sin(tl*60)*2*(1-(tl-.4)/.5);} // 驚訝：彈起來再抖一下
  if(m==='question')fx.rot+=face*.075*ease(Math.min(1,tl/.45));                                     // 疑問：歪頭
  if(m==='sigh'){const k=ease(Math.min(1,tl/.8));fx.sy*=1-.035*k;fx.sx*=1+.02*k;fx.dy+=3*k;fx.rot-=face*.025*k;}   // 嘆氣：垂下肩膀
  if(m==='thanks'&&tl<1.6){fx.rot+=face*.12*Math.sin(Math.min(1,tl/1.6)*Math.PI);}                  // 道謝：鞠躬
 }else{
  if(talkX!=null)fx.rot+=.018*Math.sign(talkX-x)*ease(Math.min(1,tl/.5));                          // 聽的人：身體微微轉向說話的人
  const ph=(t+x*.013)%6.5;if(ph<.32){const k=Math.sin(ph/.32*Math.PI);fx.dy-=k*5;fx.sy*=1+k*.02;}    // 偶爾自己小跳一下
 }
 if(img===cust.teacher&&talking)fx.rot+=Math.sin(t*5)*.03;                                          // 老師：點教鞭
 if(img===cust.dad)fx.rot+=talking?Math.sin(t*6)*.035:Math.sin(t*1.6)*.012;                         // 老闆：晃湯勺
 if(img===cust.mother)fx.rot+=Math.sin(t*1.8)*.028;                                                  // 媽媽：搖寶寶
 if(img===cust.student&&talking)fx.rot+=Math.sin(t*8)*.025;                                         // 主角：說話時擺動
 if(typeof story!=='undefined'&&(story==='cls'||story==='walk')&&typeof sT!=='undefined'){const k=Math.min(1,(now-sT)/750),e=1-Math.pow(1-k,3);if(k<1){fx.dx+=(1-e)*(x<480?-260:260);fx.alpha*=e;}} // 出場滑入
 return fx;}
// ---- 對話框頭像：從角色全身圖自動找出頭部，裁成圓形大頭貼（換角色圖也會自動裁）----
function headSrc(img){if(!img)return '';if(img._head)return img._head;if(!img.complete||!img.naturalWidth)return img.src;
 try{const W0=img.naturalWidth,H0=img.naturalHeight,sc=Math.min(1,400/Math.max(W0,H0)),w=Math.round(W0*sc),h=Math.round(H0*sc),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);const d=x.getImageData(0,0,w,h).data,A=(i,j)=>d[(j*w+i)*4+3]>60;
  let T=h,B=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(A(i,j)){if(j<T)T=j;if(j>B)B=j;break;}
  const band=T+(B-T)*.24;let L=w,R=0;for(let j=T;j<band;j++)for(let i=0;i<w;i++)if(A(i,j)){if(i<L)L=i;break;}
  for(let j=T;j<band;j++)for(let i=w-1;i>=0;i--)if(A(i,j)){if(i>R)R=i;break;}
  const S=Math.max((R-L)*1.08,(B-T)*.36),cx=(L+R)/2,cy=T+S/2-S*.04,o=document.createElement('canvas');o.width=o.height=160;
  o.getContext('2d').drawImage(c,cx-S/2,cy-S/2,S,S,0,0,160,160);img._head=o.toDataURL('image/png');return img._head;}catch(e){return img.src;}}
function drawEmote(c,x,topY){if(!talkMood||!EMO[talkMood])return;const t=performance.now()/1000,s=1+Math.sin(t*5)*.06,cx=x+70,cy=topY+28;
 c.save();c.translate(cx,cy);c.scale(s,s);c.fillStyle='#fffaf0';c.strokeStyle='#e3c9a3';c.lineWidth=3;c.beginPath();c.arc(0,0,20,0,7);c.fill();c.stroke();
 c.fillStyle={happy:'#e8a817',question:'#5e8fc7',sigh:'#5ea6e3',surprise:'#d0453a',thanks:'#e2707f'}[talkMood];c.font='900 22px "Noto Sans TC",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(EMO[talkMood],0,1);c.restore();}
// 2D 關卡的對話場景本來只在操作時重畫；對話中每秒重畫約 30 次，角色才會動
(function tick(){let last=0;const f=n=>{if(n-last>33){last=n;try{if(typeof dlgOpen!=='undefined'&&dlgOpen&&$('game').style.display!=='none'&&!story)render();}catch(e){}}requestAnimationFrame(f);};requestAnimationFrame(f);})();

// ---- 中文配音（瀏覽器語音，每個角色不同音高與語速）＋錄音檔接口（可放台語錄音）----
const VOICE={student:{p:1.25,r:1.05},teacher:{p:1.12,r:.97},dad:{p:.75,r:.95},mother:{p:1.15,r:.95},customer:{p:.95,r:1},gma:{p:1,r:.85},kid:{p:1.45,r:1.1},npc:{p:1,r:1}};
// 錄音檔：{ '台詞原文': 'voice/檔名.mp3' }。有錄音就播錄音（台語也可以），沒有才用瀏覽器語音。台詞清單見 docs/配音台詞清單.csv
const VOICE_FILES={};
let vAud=null;
function stopVoice(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}if(vAud){try{vAud.pause();}catch(e){}vAud=null;}}
function whoKey(name){name=name||'';if(/老師/.test(name))return 'teacher';if(/高中生|我$/.test(name))return 'student';if(/老闆/.test(name))return 'dad';if(/媽媽/.test(name))return 'mother';if(/客人/.test(name))return 'customer';if(/阿嬤|長輩|老人|阿公/.test(name))return 'gma';if(/小孩/.test(name))return 'kid';return 'npc';}
function speak(text,who,src){stopVoice();if(!AUD.vOn||AUD.mute||!text)return;const f=VOICE_FILES[src||text];
 if(f){vAud=new Audio(f);vAud.volume=Math.min(1,AUD.sv);vAud.play().catch(()=>{});return;}
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
 const u=new SpeechSynthesisUtterance(String(text).replace(/[「」『』…（）()▶]/g,' '));const lang=LANG==='en'?'en-US':'zh-TW';u.lang=lang;
 const vs=speechSynthesis.getVoices()||[];const v=vs.find(v=>v.lang===lang)||vs.find(v=>v.lang&&v.lang.replace('_','-').toLowerCase().startsWith(LANG==='en'?'en':'zh-tw'))||vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith(LANG==='en'?'en':'zh'));if(v)u.voice=v;
 const P=VOICE[who]||VOICE.npc;u.pitch=P.p;u.rate=P.r;u.volume=Math.min(1,AUD.sv*1.1);try{speechSynthesis.speak(u);}catch(e){}}
window.qSpeak=speak;window.qStopVoice=stopVoice;

// ---- 各場景環境音 v2（全部程式合成，沒有版權問題；音量可調、可關閉）----
// 三層：①遠處街道低鳴 ②人聲交談（合成的「聽不清楚的聊天聲」，有中文聲調起伏）③隨機生活音效（碗筷、機車經過、鳥叫…）
const AMB={gain:null,rev:null,base:null,talk:null,talkSrc:null,fan:null,scene:null,next:0,babble:null};
function ambScene(){if(typeof Explore!=='undefined'&&Explore.active)return 'street';if($('st3').style.display==='block')return 'noodle';
 if($('game').style.display!=='none'&&typeof story!=='undefined'){if(story==='walk')return 'noodle';if(story==='cls')return 'class';if(S)return ['noodle','home','market','park'][lvIdx]||null;}return null;}
// 簡單殘響：讓聲音有「在街上、有距離」的感覺
function ambReverb(){const sr=AC.sampleRate,n=sr*1.4|0,b=AC.createBuffer(2,n,sr);for(let c=0;c<2;c++){const a=b.getChannelData(c);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.2);}
 const cv=AC.createConvolver();cv.buffer=b;const g=AC.createGain();g.gain.value=.55;cv.connect(g).connect(AMB.gain);return cv;}
// 合成聊天聲：多個「人」各自說話，母音共振峰＋四種聲調的音高變化，聽起來像遠處有人在聊天但聽不清楚
function ambBabble(sec,voices){const sr=AC.sampleRate,N=sr*sec|0,out=new Float32Array(N);
 const V=[[800,1200],[300,2300],[350,800],[500,1800],[500,900],[650,1100]];
 for(let v=0;v<voices;v++){const p0=Math.random()<.5?105+Math.random()*40:190+Math.random()*60,amp=.35+Math.random()*.65,lp=.25+Math.random()*.5;
  let t=Math.random()*sec,t0=t,y1=0,y2=0,z1=0,z2=0,l=0,ph=0;
  for(let k=0;k<200;k++){const nS=4+(Math.random()*8|0);
   for(let s=0;s<nS;s++){const d=.09+Math.random()*.14,i0=t*sr|0,L=d*sr|0,vw=V[Math.random()*V.length|0],tone=Math.random()*4|0;
    const r1=Math.exp(-Math.PI*90/sr),r2=Math.exp(-Math.PI*130/sr),b1=2*r1*Math.cos(2*Math.PI*vw[0]/sr),b2=2*r2*Math.cos(2*Math.PI*vw[1]/sr);
    for(let j=0;j<L;j++){const x=j/L,f=p0*(tone===0?1:tone===1?.9+.25*x:tone===2?1-.18*Math.sin(Math.PI*x):1.15-.3*x);ph+=f/sr;if(ph>1)ph-=1;
     let src=(ph*2-1);if(j<sr*.025&&Math.random()<.5)src+=(Math.random()*2-1)*1.4;
     const a1=src+b1*y1-r1*r1*y2;y2=y1;y1=a1;const a2=src+b2*z1-r2*r2*z2;z2=z1;z1=a2;
     const env=Math.min(1,j/(sr*.018))*Math.min(1,(L-j)/(sr*.045));l+=lp*((a1*.6+a2*.4)*.012-l);out[(i0+j)%N]+=l*env*amp;}
    t+=d+(Math.random()<.2?.05:0);}
   t+=.35+Math.random()*1.3;if(t>t0+sec)break;}}
 let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(out[i]));const k=pk?.9/pk:1;for(let i=0;i<N;i++)out[i]*=k;
 const b=AC.createBuffer(1,N,sr);b.getChannelData(0).set(out);return b;}
function ambInit(){if(AMB.gain||!AC)return;AMB.gain=AC.createGain();AMB.gain.gain.value=0;AMB.gain.connect(AC.destination);AMB.rev=ambReverb();
 // ① 遠處街道低鳴
 const sr=AC.sampleRate,n=sr*3,b=AC.createBuffer(1,n,sr),a=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;a[i]=l*3.5;}
 const s=AC.createBufferSource();s.buffer=b;s.loop=true;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=600;AMB.base=AC.createGain();AMB.base.gain.value=0;s.connect(f).connect(AMB.base).connect(AMB.gain);s.start();
 // ② 人聲交談（第一次需要時才產生）
 AMB.talk=AC.createGain();AMB.talk.gain.value=0;const tf=AC.createBiquadFilter();tf.type='lowpass';tf.frequency.value=2200;AMB.talk.connect(tf);tf.connect(AMB.gain);tf.connect(AMB.rev);
 // 教室電風扇
 const fo=AC.createOscillator();fo.type='triangle';fo.frequency.value=58;const fg=AC.createGain();fg.gain.value=0;const fl=AC.createOscillator();fl.frequency.value=.8;const fd=AC.createGain();fd.gain.value=.004;fl.connect(fd).connect(fg.gain);fo.connect(fg).connect(AMB.gain);fo.start();fl.start();AMB.fan=fg;}
function ambTalkStart(){if(AMB.talkSrc)return;AMB.babble=AMB.babble||ambBabble(12,9);const s=AC.createBufferSource();s.buffer=AMB.babble;s.loop=true;s.connect(AMB.talk);s.start();AMB.talkSrc=s;}
// 輸出：左右位置＋殘響比例
function ambOut(pan,wet){const g=AC.createGain();let node=g;if(AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));g.connect(p);node=p;}
 node.connect(AMB.gain);if(wet){const w=AC.createGain();w.gain.value=wet;node.connect(w).connect(AMB.rev);}return g;}
const rnd=(a,b)=>a+Math.random()*(b-a),rpan=()=>rnd(-.8,.8);
// 撞擊聲：幾個不成倍數的泛音快速衰減（陶瓷、金屬、玻璃）
function ambHit(f,parts,dec,v,delay,pan,wet){const t=AC.currentTime+(delay||0),o=ambOut(pan,wet??.3);
 parts.forEach(([m,a],i)=>{const os=AC.createOscillator(),g=AC.createGain();os.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*a,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dec*(1-i*.18));os.connect(g).connect(o);os.start(t);os.stop(t+dec+.05);});}
function ambNz(d,v,fq,q,type,delay,pan,wet,att){const t=AC.currentTime+(delay||0),n=Math.max(1,AC.sampleRate*d|0),b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;
 const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=fq;f.Q.value=q||1;const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+d*(att??.3));g.gain.exponentialRampToValueAtTime(.0001,t+d);
 s.connect(f).connect(g).connect(ambOut(pan,wet));s.start(t);}
function ambTone(f,d,type,v,slide,delay,pan,wet){const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide),t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(ambOut(pan,wet));o.start(t);o.stop(t+d+.05);}
const CERAMIC=[[1,1],[2.71,.5],[5.13,.28]],METAL=[[1,1],[2.4,.6],[4.1,.4],[6.3,.2]],BELL=[[1,1],[2.0,.35],[2.76,.5],[5.4,.2]];
const SND={
 bowls:()=>{const p=rpan(),n=1+(Math.random()*3|0);for(let i=0;i<n;i++)ambHit(rnd(1900,2700),CERAMIC,.32,.05,i*rnd(.08,.18),p);},          // 碗碰碗
 chop:()=>{const p=rpan();for(let i=0;i<2+(Math.random()*3|0);i++)ambNz(.018,.09,rnd(2200,3200),2.5,'bandpass',i*rnd(.07,.12),p,.15,.2);},       // 筷子敲碗、夾麵
 spoon:()=>{const p=rpan();ambHit(rnd(2900,3500),METAL,.18,.03,0,p);ambHit(rnd(1900,2400),CERAMIC,.25,.04,.12,p);},                              // 湯匙碰碗
 ladle:()=>{const p=rnd(-.3,.3);ambHit(rnd(520,640),METAL,.7,.05,0,p,.4);ambHit(rnd(520,640),METAL,.5,.035,.28,p,.4);},                        // 湯勺敲鍋邊
 boil:()=>{const p=rnd(-.4,.2);for(let i=0;i<8;i++)ambTone(rnd(260,520),.06,'sine',.02,rnd(200,500),i*rnd(.05,.16),p,.1);},                      // 湯鍋咕嘟咕嘟
 sizzle:()=>ambNz(rnd(1.2,2),.03,5200,.5,'highpass',0,rnd(-.3,.3),.1,.15),                                                                      // 煮麵、炒料的滋滋聲
 scooter:()=>{const t=AC.currentTime,d=rnd(2.6,3.6),f0=rnd(95,130),o=AC.createOscillator(),o2=AC.createOscillator(),lp=AC.createBiquadFilter(),g=AC.createGain();
  o.type='sawtooth';o2.type='square';o.frequency.setValueAtTime(f0*1.08,t);o.frequency.linearRampToValueAtTime(f0*.9,t+d);o2.frequency.setValueAtTime(f0*.54,t);o2.frequency.linearRampToValueAtTime(f0*.45,t+d);
  lp.type='lowpass';lp.frequency.value=rnd(600,900);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+d*.48);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  let out;if(AC.createStereoPanner){const p=AC.createStereoPanner(),dir=Math.random()<.5?-1:1;p.pan.setValueAtTime(-.9*dir,t);p.pan.linearRampToValueAtTime(.9*dir,t+d);g.connect(p);out=p;}else out=g;
  o.connect(lp);o2.connect(lp);lp.connect(g);out.connect(AMB.gain);const w=AC.createGain();w.gain.value=.25;out.connect(w).connect(AMB.rev);o.start(t);o2.start(t);o.stop(t+d+.1);o2.stop(t+d+.1);},   // 機車從左邊騎到右邊（音高下降＝都卜勒效應）
 horn:()=>{const p=rpan();ambTone(420,.22,'square',.012,0,0,p,.3);ambTone(530,.22,'square',.01,0,0,p,.3);},                                      // 遠處喇叭
 bike:()=>{const p=rpan();ambHit(rnd(2700,3100),BELL,.6,.03,0,p);ambHit(rnd(2700,3100),BELL,.6,.03,.22,p);},                                   // 腳踏車鈴
 birds:()=>{const p=rpan(),f=rnd(2800,4200),n=3+(Math.random()*4|0);for(let i=0;i<n;i++)ambTone(f*rnd(.92,1.08),rnd(.05,.1),'sine',.025,rnd(-900,900),i*rnd(.08,.14),p,.2);},   // 麻雀啾啾
 chime:()=>{const p=rnd(-.5,.5),sc=[1,1.125,1.25,1.5,1.667];for(let i=0;i<3+(Math.random()*3|0);i++)ambHit(1568*sc[Math.random()*5|0],BELL,1.6,.018,i*rnd(.18,.4),p,.5);}, // 風鈴
 door:()=>{const p=rpan();ambNz(.12,.05,180,1,'lowpass',0,p,.35,.1);ambHit(rnd(900,1200),METAL,.15,.01,.02,p);},                               // 遠處關門
 cart:()=>{const p=rpan(),n=10+(Math.random()*10|0);for(let i=0;i<n;i++)ambNz(.03,.035,rnd(900,1500),2,'bandpass',i*.065,p,.15,.2);},          // 推車輪子喀啦喀啦
 beep:()=>{const p=rnd(-.6,.6);ambTone(1850,.1,'square',.012,0,0,p,.2);if(Math.random()<.6)ambTone(1850,.1,'square',.012,0,.18,p,.2);},         // 收銀機嗶嗶
 bag:()=>{const p=rpan();for(let i=0;i<14;i++)ambNz(rnd(.02,.05),.03,rnd(3500,6000),1.5,'bandpass',i*rnd(.03,.07),p,.1,.2);},                    // 塑膠袋沙沙
 vendor:()=>{if(!AMB.babble)return;const t=AC.currentTime,s=AC.createBufferSource(),g=AC.createGain(),bp=AC.createBiquadFilter();s.buffer=AMB.babble;s.playbackRate.value=rnd(.95,1.08);bp.type='peaking';bp.frequency.value=1200;bp.gain.value=8;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.08);g.gain.setValueAtTime(.06,t+1.1);g.gain.exponentialRampToValueAtTime(.0001,t+1.5);s.connect(bp).connect(g).connect(ambOut(rpan(),.4));s.start(t,rnd(0,10),1.6);}, // 攤販吆喝（比較近、比較大聲的一句）
 wind:()=>ambNz(rnd(3,5),.035,rnd(350,600),.4,'lowpass',0,rpan(),.2,.5),                                                                         // 一陣風
 leaves:()=>{const p=rpan();for(let i=0;i<20;i++)ambNz(rnd(.03,.08),.012,rnd(4000,7000),1,'bandpass',i*rnd(.04,.1),p,.2,.3);},                  // 樹葉沙沙
 dog:()=>{const p=rpan();for(let i=0;i<1+(Math.random()*2|0);i++){ambTone(rnd(380,460),.13,'sawtooth',.016,-150,i*.24,p,.4);ambNz(.12,.02,900,2,'bandpass',i*.24,p,.4,.1);}}, // 遠處狗叫
 page:()=>ambNz(.35,.025,rnd(2500,4000),.7,'bandpass',0,rpan(),.2,.4),                                                                            // 翻書
 chair:()=>{const p=rpan();ambTone(rnd(180,260),.25,'sawtooth',.008,rnd(-60,60),0,p,.3);}                                                         // 椅子挪動
};
// 每個場景：街道低鳴、聊天聲大小、各種音效出現的機率權重、間隔
const AMB_SCENES={
 noodle:{base:.45,talk:.55,gap:[600,2000],ev:{bowls:3,chop:3,spoon:2,ladle:1,boil:1.5,sizzle:1,scooter:1,horn:.2,bike:.3}},   // 麵攤：客人聊天、碗筷、煮麵
 home:{base:.3,talk:.12,gap:[1200,3200],ev:{birds:3,chime:1.5,scooter:1,bike:.8,door:.4,dog:.3}},                             // 住宅：鳥叫、風鈴、遠處機車
 market:{base:.35,talk:.9,gap:[500,1600],ev:{cart:2,beep:2,bag:2,vendor:1.2,scooter:.5,bike:.3}},                             // 超市外：人潮、推車、收銀、攤販吆喝
 park:{base:.15,talk:.18,gap:[900,2600],ev:{birds:4,wind:1.5,leaves:2,dog:.6,bike:.6}},                                       // 往公園：鳥、風、樹葉、狗
 street:{base:.5,talk:.35,gap:[800,2400],ev:{scooter:2,horn:.3,bike:.6,birds:1,bowls:.8,chop:.6}},                            // 無限探索的街道（有麵攤）
 class:{base:0,talk:.08,fan:1,gap:[2600,5200],ev:{page:1,chair:.6,birds:.5}}                                                    // 教室：電風扇、翻書（台詞多，所以很小聲）
};
function ambPick(ev){const ks=Object.keys(ev),tot=ks.reduce((s,k)=>s+ev[k],0);let r=Math.random()*tot;for(const k of ks){r-=ev[k];if(r<=0)return k;}return ks[0];}
setInterval(()=>{if(!AC)return;ambInit();const sc=ambScene(),cfg=AMB_SCENES[sc],on=!!cfg&&AUD.aOn!==false&&!AUD.mute,T=AC.currentTime;
 AMB.gain.gain.setTargetAtTime(on?(AUD.av??.5)*(sc==='class'?.12:.2):0,T,.6);
 if(on&&cfg.talk)ambTalkStart();
 AMB.base.gain.setTargetAtTime(on?cfg.base:0,T,1);AMB.talk.gain.setTargetAtTime(on?cfg.talk*.5:0,T,1.2);AMB.fan.gain.setTargetAtTime(on&&cfg.fan?.012:0,T,1);
 if(!on)return;const now=performance.now();if(now>AMB.next){AMB.next=now+rnd(cfg.gap[0],cfg.gap[1]);try{SND[ambPick(cfg.ev)]();}catch(e){}}},400);
window.qAmb={SND,AMB_SCENES,ambScene};

// ---- 音效面板：環境音（開關＋音量）、角色配音（開關）----
(function(){const r1=$('aAOn'),r2=$('aAV'),r3=$('aVOn'),o=$('aAVo');if(!r1)return;const sync=()=>{r1.checked=AUD.aOn!==false;r2.value=Math.round((AUD.av??.5)*100);o.textContent=r2.value;r3.checked=AUD.vOn!==false;};sync();
 r1.onchange=()=>{audioInit();AUD.aOn=r1.checked;saveAud();};r2.oninput=()=>{AUD.av=r2.value/100;o.textContent=r2.value;saveAud();};r3.onchange=()=>{AUD.vOn=r3.checked;saveAud();if(!r3.checked)stopVoice();};
 $('audBtn').addEventListener('click',sync);})();

// ---- 遊戲畫面放到最大：量出畫面上方、下方實際佔用的高度，其餘全部給遊戲畫面 ----
// 同一個視窗大小下只會變小不會忽大忽小（避免對話長短不同時畫面跳動）；視窗大小改變就重新計算
const FIT={key:'',memo:{}};
function placeCtl3(){const c=document.querySelector('#st3 .ctl'),side=$('side3'),inn=document.querySelector('#st3 .in');if(!c||!side||!inn)return;
 const toSide=innerHeight<=520&&innerWidth>innerHeight&&!inn.classList.contains('colSide');
 if(toSide){if(c.parentElement!==side)side.appendChild(c);}else if(c.parentElement===side){const pr=inn.querySelector('.playRow');if(pr)pr.after(c);}}
function fitChrome(){try{placeCtl3();
 const W=innerWidth,H=innerHeight,key=W+'x'+H;if(key!==FIT.key){FIT.key=key;FIT.memo={};}
 if(W<=820&&H>W)return;                                                     // 手機直放：寬度決定大小，維持原本版面
 [['#app','cWrap','dock2'],['#st3 .in','wrap3',null]].forEach(([cs,sid,did])=>{
  const c=document.querySelector(cs),st=$(sid);if(!c||!st||!st.offsetParent)return;
  const after=did?$(did):c.querySelector('.ctl');let below=0;
  if(after&&after.offsetParent&&!after.closest('.side')){const k=getComputedStyle(after);below=after.offsetHeight+parseFloat(k.marginTop)+parseFloat(k.marginBottom);}
  const top=st.getBoundingClientRect().top+scrollY,pad=H<=520?6:10,ch=Math.ceil(top+below+pad),m=Math.max(FIT.memo[cs]||0,ch);
  const ov=document.documentElement.scrollHeight-H,cur0=parseFloat(c.style.getPropertyValue('--chrome'))||0;const m2=ov>0&&cur0>0?Math.max(m,cur0+ov):m;
  FIT.memo[cs]=m2;const cur=parseFloat(c.style.getPropertyValue('--chrome'))||0;if(Math.abs(cur-m2)>1)c.style.setProperty('--chrome',m2+'px');});
}catch(e){}}
addEventListener('resize',()=>requestAnimationFrame(fitChrome));setInterval(fitChrome,250);
document.addEventListener('fullscreenchange',()=>setTimeout(fitChrome,80));
// ===================== 全螢幕（電腦、平板；手機不支援時給提示）=====================
// 嵌在網站裡（iframe）時，請網站把整個遊戲框切到全螢幕；單獨開啟時，整頁切到全螢幕。再按一次可以退出。
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
let fsParent=false;
function updFs(){const on=!!fsEl()||fsParent;const b=$('fsBtn');if(!b)return;b.innerHTML=icon(on?'unfull':'full');b.title=tr(on?'結束全螢幕':'全螢幕');}
function toggleFs(){sfx.click();
 if(window.top!==window.self){try{parent.postMessage({qlzFs:'toggle'},'*');}catch(e){}return;}
 if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
 const el=document.documentElement,rq=el.requestFullscreen||el.webkitRequestFullscreen;
 if(!rq){gToast(esc(tr('這個瀏覽器不支援全螢幕。手機可以把畫面橫放，或用「加到主畫面」開啟。')));return;}
 try{const pr=rq.call(el);if(pr&&pr.catch)pr.catch(()=>gToast(esc(tr('瀏覽器擋住了全螢幕，請再按一次或用新分頁開啟遊戲。'))));}catch(e){}}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{updFs();window.dispatchEvent(new Event('resize'));}));
window.addEventListener('message',e=>{if(e.data&&e.data.qlzFsState!=null){fsParent=!!e.data.qlzFsState;updFs();}});

// ===================== 拍照與相簿（照片存在瀏覽器的 IndexedDB；壓縮成 JPEG，最多 60 張）=====================
const PHOTO_MAX=60;let photoDB=null;
function pdb(){return photoDB||(photoDB=new Promise((res,rej)=>{try{const r=indexedDB.open('qlz-album',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}}));}
async function pTx(mode,fn){const db=await pdb();return new Promise((res,rej)=>{const tx=db.transaction('photos',mode),st=tx.objectStore('photos');const out=fn(st);tx.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);tx.onerror=()=>rej(tx.error);});}
const photoAll=()=>pTx('readonly',st=>st.getAll()).then(a=>(a||[]).sort((x,y)=>y.t-x.t));
const photoDel=id=>pTx('readwrite',st=>st.delete(id));
function sceneLabel(){if(typeof Explore!=='undefined'&&Explore.active)return{lv:-2,name:tr('無限探索')};if($('st3').style.display==='block')return{lv:0,name:lvTitle(0)};if($('game').style.display!=='none'&&S){if(story)return{lv:-1,name:tr('劇情')};return{lv:lvIdx,name:lvTitle(lvIdx)};}return null;}
function grabScene(){if(typeof Explore!=='undefined'&&Explore.active)return Explore.canvas();if($('st3').style.display==='block')return Stage3D.snap();if($('game').style.display!=='none')return $('c');return null;}
function shrink(src,w,q){const h=Math.round(w*src.height/src.width),k=document.createElement('canvas');k.width=w;k.height=h;const g=k.getContext('2d');g.fillStyle='#f3efe8';g.fillRect(0,0,w,h);g.drawImage(src,0,0,w,h);return k.toDataURL('image/jpeg',q);}
async function takePhoto(){audioInit();const src=grabScene(),info=sceneLabel();if(!src||!info){gToast(esc(tr('現在沒有可以拍的遊戲畫面。')));return;}
 let full,thumb;try{full=shrink(src,960,.8);thumb=shrink(src,240,.7);}catch(e){gToast(esc(tr('拍照失敗，請再試一次。')));return;}
 const fl=$(info.lv===0?'flash3':'flash2');if(fl){fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');}sfx.shutter();
 try{const all=await photoAll();if(all.length>=PHOTO_MAX){gToast(esc(tr('相簿已滿（{n} 張），請先刪除一些照片。',{n:PHOTO_MAX})));return;}
  await pTx('readwrite',st=>st.put({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),t:Date.now(),lv:info.lv,name:info.name,full,thumb}));
  gToast(icon('photo')+esc(tr('已存到相簿！')));if(tabPage==='album')renderApp();}catch(e){gToast(esc(tr('照片沒有存成功（瀏覽器可能關閉了儲存空間）。')));}}
async function pgAlbumFill(){const box=$('albGrid');if(!box)return;let all=[];try{all=await photoAll();}catch(e){}
 $('albN').textContent=tr('共 {n} 張 / 最多 {m} 張',{n:all.length,m:PHOTO_MAX});
 box.innerHTML=all.length?all.map(p=>'<button class="ph" data-photo="'+p.id+'"><img alt="" src="'+p.thumb+'"><span>'+esc(p.lv===-2?tr('無限探索'):p.lv<0?tr('劇情'):lvTitle(p.lv))+'</span><small>'+esc(new Date(p.t).toLocaleString(LOC(),{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))+'</small></button>').join(''):'<div class="empty">'+icon('photo')+'<p>'+esc(tr('還沒有照片。遊戲中按右下角的相機就能拍照！'))+'</p></div>';}
function pgAlbum(){setTimeout(pgAlbumFill,0);return '<p class="bkIntro" id="albN"></p><div class="albGrid" id="albGrid"></div>';}
async function pgPhotoFill(id){let p=null;try{p=(await photoAll()).find(x=>x.id===id);}catch(e){}const box=$('phView');if(!box)return;if(!p){box.innerHTML='<p>'+esc(tr('找不到這張照片。'))+'</p>';return;}
 box.innerHTML='<img class="phBig" alt="" src="'+p.full+'"><div class="phMeta"><span>'+icon('map')+esc(p.lv===-2?tr('無限探索'):p.lv<0?tr('劇情'):lvTitle(p.lv))+'</span><span>'+esc(new Date(p.t).toLocaleString(LOC()))+'</span><button class="btn" data-pdel="'+p.id+'">'+icon('trash')+esc(tr('刪除這張照片'))+'</button></div>';}
function pgPhoto(){setTimeout(()=>pgPhotoFill(tabArg),0);return '<div id="phView" class="phView"></div>';}

// ===================== 返回：記住「從哪裡進來」，按返回就回到上一個介面 =====================
let tabStack=[],tabArg=null;
const tabFrom=()=>phBrowse||$('phH').style.display==='flex'?'home':'game';
function goApp(p,arg){if(tabPage)tabStack.push([tabPage,tabArg]);else tabStack=[[tabFrom(),null]];tabPage=p;tabArg=arg||null;$('tabApp').hidden=false;$('tabDet').hidden=true;renderApp();sfx.click();}
function tabBackFn(){sfx.click();if(!$('tabDet').hidden){$('tabDet').hidden=true;return;}const prev=tabStack.pop();
 if(!prev||prev[0]==='home'||prev[0]==='game'){$('tabApp').hidden=true;tabPage=null;tabArg=null;tabStack=[];return;}tabPage=prev[0];tabArg=prev[1];renderApp();}
// 正在關卡裡、而且有進度時，離開前先確認
function inLevel(){if($('st3').style.display==='block')return Stage3D.busy();return $('game').style.display!=='none'&&!!S&&stage>=1&&stage<4&&!story;}
addEventListener('beforeunload',e=>{if(inLevel()){e.preventDefault();e.returnValue='';}});

// ===================== 金幣：數字跳動動畫＋音效 =====================
let coinShown=null;
function animCoins(){const to=SAVE.coins,from=coinShown==null?to:coinShown;coinShown=to;const els=[...document.querySelectorAll('.coinN')];if(from===to){els.forEach(e=>e.textContent=to);return;}
 const up=to>from,t0=performance.now(),D=650;if(up&&typeof coinBurst==='function')coinBurst(to-from);document.querySelectorAll('.coinFab,.coinPill').forEach(e=>{e.classList.remove('bump','up','down');void e.offsetWidth;e.classList.add('bump',up?'up':'down');});
 (function step(t){const k=Math.min(1,(t-t0)/D),v=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));els.forEach(e=>e.textContent=v);if(k<1)requestAnimationFrame(step);})(t0);}

// ===================== 平板 App：玩家資料、徽章收藏、物件商店、我的物件 =====================
let tabPage=null,shopF='all',invF='all',phBrowse=false;
function openTabletHome(){if($('phH').style.display==='flex'&&!phBrowse)return;phBrowse=true;$('phH').classList.add('browse');const d=new Date();$('hClock').textContent=d.toLocaleTimeString(LOC(),{hour:'2-digit',minute:'2-digit',hour12:false});$('hDate').textContent=d.toLocaleDateString(LOC(),{month:'long',day:'numeric',weekday:'long'});$('phH').style.display='flex';sfx.click();}
function closeTabletHome(){if(!phBrowse)return;phBrowse=false;$('phH').classList.remove('browse');$('phH').style.display='none';}
function openApp(p,arg){goApp(p,arg);}
function closeApp(){$('tabApp').hidden=true;$('tabDet').hidden=true;tabPage=null;tabArg=null;tabStack=[];}
const T_TITLE={map:'關卡地圖',profile:'玩家資料',badges:'徽章收藏',shop:'物件商店',inv:'我的物件',album:'相簿',photo:'照片'};
const T_IC={map:'map',profile:'user',badges:'medal',shop:'shop',inv:'bag',album:'photo',photo:'photo'};
function renderApp(){if(!tabPage)return;$('tabT').innerHTML=icon(T_IC[tabPage])+'<span>'+esc(tr(T_TITLE[tabPage]))+'</span>';updCoins();
 const B=$('tabBody');B.className='tabBody pg-'+tabPage;void B.offsetWidth;B.classList.add('pgIn');B.innerHTML=({map:pgMap,profile:pgProfile,badges:pgBadges,shop:pgShop,inv:pgInv,album:pgAlbum,photo:pgPhoto})[tabPage]();B.scrollTop=0;}
function starsTxt(n){return '★'.repeat(n)+'☆'.repeat(3-n);}
function pgProfile(){const done=[0,1,2,3].filter(i=>SAVE.done[i]).length,nb=Object.keys(SAVE.badges).length,top=[...BADGES].reverse().find(b=>SAVE.badges[b.id]);
 return '<div class="pfTop"><span class="pfAv">'+(storyImg('student')?'<img alt="" src="'+storyImg('student').src+'">':'🧑‍🎓')+'</span><div><b>'+esc(tr('高中生'))+'</b><small>'+esc(tr('騎樓改善計畫負責人'))+(top?' ・ '+esc(tr(top.name)):'')+'</small></div></div>'+
 '<div class="pfStats"><div><span>'+icon('coin')+'<b class="coinN">'+SAVE.coins+'</b></span><small>'+esc(tr('金幣'))+'</small></div><div><span><b>'+done+'</b> / 4</span><small>'+esc(tr('完成的關卡'))+'</small></div><div><span><b>'+nb+'</b> / '+BADGES.length+'</span><small>'+esc(tr('取得的徽章'))+'</small></div></div>'+
 '<div class="pfBar"><i style="width:'+Math.round(done/4*100)+'%"></i></div><small class="pfNote">'+esc(tr('遊戲完成進度 {p}%',{p:Math.round(done/4*100)}))+'</small>'+
 '<h4>'+esc(tr('各關成績'))+'</h4><ul class="pfLv">'+[0,1,2,3].map(i=>'<li><span>'+esc(lvTitle(i))+'</span><span class="st">'+(SAVE.done[i]?starsTxt(SAVE.best[i]||0):esc(tr('尚未完成')))+'</span>'+(SAVE.done[i]?'<button class="btn chip" data-replay="'+i+'">'+icon('restart')+esc(tr('再玩一次'))+'</button>':'')+'</li>').join('')+'</ul>'+
 '<p class="pfHint">'+esc(tr('完成委託可以獲得金幣；重玩時拿到更好的成績，會補發差額。'))+'</p>';}
function pgBadges(){return '<p class="bkIntro">'+esc(tr('完成任務就能收集徽章。點一下徽章可以看詳細內容。'))+'</p><div class="album">'+BADGES.map(b=>{const got=SAVE.badges[b.id];return '<button class="bdg '+(got?'got':'lock')+'" data-badge="'+b.id+'"><span class="bdgIc">'+(got?(b.img?'<img alt="" src="'+b.img+'">':esc(b.ic)):icon('lock'))+'</span><b>'+esc(tr(b.name))+'</b><small>'+esc(got?tr('已取得'):tr('未取得'))+'</small></button>';}).join('')+'</div>';}
function itemCard(it,mode){const own=SAVE.owned[it.id],eq=SAVE.equip[it.id];
 const tag='<span class="itTag '+it.type+'">'+esc(it.type==='u'?tr('通用物件'):tr('關卡限定'))+'</span>';
 const st=mode==='shop'?(own?'<button class="btn chip" disabled>'+icon('check')+esc(tr('已購買'))+'</button>':'<button class="btn chip '+(SAVE.coins<it.price?'':'pri')+'" data-buy="'+it.id+'">'+icon('coin')+it.price+'</button>')
  :'<button class="btn chip '+(eq?'pri':'')+'" data-equip="'+it.id+'">'+(eq?icon('check')+esc(tr('已配置')):esc(tr('配置到關卡')))+'</button>';
 return '<div class="it"><button class="itPic" data-item="'+it.id+'">'+iIc(it)+'</button><div class="itInfo"><b>'+esc(tr(it.name))+'</b>'+tag+'<small>'+icon('map')+esc(itemLevels(it))+'</small>'+(mode==='shop'?'<small class="price">'+icon('coin')+it.price+' '+esc(tr('金幣'))+(own?' ・ '+esc(tr('已購買')):'')+'</small>':'')+'</div>'+st+'</div>';}
const filt=(L,f)=>L.filter(it=>f==='all'||it.type===f);
const tabsHTML=(cur,key)=>'<div class="fTabs">'+[['all','全部'],['u','通用物件'],['l','關卡限定']].map(([k,l])=>'<button class="btn chip '+(cur===k?'pri':'')+'" data-'+key+'="'+k+'">'+esc(tr(l))+'</button>').join('')+'</div>';
function pgShop(){return tabsHTML(shopF,'sf')+'<p class="bkIntro">'+esc(tr('用完成委託賺來的金幣購買物件。購買後永久擁有，到「我的物件」選擇要不要配置到關卡。'))+'</p><div class="shelf">'+filt(ITEMS,shopF).map(it=>itemCard(it,'shop')).join('')+'</div>';}
function pgInv(){const L=filt(ITEMS.filter(it=>SAVE.owned[it.id]),invF);
 return tabsHTML(invF,'if')+'<p class="bkIntro">'+esc(tr('選「配置到關卡」的物件，會出現在適用關卡的物件清單裡（第一關會放在牆邊空地）。關卡限定物件只會出現在指定的關卡。'))+'</p>'+
 (L.length?'<div class="shelf inv">'+L.map(it=>itemCard(it,'inv')).join('')+'</div>':'<div class="empty">'+icon('bag')+'<p>'+esc(tr('還沒有物件。去物件商店看看吧！'))+'</p><button class="btn pri" data-go="shop">'+icon('shop')+esc(tr('物件商店'))+'</button></div>');}
function detail(html){$('tabDetIn').innerHTML=html;$('tabDet').hidden=false;}
function badgeDetail(id){const b=BADGES.find(x=>x.id===id),got=SAVE.badges[id];
 detail('<span class="dtIc '+(got?'':'lock')+'">'+(got?bIc(b):icon('lock'))+'</span><h3>'+esc(tr(b.name))+'</h3><p class="dtCond"><b>'+esc(tr('獲得條件'))+'</b>'+esc(tr(b.cond))+'</p>'+(got?'<p>'+esc(tr(b.desc))+'</p><p class="dtDate">'+esc(tr('取得日期：{d}',{d:new Date(got).toLocaleDateString(LOC())}))+'</p>':'<p class="dtLock">'+esc(tr('還沒取得。完成條件就會自動獲得！'))+'</p>'));}
function itemDetail(id){const it=ITEMS.find(x=>x.id===id),own=SAVE.owned[id];
 detail('<span class="dtIc">'+iIc(it)+'</span><h3>'+esc(tr(it.name))+'</h3><p>'+esc(tr(it.desc))+'</p><ul class="dtList"><li><b>'+esc(tr('物件類型'))+'</b>'+esc(it.type==='u'?tr('通用物件'):tr('關卡限定'))+'</li><li><b>'+esc(tr('適用關卡'))+'</b>'+esc(itemLevels(it))+'</li><li><b>'+esc(tr('價格'))+'</b>'+icon('coin')+it.price+'</li><li><b>'+esc(tr('狀態'))+'</b>'+esc(own?(SAVE.equip[id]?tr('已購買・已配置'):tr('已購買・未配置')):tr('未購買'))+'</li></ul>');}
function replayLevel(i,force){if(!SAVE.done[i]&&!force)return;closeApp();closeTabletHome();$('phone').style.display='none';$('note').style.display='none';$('title').style.display='none';
 if(i===0){if(typeof Stage3D!=='undefined')transition(()=>{story=null;$('game').style.display='none';playSong('play');setMusic(1);Stage3D.start();},'Loading',1000);}
 else transition(()=>{Stage3D.stop();$('st3').style.display='none';$('game').style.display='';char=STUDENT;setAv();story=null;playSong('play');loadLevel(i);showPhone();},'Loading Lv'+(i+1),1000);}
document.addEventListener('click',e=>{const t=e.target.closest('[data-app],[data-badge],[data-item],[data-buy],[data-equip],[data-sf],[data-if],[data-go],[data-replay],[data-photo],[data-pdel]');if(!t)return;
 const d=t.dataset;
 if(d.app){openApp(d.app);return;}
 if(d.badge){badgeDetail(d.badge);sfx.click();return;}
 if(d.item){itemDetail(d.item);sfx.click();return;}
 if(d.sf){shopF=d.sf;renderApp();return;}if(d.if){invF=d.if;renderApp();return;}if(d.go){openApp(d.go);return;}
 if(d.replay){const i=+d.replay;if(inLevel())confirmBox(tr('現在離開，這一關目前的擺放和進度不會保存（金幣、徽章不受影響）。確定要去玩別的關卡嗎？'),tr('確定離開'),tr('留在這一關'),()=>replayLevel(i));else replayLevel(i);return;}
 if(d.photo){goApp('photo',d.photo);return;}
 if(d.pdel){const id=d.pdel;confirmBox(tr('確定要刪除這張照片嗎？刪除後就找不回來了。'),tr('刪除'),tr('取消'),async()=>{try{await photoDel(id);}catch(e){}gToast(icon('trash')+esc(tr('照片已刪除')));tabBackFn();});return;}
 if(d.buy){const it=ITEMS.find(x=>x.id===d.buy),r=buyItem(d.buy);
  if(r.err==='poor'){sfx.coinNo();gToast(icon('coin')+esc(tr('金幣不夠喔！還差 {n} 金幣。',{n:it.price-SAVE.coins})));}
  else if(r.err==='owned'){gToast(esc(tr('已經擁有這個物件了。')));}
  else if(r.ok){sfx.coinBuy();gToast(icon('bag')+esc(tr('購買成功：{n}',{n:tr(it.name)})));announce({nb:r.nb});renderApp();}return;}
 if(d.equip){const on=!SAVE.equip[d.equip];setEquip(d.equip,on);sfx[on?'happy':'click']();gToast(esc(on?tr('已配置：下次進入適用的關卡就能使用'):tr('已取消配置')));renderApp();}});

// ===== 2D 關卡評分（與 3D 第一關相同的四項標準，各 25 分）=====
function score2(){const C=[],cat=(k,n)=>{const c={k,name:n,score:25,max:25,reasons:[]};C.push(c);return c;},ded=(c,p,t,v)=>{if(p<=0)return;c.score=Math.max(0,c.score-p);c.reasons.push(tr(t,v));};
 const items=S.placed.filter(p=>!p.f),stk=S.placed.filter(p=>p.f);
 const c1=cat('pass','行人通行空間');const nB=items.filter(isBad).length;if(nB)ded(c1,nB*6,'有 {n} 件物件擋在黃色通道上，行人得繞路或側身通過。',{n:nB});
 const edge=items.filter(p=>!isBad(p)&&!p.zone&&p.y>BAND[0]-16&&p.y<=BAND[0]).length;if(edge)ded(c1,Math.min(6,edge*2),'有 {n} 件物件緊貼著通道邊緣，行人經過容易擦撞。',{n:edge});
 const c2=cat('place','物件擺放位置');
 if(!items.length)ded(c2,15,'沒有擺放任何店家或住戶需要的物件，騎樓的使用需求沒有被照顧到。');
 else{const types=new Set(items.map(p=>p.e||p.name)).size;if(types<2)ded(c2,8,'只擺了一種物件，想想委託人還需要什麼。');else if(types<3)ded(c2,4,'可以再多照顧一些使用需求（試試三種以上的物件）。');if(items.length>12)ded(c2,5,'物件放太多了，騎樓會變得擁擠。');}
 const c3=cat('rule','騎樓使用規範');
 const nF=items.filter(p=>!p.zone&&p.y>=BAND[1]).length;if(nF)ded(c3,nF*6,'有 {n} 件物件放在通道和馬路之間的騎樓前緣，會擋住從馬路走上騎樓的人。',{n:nF});
 const nS=items.filter(p=>p.e==='🛵'&&!p.zone).length;if(nS)ded(c3,Math.min(8,nS*4),'機車停在騎樓裡會佔用大家的空間，盡量停到路邊的機車格。');
 if(!stk.length)ded(c3,3,'可以在通道上貼地面指引貼（例如前進方向、行人通行），提醒大家騎樓要讓路。');
 const c4=cat('overlap','避免重疊與阻礙');if(fails2)ded(c4,Math.min(12,fails2*3),'有 {n} 次想把物件疊在別的物件上（已被擋下）。',{n:fails2});
 let tight=0;for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=foot2(items[i]),b=foot2(items[j]);if(Math.max(a.x0-b.x1,b.x0-a.x1,a.y0-b.y1,b.y0-a.y1)<6)tight++;}
 let ovl=0;for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(ov2(foot2(items[i]),foot2(items[j])))ovl++;
 if(ovl)ded(c4,Math.min(14,ovl*4),'有 {n} 組物件疊在一起或擠在同一個位置，不穩又不好使用。',{n:ovl});
 if(tight-ovl>0)ded(c4,Math.min(8,(tight-ovl)*2),'有 {n} 組物件貼得太緊，使用時會卡住。',{n:tight-ovl});
 const total=C.reduce((s,c)=>s+c.score,0);return{C,total,stars:total>=85?3:total>=65?2:1};}
const catsHTML=C=>C.map(c=>`<div class="rc"><div class="rcH"><b>${esc(tr(c.name))}</b><span>${c.score} / ${c.max}</span></div><div class="bar"><i style="width:${c.score/c.max*100}%"></i></div>${c.reasons.length?'<ul>'+c.reasons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="okp">✓ '+esc(tr('做得很好！'))+'</p>'}</div>`).join('');
function showScore2(r,rw){showScore2.rw=rw||showScore2.rw;rw=showScore2.rw;$('score2').innerHTML=`<div class="card s2"><div class="r3top"><span class="stars">${'★'.repeat(r.stars)+'☆'.repeat(3-r.stars)}</span><b>${esc(tr('總分 {n} / 100',{n:r.total}))}</b></div>${rw?coinLine(rw):''}${catsHTML(r.C)}</div>`;}
function coinLine(rw){return '<div class="coinLn">'+icon('coin')+esc(rw.gain?tr('獲得 {n} 金幣',{n:rw.gain}):tr('這個成績的金幣已經領過了（最佳：{s}）',{s:'★'.repeat(rw.best)}))+'</div>'+(rw.nb&&rw.nb.length?'<div class="nbLn">'+rw.nb.map(b=>'<span>'+bIc(b)+esc(tr(b.name))+'</span>').join('')+'</div>':'');}

// ===== 遊戲教學（開始整理前出現；HUD 的「❓ 玩法說明」可再打開）=====
let tutCb=null;
function showTut(mode,cb){const t=$('tut');t.querySelectorAll('[data-m]').forEach(e=>{const m=e.dataset.m;e.style.display=(m===mode||(m==='park'&&(mode==='3d'||(LV&&LV.zone))))?'':'none';});t.style.display='flex';tutCb=cb||null;$('tutGo').focus();}
$('tutGo').onclick=()=>{audioInit();sfx.ding();$('tut').style.display='none';const c=tutCb;tutCb=null;if(c)c();};
$('helpB').onclick=()=>{sfx.click();showTut('2d');};
[['sideTog3','#st3 .in'],['sideTog2','#app']].forEach(([b,c])=>{const box=document.querySelector(c);try{if(localStorage.getItem('qlz-side')==='col')box.classList.add('colSide');}catch(e){}
 $(b).onclick=()=>{const on=!box.classList.contains('colSide');box.classList.toggle('colSide',on);try{localStorage.setItem('qlz-side',on?'col':'open');}catch(e){}sfx.click();};});
$('tabBtn').onclick=()=>{audioInit();phBrowse||$('phH').style.display!=='flex'?openTabletHome():openApp('profile');};
$('coinFab').onclick=()=>{audioInit();openApp('profile');};
$('phX').onclick=()=>{sfx.click();closeTabletHome();};$('tabBack').onclick=tabBackFn;$('tabDetX').onclick=()=>{sfx.click();$('tabDet').hidden=true;};
$('fsBtn').onclick=toggleFs;$('mapB').onclick=()=>{audioInit();openApp('map');};$('camBtn').onclick=takePhoto;updFs();coinShown=SAVE.coins;
$('tabApp').addEventListener('click',e=>{if(e.target.id==='tabApp')closeApp();});
updCoins();
$('rotX').onclick=()=>{document.documentElement.classList.add('rotOk');try{sessionStorage.setItem('qlz-rot-ok','1');}catch(e){}};

// ===== 音效設定面板 =====
function audUI(){$('aCOn').checked=AUD.cOn!==false;$('aMOn').checked=AUD.mOn;$('aSOn').checked=AUD.sOn;$('aMV').value=Math.round(AUD.mv*100);$('aSV').value=Math.round(AUD.sv*100);$('aMVo').textContent=$('aMV').value+'%';$('aSVo').textContent=$('aSV').value+'%';
 $('aMV').disabled=!AUD.mOn||AUD.mute;$('aSV').disabled=!AUD.sOn||AUD.mute;$('aMute').innerHTML=AUD.mute?icon('sound')+esc(tr('恢復聲音')):icon('mute')+esc(tr('全部靜音'));$('aMute').classList.toggle('pri',AUD.mute);
 const silent=AUD.mute||(!AUD.mOn&&!AUD.sOn);$('audBtn').innerHTML=icon(silent?'mute':'sound');$('muteB').innerHTML=icon(silent?'mute':'sound');}
$('audBtn').onclick=()=>{audioInit();const p=$('audPanel');p.hidden=!p.hidden;audUI();};
$('audX').onclick=()=>{$('audPanel').hidden=true;};
$('aMOn').onchange=e=>{audioInit();AUD.mOn=e.target.checked;if(AUD.mOn)AUD.mute=false;saveAud();applyAudio();};
$('aSOn').onchange=e=>{audioInit();AUD.sOn=e.target.checked;if(AUD.sOn)AUD.mute=false;saveAud();applyAudio();if(AUD.sOn)sfx.ding();};
$('aCOn').onchange=e=>{audioInit();AUD.cOn=e.target.checked;saveAud();if(AUD.cOn)sfx.coinGet();};
$('aMV').oninput=e=>{audioInit();AUD.mv=e.target.value/100;saveAud();applyAudio();};
$('aSV').oninput=e=>{audioInit();AUD.sv=e.target.value/100;saveAud();applyAudio();};
$('aSV').onchange=()=>sfx.ding();
$('aMute').onclick=()=>{audioInit();AUD.mute=!AUD.mute;saveAud();applyAudio();};
$('aTest').onclick=()=>{audioInit();sfx.done();};
document.addEventListener('pointerdown',e=>{const p=$('audPanel');if(!p.hidden&&!e.target.closest('#audPanel,#audBtn'))p.hidden=true;});
// 按鈕點擊回饋音（輕）
document.addEventListener('click',e=>{const b=e.target.closest('button.btn');if(b&&!b.disabled&&!b.closest('#audPanel'))sfx.click();});

// ===== 語言切換：只換文字，不重新載入、不重置進度 =====
function nextLangLabel(){const i=LANG_LIST.findIndex(x=>x[0]===LANG),n=LANG_LIST[(i+1)%LANG_LIST.length];return n[1];}
$('langBtn').onclick=()=>{const i=LANG_LIST.findIndex(x=>x[0]===LANG);setLang(LANG_LIST[(i+1)%LANG_LIST.length][0]);};
langHooks.push(()=>{const c3=$('coin3');if(c3&&c3._rw)c3.innerHTML=coinLine(c3._rw);});
langHooks.push(()=>{
 $('langBtn').textContent=nextLangLabel();audUI();
 if(LV)lvLabel();if(msgFn)msg.textContent=msgFn();if(S&&stage>=1&&stage<4)status();
 if(pal.children.length)buildPal();
 if($('phone').style.display==='flex')fillPhone();if($('note').style.display==='flex')fillNote();
 if($('phH').style.display==='flex'){const d=new Date();$('hClock').textContent=d.toLocaleTimeString(LOC(),{hour:'2-digit',minute:'2-digit',hour12:false});$('hDate').textContent=d.toLocaleDateString(LOC(),{month:'long',day:'numeric',weekday:'long'});}
 if(cmp.style.display==='block'&&$('score2').innerHTML)showScore2(score2());
 if(typeof Stage3D!=='undefined')Stage3D.relang();
 if(tabPage)renderApp();updCoins();updFs();
 if(S)render();});
reset();
setLang(LANG,true);