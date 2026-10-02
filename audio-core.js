const PRE_B=[1.53512485958697,-2.69169618940638,1.19839281085285];
const PRE_A=[1,-1.69065929318241,0.73248077421585];
const RLB_B=[1,-2,1];
const RLB_A=[1,-1.99004745483398,0.99007225036621];

export function biquad(input,b,a){const out=new Float64Array(input.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<input.length;i++){const x=input[i];const y=b[0]*x+b[1]*x1+b[2]*x2-a[1]*y1-a[2]*y2;out[i]=y;x2=x1;x1=x;y2=y1;y1=y}return out}
export function kWeight(input){return biquad(biquad(input,PRE_B,PRE_A),RLB_B,RLB_A)}
export function meanSquare(input,start=0,end=input.length){if(end<=start)return 0;let sum=0;for(let i=start;i<end;i++){const x=input[i];sum+=x*x}return sum/(end-start)}
export function samplePeak(channels){let p=0;for(const c of channels)for(let i=0;i<c.length;i++)p=Math.max(p,Math.abs(c[i]));return p}
export function dbfs(v){return v>0?20*Math.log10(v):-Infinity}
export function rmsDb(channels){let sum=0,n=0;for(const c of channels){for(let i=0;i<c.length;i++){sum+=c[i]*c[i];n++}}return n?dbfs(Math.sqrt(sum/n)):-Infinity}
export function estimatedTruePeak(channels,oversample=4){let peak=samplePeak(channels);for(const c of channels){for(let i=0;i<c.length-1;i++){const a=c[i],b=c[i+1];for(let s=1;s<oversample;s++){const v=a+(b-a)*(s/oversample);peak=Math.max(peak,Math.abs(v))}}}return peak}
export function integratedLufs(channels,sampleRate=48000){if(!channels.length||!channels[0]?.length)return -Infinity;if(sampleRate!==48000)throw new Error('integratedLufs expects 48 kHz analysis audio');const weighted=channels.slice(0,2).map(kWeight);const block=Math.round(.4*sampleRate),step=Math.round(.1*sampleRate),blocks=[];for(let start=0;start+block<=weighted[0].length;start+=step){let e=0;for(const c of weighted)e+=meanSquare(c,start,start+block);const l=e>0?-0.691+10*Math.log10(e):-Infinity;blocks.push({e,l})}const abs=blocks.filter(b=>b.l>-70);if(!abs.length)return -Infinity;const meanAbs=abs.reduce((a,b)=>a+b.e,0)/abs.length;const prelim=-0.691+10*Math.log10(meanAbs);const threshold=Math.max(-70,prelim-10);const gated=blocks.filter(b=>b.l>threshold);if(!gated.length)return -Infinity;const e=gated.reduce((a,b)=>a+b.e,0)/gated.length;return -0.691+10*Math.log10(e)}
export function stereoCorrelation(channels){if(channels.length<2)return 1;const a=channels[0],b=channels[1],n=Math.min(a.length,b.length);if(!n)return 0;let aa=0,bb=0,ab=0;for(let i=0;i<n;i++){aa+=a[i]*a[i];bb+=b[i]*b[i];ab+=a[i]*b[i]}return aa&&bb?ab/Math.sqrt(aa*bb):0}
export function crestFactorDb(channels){const p=samplePeak(channels),r=Math.pow(10,rmsDb(channels)/20);return p>0&&r>0?20*Math.log10(p/r):0}
export function peakCount(channels,threshold=.999){let n=0;for(const c of channels)for(let i=0;i<c.length;i++)if(Math.abs(c[i])>=threshold)n++;return n}
export function dcOffset(channels){if(!channels.length)return 0;let sum=0,n=0;for(const c of channels)for(let i=0;i<c.length;i++){sum+=c[i];n++}return n?sum/n:0}
export function sectionLoudness(channels,sampleRate=48000,seconds=30){const n=Math.min(channels[0]?.length||0,Math.round(sampleRate*seconds));if(!n)return -Infinity;return integratedLufs(channels.map(c=>c.slice(0,n)),sampleRate)}
export function percentile(values,p){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)}
export function median(values){return percentile(values,.5)}
export function analyzePcm(channels,sampleRate=48000){const peak=samplePeak(channels),rms=rmsDb(channels),lufs=integratedLufs(channels,sampleRate),tp=estimatedTruePeak(channels);return {lufs,rmsDb:rms,samplePeakDb:dbfs(peak),estimatedTruePeakDb:dbfs(tp),crestDb:crestFactorDb(channels),correlation:stereoCorrelation(channels),clipSamples:peakCount(channels),dcOffset:dcOffset(channels)}}
