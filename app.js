'use strict';
(()=>{
const $=id=>document.getElementById(id), A=window.RoadAnalyzer;
let seq=[], sourceBitmap=null, points=[], cells=[], liveScore=null, importMode='photo', focusBottom=false;
const canvas=$('photoCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const save=()=>{try{localStorage.setItem('roadlab-v1-seq',JSON.stringify(seq));$('saved').textContent='已保存在本机';}catch(e){$('saved').textContent='此浏览器不允许本地保存';}};
try{const s=JSON.parse(localStorage.getItem('roadlab-v1-seq'));if(Array.isArray(s))seq=A.norm(s);}catch(e){}
function label(v){return v==='B'?'庄':v==='P'?'闲':v==='T'?'和':'—';}
function handle(){const res=A.evaluate(seq);liveScore=res;$('countHands').textContent=res.all.n+' / '+res.all.T;$('countBP').textContent=res.all.B+' / '+res.all.P;$('countOR').textContent=res.all.O+' / '+res.all.R;
 $('wholeLabel').textContent=res.whole.label;$('recentLabel').textContent=res.recent.label;
 let change='待观察';if(res.previous&&res.previous.kind!==res.recent.kind&&res.previous.kind!=='mixed'&&res.recent.kind!=='mixed')change='前后分歧';else if(res.whole.kind===res.recent.kind&&['O','N','R'].includes(res.recent.kind))change='分类一致';$('changeLabel').textContent=change;
 $('sapDisplay').textContent=`已完成连续段 ${res.all.completed} 段；1连 ${res.all.count.one} / 2连 ${res.all.count.two} / 3连 ${res.all.count.three} / 4连及以上 ${res.all.count.four}。当前未完成段：${res.all.open?res.all.open.n+'连'+label(res.all.open.side):'—'}`;
 $('system').textContent='候选系统：'+res.system;
 const v=$('vote');v.textContent=res.vote?('倾向 '+label(res.vote)):'不确定 · 暂不下注';v.className='big '+(res.vote||'U');
 $('rationale').textContent=res.notes.join(' ')||'尚无足够历史数据。';
 $('dirGrid').innerHTML='';for(const [key,txt] of [['R','跟上一手'],['O','反上一手'],['T','跟倒数第二手'],['OT','反倒数第二手']]){const div=document.createElement('div'),head=document.createElement('label'),value=document.createElement('strong'),foot=document.createElement('div');head.textContent=key;value.textContent=label(res.dirs[key]);value.style.color=res.dirs[key]==='B'?'#bd4047':res.dirs[key]==='P'?'#216db4':'#94a0af';foot.textContent=txt;foot.className='caption';div.append(head,value,foot);$('dirGrid').appendChild(div);}
 const explain=$('explain');explain.innerHTML='';const ul=document.createElement('ul');for(const t of [`全靴：${res.whole.desc}，O比率${res.whole.d.oRate===null?'—':(res.whole.d.oRate*100).toFixed(1)+'%'}`,`最近14手：${res.recent.desc}，O比率${res.recent.d.oRate===null?'—':(res.recent.d.oRate*100).toFixed(1)+'%'}`,...res.notes]){const li=document.createElement('li');li.textContent=t;ul.append(li);}explain.append(ul);
 const history=$('history');history.innerHTML='';const show=seq.slice(-55);if(!show.length){history.innerHTML='<span class="muted">还没有庄闲记录。导入照片，或直接点击庄 / 闲 / 和。</span>';}else{const start=seq.length-show.length;for(let i=0;i<show.length;i+=6){const col=document.createElement('div');col.className='rcol';for(const x of show.slice(i,i+6)){const dot=document.createElement('div');dot.className='dot '+x;dot.textContent=x;col.appendChild(dot);}history.appendChild(col);}history.scrollLeft=history.scrollWidth;}
 save();}
function setSeq(s){seq=A.norm(s);handle();}
$('addB').onclick=()=>{seq.push('B');handle();};$('addP').onclick=()=>{seq.push('P');handle();};$('addT').onclick=()=>{seq.push('T');handle();};$('undo').onclick=()=>{seq.pop();handle();};
$('newShoe').onclick=()=>{if(seq.length&& !confirm('开始新牌靴？会清空当前历史，建议先导出复盘。'))return;setSeq([]);};
function switchMode(name){importMode=name;$('tabPhoto').classList.toggle('active',name==='photo');$('tabText').classList.toggle('active',name==='text');$('photoArea').classList.toggle('hide',name!=='photo');$('textArea').classList.toggle('hide',name!=='text');}
$('tabPhoto').onclick=()=>switchMode('photo');$('tabText').onclick=()=>switchMode('text');
$('importText').onclick=()=>{const arr=A.parse($('pasteInput').value);if(!arr.length){alert('没有找到B、P、T或庄、闲、和。');return;}if(seq.length&&!confirm(`确认用识别的 ${arr.length} 手替换当前 ${seq.length} 手？`))return;setSeq(arr);window.scrollTo({top:0,behavior:'smooth'});};
$('example').onclick=()=>{$('pasteInput').value='BBPPBBPPBBPBBBBPPBBBBBBBBBPBPBPPBPBP';};
function fileOut(name,type,str){const blob=new Blob([str],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
$('exportMD').onclick=()=>{const a=A.evaluate(seq),lines=[`# Baccarat Road Lab 复盘`,`日期：${new Date().toLocaleString('zh-CN')}`,`有效手：${a.all.n}，和：${a.all.T}`,`历史序列：\`${seq.join('')}\``,`整靴：${a.whole.label}；近期：${a.recent.label}`,`庄/闲：${a.all.B}/${a.all.P}；O/R：${a.all.O}/${a.all.R}`,`已完成连续段：1连${a.all.count.one}、2连${a.all.count.two}、3连${a.all.count.three}、4+连${a.all.count.four}`,`历史候选：${a.system}`,`规则下一手：${a.vote?label(a.vote):'不确定'}`,`说明：${a.notes.join('；')}`,`\n> 统计属于历史模式识别，不代表具备预测优势。`];fileOut('RoadLab_'+Date.now()+'.md','text/markdown;charset=utf-8',lines.join('\n\n'));};
$('exportCSV').onclick=()=>{const lines=['序号,开奖结果',...seq.map((x,i)=>`${i+1},${x}`)];fileOut('RoadLab_'+Date.now()+'.csv','text/csv;charset=utf-8','\ufeff'+lines.join('\n'));};

// Image ingestion: calibration at centers of corner cells; bilinear interpolation tolerates perspective.
$('photoFile').addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;try{let bitmap;if('createImageBitmap' in window)bitmap=await createImageBitmap(file);else bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file);});
 sourceBitmap=bitmap;focusBottom=false;configureCanvas();points=[];cells=[];$('calib').classList.remove('hide');$('scanReview').classList.add('hide');drawCanvas();hint();}catch(err){alert('照片无法打开：'+err.message);}});
function configureCanvas(){if(!sourceBitmap)return;const srcHeight=focusBottom?sourceBitmap.height*.37:sourceBitmap.height;const scale=Math.min(1,1400/Math.max(sourceBitmap.width,srcHeight));canvas.width=Math.max(1,Math.round(sourceBitmap.width*scale));canvas.height=Math.max(1,Math.round(srcHeight*scale));$('focusBottom').textContent=focusBottom?'显示整张照片':'聚焦下方路纸';}
$('focusBottom').onclick=()=>{if(!sourceBitmap)return;focusBottom=!focusBottom;configureCanvas();points=[];cells=[];drawCanvas();hint();$('scanReview').classList.add('hide');};
function drawCanvas(){if(!sourceBitmap)return;ctx.clearRect(0,0,canvas.width,canvas.height);if(focusBottom){const h=sourceBitmap.height*.37;ctx.drawImage(sourceBitmap,0,sourceBitmap.height-h,sourceBitmap.width,h,0,0,canvas.width,canvas.height);}else ctx.drawImage(sourceBitmap,0,0,canvas.width,canvas.height);const names=['①左上','②右上','③左下','④右下'];for(let i=0;i<points.length;i++){const p=points[i];ctx.strokeStyle='#ffe868';ctx.lineWidth=Math.max(2,canvas.width/400);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(7,canvas.width/100),0,Math.PI*2);ctx.stroke();ctx.font=`bold ${Math.max(15,canvas.width/50)}px sans-serif`;ctx.fillStyle='#ffffff';ctx.strokeStyle='#16243b';ctx.lineWidth=3;ctx.strokeText(names[i],p.x+12,p.y-8);ctx.fillText(names[i],p.x+12,p.y-8);}}
function hint(){$('coordHint').textContent=points.length<4?['① 点击珠盘左上第一格圆心','② 点击珠盘最右列第一行圆心','③ 点击珠盘最左列最后一行圆心','④ 点击珠盘最右列最后一行圆心'][points.length]:'已完成四点校准；设置行列数并点击“识别网格”。';$('scanGrid').disabled=points.length!==4;}
canvas.addEventListener('click',ev=>{if(!sourceBitmap||points.length===4)return;const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*canvas.width,y=(ev.clientY-r.top)/r.height*canvas.height;points.push({x,y});drawCanvas();hint();});
$('resetPoints').onclick=()=>{points=[];cells=[];drawCanvas();hint();$('scanReview').classList.add('hide');};
function coord(i,j,cols,rows){const u=cols<=1?0:i/(cols-1),v=rows<=1?0:j/(rows-1),[tl,tr,bl,br]=points;return {x:(1-u)*(1-v)*tl.x+u*(1-v)*tr.x+(1-u)*v*bl.x+u*v*br.x,y:(1-u)*(1-v)*tl.y+u*(1-v)*tr.y+(1-u)*v*bl.y+u*v*br.y};}
function pixelVote(img,x,y,radius){const counts={B:0,P:0,T:0};let colored=0;for(const mult of [.18,.26,.34])for(let k=0;k<24;k++){const theta=2*Math.PI*k/24,px=Math.round(x+Math.cos(theta)*radius*mult),py=Math.round(y+Math.sin(theta)*radius*mult);if(px<0||py<0||px>=img.width||py>=img.height)continue;const at=(py*img.width+px)*4,r=img.data[at]/255,g=img.data[at+1]/255,b=img.data[at+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),delta=mx-mn,sat=mx?delta/mx:0; if(mx<.25||sat<.27||delta<.12)continue;
 let hue=0;if(delta>0){if(mx===r)hue=60*((g-b)/delta%6);else if(mx===g)hue=60*((b-r)/delta+2);else hue=60*((r-g)/delta+4);if(hue<0)hue+=360;}
 if(hue<=19||hue>=344){counts.B++;colored++;}else if(hue>=185&&hue<=258){counts.P++;colored++;}else if(hue>=65&&hue<=174){counts.T++;colored++;}}
 let top='';for(const k of ['B','P','T'])if(counts[k]>(counts[top]||0))top=k;
 const num=top?counts[top]:0;return {value:colored>=9&&num>=7&&num/Math.max(1,colored)>=.58?top:'',counts,confidence:num/72};}
$('scanGrid').onclick=()=>{if(points.length!==4)return;const cols=Math.round(+$('gridCols').value),rows=Math.round(+$('gridRows').value);if(cols<2||cols>45||rows<2||rows>9){alert('请确认行列数。');return;}drawCanvas();const img=ctx.getImageData(0,0,canvas.width,canvas.height);const dx=cols>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/(cols-1):20;const dy=rows>1?Math.hypot(points[2].x-points[0].x,points[2].y-points[0].y)/(rows-1):20;const rad=Math.min(dx,dy)*.9;
 cells=[];let checks=[];for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){const p=coord(c,r,cols,rows),q=pixelVote(img,p.x,p.y,rad);cells.push(q.value);checks.push(q.confidence);}renderCells(cols,rows);$('scanReview').classList.remove('hide');$('scanSummary').textContent=`识别 ${cols}列×${rows}行；庄${cells.filter(x=>x==='B').length}，闲${cells.filter(x=>x==='P').length}，和${cells.filter(x=>x==='T').length}。请校对格子再导入。`;};
function renderCells(cols,rows){const el=$('cellGrid');el.innerHTML='';el.style.gridTemplateColumns=`repeat(${cols}, 31px)`;el.style.maxWidth='none';el.style.width='max-content'; // display columns in natural horizontal order per rows, but underlying data is col-major
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){let i=c*rows+r;const button=document.createElement('button');button.className=cells[i]||'empty';button.textContent=cells[i]||'·';button.setAttribute('aria-label',`第${c+1}列第${r+1}行`);button.onclick=()=>{const opts=['','B','P','T'];cells[i]=opts[(opts.indexOf(cells[i])+1)%opts.length];renderCells(cols,rows);};el.appendChild(button);}}
$('applyScan').onclick=()=>{const cols=Math.round(+$('gridCols').value),rows=Math.round(+$('gridRows').value),list=[];let ended=false,hasHoles=false;for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){const v=cells[c*rows+r];if(v){if(ended)hasHoles=true;list.push(v);}else ended=true;}
 if(hasHoles&&!confirm('识别结果包含空格后又出现圆圈，可能校准位置不准确。仍然导入非空格吗？'))return;
 if(list.length===0){alert('没有识别到有效珠盘，请重选网格或使用文字录入。');return;}
 if(seq.length&&!confirm(`将照片识别的${list.length}手替换当前${seq.length}手？`))return;setSeq(list);$('scanReview').classList.add('hide');window.scrollTo({top:0,behavior:'smooth'});};
$('cancelReview').onclick=()=>$('scanReview').classList.add('hide');
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
handle();
})();
