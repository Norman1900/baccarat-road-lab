/* Baccarat Road Lab 2.0 — deterministic road analytics. Historical matching ≠ predictive proof. */
(function(root,factory){const o=factory();if(typeof module==='object'&&module.exports)module.exports=o;root.RoadAnalyzer=o;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const invert=x=>x==='B'?'P':x==='P'?'B':null;
const norm=x=>(Array.isArray(x)?x:[]).map(v=>String(v).toUpperCase()).filter(v=>'BPT'.includes(v));
function parse(t){const s=String(t||'').toUpperCase().replace(/BANKER/g,'B').replace(/PLAYER/g,'P').replace(/TIE/g,'T').replace(/庄/g,'B').replace(/閒/g,'P').replace(/闲/g,'P').replace(/和/g,'T');return s.match(/[BPT]/g)||[];}
function runs(e){const a=[];for(const side of e){let z=a.at(-1);if(z&&z.side===side)z.n++;else a.push({side,n:1});}return a;}
function tall(e){const B=e.filter(x=>x==='B').length,P=e.filter(x=>x==='P').length;let O=0,R=0;for(let i=1;i<e.length;i++)e[i]===e[i-1]?R++:O++;return {B,P,O,R,n:e.length,oRate:O+R?O/(O+R):null,run:runs(e)};}
function stats(raw){const seq=norm(raw),eff=seq.filter(x=>x!=='T'),t=tall(eff),full=runs(eff),closed=full.slice(0,-1),c={one:0,two:0,three:0,four:0};for(const r of closed){if(r.n===1)c.one++;else if(r.n===2)c.two++;else if(r.n===3)c.three++;else c.four++;}return {...t,T:seq.length-eff.length,completed:closed.length,count:c,sap:{one:c.one,two:c.two*2,three:c.three*4,four:c.four*8},open:full.at(-1)||null};}
function classify(raw){const s=stats(raw),n=s.completed,c=s.count,one=n?c.one/n:0,two=n?c.two/n:0;
let kind='mixed';if(s.n<10)kind='low';else if((s.oRate>=.72&&n>=3)||(one>=.60&&n>=5&&s.oRate>=.62))kind='O';else if((s.oRate<=.32&&n>=2)||(c.four>=2&&s.oRate<=.42))kind='R';else if(n>=4&&two>=.43&&s.oRate>=.33&&s.oRate<=.73)kind='N';return {kind,label:({O:'O · 偏转换',R:'R · 偏重复',N:'N · 二连集中',low:'数据不足',mixed:'混合 / 未归类'})[kind],data:s};}
function directions(e){const x=e.at(-1)||null,y=e.at(-2)||null;return {R:x,O:invert(x),T:y,OT:invert(y)};}
// Big Eye offset=1; Small Road offset=2; Cockroach Pig offset=3. Ties don't advance Big Road.
function derived(e,offset){let marks=[],col=[];for(const side of e){let last=col.at(-1),newCol=!last||last.side!==side;if(newCol)col.push({side,n:1});else last.n++;
const c=col.length-1,r=col[c].n-1;
if(r===0){if(c>=offset+1)marks.push(col[c-1].n===col[c-offset-1].n?'R':'B');}
else if(c>=offset){const prev=col[c-offset].n;marks.push(prev>=r+1?'R':prev===r?'B':'R');}}
return marks;}
function roadAnalysis(e){const roads=[1,2,3].map((offset,i)=>{const seq=derived(e,offset),last=seq.slice(-12),red=last.filter(x=>x==='R').length;return {name:['大眼仔','小路','曱甴路'][i],marks:seq,latest:seq.at(-1)||null,red,blue:last.length-red,n:last.length};});
const whatIf={};for(const side of ['B','P']){const after=[...e,side];whatIf[side]=[1,2,3].map((offset,i)=>{const n=derived(after,offset),before=roads[i].marks.length;return n.length>before?n.at(-1):null;});}
return {roads,whatIf,agreement:roads.every(x=>x.latest)&&roads.every(x=>x.latest===roads[0].latest)?(roads[0].latest==='R'?'三路近期末端均红':'三路近期末端均蓝'):'末端颜色不同或数据不足'};}
function ciWilson(k,n,z=1.96){if(!n)return [0,1];const p=k/n,z2=z*z,den=1+z2/n,mid=(p+z2/(2*n))/den,hal=z*Math.sqrt((p*(1-p)+z2/(4*n))/n)/den;return [Math.max(0,mid-hal),Math.min(1,mid+hal)];}
function transition(e){let v={R:{R:0,O:0},O:{R:0,O:0}},ors=[];for(let i=1;i<e.length;i++)ors.push(e[i]===e[i-1]?'R':'O');for(let i=1;i<ors.length;i++)v[ors[i-1]][ors[i]]++;return Object.fromEntries(['R','O'].map(k=>{const n=v[k].R+v[k].O;return [k,{...v[k],n,pO:(v[k].O+.5)/(n+1),ci:ciWilson(v[k].O,n)}];}));}
function windowSummary(e,n){const s=e.slice(-n);return {size:s.length,...tall(s)};}
function evaluate(raw,opts={}){const seq=norm(raw),e=seq.filter(x=>x!=='T'),d=stats(seq),whole=classify(e),recent=classify(e.slice(-14)),prev=classify(e.slice(-28,-14)),w10=windowSummary(e,11),w20=windowSummary(e,21),dir=directions(e),road=roadAnalysis(e),trans=transition(e);
const notes=[],conflict=whole.kind!=='low'&&recent.kind!=='low'&&whole.kind!==recent.kind&&whole.kind!=='mixed'&&recent.kind!=='mixed';const shift=(w10.O+w10.R>=8&&w20.O+w20.R>=16&&Math.abs(w10.oRate-w20.oRate)>.26);
let system='未确定',vote=null,key=null,why='历史数据不足以匹配单一系统';
if(e.length<20)notes.push('有效结果不足20手，暂不匹配系统。');
else if(recent.kind==='mixed'||recent.kind==='low')notes.push('近期结构不够明确。');
else if((prev.kind!=='mixed'&&prev.kind!=='low'&&prev.kind!==recent.kind)||conflict&&shift)notes.push('近期与前段/整靴明显不一致，记录为潜在变路。');
else {const c=recent.data.count,n=recent.data.completed;
if(c.three>=2&&n>=5&&c.three/n>=.33){system='OTB4L+（附加规则未核实）';why='三连事件相对活跃，但缺少完整变体动作规则。';}
else if(recent.kind==='O'&&recent.data.oRate>=.72){system='基础O（S40家族）';vote=dir.O;key='O';why='近期相邻结果以换边为主；按反上一手演示，不等于完整S40。';}
else if(recent.kind==='N'&&c.two>=2){system='OTB4L';vote=dir.OT;key='OT';why='近期已完成二连比较集中；按倒数第二手反面演示。';}
else if(recent.kind==='R'&&c.two===0&&c.one>0&&c.four>0){system='TB4L';vote=dir.T;key='T';why='近期单连和较长连续段并存，且没有二连；按倒数第二手相同方演示。';}
else if(recent.kind==='R'&&recent.data.oRate<=.32){system='Repeat';vote=dir.R;key='R';why='近期重复较密；按上一手相同方演示。';}
else notes.push('历史分类没有唯一匹配的已核实基础规则。');}
if(conflict)notes.push('整靴与最近14手分类分歧。');if(shift)notes.push('最近约10次转换与最近约20次转换差异较大，存在变化迹象（非预测结论）。');
let completeness=opts.totalHands?{reported:Number(opts.totalHands),observed:seq.length,partial:Number(opts.totalHands)>seq.length}:null;
if(completeness?.partial)notes.push(`屏幕总局数${completeness.reported}，但识别到${seq.length}手：仅是可见路纸片段，不能当作完整靴统计。`);
if(opts.photoTailOnly)notes.push('图片显示的珠盘区域可能只保留最近若干手；全靴标签仅基于可见历史。');
return {seq,eff:e,all:d,whole,recent,prev,w10,w20,dir,road,trans,system,vote,key,why,conflict,shift,notes,completeness,classification:'研究性历史匹配',evidence:'未发现经独立样本验证的新增预测优势'};}
return {invert,norm,parse,runs,stats,derived,roadAnalysis,transition,ciWilson,windowSummary,classify,directions,evaluate};
});
