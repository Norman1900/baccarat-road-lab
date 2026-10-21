/* Baccarat Road Lab — research prototype, no predictive edge claimed */
(function(root,factory){const obj=factory();if(typeof module==='object'&&module.exports)module.exports=obj;root.RoadAnalyzer=obj;})(typeof window!=='undefined'?window:globalThis,function(){
 const norm=x=>(x||[]).map(y=>String(y).toUpperCase()).filter(x=>['B','P','T'].includes(x));
 const invert=x=>x==='B'?'P':x==='P'?'B':null;
 function runs(s, completedOnly=false){let arr=[];for(const x of s){let last=arr[arr.length-1];if(last&&last.side===x){last.n++;}else arr.push({side:x,n:1});} if(completedOnly&&arr.length) arr=arr.slice(0,-1);return arr;}
 function tally(s){const a=s.filter(x=>x!=='T');let O=0,R=0;for(let i=1;i<a.length;i++)a[i]===a[i-1]?R++:O++;return {B:a.filter(x=>x==='B').length,P:a.filter(x=>x==='P').length,T:s.filter(x=>x==='T').length,n:a.length,O,R,or:O-R,oRate:(O+R)?O/(O+R):null,run:runs(a)};}
 function stats(s){const z=tally(s);const completed=runs(s.filter(x=>x!=='T'),true);const count={one:0,two:0,three:0,four:0};for(const r of completed){if(r.n===1)count.one++;else if(r.n===2)count.two++;else if(r.n===3)count.three++;else count.four++;}return {...z,completed:completed.length,count,sap:{one:count.one,two:count.two*2,three:count.three*4,four:count.four*8},open:z.run.at(-1)||null};}
 function classify(sequence, lengthCap){let s=sequence.filter(x=>x!=='T');if(lengthCap)s=s.slice(-lengthCap);const d=stats(s), n=d.completed, c=d.count;const one=n?c.one/n:0,two=n?c.two/n:0,three=n?c.three/n:0,four=n?c.four/n:0;const last=s[s.length-1]||null;
  if(s.length<10)return {kind:'insufficient',label:'样本不足',desc:'有效庄闲少于10手',d,signals:[]};
  const signals=[]; if(d.oRate>=.7)signals.push('近期转换较密');if(d.oRate<=.35)signals.push('近期重复较密');if(n>=4&&one>=.55)signals.push('单连集中');if(n>=3&&two>=.45)signals.push('二连集中');if(n>=3&&three>=.34)signals.push('三连较多');if(c.four>=2||four>=.23&&n>=4)signals.push('四连以上较多');
  // Deterministic, conservative classifications. Not a validated Ellis threshold.
  let kind='mixed',desc='暂未发现单一主导结构';
  if((d.oRate>=.72&&n>=3)||(n>=5&&one>=.6&&d.oRate>=.63)){kind='O';desc='历史走势中转换/单连较集中';}
  else if((d.oRate<=.32&&n>=2)||(c.four>=2&&d.oRate<=.42)){kind='R';desc='历史走势中重复/长连较集中';}
  else if(n>=4&&two>=.45&&d.oRate>=.35&&d.oRate<=.7){kind='N';desc='中性型候选：二连段较集中';}
  return {kind,label:{O:'O · 偏转换',N:'N · 二连型',R:'R · 偏重复',mixed:'混合 / 未归类'}[kind],desc,d,signals};
 }
 function directions(effective){const last=effective.at(-1),before=effective.at(-2);return {R:last||null,O:invert(last),T:before||null,OT:invert(before)};}
 function evaluate(raw){const seq=norm(raw),eff=seq.filter(x=>x!=='T');const whole=classify(eff),recent=classify(eff,14),previous=eff.length>=24?classify(eff.slice(-28,-14)):null;const W=stats(seq);const dirs=directions(eff);const r=recent.d; const total=r.completed,c=r.count;
 const notes=[];let system='未确定',vote=null,key='uncertain',grade='无法判定';
 if(eff.length<20)notes.push('有效结果不足20手：暂不进行系统筛选。');
 else if(recent.kind==='mixed'||recent.kind==='insufficient')notes.push('最近14手尚不能明确归类，不强行指定系统。');
 else if(previous&&previous.kind!=='mixed'&&previous.kind!==recent.kind)notes.push('最近14手与前14手分类不一致：可能变路，暂缓系统匹配。');
 else if(whole.kind!=='mixed'&&whole.kind!==recent.kind&&r.completed<7)notes.push('整靴和近期分类冲突，当前确认信息不足。');
 else {
  const n=total,one=n?c.one/n:0,two=n?c.two/n:0,three=n?c.three/n:0;
  const high3=n>=4&&c.three>=2&&three>=.35;
  const combined3=n>=5&&c.one>=1&&c.two>=1&&c.three>=1&&one>=.18&&two>=.18&&three>=.18;
  // Unverified variants are not assigned an invented directional algorithm.
  if(high3){system='OTB4L+（规则未核实）';notes.push('三连事件集中，符合Ellis历史OTB4L+候选；没有经核实的完整下一手规则。');}
  else if(combined3&&recent.kind==='O'){system='S40M3（规则未核实）';notes.push('单连、二连、三连都出现；第三模式具体触发条件未核实。');}
  else if(recent.kind==='O'&&r.oRate>=.72){system='基础 O 法（S40家族）';vote=dirs.O;grade='结构匹配';key='O';notes.push('最近14手转换占比较高，按基础Opposite规则取上一手反面；不等于完整System 40。');}
  else if(recent.kind==='N'&&n>=4&&two>=.45){system='OTB4L';vote=dirs.OT;grade='结构匹配';key='OT';notes.push('近期二连集中，按OTB4L取倒数第二手的相反方。');}
  else if(recent.kind==='R'&&c.four>=1&&r.oRate<=.32){system='Repeat';vote=dirs.R;grade='结构匹配';key='R';notes.push('近期长连续段和重复状态较明显，按Repeat跟上一手。');}
  else if(recent.kind==='R'&&n>=3&&c.two===0&&c.one>=1&&c.four>=1){system='TB4L';vote=dirs.T;grade='结构匹配';key='T';notes.push('二连缺少，同时可见单连与长连，按TB4L取倒数第二手。');}
  else notes.push('当前分类不足以唯一选出一个已完整定义的基础系统。');
 }
 if(W.B>=2*W.P&&W.P>=3)notes.push('庄的历史次数至少为闲的2倍；这是Strong Side描述，非额外方向信号。');
 else if(W.P>=2*W.B&&W.B>=3)notes.push('闲的历史次数至少为庄的2倍；这是Strong Side描述，非额外方向信号。');
 if(vote&&grade!=='结构匹配'){vote=null;key='uncertain';}
 return {seq,eff,whole,recent,previous,all:W,dirs,system,vote,key,grade,notes};
 }
 function parse(text){const s=String(text||'').toUpperCase().replace(/BANKER/g,'B').replace(/PLAYER/g,'P').replace(/TIE/g,'T').replace(/庄/g,'B').replace(/闲/g,'P').replace(/和/g,'T');return s.match(/[BPT]/g)||[];}
 return {norm,parse,runs,tally,stats,classify,directions,evaluate};
});
