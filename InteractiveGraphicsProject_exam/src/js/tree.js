import * as THREE from "three";
import { Node } from "./Treenode";


const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const texLoader = new THREE.TextureLoader();
const woodTex = texLoader.load('textures/bark_willow_diff_1k.jpg')
const cubeMaterial = new THREE.MeshStandardMaterial({   map: woodTex });


const MINIMUM_BLOCK_SIZE = 0.13;
const b = 10;
const KILL_DISTANCE = 0.3;
const ATTRACTION_DISTANCE = 20;
const RANDOMNESS = 0.2;
const THRESHOLD_BRANCH_DISTANCE = 0.0001;

function getRandomPoints(min, max, n, scale_factor, translation_factor){
    //Random generates between 0 and 1 -> we have to scale the points!
    //Also we have to translate the points according to the tranlsation vector (translation_factor)
    let ret = [];
    console.log(min, max, n);
    for (let i=0; i<n; i++){
        ret.push([  (Math.random(min,max)*scale_factor)+translation_factor[0]-scale_factor/2, 
                    (Math.random(min,max)*scale_factor)+translation_factor[1]-scale_factor/2, 
                    (Math.random(min,max)*scale_factor)+translation_factor[2]-scale_factor/2
                ]);
    }
    return ret;
}

function initializeBoxes(){
    let box1 = {
        type: "box",
        size: 25,
        position: [0, 25, 0],
        points: []
    };
    box1.points = getRandomPoints(-Math.floor(box1.size/2), Math.ceil(box1.size/2), 100, box1.size, box1.position);
    let trunk_box = {
        type: "box",
        position: [-1, -1, -1],
        points: []
    };
    trunk_box.points = getRandomPoints(-Math.floor(2/2), Math.ceil(6/2), 1, 2, trunk_box.position);
    let box3 = {
        type: "box",
        size: 15,
        position: [17, 25, 0],
        points: []
    };
    box3.points = getRandomPoints(-Math.floor(box3.size/2), Math.ceil(box3.size/2), 100, box3.size, box3.position);
    //return [box1, box2, box3];
    return [box1];
}

export function initialize(){
    let kb = {
        // position: [[0, -1, 0], [0, 0, 0], [0, 1, 0], [0, 2, 0], 
        //            [0, 3, 0], [0, 4, 0], [0, 5, 0], [0, 6, 0], 
        //            [0, 7, 0]]
        position: [[0, -1, 0]]
    };
    //Generare box tridimensionale
    let box_list = initializeBoxes();
    return {kb, box_list};
}


function computeMinimumDistance(trunk_points, remaining_attraction_points){

    let minimum_distance_dictionary = new Map();
    let points_to_remove = [];
    for (let i=0; i<remaining_attraction_points.length; i++){

        let attraction_point = remaining_attraction_points[i];
        let minimum_point = null;
        let min_distance = 99999;
        for (let j=0; j<trunk_points.length; j++){
            let trunk_point = trunk_points[j];
            let distance = attraction_point.position.distanceTo(trunk_point.position);
            //If the trunk point is too far from attraction distance, we don't want to add it.
            if (distance > ATTRACTION_DISTANCE){
                continue;
            }
            if (distance < min_distance){
                min_distance = distance;
                minimum_point = trunk_point;
            }
        }
        //If the point is too close to the trunk point, we don't want to add it. We erase it.
        if (min_distance <= KILL_DISTANCE){
            points_to_remove.push(attraction_point);
            continue;
        }
        //If the point cannot reach the trunk point, we will just pass
        if (minimum_point === null){
            continue;
        }
        if (minimum_distance_dictionary.has(minimum_point)){
            minimum_distance_dictionary.get(minimum_point).push(attraction_point);
        }
        else{
            minimum_distance_dictionary.set(minimum_point, [attraction_point]);
        }
    }
    
    //Actually remove the already too close points
    let ret = remaining_attraction_points.filter(point => !points_to_remove.includes(point));
    return {minimum_distance_dictionary, ret, points_to_remove};
}

function computeAverageDistance(trunk, trunk_to_points){
    let average_distance_vector = [0, 0, 0]; //We are in three dimensions
    let trunk_position = trunk.position;
    //The expression is
    /*
    [x_dist, y_dist, z_dist] = sum {(s-v) / norm(s-v)}
    where s is the trunk point vector and v is the attraction point vector
    */
    let attractor_points = trunk_to_points.get(trunk); //This is a list of attractor
    for (let i=0; i<attractor_points.length; i++){
        let attraction_position = attractor_points[i].position;
        let distance = attraction_position.distanceTo(trunk_position);
        let temp = [attraction_position.x - trunk_position.x,
                    attraction_position.y - trunk_position.y,
                    attraction_position.z - trunk_position.z
                    ];
        temp = temp.map((x) => x/distance);
        //Finally add the computed distance
        average_distance_vector[0] += temp[0];
        average_distance_vector[1] += temp[1];
        average_distance_vector[2] += temp[2];
    }
    average_distance_vector = average_distance_vector.map((x) => x/attractor_points.length);
    return average_distance_vector;
}

function computeStandardDeviation(trunk, trunk_to_points, average_distance_vector){
    let std = 0;
    const trunk_position = trunk.position;
    const average_points_position = [trunk_position.x+average_distance_vector[0],
                                     trunk_position.y+average_distance_vector[1],
                                     trunk_position.z+average_distance_vector[2]];

    let attractor_points = trunk_to_points.get(trunk); //This is a list of attractor
    for (let i=0; i<attractor_points.length; i++){
        let attraction_position = attractor_points[i].position;
        let distance = attraction_position.distanceTo(trunk_position);
        std += (distance**2)
    }
    //Normalizing
    std /= attractor_points.length;
    // applying square root to obtain standard deviation
    std = Math.sqrt(std);
    return std;
}

export function growTree(trunk_points, remaining_attraction_points, node_distance, father_children_map){
    //From every random point, find the closest trunk point
    const { minimum_distance_dictionary, ret, points_to_remove } = computeMinimumDistance(trunk_points, remaining_attraction_points);
    let trunk_to_points = minimum_distance_dictionary;
    let remaining_attraction_points_ret = ret;
    //console.log("Trunk involved: ",trunk_to_points);
    //Then i compute the average distance between the trunk points and the random points
    let cubeMeshesToAdd = [];
    let trunk_points_ = [...trunk_points];
    for (const key of trunk_to_points.keys()){
        let average_distance = computeAverageDistance(key, trunk_to_points);
        let std = computeStandardDeviation(key, trunk_to_points, average_distance);

        //Now we compute the norm to normalize the vector
        let norm = Math.sqrt(average_distance[0]**2 + average_distance[1]**2 + average_distance[2]**2);
        //Normalize the vector
        average_distance = average_distance.map((x) => x/norm);

        //Now let's create a new branch
        const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial.clone());
        cubeMesh.castShadow = true
        cubeMesh.receiveShadow = true;

        const x_distance = average_distance[0]*Math.min(0.2, std/b);
        const y_distance = average_distance[1]*Math.min(0.2, std/b);
        const z_distance = average_distance[2]*Math.min(0.2, std/b);

        let x_random = RANDOMNESS*(Math.random()-0.5);
        let y_random = RANDOMNESS*(Math.random()-0.5);
        let z_random = RANDOMNESS*(Math.random()-0.5);

        if (x_distance < THRESHOLD_BRANCH_DISTANCE){
            x_random *= 0.5;
        }
        if (y_distance < THRESHOLD_BRANCH_DISTANCE){
            y_random *= 0.5;
        }
        if (z_distance < THRESHOLD_BRANCH_DISTANCE){
            z_random *= 0.5;
        }

        cubeMesh.position.set(key.position.x + x_distance + x_random,
                              key.position.y + y_distance + y_random,
                              key.position.z + z_distance + z_random);
        
                
        
        if ((std/b) < (MINIMUM_BLOCK_SIZE)){
            cubeMesh.scale.multiplyScalar(MINIMUM_BLOCK_SIZE);
        }
        else{
            cubeMesh.scale.multiplyScalar(std/b);
        }
        //Append new child which has as parent the node
        let child = new Node(cubeMesh, father_children_map.get(key))
        //Update the original position to have a reference for the force application
        child.original_position = cubeMesh.position.clone()
        //Push new child in map
        father_children_map.set(cubeMesh, child);
        //Update parent's info
        father_children_map.get(key).setChild(child);

        cubeMeshesToAdd.push(cubeMesh);
        trunk_points_.push(cubeMesh);
    }
    return {trunk_points_, remaining_attraction_points_ret, cubeMeshesToAdd, points_to_remove};
}



