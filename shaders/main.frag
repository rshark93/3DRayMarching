#version 330 core

/** http://mercury.sexy/hg_sdf/
A glsl library for building signed distance functions */
#include hg_sdf.glsl

layout (location = 0) out vec4 fragColor;

uniform vec2 u_resolution;

const float ROV = 1.; // region of view
const int MAX_STEPS = 256;
const float MAX_DIST = 500;
const float EPSILON = .001;

vec2 map(vec3 p) {
    // endless repetition of objects
    pMod3(p, vec3(5));
    // sphere
    float sphereDist = fSphere(p, 1.);
    float sphereID = 1.;
    return vec2(sphereDist, sphereID);
}

/* return 2-dimensional vector object for save distance to object into X
   and get id-object(color) into Y */
vec2 rayMarch(vec3 ro, vec3 rd) {
    vec2 hit, obj;
    for (int i = 0; i < MAX_STEPS; ++i) {
        vec3 p = ro + obj.x * rd;
        hit = map(p);
        obj.x += hit.x;
        obj.y = hit.y;

        if (abs(hit.x) < EPSILON || obj.x > MAX_DIST)
            break;
    }
    return obj;
}

void render(inout vec3 col, in vec2 uv) {
    vec3 ro = vec3(0.,0.,-3.);
    // rd formed along the Z axis of the camera
    vec3 rd = normalize(vec3(uv, ROV));

    vec2 obj = rayMarch(ro, rd);

    if (obj.x < MAX_DIST)
        col += 3. / obj.x;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy) / u_resolution.y; // normalize center

    vec3 col;
    render(col, uv);

    fragColor = vec4(col, 1.);
}