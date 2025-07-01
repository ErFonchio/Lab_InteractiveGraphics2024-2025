import * as THREE from 'three';

export class wind{
    constructor(camera){

        this.isMuted = 0;

        const listener = new THREE.AudioListener();
        camera.add(listener);

        const windSound = new THREE.Audio(listener);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('wind.mp3', function(buffer) {
            windSound.setBuffer(buffer);
            windSound.setLoop(true);
            windSound.setVolume(0.5); // Volume iniziale
            windSound.play();
        });

        this.toggle_wind = function() {
            this.isMuted = 1-this.isMuted;
            windSound.setVolume(0.5*(1-this.isMuted));
        }

    }
}