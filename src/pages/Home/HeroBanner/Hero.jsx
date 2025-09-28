import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Hero.css";



gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const containerRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const productRef = useRef(null);
  const overlayRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
    let gl, shaderProgram, uniforms, vertexBuffer;

    // WebGL Shader Code
    const vsSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;
      void main() {
        vUv = a_position;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_scroll_progr;
      uniform float u_col_width;
      uniform float u_seed;
      uniform float u_scale;
      uniform float u_time;
      uniform float u_speed;
      uniform vec3 u_color;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float get_l(vec2 v) {
        return 1. - clamp(0., 1., length(v));
      }

      float rand(float n) {
        return fract(sin(n) * 43758.5453123);
      }

      void main() {
        float scale = .001 * u_scale;
        float speed = .001 * u_speed;
        vec2 uv = vUv;
        uv.x *= (scale * u_resolution.x);
        vec2 noise_uv = uv;
        noise_uv *= 5.;
        noise_uv.y *= (.25 * scale * u_resolution.y);
        noise_uv += vec2(0., u_time * 1.5 * speed);
        float shape = 0.;
        shape += snoise(noise_uv);
        shape = clamp(.5 + .5 * shape, 0., 1.);
        shape *= pow(.5 * uv.y + .7 + pow(u_scroll_progr, 2.) + (.4 * u_scroll_progr * (1. - pow(vUv.x - .2, 2.))), 10.);
        shape = clamp(shape, 0., 1.);
        float dots = 0.;
        float bars = 0.;
        float light = 0.;
        const int num_col = 9;
        for (int i = 0; i < num_col; i++) {
          vec2 col_uv = vUv;
          float start_time_offset = rand(100. * (float(i) + u_seed));
          float c_t = fract(u_time * speed + start_time_offset);
          float drop_time = .2 + .6 * rand(10. * (float(i) + u_seed));
          float before_drop_normal = c_t / drop_time;
          float before_drop_t = pow(before_drop_normal, .4) * drop_time;
          float after_drop_normal = max(0., c_t - drop_time) / (1. - drop_time);
          float after_drop_t_dot = 3. * pow(after_drop_normal, 2.) * (1. - drop_time);
          float after_drop_t_bar = pow(after_drop_normal, 2.) * (drop_time);
          float eased_drop_t = step(c_t, drop_time) * before_drop_t;
          eased_drop_t += step(drop_time, c_t) * (drop_time + after_drop_t_dot);
          col_uv.y += (1. + 3. * rand(15. * float(i))) * u_scroll_progr;
          col_uv.x *= (u_resolution.x / u_resolution.y);
          col_uv *= (7. * scale * u_resolution.y);
          col_uv.x += (u_col_width * (.5 * float(num_col) - float(i)));
          vec2 dot_uv = col_uv;
          dot_uv.y += 4. * (eased_drop_t - .5);
          float dot = get_l(dot_uv);
          dot = pow(dot, 4.);
          float drop_grow = step(c_t, drop_time) * pow(before_drop_normal, .4);
          drop_grow += step(drop_time, c_t) * mix(1., .8, clamp(7. * after_drop_normal, 0., 1.));
          dot *= drop_grow;
          dot *= step(.5, drop_time);
          dots += dot;
          vec2 bar_uv = col_uv;
          bar_uv.y += step(c_t, drop_time) * 4. * (before_drop_t - .5);
          bar_uv.y += step(drop_time, c_t) * 4. * (drop_time - after_drop_t_bar - .5);
          float bar = smoothstep(-.5, 0., bar_uv.x) * (1. - smoothstep(0., .5, bar_uv.x));
          bar = pow(bar, 4.);
          light += bar * smoothstep(.0, .1, -bar_uv.x);
          float bar_mask = smoothstep(-.2, .2, bar_uv.y);
          bar *= bar_mask;
          bars += bar;
        }
        shape += bars;
        shape = clamp(shape, 0., 1.);
        shape += dots;
        float gooey = smoothstep(.48, .5, shape);
        gooey -= .1 * smoothstep(.5, .6, shape);
        vec3 color = u_color;
        color.r += .2 * (1. - vUv.y) * (1. - u_scroll_progr);
        color *= gooey;
        color = mix(color, vec3(1.), max(0., 1. - 2. * vUv.y) * light * smoothstep(.1, .7, snoise(.5 * uv)) * (smoothstep(.49, .6, shape) - smoothstep(.6, 1., shape)));
        gl_FragColor = vec4(color, gooey);
      }
    `;

    // WebGL Parameters
    const params = {
      scrollProgress: 0,
      colWidth: 0.7,
      speed: 0.2,
      scale: 0.25,
      seed: 0.231,
      color: [0.235, 0.635, 0.062], // Greenish color to match theme
    };

    // Initialize WebGL
    const initShader = () => {
      gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");
      if (!gl) {
        console.error("WebGL is not supported by your browser.");
        return;
      }

      const createShader = (source, type) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = createShader(vsSource, gl.VERTEX_SHADER);
      const fragmentShader = createShader(fsSource, gl.FRAGMENT_SHADER);

      shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Shader program link error: " + gl.getProgramInfoLog(shaderProgram));
        return;
      }

      uniforms = {};
      const uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(shaderProgram, i).name;
        uniforms[uniformName] = gl.getUniformLocation(shaderProgram, uniformName);
      }

      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.useProgram(shaderProgram);

      const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(uniforms.u_col_width, params.colWidth);
      gl.uniform1f(uniforms.u_speed, params.speed);
      gl.uniform1f(uniforms.u_scale, params.scale);
      gl.uniform1f(uniforms.u_seed, params.seed);
      gl.uniform3f(uniforms.u_color, params.color[0], params.color[1], params.color[2]);
    };

    // Resize Canvas
    const resizeCanvas = () => {
      canvasEl.width = window.innerWidth * devicePixelRatio;
      canvasEl.height = window.innerHeight * devicePixelRatio;
      if (gl) {
        gl.viewport(0, 0, canvasEl.width, canvasEl.height);
        gl.uniform2f(uniforms.u_resolution, canvasEl.width, canvasEl.height);
      }
    };

    // Render Loop
    const render = () => {
      if (gl) {
        const currentTime = performance.now();
        gl.uniform1f(uniforms.u_time, currentTime);
        gl.uniform1f(uniforms.u_scroll_progr, params.scrollProgress);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
      }
    };

    // GSAP Animations
    const ctx = gsap.context(() => {
      // Initialize WebGL
      initShader();
      resizeCanvas();
      render();

      // ScrollTrigger for gooey effect
      gsap.to(params, {
        scrollProgress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Intro timeline with enhanced animations
      const introTl = gsap.timeline();
      introTl
        .fromTo(
          canvasEl,
          { opacity: 0 },
          { opacity: 0.6, duration: 0.8, ease: "power2.out" }
        )
        .fromTo(
          headlineRef.current,
          { y: 50, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" },
          "-=0.6"
        )
        .fromTo(
          subRef.current,
          { y: 40, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" },
          "-=0.5"
        )
        .fromTo(
          ctaRef.current,
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" },
          "-=0.4"
        );

      // Image animation
      gsap.fromTo(
        productRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: productRef.current,
            start: "top 85%",
          },
        }
      );

      // Subtle image parallax
      gsap.to(productRef.current, {
        y: -20,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });

      // Hover effects
      const btn = ctaRef.current;
      btn.addEventListener("mouseenter", () => {
        gsap.to(btn, {
          scale: 1.05,
          boxShadow: "0 10px 20px rgba(18, 123, 59, 0.2)",
          duration: 0.2,
          ease: "power2.out",
        });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, {
          scale: 1,
          boxShadow: "0 8px 18px rgba(18, 123, 59, 0.14)",
          duration: 0.2,
          ease: "power2.out",
        });
      });

      // Optional: Subtle hover effect for headline
      headlineRef.current.addEventListener("mouseenter", () => {
        gsap.to(headlineRef.current, {
          color: "#147a3f",
          scale: 1.01,
          duration: 0.3,
          ease: "power2.out",
        });
      });
      headlineRef.current.addEventListener("mouseleave", () => {
        gsap.to(headlineRef.current, {
          color: "#0b3d20",
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        });
      });

      // Optional: Subtle hover effect for subtext
      subRef.current.addEventListener("mouseenter", () => {
        gsap.to(subRef.current, {
          color: "#147a3f",
          scale: 1.01,
          duration: 0.3,
          ease: "power2.out",
        });
      });
      subRef.current.addEventListener("mouseleave", () => {
        gsap.to(subRef.current, {
          color: "#254c3a",
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        });
      });
    }, containerRef);

    // Resize event
    window.addEventListener("resize", resizeCanvas);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      ctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="rn-hero-section" aria-label="Hero banner">
      <canvas ref={canvasRef} className="rn-gooey-overlay" />
      <div ref={overlayRef} className="rn-hero-overlay" aria-hidden="true" />
      <div className="rn-hero-content">
        <div className="rn-hero-text">
          <h1 ref={headlineRef} className="rn-hero-title">
            Fresh rice, honest prices.
            <span className="rn-hero-accent"> Delivering goodness.</span>
          </h1>
          <p ref={subRef} className="rn-hero-sub">
            Hand-selected rice varieties from trusted vendors — fast delivery, secure
            checkout, and vendor-driven order management.
          </p>
          <div className="rn-cta-row">
            <a
              ref={ctaRef}
              className="rn-btn-primary"
              href="/products"
              role="button"
            >
              Shop Now
            </a>
          </div>
        </div>
        <div className="rn-hero-media" aria-hidden="false">
          <img
            ref={productRef}
            src="/images/home/hero/hero1.png"
            alt="Basmati rice pack and bowl"
            className="rn-hero-image"
            draggable="false"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}