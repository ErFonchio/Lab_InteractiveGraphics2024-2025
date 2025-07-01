import * as THREE from "three";
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export class skyScene {
    constructor(scene) {
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        scene.add(this.sky);

        this.skyUniforms = this.sky.material.uniforms;

        this.skyUniforms['turbidity'].value = 4;
        this.skyUniforms['rayleigh'].value = 0.2;
        this.skyUniforms['mieCoefficient'].value = 0.001;
        this.skyUniforms['mieDirectionalG'].value = 0.6;

        this.sun = new THREE.Vector3(40, 40, 40);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.camera.left = -30;
        this.directionalLight.shadow.camera.right = 30;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -30;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 150;
        scene.add(this.directionalLight);

        //const helper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
        //scene.add(helper);
        
        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
        this.directionalLight.position.copy(this.sun);

        this.toggle_sky = (enable) => {
            console.log("Sky enabled");
            enable? scene.add(this.sky) : scene.remove(this.sky);
            
        }
        
        this.update = function (time) {}
    }
}
