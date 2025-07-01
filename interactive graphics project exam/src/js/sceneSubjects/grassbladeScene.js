import * as THREE from "three";

export class GrassBlade {
    constructor(scene, startPosition = new THREE.Vector3(0, 0, 0), noise, texLoader) {
        
        this.noise = noise;
        this.startPosition = startPosition.clone();
        this.texLoader = texLoader;
        const WIDTH = 0.3;
        const min_height = 2.5;
        const max_height = 4.0;
        const wind_constant = 100


        this.height = THREE.MathUtils.lerp(min_height, max_height, Math.random());

        // Punto di controllo random (curvatura laterale e frontale)
        const controlX = (Math.random() - 0.5) * 0.5;
        const controlZ = (Math.random() - 0.5) * this.height * 0.3; 

        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(controlX, this.height * 0.2, controlZ),
            new THREE.Vector3(0, this.height, 0)
        );

        const points = curve.getPoints(30);

        // Creo la forma (solo X e Y)
        const shape = new THREE.Shape();
        shape.moveTo(-WIDTH / 2, 0);
        for (let i = 0; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.lineTo(WIDTH / 2, 0);
        shape.closePath();


        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00693E,
            side: THREE.DoubleSide,
            roughness: 0.8
        });

        const blade = new THREE.Mesh(geometry, material.clone());

        //Now we inject the z curvature in the geometry
        const positionAttr = geometry.attributes.position;

        for (let i = 0; i < positionAttr.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

            const t = vertex.y / this.height;

            const pointOnCurve = curve.getPoint(t);
            //Update of the curve
            vertex.z = pointOnCurve.z;
            positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        positionAttr.needsUpdate = true;

        blade.position.copy(this.startPosition);
        blade.rotation.y = Math.random() * Math.PI * 2;
        blade.castShadow = true;

        scene.add(blade);
        this.blade = blade;
        
        this.update = function (time) {
            let noiseX = this.noise.getPerlin3(this.blade.position.x, this.blade.position.z, time);
            let noiseZ = this.noise.getPerlin3(this.blade.position.z, this.blade.position.x, time);

            let localWindVector = new THREE.Vector3(noiseX, 0, noiseZ).normalize();

            this.blade.rotation.x = localWindVector.x * this.noise.getWindStrenght() / wind_constant;
            this.blade.rotation.z = localWindVector.z * this.noise.getWindStrenght() / wind_constant;
        }
    }
}
