uniform mat4 u_worldViewProjection;
uniform vec3 u_lightWorldPos;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
uniform mat4 u_worldInverseTranspose;
uniform float u_clock;

attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec2 a_texcoord;
attribute vec4 a_color;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
varying vec4 v_color;

void main() {
  v_texCoord = a_texcoord;
  vec4 new_position = vec4(a_position.x, a_position.y, a_position.z+sin(u_clock+a_position.x), a_position.w);
  float tz = cos(u_clock+a_position.x)/length(1.0+cos(u_clock+a_position.x)*cos(u_clock+a_position.x));
  v_position = (u_worldViewProjection * new_position);
  v_normal = normalize(vec3(tz, 0, -1));
  v_surfaceToLight = u_lightWorldPos - (u_world * new_position).xyz;
  v_surfaceToView = (u_viewInverse[3] - (u_world * new_position)).xyz;
  gl_Position = v_position;
  v_color = a_color;
}