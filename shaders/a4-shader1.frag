precision mediump float;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

uniform vec4 u_lightColor;
uniform vec4 u_colorMult;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              abs(l),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}

void main() {
  vec3 a_normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
    float x0 = v_texCoord.x*4.0 - 2.0;
    float y0 = v_texCoord.y*4.0 - 2.0;
    float x = 0.0;
    float y = 0.0;
    float iter = 0.0;
    for (float iteration = 0.0; iteration < 20.0; iteration++) {
      if (x*x - y*y < 4.0) {
        float xtemp = x*x - y*y + x0;
        y = 2.0*x*y+y0;
        x = xtemp;
        iter = iteration;
      } else {
        break;
      }
    }
    if (iter == 19.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      gl_FragColor = vec4(iter/19.0, 0.0, 0.0, 1.0);
    }
}