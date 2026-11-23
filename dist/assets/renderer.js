var e={maxGrabs:8,meshShortSegs:128,meshMaxSegs:192,imageMaxSide:2048,alphaSampleMaxSide:1024,fitRatio:1,dprCap:3,maskSize:512,maskBlur:.008,dragOmega:80,dragZeta:.85,grabEaseMs:60,radiusGrow:.35,substep:1/240,maxDt:1/30,settlePos:.001,settleVel:.01,gifMaxSeconds:6,gifFps:30,gifMaxSide:480},t=(e,t,n)=>e+(t-e)*n;function n(e){return{radius:.22,stretch:t(.44,.66,e),releaseFreq:t(12,6,e),releaseZeta:t(.28,.1,e),bulge:.1}}function r(e){return t(.35,.1,e)}function i(e){return Math.min(1,Math.max(0,(.35-e)/.25))}var a=.5,o=new class{map=new Map;on(e,t){let n=this.map.get(e);n||this.map.set(e,n=new Set),n.add(t)}emit(e){this.map.get(e)?.forEach(e=>e())}},s={mode:`empty`,image:null,maskEnabled:!0,softness:a,params:n(a),volume:.7,muted:!1,recFormat:`video`,recording:!1};function c(e){s.mode!==e&&(s.mode=e,document.body.dataset.mode=e,o.emit(`mode`))}var l=class{ctx=null;master=null;ensure(){if(!this.ctx)try{let e=window.AudioContext||window.webkitAudioContext;this.ctx=new e,this.master=this.ctx.createGain(),this.master.connect(this.ctx.destination)}catch{return null}return this.ctx.state===`suspended`&&this.ctx.resume(),this.master.gain.value=s.muted?0:s.volume,this.ctx}unlock(){let e=this.ensure();if(!e)return;e.state===`suspended`&&e.resume();let t=e.createBufferSource();t.buffer=e.createBuffer(1,1,22050),t.connect(e.destination),t.start(0)}grab(){let e=this.ensure();if(!e||s.muted)return;let t=e.currentTime,n=e.createOscillator();n.type=`sine`,n.frequency.setValueAtTime(185,t),n.frequency.exponentialRampToValueAtTime(130,t+.09);let r=e.createGain();r.gain.setValueAtTime(0,t),r.gain.linearRampToValueAtTime(.3,t+.008),r.gain.exponentialRampToValueAtTime(.001,t+.12),n.connect(r).connect(this.master),n.start(t),n.stop(t+.14);let i=this.noiseSource(e,.06),a=e.createBiquadFilter();a.type=`lowpass`,a.frequency.value=500;let o=e.createGain();o.gain.setValueAtTime(.1,t),o.gain.exponentialRampToValueAtTime(.001,t+.07),i.connect(a).connect(o).connect(this.master),i.start(t)}release(e,t){let n=this.ensure();if(!n||s.muted||e<.05)return;let r=n.currentTime,i=.12+.3*e,a=n.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(240,r),a.frequency.exponentialRampToValueAtTime(165,r+.3);let o=n.createGain();o.gain.setValueAtTime(i,r),o.gain.exponentialRampToValueAtTime(.001,r+.4);let c=n.createGain();c.gain.setValueAtTime(1,r);let l=n.createOscillator();l.type=`sine`,l.frequency.value=t;let u=n.createGain();u.gain.value=.5,l.connect(u).connect(c.gain),a.connect(o).connect(c).connect(this.master),a.start(r),a.stop(r+.45),l.start(r),l.stop(r+.45)}noiseSource(e,t){let n=e.createBuffer(1,Math.ceil(e.sampleRate*t),e.sampleRate),r=n.getChannelData(0);for(let e=0;e<r.length;e++)r[e]=Math.random()*2-1;let i=e.createBufferSource();return i.buffer=n,i}};function u(e,t,n){let r=Math.min(1,n/Math.max(e,t));return{w:Math.max(1,Math.round(e*r)),h:Math.max(1,Math.round(t*r))}}async function d(e){let t=typeof e==`string`?e:URL.createObjectURL(e);try{let e=new Image;return e.crossOrigin=`anonymous`,e.src=t,await e.decode(),e}finally{typeof e!=`string`&&URL.revokeObjectURL(t)}}async function f(e,t){let n;if(e instanceof Blob){if(e.type===`image/svg+xml`)n=await d(e);else try{n=await createImageBitmap(e,{imageOrientation:`from-image`})}catch{n=await d(e)}}else n=e;let r=`naturalWidth`in n?n.naturalWidth:n.width,i=`naturalHeight`in n?n.naturalHeight:n.height;if(!r||!i)throw Error(`Empty image dimensions`);let{w:a,h:o}=u(r,i,t),s=document.createElement(`canvas`);s.width=a,s.height=o;let c=s.getContext(`2d`);return c.imageSmoothingQuality=`high`,c.drawImage(n,0,0,a,o),`close`in n&&typeof n.close==`function`&&n.close(),s}async function p(t){let n=await f(t,e.imageMaxSide),r=u(n.width,n.height,e.alphaSampleMaxSide),i;if(r.w===n.width&&r.h===n.height)i=n.getContext(`2d`).getImageData(0,0,n.width,n.height);else{let e=document.createElement(`canvas`);e.width=r.w,e.height=r.h;let t=e.getContext(`2d`);t.drawImage(n,0,0,r.w,r.h),i=t.getImageData(0,0,r.w,r.h)}return{source:n,width:n.width,height:n.height,aspect:n.width/n.height,alpha:i}}async function m(t){try{let e=await fetch(t);if(!e.ok)throw Error(`HTTP ${e.status}`);return await p(await e.blob())}catch{let n=await f(await d(t),e.imageMaxSide),r=u(n.width,n.height,e.alphaSampleMaxSide),i=document.createElement(`canvas`);i.width=r.w,i.height=r.h;let a=i.getContext(`2d`);a.drawImage(n,0,0,r.w,r.h);let o=a.getImageData(0,0,r.w,r.h);return{source:n,width:n.width,height:n.height,aspect:n.width/n.height,alpha:o}}}function h(e){let{data:t,width:n,height:r}=e.alpha;return(e,i)=>{let a=Math.min(n-1,Math.max(0,Math.round(e*(n-1)))),o=Math.min(r-1,Math.max(0,Math.round(i*(r-1))));return t[(o*n+a)*4+3]/255}}var g=class{aspect=1;canvasW=1;canvasH=1;k=1;ox=0;oy=0;a=1;b=0;tx=0;ty=0;mat=new Float32Array(9);update(e,t,n,r){this.aspect=n,this.canvasW=e,this.canvasH=t,this.k=r*Math.min(e/n,t),this.ox=(e-this.k*n)/2,this.oy=(t-this.k)/2}get scale(){return Math.hypot(this.a,this.b)}resetUser(){this.a=1,this.b=0,this.tx=0,this.ty=0}isTransformed(){return Math.abs(this.scale-1)>.001||Math.abs(this.b)>.001||Math.abs(this.tx)>.5||Math.abs(this.ty)>.5}applyGesture(e,t,n,r){let i=t.x-e.x,a=t.y-e.y,o=r.x-n.x,s=r.y-n.y,c=i*i+a*a;if(c<1e-6)return;let l=(o*i+s*a)/c,u=(s*i-o*a)/c,d=Math.hypot(l,u);if(d<1e-6)return;let f=Math.min(Math.max(d*this.scale,.5),8)/this.scale;l*=f/d,u*=f/d,this.compose(l,u,n.x-(l*e.x-u*e.y),n.y-(u*e.x+l*e.y))}zoomAt(e,t,n){let r=Math.min(Math.max(n*this.scale,.5),8)/this.scale;this.compose(r,0,e*(1-r),t*(1-r))}compose(e,t,n,r){let{a:i,b:a,tx:o,ty:s}=this;this.a=e*i-t*a,this.b=t*i+e*a,this.tx=e*o-t*s+n,this.ty=t*o+e*s+r}matrix(){let{k:e,ox:t,oy:n,canvasW:r,canvasH:i,a,b:o,tx:s,ty:c}=this,l=a*e,u=o*e,d=a*t-o*n+s,f=o*t+a*n+c;return this.mat.set([2*l/r,-2*u/i,0,-2*u/r,-2*l/i,0,2*d/r-1,1-2*f/i,1]),this.mat}canvasPxFromClient(e,t,n){let r=n.getBoundingClientRect();return{x:(e-r.left)*this.canvasW/r.width,y:(t-r.top)*this.canvasH/r.height}}isoFromClient(e,t,n){let r=this.canvasPxFromClient(e,t,n),{a:i,b:a,tx:o,ty:s}=this,c=i*i+a*a,l=r.x-o,u=r.y-s,d=(i*l+a*u)/c,f=(-a*l+i*u)/c;return{x:(d-this.ox)/this.k,y:(f-this.oy)/this.k}}isoToCssLength(e,t){let n=t.getBoundingClientRect();return e*this.k*this.scale*(n.width/this.canvasW)}restUvFromIso(e){return{x:e.x/this.aspect,y:e.y}}};function _(e,t){e.addEventListener(`pointerdown`,n=>{let r=t();if(r?.down){n.preventDefault();try{e.setPointerCapture(n.pointerId)}catch{}r.down(n)}}),e.addEventListener(`pointermove`,e=>t()?.move?.(e));let n=e=>t()?.up?.(e);e.addEventListener(`pointerup`,n),e.addEventListener(`pointercancel`,n),e.addEventListener(`contextmenu`,e=>e.preventDefault()),document.addEventListener(`gesturestart`,e=>e.preventDefault())}var v=class{canvas=document.createElement(`canvas`);ctx;blurCanvas=document.createElement(`canvas`);blurCtx;blurDirty=!0;dirty=!1;painted=!1;data=null;constructor(){this.canvas.width=1,this.canvas.height=1,this.ctx=this.canvas.getContext(`2d`,{alpha:!1,willReadFrequently:!0}),this.blurCtx=this.blurCanvas.getContext(`2d`,{alpha:!1,willReadFrequently:!0})}setup(t){let n=e.maskSize,r=t>=1?n:Math.max(1,Math.round(n*t)),i=t>=1?Math.max(1,Math.round(n/t)):n;this.canvas.width=r,this.canvas.height=i,this.blurCanvas.width=r,this.blurCanvas.height=i,this.clear()}ensureBlur(){if(!this.blurDirty)return;let{width:t,height:n}=this.canvas,r=Math.max(2,Math.round(Math.max(t,n)*e.maskBlur)),i=this.blurCtx;i.filter=`none`,i.fillStyle=`#000`,i.fillRect(0,0,t,n),i.filter=`blur(${r}px)`,i.drawImage(this.canvas,0,0),i.filter=`none`,this.blurDirty=!1}textureSource(){return this.ensureBlur(),this.blurCanvas}clear(){this.ctx.globalCompositeOperation=`source-over`,this.ctx.fillStyle=`#000`,this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height),this.painted=!1,this.snap=null,this.invalidate()}snap=null;snapPainted=!1;beginStroke(){this.snap=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height),this.snapPainted=this.painted}cancelStroke(){this.snap&&(this.ctx.putImageData(this.snap,0,0),this.painted=this.snapPainted,this.snap=null,this.invalidate())}stamp(e,t,n,r,i=!1){let{width:a,height:o}=this.canvas,s=e*a,c=t*o,l=Math.max(1,n*o),u=this.ctx;if(i){let e=u.createRadialGradient(s,c,0,s,c,l),t=r?`0,0,0`:`255,255,255`;for(let[n,r]of[[0,1],[.4,.65],[.7,.3],[1,0]])e.addColorStop(n,`rgba(${t},${(.12*r).toFixed(4)})`);u.globalCompositeOperation=`source-over`,u.fillStyle=e,u.fillRect(s-l,c-l,l*2,l*2)}else u.globalCompositeOperation=r?`darken`:`lighten`,u.fillStyle=r?`#000`:`#fff`,u.beginPath(),u.arc(s,c,l,0,Math.PI*2),u.fill();u.globalCompositeOperation=`source-over`,r||(this.painted=!0),this.invalidate()}invalidate(){this.dirty=!0,this.blurDirty=!0,this.data=null}sample=(e,t)=>{this.data||=(this.ensureBlur(),this.blurCtx.getImageData(0,0,this.blurCanvas.width,this.blurCanvas.height));let{data:n,width:r,height:i}=this.data,a=Math.min(r-1,Math.max(0,Math.round(e*(r-1))));return n[(Math.min(i-1,Math.max(0,Math.round(t*(i-1))))*r+a)*4]/255}},y=class{brushRadius=.07;brushType=`hard`;erasing=!1;streamline=.35;last=null;smooth=null;lastRaw=null;pendingLayer=null;pendingS=1;strokeTo(e,t,n,r){this.lastRaw={x:t,y:n},this.pendingLayer=e,this.pendingS=r,this.smooth?(this.smooth.x+=(t-this.smooth.x)*this.streamline,this.smooth.y+=(n-this.smooth.y)*this.streamline,this.stampSegment(e,this.smooth.x,this.smooth.y,r)):(this.smooth={x:t,y:n},e.stamp(t,n,this.brushRadius*r,this.erasing,this.brushType===`soft`),this.last={x:t,y:n})}stampSegment(e,t,n,r){let i=this.brushRadius*r,a=this.brushType===`soft`;if(!this.last)e.stamp(t,n,i,this.erasing,a);else{let r=t-this.last.x,o=n-this.last.y,s=Math.hypot(r,o),c=Math.max(i*.4,1e-4),l=Math.min(200,Math.ceil(s/c));for(let t=1;t<=l;t++)e.stamp(this.last.x+r*t/l,this.last.y+o*t/l,i,this.erasing,a)}this.last={x:t,y:n}}endStroke(){this.pendingLayer&&this.lastRaw&&this.last&&this.stampSegment(this.pendingLayer,this.lastRaw.x,this.lastRaw.y,this.pendingS),this.last=null,this.smooth=null,this.lastRaw=null,this.pendingLayer=null}};function b(e,t,n,r,i,a,o){let s=i*i*(n-e.x)-2*a*i*t.x,c=i*i*(r-e.y)-2*a*i*t.y;t.x+=s*o,t.y+=c*o,e.x+=t.x*o,e.y+=t.y*o}function x(e){let t=1-e;return t*t*t*(6*e*e+3*e+1)}function S(e){return 6.75*e*(1-e)*(1-e)}var C=class{grabs=[];aspect=1;maskSample=()=>1;alphaSample=()=>1;grabA=new Float32Array(e.maxGrabs*4);grabPull=new Float32Array(e.maxGrabs*2);get S(){return Math.min(1,this.aspect)}lmax(){return s.params.stretch*s.params.radius*this.S}radiusEff(t){let n=s.params.radius*this.S,r=Math.hypot(t.pull.x,t.pull.y);return n*(1+e.radiusGrow*Math.min(1,r/this.lmax()))}strengthOf(t){return Math.min(1,t.ease*1e3/e.grabEaseMs)*t.weight}displacementAt(e,t){let n=e*this.aspect,r=t,i=0,a=0,o=0,c=s.params.bulge;for(let e of this.grabs){let t=this.strengthOf(e);if(t<=0)continue;let s=n-e.anchor.x,l=r-e.anchor.y,u=Math.hypot(s,l),d=this.radiusEff(e),f=Math.min(1,u/d),p=x(f)*t,m=Math.hypot(e.pull.x,e.pull.y),h=u>1e-5?s/u:0,g=u>1e-5?l/u:0;i+=p*e.pull.x+c*m*S(f)*h*t,a+=p*e.pull.y+c*m*S(f)*g*t,o+=p}let l=(s.maskEnabled?this.maskSample(e,t):1)/Math.max(1,o);return{x:i*l,y:a*l}}invert(e,t){let n=e/this.aspect,r=t;for(let i=0;i<3;i++){let i=this.displacementAt(n,r);n=(e-i.x)/this.aspect,r=t-i.y}return{x:n,y:r}}tryGrab(t,n){if(this.grabs.length>=e.maxGrabs){let e=this.grabs.findIndex(e=>e.released);if(e<0)return null;this.grabs.splice(e,1)}let r=this.invert(n.x,n.y);if(r.x<0||r.x>1||r.y<0||r.y>1||this.alphaSample(r.x,r.y)<.05)return null;let i=s.maskEnabled?this.maskSample(r.x,r.y):1;if(i<.05)return null;let a={pointerId:t,anchor:{x:r.x*this.aspect,y:r.y},pointer:{...n},pull:{x:0,y:0},vel:{x:0,y:0},ease:0,weight:i,released:!1};return this.grabs.push(a),a}move(e,t){let n=this.grabs.find(t=>t.pointerId===e&&!t.released);n&&(n.pointer.x=t.x,n.pointer.y=t.y)}release(e){let t=this.grabs.find(t=>t.pointerId===e&&!t.released);return t&&(t.released=!0),t??null}releaseAll(){this.grabs.length=0}update(t){if(this.grabs.length===0)return;let n=Math.min(t,e.maxDt),r=s.params,i=2*Math.PI*r.releaseFreq,a=this.lmax(),o=e.settlePos*this.S,c=e.settleVel*this.S;for(let t=this.grabs.length-1;t>=0;t--){let s=this.grabs[t];s.ease+=n;let l=0,u=0;if(!s.released){let e=s.pointer.x-s.anchor.x,t=s.pointer.y-s.anchor.y,n=Math.hypot(e,t);if(n>1e-9){let r=a*Math.tanh(n/a);l=e/n*r,u=t/n*r}}let d=s.released?i:e.dragOmega,f=s.released?r.releaseZeta:e.dragZeta,p=Math.max(1,Math.ceil(n/e.substep)),m=n/p;for(let e=0;e<p;e++)b(s.pull,s.vel,l,u,d,f,m);s.released&&Math.hypot(s.pull.x,s.pull.y)<o&&Math.hypot(s.vel.x,s.vel.y)<c&&this.grabs.splice(t,1)}}get active(){return this.grabs.length>0}intensityOf(e){return Math.min(1,Math.hypot(e.pull.x,e.pull.y)/this.lmax())}fillUniforms(){let t=Math.min(this.grabs.length,e.maxGrabs);for(let e=0;e<t;e++){let t=this.grabs[e];this.grabA[e*4]=t.anchor.x,this.grabA[e*4+1]=t.anchor.y,this.grabA[e*4+2]=this.radiusEff(t),this.grabA[e*4+3]=this.strengthOf(t),this.grabPull[e*2]=t.pull.x,this.grabPull[e*2+1]=t.pull.y}return{grabCount:t,grabA:this.grabA,grabPull:this.grabPull}}};function w(e){return e.getContext(`webgl2`,{alpha:!0,antialias:!0,premultipliedAlpha:!0,preserveDrawingBuffer:!0})}function T(t,n){let r=e.meshShortSegs,i=e.meshMaxSegs,a=n>=1?Math.min(i,Math.round(r*n)):r,o=n>=1?r:Math.min(i,Math.round(r/n)),s=a+1,c=o+1,l=new Float32Array(s*c*2),u=0;for(let e=0;e<c;e++)for(let t=0;t<s;t++)l[u++]=t/a,l[u++]=e/o;let d=new Uint16Array(a*o*6),f=0;for(let e=0;e<o;e++)for(let t=0;t<a;t++){let n=e*s+t,r=n+1,i=n+s,a=i+1;d[f++]=n,d[f++]=i,d[f++]=r,d[f++]=r,d[f++]=i,d[f++]=a}let p=t.createVertexArray();if(!p)throw Error(`createVertexArray failed`);t.bindVertexArray(p);let m=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,m),t.bufferData(t.ARRAY_BUFFER,l,t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let h=t.createBuffer();return t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,h),t.bufferData(t.ELEMENT_ARRAY_BUFFER,d,t.STATIC_DRAW),t.bindVertexArray(null),{vao:p,indexCount:d.length,segsX:a,segsY:o,dispose(){t.deleteVertexArray(p),t.deleteBuffer(m),t.deleteBuffer(h)}}}function E(e,t,n){let r=e.createShader(t);if(!r)throw Error(`createShader failed`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`Shader compile failed: ${t}`)}return r}function D(e,t,n){let r=e.createProgram();if(!r)throw Error(`createProgram failed`);let i=E(e,e.VERTEX_SHADER,t),a=E(e,e.FRAGMENT_SHADER,n);if(e.attachShader(r,i),e.attachShader(r,a),e.linkProgram(r),e.deleteShader(i),e.deleteShader(a),!e.getProgramParameter(r,e.LINK_STATUS)){let t=e.getProgramInfoLog(r);throw e.deleteProgram(r),Error(`Program link failed: ${t}`)}return r}function O(e,t,n){let r={};for(let i of n)r[i]=e.getUniformLocation(t,i);return r}var k=`#version 300 es
precision highp float;

layout(location = 0) in vec2 aRest;

uniform float uAspect;
uniform mat3 uView;
uniform int uGrabCount;
uniform vec4 uGrabA[${e.maxGrabs}]; // anchor.xy(iso), radiusEff, strength
uniform vec2 uGrabPull[${e.maxGrabs}]; // pull.xy(iso)
uniform float uBulge;
uniform sampler2D uMask;
uniform float uMaskEnabled;
uniform vec2 uMaskCell;

out vec2 vUV;

float falloff(float t) {
  float s = 1.0 - t;
  return s * s * s * (6.0 * t * t + 3.0 * t + 1.0);
}

float maskAt(vec2 uv) {
  vec2 h = uMaskCell * 0.5;
  return (textureLod(uMask, uv + vec2(-h.x, -h.y), 0.0).r +
          textureLod(uMask, uv + vec2(h.x, -h.y), 0.0).r +
          textureLod(uMask, uv + vec2(-h.x, h.y), 0.0).r +
          textureLod(uMask, uv + vec2(h.x, h.y), 0.0).r) * 0.25;
}

float ring(float t) {
  return 6.75 * t * (1.0 - t) * (1.0 - t);
}

void main() {
  vec2 iso = vec2(aRest.x * uAspect, aRest.y);
  vec2 disp = vec2(0.0);
  float wsum = 0.0;

  for (int i = 0; i < ${e.maxGrabs}; i++) {
    if (i >= uGrabCount) break;
    float strength = uGrabA[i].w;
    if (strength <= 0.0) continue;
    vec2 rel = iso - uGrabA[i].xy;
    float d = length(rel);
    float t = clamp(d / uGrabA[i].z, 0.0, 1.0);
    float w = falloff(t) * strength;
    vec2 pull = uGrabPull[i];
    vec2 dir = d > 1e-5 ? rel / d : vec2(0.0);
    disp += w * pull + uBulge * length(pull) * ring(t) * dir * strength;
    wsum += w;
  }

  float m = uMaskEnabled > 0.5 ? maskAt(aRest) : 1.0;
  disp *= m / max(1.0, wsum);

  float lift = clamp(wsum, 0.0, 1.0) * m;

  vec3 clip = uView * vec3(iso + disp, 1.0);
  gl_Position = vec4(clip.xy, -0.5 * lift, 1.0);
  vUV = aRest;
}
`,A=`#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform float uMaskView;
uniform float uPass;
uniform vec2 uTexSize;
uniform float uBicubic;

out vec4 outColor;

vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}

vec4 sampleImage(vec2 uv) {
  if (uBicubic < 0.5) return texture(uTex, uv);
  vec2 invSize = 1.0 / uTexSize;
  vec2 coord = uv * uTexSize - 0.5;
  vec2 fxy = fract(coord);
  coord -= fxy;
  vec4 xcubic = cubicW(fxy.x);
  vec4 ycubic = cubicW(fxy.y);
  vec4 c = coord.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = (c + vec4(xcubic.yw, ycubic.yw) / s) * invSize.xxyy;
  vec4 s0 = texture(uTex, offset.xz);
  vec4 s1 = texture(uTex, offset.yz);
  vec4 s2 = texture(uTex, offset.xw);
  vec4 s3 = texture(uTex, offset.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

void main() {
  vec4 c = sampleImage(vUV);
  if (uMaskView > 0.5) {
    float m = texture(uMask, vUV).r;
    float mq = floor(m * 4.0 + 0.5) / 4.0;
    c *= 0.45 + 0.4 * mq;
    c += vec4(1.0, 0.55, 0.68, 1.0) * (0.35 * mq);
  } else if (uPass < 0.5) {
    if (c.a < 0.95) discard;
  } else {
    if (c.a >= 0.95) discard;
  }
  outColor = c;
}
`;function j(e,t){let n=e.createTexture();if(!n)throw Error(`createTexture failed`);return e.bindTexture(e.TEXTURE_2D,n),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,t),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),n}function M(e){let t=e.createTexture();if(!t)throw Error(`createTexture failed`);return e.bindTexture(e.TEXTURE_2D,t),e.texImage2D(e.TEXTURE_2D,0,e.R8,1,1,0,e.RED,e.UNSIGNED_BYTE,new Uint8Array([255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),t}function N(e,t,n){e.bindTexture(e.TEXTURE_2D,t),e.texImage2D(e.TEXTURE_2D,0,e.R8,e.RED,e.UNSIGNED_BYTE,n)}var P=[`uAspect`,`uView`,`uGrabCount`,`uGrabA`,`uGrabPull`,`uBulge`,`uMask`,`uMaskEnabled`,`uTex`,`uMaskView`,`uPass`,`uTexSize`,`uBicubic`,`uMaskCell`],F=class{gl;program;uniforms;mesh=null;imageTex=null;maskTex;view;aspect=1;imageW=1;imageH=1;constructor(e,t){this.gl=e,this.view=t,this.program=D(e,k,A),this.uniforms=O(e,this.program,P),this.maskTex=M(e),e.clearColor(0,0,0,0),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.enable(e.DEPTH_TEST),e.depthFunc(e.LEQUAL)}setImage(t,n){let r=this.gl;this.aspect=n,this.imageW=t.width,this.imageH=t.height,this.imageTex&&r.deleteTexture(this.imageTex),this.imageTex=j(r,t),this.mesh?.dispose(),this.mesh=T(r,n),this.view.update(r.drawingBufferWidth,r.drawingBufferHeight,n,e.fitRatio)}updateMask(e){N(this.gl,this.maskTex,e)}resetMask(){let e=this.gl;e.deleteTexture(this.maskTex),this.maskTex=M(e)}resize(t,n){let r=this.gl;r.canvas.width=t,r.canvas.height=n,r.viewport(0,0,t,n),this.view.update(t,n,this.aspect,e.fitRatio)}draw(e){let t=this.gl;if(t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),!this.mesh||!this.imageTex)return;t.useProgram(this.program);let n=this.uniforms;t.uniform1f(n.uAspect,this.aspect),t.uniformMatrix3fv(n.uView,!1,this.view.matrix()),t.uniform1i(n.uGrabCount,e.grabCount),t.uniform4fv(n.uGrabA,e.grabA),t.uniform2fv(n.uGrabPull,e.grabPull),t.uniform1f(n.uBulge,e.bulge),t.uniform1f(n.uMaskEnabled,+!!e.maskEnabled),t.uniform1f(n.uMaskView,+!!e.maskView),t.uniform2f(n.uTexSize,this.imageW,this.imageH);let r=this.view.k*this.view.scale/this.imageH;t.uniform1f(n.uBicubic,+(r>1.05)),t.uniform2f(n.uMaskCell,1/this.mesh.segsX,1/this.mesh.segsY),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.imageTex),t.uniform1i(n.uTex,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.maskTex),t.uniform1i(n.uMask,1),t.bindVertexArray(this.mesh.vao),e.maskView?(t.uniform1f(n.uPass,0),t.drawElements(t.TRIANGLES,this.mesh.indexCount,t.UNSIGNED_SHORT,0)):(t.uniform1f(n.uPass,0),t.depthMask(!0),t.drawElements(t.TRIANGLES,this.mesh.indexCount,t.UNSIGNED_SHORT,0),t.uniform1f(n.uPass,1),t.depthMask(!1),t.drawElements(t.TRIANGLES,this.mesh.indexCount,t.UNSIGNED_SHORT,0),t.depthMask(!0)),t.bindVertexArray(null)}};export{n as _,v as a,p as c,l as d,o as f,a as g,e as h,y as i,m as l,s as m,w as n,_ as o,c as p,C as r,g as s,F as t,h as u,i as v,r as y};