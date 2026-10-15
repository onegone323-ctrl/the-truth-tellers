import { getVoiceAnalyser } from "@/lib/oracleVoice";

const VERTEX = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT = `
precision mediump float;
uniform vec2 resolution;
uniform float time, heat, level, radius;
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.55;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec3(4.1,1.7,3.2);a*=.5;}return n;}
vec3 palette(float h){return .5+.5*cos(6.2831853*(h+vec3(0.,.67,.33)));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/max(radius,1.);
 vec3 accumulated=vec3(0.);float alpha=0.;
 float speed=time*(.75+heat*.35);
 for(int i=0;i<28;i++){
  float z=-1.5+float(i)*.111;
  vec3 p=vec3(uv,z);
  float y=p.y+.65;
  float rise=max(y,0.);
  vec3 q=p*2.4-vec3(0.,speed*2.,0.);
  float warp=fbm(q*.7+vec3(0.,-speed*.45,0.));
  q+=vec3(warp-.5,warp*.4,warp-.5)*1.8;
  float detail=fbm(q);
  float width=max(.14,1.14-rise*(.19-.045*heat));
  float shell=abs(length(vec2(p.x,p.z*.82))-.72);
  float base=exp(-shell*shell*8.)*exp(-pow((p.y+.1)*.75,2.));
  float plume=exp(-(p.x*p.x+p.z*p.z*.75)/(width*width))*smoothstep(-.8,-.15,p.y)*(1.-smoothstep(1.25+heat,3.1+heat,p.y));
  float density=max(0.,(detail-.43)*3.8)*(base*.62+plume*.9);
  density*=smoothstep(-1.2,-.65,p.y);
  density*=1.-smoothstep(.60,.94,length(p));
  // Retain the outer plume after masking the solid globe interior.
  density+=max(0.,detail-.48)*3.2*plume*smoothstep(.85,1.1,length(p));
  float a=clamp(density*(.14+heat*.075)*level,0.,.32);
  float hot=clamp(density*1.8,0.,1.);
  vec3 spectrum=palette(time*.023+p.y*.09+warp*.17);
  vec3 ember=mix(vec3(.48,.012,.018),vec3(1.,.28,.025),hot);
  vec3 color=mix(ember,spectrum*spectrum*1.5,.38);
  color=mix(color,vec3(1.,.69,.19),smoothstep(.48,.85,hot)*.65);
  color=mix(color,vec3(1.,.94,.73),pow(hot,7.)*.75);
  accumulated+=(1.-alpha)*color*a*2.1;
  alpha+=(1.-alpha)*a;
 }
 float edge=1.-smoothstep(.80,1.,max(abs(uv.x)*radius/(resolution.x*.5),abs(uv.y)*radius/(resolution.y*.5)));
 gl_FragColor=vec4(accumulated*edge,alpha*edge);
}`;

export function animateOracleFlames(canvas, live) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) { canvas.dataset.flameError = "WebGL unavailable"; return () => {}; }
  const shaders = [];
  let program, buffer, observer, frame = 0, disposed = false, lost = false;
  const release = () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
  };
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "Flame shader compilation failed");
      return shader;
    };
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Flame shader link failed");
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["resolution","time","heat","level","radius"].map(name => [name, gl.getUniformLocation(program,name)]));
    let ratio = 1, last = 0, time = 0, heat = 0, level = 0, bins;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.25, 900 / Math.max(canvas.clientWidth, canvas.clientHeight, 1));
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0,0,canvas.width,canvas.height);
    };
    observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const tick = now => {
      if (disposed || lost) return;
      frame = requestAnimationFrame(tick);
      const dt = last ? Math.min((now-last)/1000,.05) : .016; last = now;
      if (document.hidden) return;
      const { active, radius } = live.current;
      const analyser = active ? getVoiceAnalyser() : null;
      let energy = 0;
      if (analyser) {
        if (!bins || bins.length !== analyser.fftSize) bins = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(bins);
        for (const b of bins) energy += ((b-128)/128)**2;
        energy = Math.min(1,Math.sqrt(energy/bins.length)*7);
      }
      heat += (energy-heat)*(1-Math.exp(-dt*(energy>heat?10:3)));
      level += ((active?1:0)-level)*(1-Math.exp(-dt*(active?4:2.5)));
      time += reduced.matches ? 0 : dt;
      canvas.dataset.voiceEnergy = heat.toFixed(3);
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (level < .005) return;
      gl.uniform2f(u.resolution,canvas.width,canvas.height);
      gl.uniform1f(u.time,time); gl.uniform1f(u.heat,heat);
      gl.uniform1f(u.level,level); gl.uniform1f(u.radius,Math.max(1,radius*ratio));
      gl.drawArrays(gl.TRIANGLES,0,6);
    };
    const onLost = event => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); canvas.dataset.flameError = "WebGL context lost; remount required"; };
    canvas.addEventListener("webglcontextlost",onLost);
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; canvas.removeEventListener("webglcontextlost",onLost); release(); };
  } catch (error) {
    canvas.dataset.flameError = String(error.message || error);
    console.error("Oracle flame renderer:",error);
    release();
    return () => {};
  }
}
