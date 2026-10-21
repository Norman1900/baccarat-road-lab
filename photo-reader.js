/* Offline automatic bead-plate extraction for the photographed live-table layout.
   No OCR, no server upload. Assumes portrait, bead plate in lower-left, up to 6 rows. */
(function(root){'use strict';
function color(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx<75||mx-mn<53||mx-mn<mx*.30)return 0;
if(r>g*1.24&&r>b*1.17)return 1;
if(b>r*1.20&&b>g*1.10)return 2;
if(g>r*1.18&&g>b*.85)return 3;return 0;}
function smooth(arr,k){let out=new Float64Array(arr.length),sum=0;for(let i=0;i<arr.length;i++){sum+=arr[i];if(i-k-1>=0)sum-=arr[i-k-1];if(i>=k)out[i-Math.floor(k/2)]=sum/(k+1);}return out;}
function peaks(hist,from,to,minDistance,minAmp){let cand=[];for(let i=Math.ceil(from)+1;i<Math.floor(to)-1;i++)if(hist[i]>=minAmp&&hist[i]>=hist[i-1]&&hist[i]>hist[i+1])cand.push({p:i,v:hist[i]});cand.sort((a,b)=>b.v-a.v);let kept=[];for(const c of cand){if(kept.every(t=>Math.abs(t.p-c.p)>=minDistance))kept.push(c);if(kept.length>=24)break;}return kept.sort((a,b)=>a.p-b.p);}
function chooseSix(a,rangeMin,rangeMax){if(a.length<6)return null;let best=null;for(let i=0;i<a.length-5;i++)for(let j=i+5;j<a.length;j++){const step=(a[j].p-a[i].p)/5;if(step<rangeMin||step>rangeMax)continue;let chosen=[a[i]],err=0,used=new Set([i,j]);for(let k=1;k<=4;k++){const target=a[i].p+step*k;let curr=null,index=-1;for(let m=i+1;m<j;m++){if(used.has(m))continue;if(curr===null||Math.abs(a[m].p-target)<Math.abs(curr.p-target)){curr=a[m];index=m;}}if(curr===null||Math.abs(curr.p-target)>step*.37){err+=100;break;}used.add(index);chosen.push(curr);err+=Math.pow((curr.p-target)/step,2);}chosen.push(a[j]);if(chosen.length!==6)continue;const sum=chosen.reduce((z,p)=>z+p.v,0);const score=sum/(1+err*8);if(!best||score>best.score)best={pts:chosen.map(x=>x.p),score,step};}return best;}
function decode(img,x,y,radius){let n=[0,0,0,0];const r=Math.round(radius*.82);for(let dy=-r;dy<=r;dy+=2)for(let dx=-r;dx<=r;dx+=2){const px=Math.round(x+dx),py=Math.round(y+dy);if(px<0||py<0||px>=img.width||py>=img.height)continue;const off=(py*img.width+px)*4;n[color(img.data[off],img.data[off+1],img.data[off+2])]++;}const arr=n.slice(1),max=Math.max(...arr),idx=arr.indexOf(max)+1,colored=n[1]+n[2]+n[3];return {side:colored>=18&&max/colored>.59?['','B','P','T'][idx]:'',confidence:max/Math.max(1,colored),colored};}
async function analyze(file){let bmp=await createImageBitmap(file);let width=Math.min(bmp.width,1050),ratio=width/bmp.width,height=Math.round(bmp.height*ratio);let cvs=document.createElement('canvas');cvs.width=width;cvs.height=height;let ctx=cvs.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,width,height);if(bmp.close)bmp.close();const img=ctx.getImageData(0,0,width,height),W=width,H=height;
let x0=Math.round(W*.022),x1=Math.round(W*.39),y0=Math.round(H*.595),y1=Math.round(H*.857),rows=new Float64Array(H),cols=new Float64Array(W);
for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){let off=(y*W+x)*4,c=color(img.data[off],img.data[off+1],img.data[off+2]);if(c){rows[y]+=1;}}
// each sample contributes its row; repeated two-pixel rows are smoothed.
const rh=smooth(rows,10);let rp=peaks(rh,y0,y1,Math.max(12,H*.020),3),selY=chooseSix(rp,H*.019,H*.063);
if(!selY)return {ok:false,error:'未找到连续六行珠盘圆点。请把整块珠盘拍清楚，减少反光后重试。',meta:{yCandidates:rp.length}};
const rowStart=Math.max(y0,Math.round(selY.pts[0]-selY.step*.43)),rowEnd=Math.min(y1,Math.round(selY.pts[5]+selY.step*.43));
for(let y=rowStart;y<=rowEnd;y+=2)for(let x=x0;x<x1;x++){const off=(y*W+x)*4;if(color(img.data[off],img.data[off+1],img.data[off+2]))cols[x]++;}
const ch=smooth(cols,Math.max(4,Math.round(W*.009)));let cp=peaks(ch,x0,x1,Math.max(14,W*.026),5),selX=chooseSix(cp,W*.026,W*.089);
if(!selX)return {ok:false,error:'找到六行，但未可靠定位六列珠盘。请完整拍入左下方的珠盘区域。',meta:{rows:selY.pts,xCandidates:cp.length}};
let grid=[],seq=[],scores=[];const radius=Math.min(selX.step,selY.step)*.5;for(let ci=0;ci<6;ci++){grid[ci]=[];for(let ri=0;ri<6;ri++){const x=selX.pts[ci],y=selY.pts[ri],dec=decode(img,x,y,radius);grid[ci][ri]=dec.side;scores.push(dec.confidence);}}
// Column-major chronological order, stop at first blank; reject gaps inside the active grid.
let seenEmpty=false,gaps=0;for(const column of grid)for(const side of column){if(!side)seenEmpty=true;else if(seenEmpty)gaps++;else seq.push(side);}
if(seq.length<12||gaps>2)return {ok:false,error:`检测到珠盘，但有${gaps}个空格或${seq.length}手有效位置，请使用“修正识别”或重新拍照。`,grid,meta:{rows:selY.pts,cols:selX.pts,found:seq.length,gaps},imageData:img};
const mean=seq.length?scores.slice(0,seq.length).reduce((a,b)=>a+b,0)/seq.length:0;
return {ok:true,seq,grid,confidence:mean,tailOnly:seq.length===36,meta:{rows:selY.pts,cols:selX.pts,gaps,photoSize:[W,H]},preview:cvs.toDataURL('image/jpeg',.80)};}
root.RoadPhoto={analyze};})(typeof window!=='undefined'?window:globalThis);
