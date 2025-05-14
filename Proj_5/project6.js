var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0.0);
    vec3 ambient = mtl.k_d * 0.05; // Add a small ambient component
    color += ambient;
    
    for (int i = 0; i < NUM_LIGHTS; ++i) {
        vec3 lightDir = normalize(lights[i].position - position);
        float lightDistance = length(lights[i].position - position);
        
        // Check for shadows with a shadow ray
        Ray shadowRay;
        shadowRay.pos = position + 0.001 * normal; // Offset to avoid self-intersection
        shadowRay.dir = lightDir;
        
        HitInfo shadowHit;
        bool inShadow = false;
        
        if (IntersectRay(shadowHit, shadowRay)) {
            // Check if the hit is between the point and the light
            if (shadowHit.t < lightDistance) {
                inShadow = true;
            }
        }
        
        if (!inShadow) {
            // Diffuse component 
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = mtl.k_d * diff * lights[i].intensity;
            
            // Specular component 
            vec3 halfVector = normalize(lightDir + view);
            float spec = pow(max(dot(normal, halfVector), 0.0), mtl.n);
            vec3 specular = mtl.k_s * spec * lights[i].intensity;
            
            color += diffuse + specular;
        }
    }
    
    return color;
}


// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;

	for ( int i=0; i<NUM_SPHERES; ++i ) {
		Sphere sphere = spheres[i];

		// TO-DO: Test for ray-sphere intersection
		float discriminant = pow(dot(ray.dir, (ray.pos - sphere.center)), 2.0) - 
			(dot(ray.dir, ray.dir) * (dot((ray.pos - sphere.center), (ray.pos - sphere.center)) - pow(sphere.radius, 2.0))); 

		if(discriminant >= 0.0){ // hit found

			// find the t value of closet ray-sphere intersection
			float t0 = (-(dot(ray.dir, (ray.pos-sphere.center))) - sqrt(discriminant)) / (dot(ray.dir, ray.dir));

			if( t0 > 0.0 && t0 <= hit.t){
				foundHit = true;

				hit.t = t0; 
				hit.position = ray.pos + (ray.dir * t0) ; 
				hit.normal = normalize(hit.position - sphere.center); 

				hit.mtl = sphere.mtl;
			}	
	
		}
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
        vec3 k_s = hit.mtl.k_s;
        for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
            if (bounce >= bounceLimit) break;
            if (k_s.r + k_s.g + k_s.b <= 0.0) break;

            Ray r;
            HitInfo h;
            
            r.pos = hit.position + 0.001 * hit.normal;
            r.dir = reflect(ray.dir, hit.normal);

            if (IntersectRay(h, r)) {
                vec3 reflColor = Shade(h.mtl, h.position, h.normal, normalize(-r.dir));
                clr += k_s * reflColor;

                // Prep for next bounce
                k_s *= h.mtl.k_s;
                hit = h;
                ray = r;
            } else {
                clr += k_s * textureCube(envMap, r.dir.xzy).rgb;
                break;
            }
        }

		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 1 );	// return the environment color
	}
}
`;