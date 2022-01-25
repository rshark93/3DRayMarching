#version 330 core

/** http://mercury.sexy/hg_sdf/
A glsl library for building signed distance functions */
#include hg_sdf.glsl

layout (location = 0) out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const float ROV = 1.; // region of view
const int MAX_STEPS = 256;
const float MAX_DIST = 500;
const float EPSILON = .001;

float fDisplace(vec3 p) {
    pR(p.yz, sin(2.0 * u_time));
    return (sin(p.x + 4.0 * u_time) * sin(p.y + sin(2.0 * u_time)) * sin(p.z + 6.0 * u_time));
}

vec2 fOpUnionID(vec2 res1, vec2 res2) {
    return res1.x < res2.x ? res1 : res2;
}

vec2 fOpDifferenceID(vec2 res1, vec2 res2) {
    return res1.x > -res2.x ? res1 : vec2(-res2.x, res2.y);
}

vec2 fOpDifferenceColumnsID(vec2 res1, vec2 res2, float r, float n) {
    float dist = fOpDifferenceColumns(res1.x, res2.x, r, n);
    return res1.x > -res2.x ? vec2(dist, res1.y) : vec2(dist, res2.y);
}

vec2 fOpUnionStairsID(vec2 res1, vec2 res2, float r, float n) {
    float dist = fOpUnionStairs(res1.x, res2.x, r, n);
    return res1.x < res2.x ? vec2(dist, res1.y) : vec2(dist, res2.y);
}

vec2 fOpUnionChamferID(vec2 res1, vec2 res2, float r) {
    float dist = fOpUnionChamfer(res1.x, res2.x, r);
    return res1.x < res2.x ? vec2(dist, res1.y) : vec2(dist, res2.y);
}

vec2 map(vec3 p) {
    // endless repetition of objects
    // pMod3(p, vec3(5));

    // plane
    float planeDist = fPlane(p, vec3(0, 1, 0), 14.);
    float planeID = 2.;
    vec2 plane = vec2(planeDist, planeID);

    // torus
    vec3 pt = p + .2;
    pt.y -= 8;
    pR(pt.yx, 4. * u_time);
    pR(pt.yz, .3 * u_time);
    float torusDist = fTorus(pt, .7, 16.);
    float torusID = 5.;
    vec2 torus = vec2(torusDist, torusID);

    // sphere
    vec3 ps = p + .2;
    ps.y -= 8;
    float sphereDist = fSphere(ps, 13. + fDisplace(p));
    float sphereID = 1.;
    vec2 sphere = vec2(sphereDist, sphereID);

    // manipulation operators
    pMirrorOctant(p.xz, vec2(50, 50));
    p.x = -abs(p.x) + 20;
    pMod1(p.z, 15);

    // roof
    vec3 pr = p;
    pr.y -= 15.5;
    pR(pr.xy, .6);
    pr.x -= 18.;
    float roofDist = fBox2(pr.xy, vec2(20, .3));
    float roofID = 4.;
    vec2 roof = vec2(roofDist, roofID);

    // box
    float boxDist = fBox(p, vec3(3, 9, 4));
    float boxID = 3.;
    vec2 box = vec2(boxDist, boxID);

    // cylinder
    vec3 pc = p;
    pc.y -= 9.;
    float cylinderDist = fCylinder(pc.yxz, 4, 3);
    float cylinderID = 3.;
    vec2 cylinder = vec2(cylinderDist, cylinderID);

    // wall
    float wallDist = fBox2(p.xy, vec2(1, 15));
    float wallID = 3.;
    vec2 wall = vec2(wallDist, wallID);

    // result
    vec2  res;
    res = fOpUnionID(box, cylinder);
    res = fOpDifferenceColumnsID(wall, res, .6, 3.);
    res = fOpUnionChamferID(res, roof, .9);
    res = fOpUnionStairsID(res, plane, 4., 5.);
    res = fOpUnionID(res, sphere);
    res = fOpUnionID(res, torus);

    return res;
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
    // add module lighting
    vec3 V = -rd;
    vec3 R = reflect(-L, N);

    vec3 specColor = vec3(.5);
    vec3 specular = specColor * pow(clamp(dot(R, V), 0., 1.), 10.);
    vec3 diffuse = color * clamp(dot(L, N), 0., 1.);
    vec3 ambient = color * .05;
    vec3 fresnel = .25 * color * pow(1. + dot(rd, N), 3.);

    // shadows
    float d = rayMarch(p + N * .02, normalize(lightPos)).x;
    if (d < length(lightPos - p)) return ambient + fresnel;

    return diffuse + ambient + specular;
}

vec3 getColorMaterial(vec3 p, float id) {
    vec3 m;
    switch(int(id)) {
        case 1: m = vec3(.8, .2, .1);
            break;
        // chess pale texture
        case 2: m = vec3(.2 + .4 * mod(floor(p.x) + floor(p.z), 2.));
            break;
        case 3: m = vec3(.7,.8,.1);
            break;
        case 4:
            vec2 i = step(fract(.5 * p.xz), vec2(1. / 10.));
            m = ((1.0 - i.x) * (1.0 - i.y)) * vec3(.66, .55, .44); break;
        case 5:
            m = vec3(.5, .5, .1);
    }
    return m;
}

mat3 getCamera(vec3 ro, vec3 lookAt){
    vec3 camF = normalize(vec3(lookAt - ro));
    vec3 camR = normalize(cross(vec3(0, 1, 0), camF));
    vec3 camU = cross(camF, camR);
    return mat3(camR, camU, camF);
}

void mouseControl(inout vec3 ro){
    vec2 m = u_mouse / u_resolution;
    pR(ro.yz, m.y * PI * .5 - .5);
    pR(ro.xz, m.x * TAU);
}

void render(inout vec3 col, in vec2 uv) {
    vec3 ro = vec3(36., 19., -36.);
    mouseControl(ro);
    vec3 lookAt = vec3(0, 1, 0);
    // rd formed along the Z axis of the camera
    vec3 rd = getCamera(ro, lookAt) * normalize(vec3(uv, ROV));

    vec2 obj = rayMarch(ro, rd);

    vec3 background = vec3(.5, .8, .9);
    if (obj.x < MAX_DIST) {
        vec3 p = ro + obj.x * rd;
        vec3 colorM = getColorMaterial(p, obj.y);
        col += getLighting(p, rd, colorM);
        //  fog for background smoothing
        col = mix(col, background, 1. - exp(-.0008 * obj.x * obj.x));
    } else { // adding background color
        col += background - max(.95 * rd.y, 0.);
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy) / u_resolution.y; // normalize center
    vec3 col;
    render(col, uv);

    // gamma correction
    col = pow(col, vec3(.4545));
    fragColor = vec4(col, 1.);
}