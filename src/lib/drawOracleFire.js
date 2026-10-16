import { FIRE_VERTEX, FIRE_FRAGMENT } from '@/lib/oracleFireShaders';

const engines = new WeakMap();

function createFireEngine() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, FIRE_VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FIRE_FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['resolution', 'time', 'heat', 'strength'].map(name => [name, gl.getUniformLocation(program, name)]));
  return {
    canvas,
    render(r, time, heat, strength) {
      // A modest texture stays fluid on phones and scales softly, like fire.
      const size = Math.min(384, Math.max(192, Math.round(r * 3)));
      if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
      gl.viewport(0, 0, size, size);
      gl.uniform2f(uniforms.resolution, size, size);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.heat, heat);
      gl.uniform1f(uniforms.strength, strength);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function drawOracleFire(ctx, { cx, cy, r, time, heat, strength }) {
  if (strength < .005) return;
  if (!engines.has(ctx)) engines.set(ctx, createFireEngine());
  const engine = engines.get(ctx);
  if (!engine) return;
  engine.render(r, time, heat, strength);
  ctx.save();
  ctx.globalAlpha = 1;
  const span = r * 3.8;
  ctx.drawImage(engine.canvas, cx - span / 2, cy - span / 2, span, span);
  ctx.restore();
}

export function disposeOracleFire(ctx) {
  engines.get(ctx)?.dispose();
  engines.delete(ctx);
}