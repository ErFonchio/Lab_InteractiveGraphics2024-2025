import * as THREE from 'three';
import { GeneralLights } from './sceneSubjects/GeneralLights';
import { TreeScene } from './sceneSubjects/treeScene';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { skyScene } from './sceneSubjects/skyScene';
import { TerrainScene } from './sceneSubjects/terrainScene';
import { perlinNoise } from './perlinNoise';
import { guiInterface } from './guiInterface';
import { wind } from './windAudio';

export function SceneManager(canvas) {

    const clock = new THREE.Clock();
    
    const screenDimensions = {
        width: window.width,
        height: window.height
    }
    
    //Crete scene
    const scene = buildScene();
    //Initialize renderer
    const renderer = buildRender(screenDimensions);
    //Initialize camera
    const camera = buildCamera(screenDimensions);
    //Put subjects inside scene
    const cont = buildControls(camera);
    const sceneSubjects = createSceneSubjects(scene);

    function buildScene() {
        //Creating the scene
        const scene = new THREE.Scene();
        //Creating axis helper to orient through dimensions
        const axesHelper = new THREE.AxesHelper(2);
        //scene.add(axesHelper);
        scene.background = new THREE.Color("#000");

        return scene;
    }


    function buildRender() {
        const renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return renderer;
    }

    function buildCamera() {
        // initialize the camera
        const camera = new THREE.PerspectiveCamera(
          35,
          window.innerWidth / window.innerHeight,
          0.1,
          2000
        );
        camera.position.set(0, 70, 150);

        return camera;
    }

    function buildControls(camera){
        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        return controls;

    }

    function createSceneSubjects(scene) {
        //Initializate perlin noise which has to be common 
        // both to the tree and to the grass
        const noise = new perlinNoise();
        const texLoader = new THREE.TextureLoader();
        const windObj = new wind(camera);
        const sceneSubjects = [
            new GeneralLights(scene),
            new TreeScene(scene, noise),
            new skyScene(scene),
            new TerrainScene(scene, noise, texLoader),
        ];
        const gui_interface = new guiInterface(noise, sceneSubjects[1], sceneSubjects[2], sceneSubjects[3], windObj);
        
        return sceneSubjects;
    }

    this.update = function() {
        const elapsedTime = clock.getElapsedTime();
        for(let i=0; i<sceneSubjects.length; i++){
        	sceneSubjects[i].update(elapsedTime);
            renderer.render(scene, camera);
        }

    }

    this.onWindowResize = function() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}