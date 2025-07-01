import * as THREE from 'three';

export function GeneralLights(scene) {

    const ambientLight = new THREE.AmbientLight("#ffffff", 0.5); // AGGIUNTO LUCE AMBIENTE
    scene.add(ambientLight);
	
	this.update = function(time) {
	}
}