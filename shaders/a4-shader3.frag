precision mediump float;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
varying vec4 v_color;

uniform vec4 u_lightColor;
uniform vec4 u_colorMult;
uniform sampler2D u_diffuse;
uniform sampler2D u_image0;
uniform sampler2D u_image1;
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
  vec4 diffuseColor = texture2D(u_diffuse, v_texCoord);
  vec3 a_normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
  vec4 litR = lit(dot(a_normal, surfaceToLight),
                    dot(a_normal, halfVector), u_shininess);
  
  vec4 texColor1 = texture2D(u_image0, v_texCoord);
  vec4 texColor2 = texture2D(u_image1, v_texCoord);
  vec4 mainColor = texColor1;
  float greendiff = ((texColor1.g - texColor1.r) + (texColor1.g - texColor1.b))/2.0;
  if (greendiff >= 0.15) {
    mainColor = texColor2;
  }
  vec4 outColor = vec4((u_lightColor * (
                    litR.y * mainColor +
                    u_specular * litR.z * u_specularFactor)).rgb,
      diffuseColor.a);
  gl_FragColor = outColor + u_ambient;
}
