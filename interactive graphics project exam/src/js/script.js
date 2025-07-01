import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initialize, growTree } from "./tree.js";
import { Pane } from "tweakpane";

let NODE_DISTANCE = 0.2;
let RANDOMNESS = 0.2;

//initialize the pane for input management
const pane = new Pane();


// initialize the scene
const scene = new THREE.Scene();
const axesHelper = new THREE.AxesHelper(2);
scene.add(axesHelper);

// add objects to the scene
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: "brown" });

// ADD tree axioms to the scene
const { kb, box_list } = initialize();
let axioms = []
for (let i=0; i<kb.position.length; i++){
    let position = kb.position[i];
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.set(position[0], position[1], position[2]);
    scene.add(cubeMesh);
    axioms.push(cubeMesh);
}

// Create box for random points
console.log(box_list);
for (let i=0; i<box_list.length; i++){
    let box = box_list[i];
    const boxGeometry = new THREE.BoxGeometry(box.size, box.size, box.size);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: "green", wireframe: true});
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.set(box.position[0], box.position[1], box.position[2]);
    scene.add(boxMesh);
}

// Add random points
let random_points = []
const pointGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const pointMaterial = new THREE.MeshBasicMaterial({ color: "green" });
for (let i=0; i<box_list.length; i++){
    let box = box_list[i];
    for (let i=0; i<box.points.length; i++){
        let point = box.points[i];
        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        pointMesh.position.set(point[0], point[1], point[2]);
        random_points.push(pointMesh);
        scene.add(pointMesh);
    }
}

pane.addButton({
    title: "Grow Tree",
}).on("click", () => {
    treecycle();
});

// initialize the camera
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 5, 30);

// initialize the renderer
const canvas = document.querySelector("canvas.threejs");
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// instantiate the controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = false;

window.addEventListener('resize', () =>{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight);
})

// render the scene
const renderloop = () => {

  controls.update();  
  renderer.render(scene, camera);
  window.requestAnimationFrame(renderloop);
};

var trunk_points = [...axioms];
var remaining_attraction_points = [...random_points];

const treecycle = () => {
    while (remaining_attraction_points.length > 0){
        let {trunk_points_, remaining_attraction_points_ret, cubeMeshesToAdd, points_to_remove} = 
        growTree(trunk_points, remaining_attraction_points, NODE_DISTANCE, RANDOMNESS);
        trunk_points = trunk_points_;
        remaining_attraction_points = remaining_attraction_points_ret;
        updateScene(cubeMeshesToAdd, points_to_remove);
    }
    
}

const updateScene = (cubeMeshesToAdd, points_to_remove) => {
    scene.remove(...points_to_remove);
    scene.add(...cubeMeshesToAdd);
}

renderloop();
