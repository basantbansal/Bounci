import { CONFIG } from '../config';

export const VERTEX_SRC = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aRest;

uniform float uAspect;
uniform mat3 uView;
uniform int uGrabCount;
uniform vec4 uGrabA[${CONFIG.maxGrabs}]; // anchor.xy(iso), radiusEff, strength
uniform vec2 uGrabPull[${CONFIG.maxGrabs}]; // pull.xy(iso)
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

  for (int i = 0; i < ${CONFIG.maxGrabs}; i++) {
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
`;

export const FRAGMENT_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform float uMaskView;
uniform float uPass;
uniform vec2 uTexSize;
uniform float uBicubic;

out vec4 outColor;

vec4 sampleImage(vec2 uv) {
  return texture(uTex, uv);
}

void main() {
  vec4 c = sampleImage(vUV);
  if (uMaskView > 0.5) {
    float m = texture(uMask, vUV).r;
    float mq = floor(m * 4.0 + 0.5) / 4.0;
    if (mq > 0.05) {
      c.rgb = mix(c.rgb, vec3(1.0, 0.45, 0.65), 0.45 * mq);
    }
  } else if (uPass < 0.5) {
    if (c.a < 0.95) discard;
  } else {
    if (c.a >= 0.95) discard;
  }
  outColor = c;
}
`;
