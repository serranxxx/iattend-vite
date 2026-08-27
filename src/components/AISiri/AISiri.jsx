import styles from './AISiri.module.css';
import { useEffect, useRef } from 'react';
import { ORB_SHADER_SOURCE, ORB_UNIFORM_SEED } from './orbShader';

// Los colores del orb viven en el uniform seed: colorA..colorD (500 dominante,
// 300, 100 y 700) ocupan los índices 32..47 como cuatro RGBA consecutivos.
// canvasColor (el fondo detrás del fluido) es el RGBA en 72..75.
// zoom (índice 5) es el "flow scale": la escala espacial del fluido.
const PALETTE_OFFSET = 32;
const CANVAS_COLOR_OFFSET = 72;
const FLOW_SCALE_OFFSET = 5;

function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

export default function AISiri({ size = 32, speed = 1, palette = null, background = null, flowScale = null }) {
  const canvasRef = useRef(null);
  const speedRef = useRef(speed);
  const paletteRef = useRef(null);
  const backgroundRef = useRef(null);
  const flowScaleRef = useRef(flowScale);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    flowScaleRef.current = flowScale;
  }, [flowScale]);

  useEffect(() => {
    paletteRef.current = palette ? palette.flatMap(hexToRgba) : null;
  }, [palette]);

  useEffect(() => {
    backgroundRef.current = background ? hexToRgba(background) : null;
  }, [background]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stopped = false;
    let animationFrame = 0;
    let device = null;

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      device?.destroy();
    };

    const start = async () => {
      const gpu = navigator.gpu;
      if (!gpu) return;
      const adapter = await gpu.requestAdapter();
      if (!adapter || stopped) return;
      device = await adapter.requestDevice();
      if (stopped) {
        device.destroy();
        return;
      }
      const context = canvas.getContext('webgpu');
      if (!context) return;

      const format = gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'premultiplied' });
      const shader = device.createShaderModule({ code: ORB_SHADER_SOURCE });
      const compilation = await shader.getCompilationInfo();
      if (compilation.messages.some((m) => m.type === 'error') || stopped) return;

      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs_main' },
        fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      const values = new Float32Array(ORB_UNIFORM_SEED);
      const GPUBufferUsage = window.GPUBufferUsage;
      const uniformBuffer = device.createBuffer({
        size: values.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });
      // Tiempo acumulado (no `elapsed * speed`): así un cambio de velocidad en
      // caliente no provoca un salto de fase en la animación.
      let shaderTime = 0;
      let lastNow = performance.now();

      device.lost.then(() => stop()).catch(() => {});
      device.addEventListener('uncapturederror', (event) => {
        event.preventDefault();
        stop();
      });

      const frame = (now) => {
        if (stopped) return;
        try {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
          const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          values[0] = width;
          values[1] = height;
          shaderTime += ((now - lastNow) / 1000) * speedRef.current;
          lastNow = now;
          values[2] = shaderTime;
          if (paletteRef.current) values.set(paletteRef.current, PALETTE_OFFSET);
          if (backgroundRef.current) values.set(backgroundRef.current, CANVAS_COLOR_OFFSET);
          if (flowScaleRef.current != null) {
            // Easing exponencial: el flow scale se acerca a su objetivo poco a
            // poco en lugar de morfear el patrón de golpe al entrar/salir del hover.
            values[FLOW_SCALE_OFFSET] += (flowScaleRef.current - values[FLOW_SCALE_OFFSET]) * 0.06;
          }
          device.queue.writeBuffer(uniformBuffer, 0, values);

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
          pass.end();
          device.queue.submit([encoder.finish()]);
          animationFrame = requestAnimationFrame(frame);
        } catch {
          stop();
        }
      };

      animationFrame = requestAnimationFrame(frame);
    };

    start().catch(() => stop());
    return stop;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.orb}
      style={{ width: size, height: size }}
      aria-label="Asistente de IA procesando"
    />
  );
}
