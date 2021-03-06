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
uniform vec4 u_ambient;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              abs(l),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}

void main() {
  if ((v_texCoord.x-0.85)*(v_texCoord.x-0.85) + (v_texCoord.y-0.85)*(v_texCoord.y-0.85) < 0.025) {
    discard;
  }
  else if ((v_texCoord.x-0.15)*(v_texCoord.x-0.15) + (v_texCoord.y-0.5)*(v_texCoord.y-0.5) < 0.005) {
    discard;
  } 
  else if ((v_texCoord.x-0.35)*(v_texCoord.x-0.35) + (v_texCoord.y-0.01)*(v_texCoord.y-0.01) < 0.06) {
    discard;
  }
  else if ((v_texCoord.x-0.7)*(v_texCoord.x-0.7) + (v_texCoord.y-0.35)*(v_texCoord.y-0.35) < 0.03) {
    discard;
  }
  else if ((v_texCoord.x-0.2)*(v_texCoord.x-0.2) + (v_texCoord.y-0.95)*(v_texCoord.y-0.95) < 0.01) {
    discard;
  } else {
    vec3 a_normal = normalize(v_normal);
    vec3 surfaceToLight = normalize(v_surfaceToLight);
    vec3 surfaceToView = normalize(v_surfaceToView);
    vec3 halfVector = normalize(surfaceToLight + surfaceToView);
    vec4 litR = lit(dot(a_normal, surfaceToLight),
                      dot(a_normal, halfVector), u_shininess);
    vec4 outColor = vec4((u_lightColor * (litR.y * u_colorMult +
                                          u_specular * litR.z * u_specularFactor)).rgb, 1.0);  
    gl_FragColor = outColor + u_ambient;
  }
}