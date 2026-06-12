import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import BacktestChartPanel from "./backtest/BacktestChartPanel";
import CommitBacktestModal from "./backtest/CommitBacktestModal";
import type { DraftBacktestTrade } from "./backtest/tv-mapping";

// ─── Engine (compact) ───
const calcR=(e:number,sl:number,ex:number)=>(!e||!sl||ex==null||e===sl)?null:(ex-e)/(e-sl);
const autoDir=(e:number,sl:number)=>(!e||!sl)?"":e>sl?"Long":sl>e?"Short":"";
const parseDT=(s:string)=>{if(!s)return null;const m=s.match(/(\d{2})[/.](\d{2})[/.](\d{4})\s+(\d{2}):(\d{2})/);return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]):null;};
const durCalc=(a:any,b:any)=>{const d1=typeof a==="string"?parseDT(a):a,d2=typeof b==="string"?parseDT(b):b;if(!d1||!d2)return null;let df=Math.abs(+d2-+d1);const D=Math.floor(df/864e5);df%=864e5;const H=Math.floor(df/36e5);df%=36e5;return{t:`${D}d ${H}h ${Math.floor(df/6e4)}m`,ms:Math.abs(+d2-+d1)};};
const avg=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const med=(a:number[])=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length&1?s[m]:(s[m-1]+s[m])/2;};
const zFilt=(a:number[],th=2.5)=>{if(a.length<3)return a;const m=avg(a),sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length);return sd===0?a:a.filter(v=>Math.abs((v-m)/sd)<=th);};
const computeAll=(trades:any[])=>{const v=trades.filter((t:any)=>t.r!=null);const w=v.filter((t:any)=>t.r>0),l=v.filter((t:any)=>t.r<0);const wR=w.map((t:any)=>t.r),aR=v.map((t:any)=>t.r);const wp=v.length?w.length/v.length:0,lp=v.length?l.length/v.length:0;const ev=wp*avg(wR)-lp*avg(l.map((t:any)=>Math.abs(t.r))),totR=aR.reduce((a:number,b:number)=>a+b,0);const maeW=w.filter((t:any)=>t.maeR!=null).map((t:any)=>Math.abs(t.maeR)),maeF=zFilt(maeW,2);const maeDist=[.25,.5,.75].map(th=>({th,pct:maeF.length?maeF.filter((x:number)=>x<=th).length/maeF.length:0}));const d1=v.length?parseDT(v[0].entryDT):null,d2=v.length?parseDT(v[v.length-1].exitDT||v[v.length-1].entryDT):null;const sysDur=d1&&d2?durCalc(d1,d2):null,sysDays=sysDur?sysDur.ms/864e5:1;const rtr=(m:number)=>sysDays>0?(totR/sysDays)*m:0;const byDir=(dr:string)=>{const f=v.filter((t:any)=>t.dir===dr),fw=f.filter((t:any)=>t.r>0),fl=f.filter((t:any)=>t.r<0);return{n:f.length,w:fw.length,l:fl.length,be:f.filter((t:any)=>t.r===0).length,wp:f.length?fw.length/f.length:0,avgR:avg(f.map((t:any)=>t.r)),totR:f.map((t:any)=>t.r).reduce((a:number,b:number)=>a+b,0),avgWR:avg(fw.map((t:any)=>t.r)),avgLR:avg(fl.map((t:any)=>Math.abs(t.r)))};};const eq=v.reduce((a:any[],t:any,i:number)=>{const p=i>0?a[i-1].c:0;a.push({x:i+1,c:+(p+t.r).toFixed(2),r:+t.r.toFixed(2)});return a;},[]);let cs=0,mxW=0,mxL=0;v.forEach((t:any)=>{if(t.r>0){cs=cs>0?cs+1:1;mxW=Math.max(mxW,cs);}else if(t.r<0){cs=cs<0?cs-1:-1;mxL=Math.max(mxL,Math.abs(cs));}else cs=0;});const coins:any={};v.forEach((t:any)=>{if(!t.coin)return;if(!coins[t.coin])coins[t.coin]={n:0,w:0,l:0,totR:0};coins[t.coin].n++;if(t.r>0)coins[t.coin].w++;else if(t.r<0)coins[t.coin].l++;coins[t.coin].totR+=t.r;});Object.values(coins).forEach((c:any)=>{c.wp=c.n?c.w/c.n:0;});const dayN=["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"],monN=["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ"],qmN=["Q1","Q2","Q3","Q4"];const getQM=(d:Date)=>{const x=d.getDate();return x<=7?0:x<=14?1:x<=21?2:3;};const buildMat=(fl:any[],kFn:(d:Date)=>number,keys:number[])=>{const m:any={};keys.forEach(k=>{m[k]={n:0,w:0,l:0,be:0,totR:0};});fl.forEach((t:any)=>{const d=parseDT(t.exitDT||t.entryDT);if(!d)return;const k=kFn(d);if(m[k]){m[k].n++;if(t.r>0)m[k].w++;else if(t.r<0)m[k].l++;else m[k].be++;m[k].totR+=t.r;}});return m;};const buildAll=(f:any[])=>({wd:buildMat(f,(d:Date)=>d.getDay(),[0,1,2,3,4,5,6]),qm:buildMat(f,getQM,[0,1,2,3]),mo:buildMat(f,(d:Date)=>d.getMonth(),[0,1,2,3,4,5,6,7,8,9,10,11])});return{n:v.length,w:w.length,l:l.length,be:v.filter((t:any)=>t.r===0).length,wp,lp,ev,totR,avgR:avg(aR),avgWR:avg(wR),avgLR:avg(l.map((t:any)=>Math.abs(t.r))),medR:med(aR),medWR:med(wR),maxWR:wR.length?Math.max(...wR):0,maxLR:l.length?Math.max(...l.map((t:any)=>Math.abs(t.r))):0,maeDist,sysDur,rtr:{d:rtr(1),w:rtr(7),m:rtr(30.44),q:rtr(91.31),y:rtr(365.25)},lo:byDir("Long"),sh:byDir("Short"),eq,dayN,monN,qmN,coins,macro:{all:buildAll(v),lo:buildAll(v.filter((t:any)=>t.dir==="Long")),sh:buildAll(v.filter((t:any)=>t.dir==="Short"))},mxW,mxL};};

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fm=(v:any,d=2)=>v!=null&&!isNaN(v)?Number(v).toFixed(d):"—";const fp=(v:any)=>v!=null?(v*100).toFixed(1)+"%":"—";const rc=(v:number)=>v>0?"#0ecb81":v<0?"#f6465d":"#6b7280";
const emptyRow=()=>({id:uid(),coin:"",entryDT:"",exitDT:"",entry:"",sl:"",exit:"",mfeP:"",maeP:"",notes:"",chartE:"",chartX:"",dir:"",r:null as number|null,mfeR:null as number|null,maeR:null as number|null,dur:""});
const recalc=(t:any)=>{const e=parseFloat(t.entry),sl=parseFloat(t.sl),ex=parseFloat(t.exit),mfe=parseFloat(t.mfeP),mae=parseFloat(t.maeP);t.dir=autoDir(e,sl);t.r=(e&&sl&&ex)?calcR(e,sl,ex):null;t.mfeR=(e&&sl&&mfe)?calcR(e,sl,mfe):null;t.maeR=(e&&sl&&mae)?calcR(e,sl,mae):null;const d=durCalc(t.entryDT,t.exitDT);t.dur=d?d.t:"";return t;};
import { scopedStorage } from '@/lib/scoped-storage';
import { useLang } from '@/hooks/use-lang';
// ─── Multi-strategy storage ───
// Each strategy is a fully isolated workbook with its own trades, analytics & equity.
// v14 schema: {strategies:[{id,name,trades:[]}], activeId}. v13 (flat array) migrates
// into a single "Default" strategy automatically on first load.
type BTStrategy = { id: string; name: string; trades: any[] };
type BTState = { strategies: BTStrategy[]; activeId: string };
const SK = "orca-bt-v14";
const SK_OLD = "orca-bt-v13";
const makeDefaultState = (seedTrades: any[] = []): BTState => {
  const id = uid();
  return { strategies: [{ id, name: 'Default', trades: seedTrades }], activeId: id };
};
const loadState = async (): Promise<BTState> => {
  try {
    const r = await scopedStorage.getItem(SK);
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed && Array.isArray(parsed.strategies) && parsed.strategies.length) {
        if (!parsed.strategies.find((s: BTStrategy) => s.id === parsed.activeId)) {
          parsed.activeId = parsed.strategies[0].id;
        }
        return parsed as BTState;
      }
    }
    // Migrate v13 flat array → single "Default" strategy.
    const old = await scopedStorage.getItem(SK_OLD);
    const arr = old ? JSON.parse(old) : [];
    return makeDefaultState(Array.isArray(arr) ? arr : []);
  } catch {
    return makeDefaultState();
  }
};
const persistState = async (s: BTState) => { try { await scopedStorage.setItem(SK, JSON.stringify(s)); } catch {} };

// ─── Bilingual labels ───
type BTLang = 'he' | 'en';
const BT_STR = {
  he: {
    appName: 'יומן באק-טסט', enter: 'כניסה למערכת', skip: 'דלג', back: 'חזרה ל-OrcaInvestment',
    locked: 'המערכת נעולה', unlock: 'פתח נעילה', loading: 'טוען...',
    deleteQ: 'למחוק?', del: 'מחק', cancel: 'ביטול', saveTrade: 'שמור עסקה',
    editTrade: 'עריכת עסקה', newTrade: 'עסקה חדשה',
    chart: 'גרף', import: 'ייבוא', exportJson: 'JSON', exportCsv: 'CSV',
    tabs: { chart: 'גרף', trades: 'עסקאות', analytics: 'ניתוח', macro: 'מאקרו', equity: 'עקומה' },
    quick: 'מהיר', coin: 'מטבע', entry: 'כניסה', sl: 'סטופ', exit: 'יציאה',
    fullForm: 'טופס מלא', filter: 'סינון', all: 'הכל', long: 'לונג', short: 'שורט',
    allCoins: 'כל המטבעות', search: 'חיפוש...', newToOld: 'חדש→ישן', oldToNew: 'ישן→חדש',
    direction: 'כיוון', status: 'סטטוס', auto: '⚡ אוטומטי',
    liveDemo: 'הדגמה חיה — מילוי עסקה', soSimple: 'ככה פשוט! עכשיו תורך 🚀', firstTrade: '+ הוסף עסקה ראשונה',
    ready: 'מוכן להתחיל', firstTradeBtn: '+ עסקה ראשונה', demoLink: 'הדגמה',
    win: 'ניצחון', ev: 'תוחלת', totalR: 'סה״כ R', avg: 'ממוצע', median: 'חציון', maxLbl: 'מקסימלי', streak: 'רצף',
    noResults: 'אין תוצאות', totalReturn: 'תשואה כוללת', trades: 'עסקאות',
    byCoin: 'לפי מטבע', averages: 'ממוצעים', general: 'כללי', loss: 'הפסד', total: 'סה״כ',
    returnTime: 'תשואה/זמן', daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי', quarterly: 'רבעוני', yearly: 'שנתי',
    day: 'יום', quarter: 'רבע', month: 'חודש',
    equityCurve: 'עקומת הון', rPerTrade: 'R לכל עסקה', drawdown: 'Drawdown', maxDd: 'מקסימלי',
    addTrades: 'הוסף עסקאות',
    // Tutorial demo rows
    demoCoin: { l: 'מטבע', d: 'שם המטבע שנסחר' },
    demoEntry: { l: 'כניסה $', d: 'מחיר הכניסה לעסקה' },
    demoSl: { l: 'סטופ $', d: 'מחיר הסטופ לוס' },
    demoExit: { l: 'יציאה $', d: 'מחיר היציאה בפועל' },
    demoEntryDT: { l: 'זמן כניסה', d: 'מתי נכנסת לעסקה' },
    demoExitDT: { l: 'זמן יציאה', d: 'מתי סגרת' },
    demoMfeP: { l: 'MFE $', d: 'המחיר הכי טוב לטובתך' },
    demoMaeP: { l: 'MAE $', d: 'המחיר הכי גרוע נגדך' },
    demoChartE: { l: 'צילום כניסה', d: 'לינק לצילום TradingView' },
    demoChartX: { l: 'צילום יציאה', d: 'צילום מסך יציאה' },
    // Form sections
    secTrade: 'פרטי העסקה', secDates: 'תאריכים', secMfeMae: 'MFE / MAE', optional: 'אופציונלי',
    secMedia: 'צילומים והערות',
    fldEntryPrice: 'מחיר כניסה', fldSl: 'סטופ לוס', fldExitPrice: 'מחיר יציאה',
    fldEntryDT: 'זמן כניסה', fldExitDT: 'זמן יציאה',
    fldChartE: 'צילום כניסה', fldChartX: 'צילום יציאה', fldNotes: 'הערות',
    // Table cols
    colDir: 'כיוון', colTime: 'זמן', colDur: 'משך',
    strategy: 'אסטרטגיה', allStrategies: 'כל האסטרטגיות', strategyPh: 'שם אסטרטגיה',
  },

  en: {
    appName: 'Backtest Journal', enter: 'Enter System', skip: 'Skip', back: 'Back to OrcaInvestment',
    locked: 'System Locked', unlock: 'Unlock', loading: 'Loading...',
    deleteQ: 'Delete?', del: 'Delete', cancel: 'Cancel', saveTrade: 'Save Trade',
    editTrade: 'Edit Trade', newTrade: 'New Trade',
    chart: 'Chart', import: 'Import', exportJson: 'JSON', exportCsv: 'CSV',
    tabs: { chart: 'Chart', trades: 'Trades', analytics: 'Analytics', macro: 'Macro', equity: 'Equity' },
    quick: 'Quick', coin: 'Coin', entry: 'Entry', sl: 'Stop', exit: 'Exit',
    fullForm: 'Full form', filter: 'Filter', all: 'All', long: 'Long', short: 'Short',
    allCoins: 'All coins', search: 'Search...', newToOld: 'New→Old', oldToNew: 'Old→New',
    direction: 'Direction', status: 'Status', auto: '⚡ Auto',
    liveDemo: 'Live demo — filling a trade', soSimple: "That's it! Your turn 🚀", firstTrade: '+ Add first trade',
    ready: 'Ready to start', firstTradeBtn: '+ First trade', demoLink: 'Demo',
    win: 'Win', ev: 'EV', totalR: 'Total R', avg: 'Avg', median: 'Median', maxLbl: 'Max', streak: 'Streak',
    noResults: 'No results', totalReturn: 'Total Return', trades: 'trades',
    byCoin: 'By Coin', averages: 'Averages', general: 'All', loss: 'Loss', total: 'Total',
    returnTime: 'Return/Time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
    day: 'Day', quarter: 'Quarter', month: 'Month',
    equityCurve: 'Equity Curve', rPerTrade: 'R per trade', drawdown: 'Drawdown', maxDd: 'Max',
    addTrades: 'Add trades',
    demoCoin: { l: 'Coin', d: 'Traded asset symbol' },
    demoEntry: { l: 'Entry $', d: 'Entry price' },
    demoSl: { l: 'Stop $', d: 'Stop loss price' },
    demoExit: { l: 'Exit $', d: 'Actual exit price' },
    demoEntryDT: { l: 'Entry time', d: 'When you entered' },
    demoExitDT: { l: 'Exit time', d: 'When you closed' },
    demoMfeP: { l: 'MFE $', d: 'Best price in your favor' },
    demoMaeP: { l: 'MAE $', d: 'Worst price against you' },
    demoChartE: { l: 'Entry chart', d: 'TradingView snapshot link' },
    demoChartX: { l: 'Exit chart', d: 'Exit screenshot link' },
    secTrade: 'Trade Details', secDates: 'Dates', secMfeMae: 'MFE / MAE', optional: 'optional',
    secMedia: 'Charts & Notes',
    fldEntryPrice: 'Entry price', fldSl: 'Stop loss', fldExitPrice: 'Exit price',
    fldEntryDT: 'Entry time', fldExitDT: 'Exit time',
    fldChartE: 'Entry chart', fldChartX: 'Exit chart', fldNotes: 'Notes',
    colDir: 'Dir', colTime: 'Time', colDur: 'Duration',
    strategy: 'Strategy', allStrategies: 'All strategies', strategyPh: 'Strategy name',
  },

} as const;

const BL="#2563eb",BL2="#3b82f6",G="#0ecb81",RD="#f6465d",CY="#06b6d4",PU="#a855f7";
const BG="#0c0f14",BG2="#10141b",BG3="#161c26",SURF="#1e2535",BRD="#1e2736",BRDH="#2a3548";
const T1="#e8ecf1",T2="#8896ab",T3="#556277",T4="#2d3a4d";

const css=()=>{if(document.getElementById("o13"))return;const s=document.createElement("style");s.id="o13";s.textContent=`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
.ox{font-family:'Poppins',system-ui,sans-serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}.ox *{font-family:inherit;box-sizing:border-box;}.ox input:focus,.ox select:focus{outline:none;}
@keyframes fi{0%{opacity:0;transform:translateY(6px);}100%{opacity:1;transform:translateY(0);}}
@keyframes pop{0%{opacity:0;transform:scale(.94);}100%{opacity:1;transform:scale(1);}}
@keyframes popBig{0%{opacity:0;transform:scale(.7);}100%{opacity:1;transform:scale(1);}}
@keyframes typeCursor{0%,100%{border-color:${BL};}50%{border-color:transparent;}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes lockGlow{0%,100%{filter:drop-shadow(0 0 0 ${BL});}50%{filter:drop-shadow(0 0 20px ${BL});}}
@keyframes formSlideUp{0%{opacity:0;transform:translateY(30px) scale(.96);}100%{opacity:1;transform:translateY(0) scale(1);}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0);}50%{box-shadow:0 0 20px 4px rgba(37,99,235,.15);}}
.fi{animation:fi .3s ease-out both;}.pop{animation:pop .25s cubic-bezier(.16,1,.3,1) both;}.popBig{animation:popBig .4s cubic-bezier(.16,1,.3,1) both;}
.notion-row{transition:background .1s;}.notion-row:hover{background:${SURF}66;}
@media(max-width:700px){.ox-2col{grid-template-columns:1fr!important;}}
@media(max-width:480px){.ox-qa-row{flex-wrap:wrap!important;}}`;document.head.appendChild(s);};

// ═══════════════════════════════════════════
// TUTORIAL
// ═══════════════════════════════════════════
const makeDemo=(L:BTLang)=>{const S=BT_STR[L];return [
  {k:"coin",l:S.demoCoin.l,v:"BTC",d:S.demoCoin.d},
  {k:"entry",l:S.demoEntry.l,v:"64,250",d:S.demoEntry.d},
  {k:"sl",l:S.demoSl.l,v:"63,800",d:S.demoSl.d},
  {k:"exit",l:S.demoExit.l,v:"65,700",d:S.demoExit.d},
  {k:"entryDT",l:S.demoEntryDT.l,v:"15/03/2025 09:30",d:S.demoEntryDT.d},
  {k:"exitDT",l:S.demoExitDT.l,v:"15/03/2025 16:45",d:S.demoExitDT.d},
  {k:"mfeP",l:S.demoMfeP.l,v:"66,100",d:S.demoMfeP.d},
  {k:"maeP",l:S.demoMaeP.l,v:"63,900",d:S.demoMaeP.d},
  {k:"chartE",l:S.demoChartE.l,v:"tradingview.com/x/aBc12",d:S.demoChartE.d},
  {k:"chartX",l:S.demoChartX.l,v:"tradingview.com/x/xYz99",d:S.demoChartX.d},
];};

function Tutorial({onClose,onStart,L}:{onClose:()=>void;onStart:()=>void;L:BTLang}){
  const S=BT_STR[L];
  const DEMO=useMemo(()=>makeDemo(L),[L]);
  const[step,setStep]=useState(-1);
  const[typed,setTyped]=useState("");
  const[filled,setFilled]=useState<any>({});
  const[mousePos,setMousePos]=useState({x:"50%" as any,y:40});
  const[done,setDone]=useState(false);
  const refs=useRef<any>({});

  useEffect(()=>{const t=setTimeout(()=>setStep(0),600);return()=>clearTimeout(t);},[]);

  useEffect(()=>{
    if(step<0||step>=DEMO.length){if(step>=DEMO.length)setDone(true);return;}
    const s=DEMO[step];
    const el=refs.current[s.k];
    if(el){const r=el.getBoundingClientRect();const ct=el.closest(".tut-wrap")?.getBoundingClientRect()||{left:0,top:0};setMousePos({x:r.left-ct.left+r.width/2,y:r.top-ct.top+14});}
    let cancelled=false;
    const pt=setTimeout(()=>{
      if(cancelled)return;
      setTyped("");
      let i=0;const val=s.v;
      const iv=setInterval(()=>{if(cancelled)return;i++;setTyped(val.slice(0,i));
        if(i>=val.length){clearInterval(iv);setTimeout(()=>{if(cancelled)return;setFilled((p:any)=>({...p,[s.k]:val}));setTimeout(()=>{if(!cancelled)setStep(st=>st+1);},600);},200);}
      },45);
    },800);
    return()=>{cancelled=true;clearTimeout(pt);};
  },[step,DEMO]);

  const liveR=useMemo(()=>{const e=parseFloat((filled.entry||"").replace(/,/g,"")),sl=parseFloat((filled.sl||"").replace(/,/g,"")),ex=parseFloat((filled.exit||"").replace(/,/g,""));return(e&&sl&&ex&&e!==sl)?calcR(e,sl,ex):null;},[filled]);
  const liveDir=useMemo(()=>autoDir(parseFloat((filled.entry||"").replace(/,/g,"")),parseFloat((filled.sl||"").replace(/,/g,""))),[filled]);
  const cur=step>=0&&step<DEMO.length?DEMO[step]:null;

  return <div className="tut-wrap fi" style={{background:BG3,borderRadius:16,padding:"clamp(16px,3vw,24px)",border:`1px solid ${BRD}`,maxWidth:560,margin:"0 auto",position:"relative",overflow:"hidden"}}>
    {!done&&<div style={{position:"absolute",left:mousePos.x,top:mousePos.y,zIndex:50,transition:"all .5s cubic-bezier(.16,1,.3,1)",pointerEvents:"none",marginLeft:-4,marginTop:-2}}>
      <svg width="18" height="18" viewBox="0 0 24 24" style={{filter:`drop-shadow(0 2px 6px rgba(0,0,0,.6))`}}><path d="M5 3l14 8-6 2-4 6z" fill={BL} stroke="#fff" strokeWidth="1.5"/></svg>
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:BL,animation:"pulse 1.5s infinite"}}/><span style={{fontSize:13,fontWeight:700,color:T1}}>{S.liveDemo}</span></div>
      <button onClick={onClose} style={{background:"none",border:"none",color:T3,fontSize:16,cursor:"pointer"}}>×</button>
    </div>
    <div style={{display:"flex",gap:2,marginBottom:12}}>{DEMO.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?BL:T4,transition:"background .3s"}}/>)}</div>
    {cur&&<div className="popBig" key={step} style={{background:`linear-gradient(135deg, ${BL}15, ${PU}08)`,borderRadius:12,padding:"12px 16px",marginBottom:14,borderRight:`3px solid ${BL}`,animation:"glowPulse 2s ease-in-out infinite"}}>
      <div style={{fontSize:14,fontWeight:800,color:BL2}}>{cur.l}</div>
      <div style={{fontSize:12,color:T2,marginTop:3}}>{cur.d}</div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
      {DEMO.map(f=>{
        const isActive=cur&&cur.k===f.k;
        const isFilled=!!filled[f.k];
        const showTyping=isActive&&!isFilled;
        return <div key={f.k} ref={(el:any)=>{if(el)refs.current[f.k]=el;}} style={{position:"relative",transition:"transform .3s",transform:isActive?"scale(1.03)":"scale(1)"}}>
          <div style={{fontSize:9,fontWeight:600,color:isActive?BL:isFilled?G:T3,marginBottom:2,transition:"color .3s"}}>{f.l} {isFilled&&<span style={{color:G}}>✓</span>}</div>
          <div style={{padding:"8px 10px",borderRadius:7,fontSize:12,fontWeight:500,border:`1.5px solid ${isActive?BL:isFilled?G+"44":BRD}`,background:isActive?`${BL}0c`:BG2,color:isFilled?T1:T4,transition:"all .3s",minHeight:34,direction:"ltr",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",animation:isActive?"glowPulse 2s infinite":"none"}}>
            {showTyping?<span>{typed}<span style={{borderLeft:`2px solid ${BL}`,animation:"typeCursor .6s step-end infinite"}}>&nbsp;</span></span>:isFilled?filled[f.k]:"—"}
          </div>
        </div>;
      })}
    </div>
    {liveR!=null&&<div className="popBig" style={{display:"flex",gap:12,justifyContent:"center",padding:"12px 16px",background:`linear-gradient(135deg, ${BL}0a, ${G}08)`,borderRadius:10,marginBottom:14,border:`1px solid ${BL}22`}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:8,color:T3,fontWeight:700}}>{S.direction}</div><div style={{fontSize:16,fontWeight:800,color:liveDir==="Long"?G:RD}}>{liveDir==="Long"?"LONG ↑":"SHORT ↓"}</div></div>
      <div style={{width:1,background:T4}}/>
      <div style={{textAlign:"center"}}><div style={{fontSize:8,color:T3,fontWeight:700}}>R</div><div style={{fontSize:16,fontWeight:800,color:rc(liveR)}}>{fm(liveR)}</div></div>
      <div style={{width:1,background:T4}}/>
      <div style={{textAlign:"center"}}><div style={{fontSize:8,color:T3,fontWeight:700}}>{S.status}</div><div style={{fontSize:12,fontWeight:700,color:BL}}>{S.auto}</div></div>
    </div>}
    {done&&<div className="popBig" style={{textAlign:"center",paddingTop:8}}>
      <div style={{fontSize:15,fontWeight:700,color:G,marginBottom:14}}>{S.soSimple}</div>
      <button onClick={onStart} style={{background:BL,border:"none",borderRadius:10,padding:"12px 32px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 24px ${BL}44`}}>{S.firstTrade}</button>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════
// PREMIUM FORM
// ═══════════════════════════════════════════
const makeSections=(L:BTLang)=>{const S=BT_STR[L];return [
  {title:S.secTrade,icon:"◆",fields:[{k:"coin",l:S.coin,ph:"BTC"},{k:"entry",l:S.fldEntryPrice,ph:"64250",num:true},{k:"sl",l:S.fldSl,ph:"63800",num:true},{k:"exit",l:S.fldExitPrice,ph:"65700",num:true}]},
  {title:S.secDates,icon:"◷",fields:[{k:"entryDT",l:S.fldEntryDT,ph:"15/03/2025 09:30"},{k:"exitDT",l:S.fldExitDT,ph:"15/03/2025 16:45"}]},
  {title:S.secMfeMae,icon:"◈",desc:S.optional,fields:[{k:"mfeP",l:"MFE",ph:"66100",num:true},{k:"maeP",l:"MAE",ph:"63900",num:true}]},
  {title:S.secMedia,icon:"◫",fields:[{k:"chartE",l:S.fldChartE,ph:"https://..."},{k:"chartX",l:S.fldChartX,ph:"https://..."},{k:"notes",l:S.fldNotes,ph:"",full:true}]},
];};

function BTTradeForm({onSave,onClose,initial,L}:{onSave:(t:any)=>void;onClose:()=>void;initial?:any;L:BTLang}){
  const S=BT_STR[L];
  const SECTIONS=useMemo(()=>makeSections(L),[L]);
  const[t,setT]=useState(initial||emptyRow());const set=(k:string,v:string)=>setT((p:any)=>recalc({...p,[k]:v}));
  return <div style={{position:"fixed",inset:0,zIndex:8000,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={(e:any)=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:BG3,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",border:`1px solid ${BRD}`,direction:L==='he'?"rtl":"ltr",animation:"formSlideUp .4s cubic-bezier(.16,1,.3,1)"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${BRD}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:BG3,zIndex:2,borderRadius:"16px 16px 0 0"}}>
        <span style={{fontSize:15,fontWeight:700,color:T1}}>{initial?S.editTrade:S.newTrade}</span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>{t.r!=null&&<div style={{display:"flex",gap:8,alignItems:"center",background:`${BL}0a`,padding:"4px 12px",borderRadius:8}}><span style={{fontSize:12,fontWeight:800,color:t.dir==="Long"?G:RD}}>{t.dir==="Long"?"L↑":"S↓"}</span><span style={{fontSize:12,fontWeight:800,color:rc(t.r)}}>{fm(t.r)}R</span></div>}<button onClick={onClose} style={{background:"none",border:"none",color:T3,fontSize:18,cursor:"pointer"}}>×</button></div>
      </div>
      <div style={{padding:"12px 20px 20px"}}>{SECTIONS.map((sec:any,si:number)=><div key={si} style={{marginBottom:si<SECTIONS.length-1?14:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span style={{fontSize:13,color:BL}}>{sec.icon}</span><span style={{fontSize:12,fontWeight:700,color:T1}}>{sec.title}</span>{sec.desc&&<span style={{fontSize:9,color:T3}}>({sec.desc})</span>}</div>
        <div style={{display:"grid",gridTemplateColumns:sec.fields.length>=2&&!sec.fields.some((f:any)=>f.full)?"1fr 1fr":"1fr",gap:8,background:BG2,borderRadius:10,padding:12,border:`1px solid ${BRD}`}}>
          {sec.fields.map((f:any)=><div key={f.k} style={{gridColumn:f.full?"1/-1":"auto"}}><label style={{fontSize:10,fontWeight:600,color:T3,marginBottom:2,display:"block"}}>{f.l}</label><input value={t[f.k]||""} onChange={(e:any)=>set(f.k,e.target.value)} placeholder={f.ph} dir="ltr" type={f.num?"number":"text"} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${BRD}`,background:BG,fontSize:13,color:T1,transition:"border-color .2s,box-shadow .2s"}} onFocus={(e:any)=>{e.target.style.borderColor=BL;e.target.style.boxShadow=`0 0 0 3px ${BL}15`;}} onBlur={(e:any)=>{e.target.style.borderColor=BRD;e.target.style.boxShadow="none";}}/></div>)}
        </div>
      </div>)}</div>
      <div style={{padding:"12px 20px 16px",borderTop:`1px solid ${BRD}`,display:"flex",gap:8,position:"sticky",bottom:0,background:BG3,borderRadius:"0 0 16px 16px"}}><button onClick={()=>{if(t.coin&&t.entry&&t.sl)onSave(recalc(t));}} style={{flex:1,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",background:(!t.coin||!t.entry||!t.sl)?T4:BL,color:"#fff",fontSize:14,fontWeight:700,opacity:(!t.coin||!t.entry||!t.sl)?.35:1}}>{S.saveTrade}</button><button onClick={onClose} style={{padding:"12px 20px",borderRadius:10,border:`1.5px solid ${BRD}`,background:"transparent",color:T2,fontSize:13,fontWeight:600,cursor:"pointer"}}>{S.cancel}</button></div>
    </div>
  </div>;
}

// ─── Shared ───
const inp:any={padding:"7px 10px",borderRadius:6,border:`1px solid ${BRD}`,background:BG2,fontSize:12,color:T1};
const th:any={padding:"8px 8px",textAlign:"right" as const,fontSize:10,fontWeight:600,color:T3,background:BG2,whiteSpace:"nowrap" as const};
const td:any={padding:"9px 8px",fontSize:12,color:T1};
function QI({v,set,ph,num,w}:{v:string;set:(v:string)=>void;ph:string;num?:boolean;w?:number}){return <input value={v} onChange={(e:any)=>set(e.target.value)} placeholder={ph} dir="ltr" type={num?"number":"text"} style={{...inp,width:w||"auto",flex:w?undefined:1,minWidth:0}} onFocus={(e:any)=>{e.target.style.borderColor=BL;}} onBlur={(e:any)=>{e.target.style.borderColor=BRD;}}/>;}
function SBtn({onClick,children}:{onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} style={{background:BG3,border:`1px solid ${BRD}`,borderRadius:8,padding:"6px 14px",color:T2,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s"}} onMouseEnter={(e:any)=>{e.target.style.borderColor=BRDH;e.target.style.color=T1;}} onMouseLeave={(e:any)=>{e.target.style.borderColor=BRD;e.target.style.color=T2;}}>{children}</button>;}
function Crd({t,children,s}:{t:string;children:React.ReactNode;s?:any}){return <div style={{background:BG3,border:`1px solid ${BRD}`,borderRadius:10,padding:"clamp(12px,2vw,16px)",...s}}>{t&&<div style={{fontSize:10,fontWeight:700,color:T3,letterSpacing:.5,marginBottom:10}}>{t}</div>}{children}</div>;}
function TT({head,rows}:{head:string[];rows:string[][]}){return <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr>{head.map((h:string,i:number)=><th key={i} style={{padding:"3px 4px",textAlign:i?"center" as const:"right" as const,color:T3,fontWeight:600,fontSize:9}}>{h}</th>)}</tr></thead><tbody>{rows.map((r:string[],i:number)=><tr key={i} style={{borderBottom:`1px solid ${BRD}`}}>{r.map((c:string,j:number)=><td key={j} style={{padding:"5px 4px",textAlign:j?"center" as const:"right" as const,color:j?rc(parseFloat(c)):T2,fontWeight:j?700:400}}>{c}</td>)}</tr>)}</tbody></table>;}
function DirC({l,d,c,L}:{l:string;d:any;c:string;L?:BTLang}){const S=BT_STR[L||'en'];return <div style={{background:BG3,border:`1px solid ${BRD}`,borderRadius:10,padding:14}}><div style={{fontSize:10,fontWeight:700,color:c,marginBottom:8,display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:c,display:"inline-block"}}/>{l}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 14px",fontSize:11}}>{[[S.trades,d.n,T1],[S.win,fp(d.wp),c],[S.totalR,fm(d.totR),rc(d.totR)],[S.avg,fm(d.avgR),rc(d.avgR)]].map(([k,v,vc]:any)=><div key={k} style={{color:T3}}>{k}: <span style={{color:vc,fontWeight:700}}>{v}</span></div>)}</div></div>;}
function Seg({opts,v,s}:{opts:string[][];v:string;s:(v:string)=>void}){return <div style={{display:"flex",gap:2,background:BG,borderRadius:8,padding:3,border:`1px solid ${BRD}`}}>{opts.map(([k,l])=><button key={k} onClick={()=>s(k)} style={{padding:"6px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",background:v===k?BL:"transparent",color:v===k?"#fff":T3,transition:"all .15s"}}>{l}</button>)}</div>;}


// ═══════════════════════════════════════════
// ENTRY ANIMATION — Discretionary Trading Portal
// ═══════════════════════════════════════════
function BacktestEntryScreen({ onEnter, onSkip, L }: { onEnter: () => void; onSkip: () => void; L: BTLang }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'boot' | 'ready' | 'portal' | 'done'>('boot');

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    let W: number, H: number, w: number, h: number;

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      W = w * dpr; H = h * dpr;
      c.width = W; c.height = H;
      ctx.scale(dpr, dpr);
    };
    resize();

    // Generate multi-timeframe candles
    const candles: { o: number; h: number; l: number; c: number; vol: number }[] = [];
    let price = h * 0.5;
    for (let i = 0; i < 80; i++) {
      const trend = Math.sin(i * 0.08) * h * 0.002;
      const momentum = (Math.random() - 0.45) * h * 0.04;
      const open = price;
      const close = price + momentum + trend;
      const high = Math.max(open, close) + Math.random() * h * 0.015;
      const low = Math.min(open, close) - Math.random() * h * 0.015;
      candles.push({ o: open, h: high, l: low, c: close, vol: 0.3 + Math.random() * 0.7 });
      price = close;
    }

    // Normalize to viewport
    const allPrices = candles.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...allPrices), maxP = Math.max(...allPrices);
    const range = maxP - minP || 1;
    const mapY = (p: number) => h * 0.1 + ((maxP - p) / range) * h * 0.7;

    // Order flow particles
    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

    let frame = 0;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // Ambient grid
      const gridAlpha = Math.min(0.06, frame * 0.001);
      ctx.strokeStyle = `rgba(37,99,235,${gridAlpha})`;
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += h / 10) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let x = 0; x < w; x += w / 12) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }

      // Draw candles progressively
      const visibleCount = Math.min(candles.length, Math.floor(frame * 0.8));
      const candleW = Math.max(2, (w * 0.85) / candles.length);
      const startX = w * 0.08;

      for (let i = 0; i < visibleCount; i++) {
        const cd = candles[i];
        const x = startX + i * candleW;
        const isGreen = cd.c > cd.o;
        const color = isGreen ? '#00FFA3' : '#FF4D4D';
        const entryProgress = Math.min(1, (frame - i * 1.2) / 10);
        if (entryProgress <= 0) continue;

        ctx.globalAlpha = entryProgress;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x + candleW * 0.4, mapY(cd.h));
        ctx.lineTo(x + candleW * 0.4, mapY(cd.l));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Body
        const bodyTop = mapY(Math.max(cd.o, cd.c));
        const bodyBot = mapY(Math.min(cd.o, cd.c));
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, bodyTop, candleW * 0.8 - 2, Math.max(1, bodyBot - bodyTop));

        // Volume bars at bottom
        const volH = cd.vol * h * 0.08;
        ctx.fillStyle = isGreen ? 'rgba(0,255,163,0.08)' : 'rgba(255,77,77,0.08)';
        ctx.fillRect(x + 1, h - volH, candleW * 0.8 - 2, volH);

        // Spawn order flow particles on recent candles
        if (i === visibleCount - 1 && Math.random() > 0.6) {
          particles.push({
            x: x + candleW * 0.4,
            y: mapY((cd.o + cd.c) / 2),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 1.5,
            life: 1,
            color: isGreen ? '0,255,163' : '255,77,77',
          });
        }
      }

      ctx.globalAlpha = 1;

      // Draw & update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.life * 0.6})`;
        ctx.fill();
      }

      // Moving average overlay
      if (visibleCount > 10) {
        ctx.beginPath();
        for (let i = 5; i < visibleCount; i++) {
          const avg = candles.slice(i - 5, i).reduce((s, c) => s + (c.o + c.c) / 2, 0) / 5;
          const x = startX + i * candleW + candleW * 0.4;
          if (i === 5) ctx.moveTo(x, mapY(avg));
          else ctx.lineTo(x, mapY(avg));
        }
        ctx.strokeStyle = 'rgba(99,102,241,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Scanline effect
      const scanY = (frame * 2) % h;
      ctx.fillStyle = 'rgba(0,255,163,0.015)';
      ctx.fillRect(0, scanY, w, 2);

      frame++;
      if (frame < 160) raf = requestAnimationFrame(draw);
      else setPhase('ready');
    };

    const t = setTimeout(() => draw(), 200);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  const handleEnter = () => {
    setPhase('portal');
    setTimeout(() => { setPhase('done'); onEnter(); }, 1200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: BG, overflow: 'hidden', width: '100vw', height: '100dvh', maxWidth: '100vw' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: phase === 'portal' ? 0 : 0.9, transition: 'opacity 0.8s' }} />

      {/* Overlay vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${BG} 100%)`,
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
        opacity: phase === 'ready' || phase === 'boot' ? 1 : 0,
        transform: phase === 'portal' ? 'scale(2.5)' : 'scale(1)',
        transition: 'all 1s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: T3, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 12, opacity: phase === 'ready' ? 1 : 0, transition: 'opacity 0.5s 0.2s' }}>
          BACKTEST JOURNAL
        </div>
        <div style={{ fontSize: 'clamp(24px,7vw,48px)', fontWeight: 900, color: BL, letterSpacing: -2, textShadow: `0 0 60px ${CY}44, 0 0 30px ${BL}33`, opacity: phase === 'ready' ? 1 : 0, transition: 'opacity 0.5s 0.4s' }}>
          {BT_STR[L].appName}
        </div>
        <div style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: T2, marginTop: 8, letterSpacing: 3, opacity: phase === 'ready' ? 1 : 0, transition: 'opacity 0.5s 0.6s' }}>
          OrcaInvestment
        </div>

        {/* Enter button */}
        {phase === 'ready' && (
          <button onClick={handleEnter} style={{
            marginTop: 40, padding: '14px 48px', background: `linear-gradient(135deg, ${BL}, ${CY})`, border: 'none',
            borderRadius: 14, color: '#fff', fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 700,
            cursor: 'pointer', animation: 'pop .4s cubic-bezier(.16,1,.3,1)',
            boxShadow: `0 4px 30px ${BL}44, 0 0 60px ${CY}15`,
            transition: 'all 0.3s',
          }}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 8px 40px ${BL}66`; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 30px ${BL}44`; }}
          >
            {BT_STR[L].enter}
          </button>
        )}
      </div>

      {/* Portal effect */}
      {phase === 'portal' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: `radial-gradient(circle at center, ${CY}30 0%, ${BG} 50%)`,
          animation: 'popBig 1s cubic-bezier(.16,1,.3,1)',
        }} />
      )}

      {/* Skip button */}
      <button onClick={onSkip} style={{
        position: 'absolute', bottom: 'max(24px, env(safe-area-inset-bottom, 24px))', left: '50%', transform: 'translateX(-50%)',
        background: 'none', border: `1px solid ${T4}`, borderRadius: 6,
        padding: '6px 16px', color: T3, fontSize: 11, cursor: 'pointer', zIndex: 30,
      }}>{BT_STR[L].skip}</button>
    </div>
  );
}


// ═══════════════════════════════════════════
// MAIN BACKTEST COMPONENT (wrapped for dimension)
// ═══════════════════════════════════════════
function BacktestApp({ onReturn }: { onReturn: () => void }) {
  const { isRTL } = useLang();
  const L: BTLang = isRTL ? 'he' : 'en';
  const S = BT_STR[L];
  // Multi-strategy state: each strategy is its own isolated workbook.
  const[state,setState]=useState<BTState>(()=>makeDefaultState());
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("trades");const[showForm,setShowForm]=useState(false);const[editModal,setEditModal]=useState<any>(null);const[macDir,setMacDir]=useState("all");const[macDim,setMacDim]=useState("wd");const[search,setSearch]=useState("");const[filterDir,setFilterDir]=useState("all");const[filterCoin,setFilterCoin]=useState("all");const[sortBy,setSortBy]=useState("date_d");const[qa,setQa]=useState({coin:"",entry:"",sl:"",exit:""});const[lastX,setLastX]=useState(0);const[showFilters,setShowFilters]=useState(false);const[confirmDel,setConfirmDel]=useState<string|null>(null);const[showTut,setShowTut]=useState(true);const[locked,setLocked]=useState(false);
  const[exitingToOrca,setExitingToOrca]=useState(false);
  const[renamingStrat,setRenamingStrat]=useState(false);
  const[confirmDelStrat,setConfirmDelStrat]=useState(false);

  useEffect(()=>{css();loadState().then((s)=>{setState(s);setLoading(false);});},[]);

  const activeStrat = useMemo(()=>state.strategies.find(s=>s.id===state.activeId)||state.strategies[0],[state]);
  const trades = activeStrat?.trades||[];

  const updateState=useCallback((updater:(s:BTState)=>BTState)=>{
    setState(prev=>{const next=updater(prev);persistState(next);return next;});
  },[]);
  const save=useCallback(async (n:any[])=>{
    updateState(s=>({...s,strategies:s.strategies.map(st=>st.id===s.activeId?{...st,trades:n}:st)}));
  },[updateState]);

  // Strategy CRUD
  const addStrategy=()=>{
    const name=prompt(L==='he'?'שם האסטרטגיה החדשה':'New strategy name','');
    if(!name||!name.trim())return;
    const id=uid();
    updateState(s=>({strategies:[...s.strategies,{id,name:name.trim(),trades:[]}],activeId:id}));
    setShowTut(true);
  };
  const switchStrategy=(id:string)=>updateState(s=>({...s,activeId:id}));
  const renameStrategy=()=>{
    const name=prompt(L==='he'?'שם חדש לאסטרטגיה':'Rename strategy',activeStrat?.name||'');
    if(!name||!name.trim())return;
    updateState(s=>({...s,strategies:s.strategies.map(st=>st.id===s.activeId?{...st,name:name.trim()}:st)}));
  };
  const deleteStrategy=()=>{
    updateState(s=>{
      if(s.strategies.length<=1){
        // Don't delete the last one; just clear its trades.
        return {...s,strategies:s.strategies.map(st=>st.id===s.activeId?{...st,trades:[]}:st)};
      }
      const remaining=s.strategies.filter(st=>st.id!==s.activeId);
      return {strategies:remaining,activeId:remaining[0].id};
    });
    setConfirmDelStrat(false);
  };

  const commitDraft=useCallback((d:DraftBacktestTrade)=>{
    const row=recalc({...emptyRow(),coin:d.coin,entryDT:d.entryDT,exitDT:d.exitDT,entry:d.entry,sl:d.sl,exit:d.exit,mfeP:d.mfeP,maeP:d.maeP,notes:d.notes,chartE:d.chartE,chartX:d.chartX});
    updateState(s=>({...s,strategies:s.strategies.map(st=>st.id===s.activeId?{...st,trades:[...st.trades,row]}:st)}));
    setShowTut(false);
  },[updateState]);
  const addTrade=(t:any)=>{save([...trades,t]);setShowForm(false);setShowTut(false);};
  const updateTrade=(t:any)=>{save(trades.map((x:any)=>x.id===t.id?t:x));setEditModal(null);};
  const del=(id:string)=>{save(trades.filter((t:any)=>t.id!==id));setConfirmDel(null);};
  const quickAdd=()=>{if(!qa.coin||!qa.entry||!qa.sl||!qa.exit)return;save([...trades,recalc({...emptyRow(),...qa})]);setQa({coin:"",entry:"",sl:"",exit:""});setShowTut(false);};

  const statsIn=useMemo(()=>lastX>0?trades.slice(-lastX):trades,[trades,lastX]);
  const stats=useMemo(()=>computeAll(statsIn),[statsIn]);
  const allStats=useMemo(()=>computeAll(trades),[trades]);
  const displayed=useMemo(()=>{let a=[...trades];if(search)a=a.filter((t:any)=>(t.coin||"").toLowerCase().includes(search.toLowerCase()));if(filterDir!=="all")a=a.filter((t:any)=>t.dir===filterDir);if(filterCoin!=="all")a=a.filter((t:any)=>t.coin===filterCoin);const[f,d]=sortBy.split("_");a.sort((x:any,y:any)=>{if(f==="r")return d==="d"?(y.r||0)-(x.r||0):(x.r||0)-(y.r||0);if(f==="coin")return d==="a"?(x.coin||"").localeCompare(y.coin||""):(y.coin||"").localeCompare(x.coin||"");return d==="d"?trades.indexOf(y)-trades.indexOf(x):trades.indexOf(x)-trades.indexOf(y);});return a;},[trades,search,filterDir,filterCoin,sortBy]);
  const uCoins=useMemo(()=>[...new Set(trades.map((t:any)=>t.coin).filter(Boolean))],[trades]);

  const csvX=()=>{const h="Coin,Dir,Entry,SL,Exit,R,Time,Dur,Notes";const r=trades.map((t:any)=>[t.coin,t.dir,t.entry,t.sl,t.exit,t.r!=null?fm(t.r):"",t.entryDT,t.dur,`"${(t.notes||"").replace(/"/g,'""')}"`].join(","));const b=new Blob([h+"\n"+r.join("\n")],{type:"text/csv"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(b),download:`orca-bt_${(activeStrat?.name||'strategy').replace(/[^a-z0-9]+/gi,'-')}_${Date.now()}.csv`}).click();};
  const jsonX=()=>{const b=new Blob([JSON.stringify(trades,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(b),download:`orca-bt_${(activeStrat?.name||'strategy').replace(/[^a-z0-9]+/gi,'-')}_${Date.now()}.json`}).click();};
  const imp=()=>{const i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=async (e:any)=>{try{const d=JSON.parse(await e.target.files[0].text());if(Array.isArray(d)){const m=[...trades];d.forEach((t:any)=>{if(!m.find((x:any)=>x.id===t.id))m.push(recalc({...emptyRow(),...t,id:t.id||uid()}));});save(m);}}catch{}};i.click();};


  const handleReturn = useCallback(() => {
    setExitingToOrca(true);
    setTimeout(() => onReturn(), 1200);
  }, [onReturn]);

  // Lock screen
  const Lock=({onUnlock}:{onUnlock:()=>void})=>{const[ph,setPh]=useState(0);const go=()=>{setPh(1);setTimeout(()=>setPh(2),600);setTimeout(onUnlock,1100);};return <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(12,15,20,.94)",backdropFilter:"blur(10px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity .4s",opacity:ph===2?0:1,pointerEvents:ph===2?"none":"auto"}}><div style={{width:64,height:64,borderRadius:"50%",border:`2px solid ${ph>=1?BL:T4}`,display:"flex",alignItems:"center",justifyContent:"center",animation:ph===1?"lockGlow .3s":"none"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ph>=1?BL:T3} strokeWidth="2" strokeLinecap="round">{ph>=1?<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}</svg></div>{ph===0&&<><div style={{marginTop:12,fontSize:13,color:T3}}>{S.locked}</div><button onClick={go} style={{marginTop:16,background:"none",border:`1px solid ${T4}`,borderRadius:10,padding:"10px 28px",color:T2,fontSize:13,fontWeight:600,cursor:"pointer"}} onMouseEnter={(e:any)=>{e.currentTarget.style.borderColor=BL;e.currentTarget.style.color=BL;}} onMouseLeave={(e:any)=>{e.currentTarget.style.borderColor=T4;e.currentTarget.style.color=T2;}}>{S.unlock}</button></>}</div>;};

  if(loading)return <div className="ox" style={{minHeight:"100dvh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",color:BL}}>{S.loading}</div>;

  const has=trades.length>0;
  const cols=[{k:"coin",l:S.coin,w:"9%"},{k:"dir",l:S.colDir,w:"6%"},{k:"entry",l:S.entry,w:"10%"},{k:"sl",l:S.sl,w:"10%"},{k:"exit",l:S.exit,w:"10%"},{k:"r",l:"R",w:"7%"},{k:"entryDT",l:S.colTime,w:"14%"},{k:"dur",l:S.colDur,w:"9%"},{k:"mfeR",l:"MFE",w:"6%"},{k:"maeR",l:"MAE",w:"6%"}];

  return <div className="ox" style={{
    minHeight:"100dvh",background:BG,color:T1,direction:isRTL?"rtl":"ltr",fontSize:13,
    opacity: exitingToOrca ? 0 : 1,
    transform: exitingToOrca ? 'scale(0.92)' : 'scale(1)',
    filter: exitingToOrca ? 'blur(12px)' : 'none',
    transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.4,0,0.2,1), filter 0.8s ease',
  }}>
    {/* Exit overlay */}
    {exitingToOrca && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(circle at center, transparent 0%, ${BG} 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fi .4s ease-out',
      }}>
        <div style={{ textAlign: 'center', animation: 'pop .3s cubic-bezier(.16,1,.3,1)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: BL, letterSpacing: 2 }}>RETURNING TO ORCAINVESTMENT</div>
        </div>
      </div>
    )}

    {locked&&<Lock onUnlock={()=>setLocked(false)}/>}
    {showForm&&<BTTradeForm L={L} onSave={addTrade} onClose={()=>setShowForm(false)}/>}
    {editModal&&<BTTradeForm L={L} initial={editModal} onSave={updateTrade} onClose={()=>setEditModal(null)}/>}
    {confirmDel&&<div style={{position:"fixed",inset:0,zIndex:8500,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setConfirmDel(null)}><div className="pop" onClick={(e:any)=>e.stopPropagation()} style={{background:BG3,borderRadius:12,padding:24,textAlign:"center",border:`1px solid ${BRD}`,maxWidth:320}}><div style={{fontSize:14,fontWeight:600,color:T1,marginBottom:12}}>{S.deleteQ}</div><div style={{display:"flex",gap:8,justifyContent:"center"}}><button onClick={()=>del(confirmDel)} style={{background:RD,border:"none",borderRadius:8,padding:"8px 24px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>{S.del}</button><button onClick={()=>setConfirmDel(null)} style={{background:"none",border:`1px solid ${BRD}`,borderRadius:8,padding:"8px 20px",color:T2,fontSize:12,cursor:"pointer"}}>{S.cancel}</button></div></div></div>}

    <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px clamp(12px,3vw,20px)",background:BG2,borderBottom:`1px solid ${BRD}`,gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={handleReturn} style={{
          display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
          background:'none',border:`1px solid ${T4}`,borderRadius:8,
          color:BL,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .2s',
        }}
          onMouseEnter={(e:any)=>{e.currentTarget.style.borderColor=BL;e.currentTarget.style.boxShadow=`0 0 12px ${BL}20`;}}
          onMouseLeave={(e:any)=>{e.currentTarget.style.borderColor=T4;e.currentTarget.style.boxShadow='none';}}
        >
          <span>⚔️</span> {S.back}
        </button>
        <span style={{fontSize:"clamp(14px,2.5vw,16px)",fontWeight:800,color:BL}}>{S.appName}</span>
        {has&&<span style={{fontSize:10,color:rc(allStats.totR),fontWeight:700}}>{fm(allStats.totR)}R</span>}

      </div>
      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>setTab("chart")} style={{background:tab==="chart"?BL:"none",border:`1px solid ${tab==="chart"?BL:BRD}`,borderRadius:8,padding:"6px 12px",color:tab==="chart"?"#fff":BL2,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📈 {S.chart}</button>
        <SBtn onClick={imp}>{S.import}</SBtn><SBtn onClick={jsonX}>{S.exportJson}</SBtn><SBtn onClick={csvX}>{S.exportCsv}</SBtn>
        <button onClick={()=>setLocked(true)} style={{background:"none",border:`1px solid ${BRD}`,borderRadius:8,padding:"6px 10px",color:T3,cursor:"pointer",fontSize:13}} onMouseEnter={(e:any)=>{e.currentTarget.style.color=BL;}} onMouseLeave={(e:any)=>{e.currentTarget.style.color=T3;}}>🔒</button>
      </div>
    </header>

    {!has&&tab==="trades"&&<div className="fi" style={{padding:"clamp(20px,4vw,40px) 16px",maxWidth:580,margin:"0 auto"}}>{showTut?<Tutorial L={L} onClose={()=>setShowTut(false)} onStart={()=>{setShowTut(false);setShowForm(true);}}/>:<div style={{textAlign:"center",padding:"clamp(20px,6vw,40px) 0"}}><div style={{width:56,height:56,borderRadius:14,background:`${BL}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BL} strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></div><div style={{fontSize:"clamp(18px,4vw,22px)",fontWeight:700,color:T1,marginBottom:20}}>{S.ready}</div><button onClick={()=>setShowForm(true)} style={{background:BL,border:"none",borderRadius:10,padding:"12px 32px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>{S.firstTradeBtn}</button><div style={{marginTop:12}}><button onClick={()=>setShowTut(true)} style={{background:"none",border:"none",color:BL2,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>{S.demoLink}</button><span style={{color:T4,margin:"0 8px"}}>·</span><button onClick={imp} style={{background:"none",border:"none",color:T3,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>{S.import}</button></div></div>}</div>}

    {has&&<><nav style={{display:"flex",background:BG2,borderBottom:`1px solid ${BRD}`,padding:"0 clamp(8px,2vw,16px)",overflowX:"auto"}}>{[["chart",S.tabs.chart],["trades",S.tabs.trades],["analytics",S.tabs.analytics],["macro",S.tabs.macro],["equity",S.tabs.equity]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"10px 16px",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,background:"transparent",whiteSpace:"nowrap",color:tab===k?BL:T3,borderBottom:tab===k?`2px solid ${BL}`:"2px solid transparent",transition:"all .15s"}}>{l}</button>)}</nav>

    {tab==="trades"&&<div style={{padding:"clamp(12px,2vw,20px)",maxWidth:1100,margin:"0 auto"}}>
      <div className="ox-qa-row" style={{display:"flex",gap:6,marginBottom:14,alignItems:"center",background:BG3,borderRadius:10,padding:"8px 12px",border:`1px solid ${BRD}`}}><span style={{fontSize:10,color:T3,fontWeight:600,whiteSpace:"nowrap"}}>{S.quick}</span><QI v={qa.coin} set={(v:string)=>setQa(p=>({...p,coin:v}))} ph={S.coin} w={60}/><QI v={qa.entry} set={(v:string)=>setQa(p=>({...p,entry:v}))} ph={S.entry} num/><QI v={qa.sl} set={(v:string)=>setQa(p=>({...p,sl:v}))} ph={S.sl} num/><QI v={qa.exit} set={(v:string)=>setQa(p=>({...p,exit:v}))} ph={S.exit} num/><button onClick={quickAdd} style={{background:BL,border:"none",borderRadius:6,padding:"7px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:(!qa.coin||!qa.entry||!qa.sl||!qa.exit)?.35:1}}>+</button><div style={{flex:1}}/><button onClick={()=>setShowForm(true)} style={{background:"none",border:`1px solid ${BRD}`,borderRadius:6,padding:"6px 12px",color:BL2,fontSize:10,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{S.fullForm}</button></div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><button onClick={()=>setShowFilters(!showFilters)} style={{background:"none",border:`1px solid ${showFilters?BL:BRD}`,borderRadius:6,padding:"5px 10px",color:showFilters?BL:T3,fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>{S.filter}</button><span style={{fontSize:10,color:T3}}>{displayed.length}/{trades.length}</span><div style={{flex:1}}/><div style={{display:"flex",gap:2}}>{[0,10,20,50].map(n=><button key={n} onClick={()=>setLastX(n)} style={{padding:"4px 8px",borderRadius:5,border:"none",cursor:"pointer",fontSize:9,fontWeight:600,background:lastX===n?BL:"transparent",color:lastX===n?"#fff":T3}}>{n===0?S.all:n}</button>)}</div></div>
      {showFilters&&<div className="fi" style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",background:BG3,borderRadius:8,padding:"8px 10px",border:`1px solid ${BRD}`}}><input value={search} onChange={(e:any)=>setSearch(e.target.value)} placeholder={S.search} dir={isRTL?"rtl":"ltr"} style={{...inp,flex:1,minWidth:80}}/><select value={filterDir} onChange={(e:any)=>setFilterDir(e.target.value)} style={{...inp,width:"auto"}}><option value="all">{S.all}</option><option value="Long">{S.long}</option><option value="Short">{S.short}</option></select>{uCoins.length>1&&<select value={filterCoin} onChange={(e:any)=>setFilterCoin(e.target.value)} style={{...inp,width:"auto"}}><option value="all">{S.allCoins}</option>{uCoins.map((c:string)=><option key={c} value={c}>{c}</option>)}</select>}<select value={sortBy} onChange={(e:any)=>setSortBy(e.target.value)} style={{...inp,width:"auto"}}><option value="date_d">{S.newToOld}</option><option value="date_a">{S.oldToNew}</option><option value="r_d">R↓</option><option value="r_a">R↑</option></select></div>}
      {stats.eq.length>2&&<div style={{borderRadius:8,overflow:"hidden",marginBottom:12,height:50,background:BG3,border:`1px solid ${BRD}`}}><ResponsiveContainer width="100%" height={50}><AreaChart data={stats.eq} margin={{top:0,right:0,bottom:0,left:0}}><defs><linearGradient id="me" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BL} stopOpacity={.15}/><stop offset="100%" stopColor={BL} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="c" stroke={BL} strokeWidth={1.5} fill="url(#me)" dot={false}/></AreaChart></ResponsiveContainer></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:14}}>{[[S.win,fp(stats.wp),stats.wp>.5?G:RD],[S.ev,fm(stats.ev),rc(stats.ev)],[S.totalR,fm(stats.totR),rc(stats.totR)],[S.avg,fm(stats.avgR),rc(stats.avgR)]].map(([l,v,c]:any)=><div key={l} style={{background:BG3,borderRadius:8,padding:"7px 8px",textAlign:"center",border:`1px solid ${BRD}`}}><div style={{fontSize:8,color:T3,fontWeight:700}}>{l}</div><div style={{fontSize:14,fontWeight:800,color:c}}>{v}</div></div>)}</div>
      <div style={{background:BG3,borderRadius:10,border:`1px solid ${BRD}`,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}><thead><tr style={{borderBottom:`1px solid ${BRDH}`}}><th style={{...th,width:32}}>#</th>{cols.map((c:any)=><th key={c.k} style={{...th,width:c.w}}>{c.l}</th>)}<th style={{...th,width:32}}/></tr></thead><tbody>{displayed.map((t:any,i:number)=><tr key={t.id} className="notion-row" style={{borderBottom:`1px solid ${BRD}18`}}><td style={td}><span style={{color:T4,fontSize:10}}>{i+1}</span></td><td style={td}><span style={{fontWeight:700}}>{t.coin||"—"}</span></td><td style={td}>{t.strategy?<span title={t.strategy} style={{display:"inline-block",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600,background:`${CY}14`,color:CY,border:`1px solid ${CY}33`}}>{t.strategy}</span>:<span style={{color:T4}}>—</span>}</td><td style={td}>{t.dir?<span style={{padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,background:t.dir==="Long"?G+"15":RD+"15",color:t.dir==="Long"?G:RD}}>{t.dir==="Long"?"L":"S"}</span>:<span style={{color:T4}}>—</span>}</td><td style={{...td,direction:"ltr",textAlign:"right" as const}}>{t.entry||"—"}</td><td style={{...td,direction:"ltr",textAlign:"right" as const,color:T3}}>{t.sl||"—"}</td><td style={{...td,direction:"ltr",textAlign:"right" as const}}>{t.exit||"—"}</td><td style={td}><span style={{fontWeight:700,color:rc(t.r)}}>{t.r!=null?fm(t.r):"—"}</span></td><td style={{...td,fontSize:11,color:T3,direction:"ltr",textAlign:"right" as const}}>{t.entryDT||"—"}</td><td style={{...td,fontSize:11,color:T3}}>{t.dur||"—"}</td><td style={td}><span style={{color:t.mfeR!=null?G:T4,fontSize:11}}>{t.mfeR!=null?fm(t.mfeR):"—"}</span></td><td style={td}><span style={{color:t.maeR!=null?RD:T4,fontSize:11}}>{t.maeR!=null?fm(t.maeR):"—"}</span></td><td style={{...td,textAlign:"center" as const}}><div style={{display:"flex",gap:4,justifyContent:"center",opacity:.4,transition:"opacity .15s"}} onMouseEnter={(e:any)=>{e.currentTarget.style.opacity="1";}} onMouseLeave={(e:any)=>{e.currentTarget.style.opacity=".4";}}><button onClick={()=>setEditModal(t)} style={{background:"none",border:"none",color:BL2,cursor:"pointer",fontSize:11,padding:2}}>✎</button><button onClick={()=>setConfirmDel(t.id)} style={{background:"none",border:"none",color:RD,cursor:"pointer",fontSize:11,padding:2}}>×</button></div></td></tr>)}{displayed.length===0&&<tr><td colSpan={13} style={{padding:24,textAlign:"center",color:T3}}>{S.noResults}</td></tr>}</tbody></table></div></div>
    </div>}

    {tab==="analytics"&&<div className="fi" style={{padding:"clamp(12px,2vw,20px)",maxWidth:900,margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:10,color:T3,fontWeight:700,letterSpacing:2}}>{S.totalReturn}</div><div style={{fontSize:"clamp(24px,5vw,38px)",fontWeight:900,color:rc(stats.totR),letterSpacing:-2,lineHeight:1}}>{fm(stats.totR)}R</div><div style={{fontSize:10,color:T3,marginTop:4}}>{stats.n} {S.trades}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:6,marginBottom:16}}>{[[S.win,fp(stats.wp),stats.wp>.5?G:RD],[S.ev,fm(stats.ev),rc(stats.ev)],[S.avg,fm(stats.avgR),rc(stats.avgR)],[S.median,fm(stats.medR),rc(stats.medR)],[S.maxLbl,fm(stats.maxWR),G],[S.streak,`${stats.mxW}W/${stats.mxL}L`,T2]].map(([l,v,c]:any,i:number)=><div key={i} style={{background:BG3,border:`1px solid ${BRD}`,borderRadius:10,padding:12}}><div style={{fontSize:8,color:T3,fontWeight:700,marginBottom:3}}>{l}</div><div style={{fontSize:"clamp(14px,2vw,18px)",fontWeight:800,color:c}}>{v}</div></div>)}</div>{Object.keys(stats.coins).length>1&&<Crd t={S.byCoin} s={{marginBottom:12}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(stats.coins).sort((a:any,b:any)=>b[1].totR-a[1].totR).map(([c,d]:any)=><div key={c} style={{flex:"1 1 75px",minWidth:65,background:BG2,borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${BRD}`,borderBottom:`3px solid ${rc(d.totR)}`}}><div style={{fontSize:12,fontWeight:800}}>{c}</div><div style={{fontSize:13,fontWeight:800,color:rc(d.totR)}}>{fm(d.totR)}R</div><div style={{fontSize:9,color:T3}}>{d.n}·{fp(d.wp)}</div></div>)}</div></Crd>}<div className="ox-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}><Crd t={S.averages}><TT head={["",S.general,S.long,S.short]} rows={[[S.avg,fm(stats.avgR),fm(stats.lo.avgR),fm(stats.sh.avgR)],[S.win,fm(stats.avgWR),fm(stats.lo.avgWR),fm(stats.sh.avgWR)],[S.loss,fm(stats.avgLR),fm(stats.lo.avgLR),fm(stats.sh.avgLR)],[S.total,fm(stats.totR),fm(stats.lo.totR),fm(stats.sh.totR)]]}/></Crd><Crd t={S.returnTime}>{[[S.daily,stats.rtr.d],[S.weekly,stats.rtr.w],[S.monthly,stats.rtr.m],[S.quarterly,stats.rtr.q],[S.yearly,stats.rtr.y]].map(([l,v]:any)=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${BRD}`}}><span style={{color:T3,fontSize:11}}>{l}</span><span style={{fontWeight:700,color:rc(v),fontSize:12}}>{fm(v)}</span></div>)}</Crd></div><Crd t="MAE" s={{marginBottom:12}}><div style={{display:"flex",gap:8}}>{stats.maeDist.map((d:any)=><div key={d.th} style={{flex:1,textAlign:"center",padding:12,background:BG2,borderRadius:8,border:`1px solid ${BRD}`}}><div style={{fontSize:9,color:T3}}>≤{d.th}R</div><div style={{fontSize:"clamp(16px,3vw,22px)",fontWeight:800,color:BL}}>{fp(d.pct)}</div></div>)}</div></Crd><div className="ox-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><DirC L={L} l={S.long} d={stats.lo} c={G}/><DirC L={L} l={S.short} d={stats.sh} c={RD}/></div></div>}

    {tab==="macro"&&<div className="fi" style={{padding:"clamp(12px,2vw,20px)",maxWidth:900,margin:"0 auto"}}><div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Seg opts={[["all",S.general],["lo",S.long],["sh",S.short]]} v={macDir} s={setMacDir}/><Seg opts={[["wd",S.day],["qm",S.quarter],["mo",S.month]]} v={macDim} s={setMacDim}/></div><Crd t="">{(()=>{const d=stats.macro[macDir][macDim],keys=Object.keys(d).map(Number),labs=macDim==="wd"?(isRTL?stats.dayN:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]):macDim==="qm"?stats.qmN:(isRTL?stats.monN:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]);return <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{keys.map((k:number)=>{const v=d[k],wr=v.n?v.w/v.n:0;return <div key={k} style={{flex:"1 1 55px",minWidth:48,textAlign:"center",padding:"10px 4px",background:BG2,borderRadius:8,borderBottom:v.n?`3px solid ${wr>=.5?G:RD}`:`3px solid ${T4}`}}><div style={{fontSize:9,fontWeight:700,color:T3}}>{labs[k]}</div><div style={{fontSize:14,fontWeight:800,color:v.n?T1:T4}}>{v.n||"—"}</div>{v.n>0&&<div style={{fontSize:9,color:wr>=.5?G:RD,fontWeight:600}}>{fp(wr)}</div>}{v.n>0&&<div style={{fontSize:9,color:rc(v.totR)}}>{fm(v.totR)}R</div>}</div>;})}</div>;})()}</Crd><Crd t="" s={{marginTop:10}}><ResponsiveContainer width="100%" height={200}><BarChart data={(()=>{const d=stats.macro[macDir][macDim],labs=macDim==="wd"?(isRTL?stats.dayN:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]):macDim==="qm"?stats.qmN:(isRTL?stats.monN:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]);return Object.keys(d).map((k:string)=>({n:labs[+k],r:+(d[k]?.totR||0).toFixed(2)}));})()}><CartesianGrid strokeDasharray="3 3" stroke={BRD}/><XAxis dataKey="n" tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={T4}/><Tooltip contentStyle={{background:SURF,border:`1px solid ${BRD}`,borderRadius:8,color:T1,fontSize:11}}/><Bar dataKey="r" radius={[4,4,0,0]}>{Object.keys(stats.macro[macDir][macDim]).map((_:string,i:number)=><Cell key={i} fill={(stats.macro[macDir][macDim] as any)[Object.keys(stats.macro[macDir][macDim])[i]]?.totR>=0?G:RD} fillOpacity={.7}/>)}</Bar></BarChart></ResponsiveContainer></Crd></div>}

    {tab==="equity"&&<div className="fi" style={{padding:"clamp(12px,2vw,20px)",maxWidth:900,margin:"0 auto"}}><Crd t={S.equityCurve}>{stats.eq.length>1?<ResponsiveContainer width="100%" height={250}><AreaChart data={stats.eq}><defs><linearGradient id="eG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BL} stopOpacity={.15}/><stop offset="95%" stopColor={BL} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={BRD}/><XAxis dataKey="x" tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={T4} strokeDasharray="3 3"/><Tooltip contentStyle={{background:SURF,border:`1px solid ${BRD}`,borderRadius:8,color:T1,fontSize:11}} formatter={(v:any)=>[fm(v),"R"]}/><Area type="monotone" dataKey="c" stroke={BL} strokeWidth={1.5} fill="url(#eG2)" dot={false}/></AreaChart></ResponsiveContainer>:<div style={{textAlign:"center",padding:40,color:T3}}>{S.addTrades}</div>}</Crd>{stats.eq.length>1&&<><Crd t={S.rPerTrade} s={{marginTop:10}}><ResponsiveContainer width="100%" height={160}><BarChart data={stats.eq}><CartesianGrid strokeDasharray="3 3" stroke={BRD}/><XAxis dataKey="x" tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={T4}/><Bar dataKey="r" radius={[3,3,0,0]}>{stats.eq.map((d:any,i:number)=><Cell key={i} fill={d.r>=0?G:RD} fillOpacity={.65}/>)}</Bar></BarChart></ResponsiveContainer></Crd><Crd t={S.drawdown} s={{marginTop:10}}>{(()=>{let pk=0,mx=0;const dd=stats.eq.map((d:any)=>{pk=Math.max(pk,d.c);const v=d.c-pk;mx=Math.min(mx,v);return{x:d.x,dd:+v.toFixed(2)};});return <><div style={{fontSize:10,color:RD,fontWeight:700,marginBottom:6}}>{S.maxDd}: {fm(mx)}R</div><ResponsiveContainer width="100%" height={120}><AreaChart data={dd}><defs><linearGradient id="dG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={RD} stopOpacity={.12}/><stop offset="95%" stopColor={RD} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={BRD}/><XAxis dataKey="x" tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T3,fontSize:9}} axisLine={false} tickLine={false}/><ReferenceLine y={0} stroke={T4}/><Area type="monotone" dataKey="dd" stroke={RD} strokeWidth={1} fill="url(#dG2)" dot={false}/></AreaChart></ResponsiveContainer></>;})()}</Crd></>}</div>}
    </>}

    {/* TradingView ⇄ Backtest Journal bridge — always mounted, chart state survives tab switches */}
    <div style={{position:"relative",height:tab==="chart"?"calc(100vh - 60px)":0,overflow:"hidden",transition:"height .25s ease"}}>
      <BacktestChartPanel visible={tab==="chart"} />
    </div>
    <CommitBacktestModal onCommit={commitDraft} />
  </div>;
}


// ═══════════════════════════════════════════
// EXPORTED DIMENSION WRAPPER
// ═══════════════════════════════════════════
interface BacktestDimensionProps {
  onReturn: () => void;
}

export const BacktestDimension = ({ onReturn }: BacktestDimensionProps) => {
  const [showEntry, setShowEntry] = useState(true);
  const { isRTL } = useLang();
  const L: BTLang = isRTL ? 'he' : 'en';

  if (showEntry) {
    return <BacktestEntryScreen L={L} onEnter={() => setShowEntry(false)} onSkip={() => setShowEntry(false)} />;
  }

  return <BacktestApp onReturn={onReturn} />;
};
