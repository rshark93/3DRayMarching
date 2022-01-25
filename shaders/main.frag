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

vec2 fOpUnionID(vec2 res1, vec2 res2) {
    return res1.x < res2.x ? res1 : res2;
}

vec2 map(vec3 p) {
    // endless repetition of objects
    //pMod3(p, vec3(5));

    // plane
    float planeDist = fPlane(p, vec3(0, 1, 0), 1.);
    float planeID = 2.;
    vec2 plane = vec2(planeDist, planeID);

    // sphere
    float sphereDist = fSphere(p, 1.);
    float sphereID = 1.;
    vec2 sphere = vec2(sphereDist, sphereID);
    //result
    return fOpUnionID(sphere, plane);
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

// gradient of plane
vec3 getNormal(vec3 p){
    vec2 e = vec2(EPSILON, 0.);
    vec3 n = vec3(map(p).x) - vec3(map(p - e.xyy).x, map(p - e.yxy).x, map(p - e.yyx).x);
    return normalize(n);
}

/** Lambertian Reflection
https://en.wikipedia.org/wiki/Lambertian_reflectance
*/
vec3 getLighting(vec3 p, vec3 rd, vec3 color) {
    vec3 lightPos = vec3(20., 40., -30.);
    vec3 L = normalize(lightPos - p);
    vec3 N = getNormal(p);

    vec3 diffuse = color * clamp(dot(L, N), 0., 1.);

    // adding shadows
    float d = rayMarch(p +N * .02, normalize(lightPos)).x;
    if (d < length(lightPos - p)) return vec3(0);

    return diffuse;
}

vec3 getColorMaterial(vec3 p, float id){
    vec3 m;
    switch(int(id)) {
        case 1: m = vec3(.9, .0, .0);
            break;
        // chess texture
        case 2: m = vec3(.2 + .4 * mod(floor(p.x) + floor(p.z), 2.));
            break;
        case 3: m = vec3(.5,.5,.9);
            break;
    }
    return m;
}

void render(inout vec3 col, in vec2 uv) {
    vec3 ro = vec3(0.,0.,-3.);
    // rd formed along the Z axis of the camera
    vec3 rd = normalize(vec3(uv, ROV));

    vec2 obj = rayMarch(ro, rd);

    if (obj.x < MAX_DIST) {
        vec3 p = ro + obj.x * rd;
        vec3 color = getColorMaterial(p, obj.y);
        col += getLighting(p, rd, color);
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy) / u_resolution.y; // normalize center

    vec3 col;
    render(col, uv);

    // gamma correction
    col = pow(col, vec3(.454545));
    fragColor = vec4(col, 1.);
}