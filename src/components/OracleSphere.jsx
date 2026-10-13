import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import useViewportWidth from '@/hooks/useViewportWidth';
import { getVoiceAnalyser } from '@/lib/oracleVoice';

const vertexShader = `varying vec2 uvFire; void main(){ uvFire=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const fragmentShader = `
precision highp float;
varying vec2 uvFire;
uniform float time, heat, ignition;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+vec2(3.1,7.2);a*=.5;}return s;}
vec3 spectrum(float h){return clamp(abs(fract(h+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.);}
void main(){
 vec2 p=(uvFire-.5)*3.8;float r=length(p);float angle=atan(p.y,p.x);
 float n=fbm(p*4.5-vec2(0.,time*1.6));
 float detail=fbm(p*12.+vec2(n*3.,-time*2.3));
 float lift=max(p.y,0.)*.16;
 float edge=1.02+ignition*(.16+heat*.22)+n*.24+lift;
 float shell=smoothstep(.78,.98,r)*(1.-smoothstep(edge-.13,edge+.16,r));
 float tongues=smoothstep(.38,.78,n*.65+detail*.55);
 float flame=shell*(.22+tongues*.9)*ignition;
 float core=exp(-r*r*8.)*(.11+ignition*.55)*( .6+n);
 float hue=fract(time*.045+angle*.10+n*.24+heat*.12);
 vec3 color=mix(spectrum(hue),vec3(1.,.34,.035),1.-ignition);
 vec3 hot=mix(color,vec3(1.),pow(detail,4.)*.7);
 float alpha=clamp(flame+core,0.,.86);
 if(alpha<.005)discard;gl_FragColor=vec4(hot*(1.+heat*.65),alpha);
}`;

function glowTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'white');g.addColorStop(.15,'rgba(255,255,255,.9)');g.addColorStop(.5,'rgba(255,255,255,.12)');g.addColorStop(1,'transparent');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
}

export default function OracleSphere({state='idle',size=215}){
 const width=useViewportWidth();const effective=Math.max(1,width<768?Math.min(size,Math.round(width*.6)):size);
 const mountRef=useRef(null),stateRef=useRef(state);stateRef.current=state;
 useEffect(()=>{
 const mount=mountRef.current;if(!mount)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,20);camera.position.z=4.7;
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{mount.textContent='Globe rendering unavailable on this device';return()=>{mount.textContent='';};}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(effective,effective);renderer.setClearColor(0,0);
 mount.appendChild(renderer.domElement);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';
 const texture=glowTexture();const group=new THREE.Group();scene.add(group);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.94,48,32),new THREE.MeshPhongMaterial({color:0x090709,specular:0xaaaabb,shininess:110,transparent:true,opacity:.77,depthWrite:false}));group.add(core);
 scene.add(new THREE.AmbientLight(0xffffff,.25));
 const key=new THREE.PointLight(0xe4edff,2.2);key.position.set(-2,3,3);scene.add(key);
 const warm=new THREE.PointLight(0xff7c22,1.2);warm.position.set(1,-1,2);scene.add(warm);
 const points=[];const count=effective<190?65:95;
 for(let i=0;i<count;i++){const y=1-2*(i+.5)/count;const a=i*Math.PI*(3-Math.sqrt(5));const r=Math.sqrt(1-y*y);points.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
 const nodeGeo=new THREE.BufferGeometry().setFromPoints(points);
 const nodeMat=new THREE.PointsMaterial({map:texture,color:0xffdc8c,size:.12,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});group.add(new THREE.Points(nodeGeo,nodeMat));
 const linePositions=[],colors=[];const red=new THREE.Color('#b62b24'),gold=new THREE.Color('#ffd36d');const pairs=new Set();
 points.forEach((p,i)=>{const neighbors=points.map((q,j)=>({j,d:p.distanceTo(q)})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d).slice(0,4);
 neighbors.forEach(({j})=>{const id=[i,j].sort((a,b)=>a-b).join('-');if(pairs.has(id))return;pairs.add(id);
 const q=points[j],steps=12;for(let k=0;k<steps;k++){const a=p.clone().lerp(q,k/steps).normalize().multiplyScalar(1.005),b=p.clone().lerp(q,(k+1)/steps).normalize().multiplyScalar(1.005);linePositions.push(...a.toArray(),...b.toArray());const c=red.clone().lerp(gold,(i%5)/4);colors.push(...c.toArray(),...c.toArray());}});});
 const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));lineGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const lineMat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false});group.add(new THREE.LineSegments(lineGeo,lineMat));
 const uniforms={time:{value:0},heat:{value:0},ignition:{value:0}};
 const fireMat=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
 const fire=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3.8),fireMat);fire.renderOrder=3;scene.add(fire);
 const sparkCount=effective<190?100:220;const positions=new Float32Array(sparkCount*3),sparkColors=new Float32Array(sparkCount*3),life=new Float32Array(sparkCount);
 const reset=i=>{const p=points[i%count];p.toArray(positions,i*3);life[i]=0;};for(let i=0;i<sparkCount;i++){reset(i);life[i]=i/sparkCount;}
 const sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));sparkGeo.setAttribute('color',new THREE.BufferAttribute(sparkColors,3));
 const sparkMat=new THREE.PointsMaterial({map:texture,size:.045,vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});const sparks=new THREE.Points(sparkGeo,sparkMat);scene.add(sparks);
 let raf=0,last=performance.now(),t=0,energy=0,level=0,bins=null;const color=new THREE.Color();
 const tick=now=>{raf=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;t+=dt;
 const speaking=stateRef.current==='speaking';const analyser=getVoiceAnalyser();let sample=0;
 if(speaking&&analyser){if(!bins||bins.length!==analyser.frequencyBinCount)bins=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(bins);for(const b of bins)sample+=b;sample=sample/bins.length/255;}
 const target=speaking?(analyser?Math.min(1,sample*2.2):.28+.12*Math.sin(t*2)):0;
 energy+=(target-energy)*(1-Math.exp(-dt*7));level+=((speaking?1:0)-level)*(1-Math.exp(-dt*3));
 if(!reduced){group.rotation.y+=dt*(.13+energy*.18);group.rotation.x=Math.sin(t*.16)*.08;}
 uniforms.time.value=reduced?0:t;uniforms.heat.value=energy;uniforms.ignition.value=level;
 nodeMat.size=.1+energy*.055;nodeMat.color.setHSL(.115,.65,.72+energy*.2);lineMat.opacity=.62+energy*.25;warm.intensity=1.2+energy*1.4;
 sparkMat.opacity=reduced?0:level*.8;
 for(let i=0;i<sparkCount&&!reduced;i++){life[i]+=dt*(.25+energy*.45);if(life[i]>1)reset(i);const k=i*3;positions[k]+=positions[k]*dt*.19;positions[k+1]+=dt*(.3+energy*.6);positions[k+2]+=positions[k+2]*dt*.12;color.setHSL((t*.045+i/sparkCount*.3)%1,.9,.52);color.multiplyScalar(Math.max(0,1-life[i]));color.toArray(sparkColors,k);}
 sparkGeo.attributes.position.needsUpdate=true;sparkGeo.attributes.color.needsUpdate=true;renderer.render(scene,camera);
 };raf=requestAnimationFrame(tick);
 return()=>{cancelAnimationFrame(raf);scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});texture.dispose();renderer.dispose();if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);};
 },[effective]);
 return <div ref={mountRef} role='img' aria-label={`truth4clarity globe: ${state}`} style={{width:effective,height:effective}}/>;
}
