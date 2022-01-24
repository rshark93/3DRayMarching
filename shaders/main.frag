#version 330 core

layout (location = 0) out vec4 fragColor;

uniform vec2 u_resolution;

void render(inout vec3 col, in vec2 uv) {
    col.rg += uv;
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y; // normalize center

    vec3 col;
    render(col, uv);

    fragColor = vec4(col, 1.0);
}