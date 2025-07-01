import * as THREE from "three";
import { initialize, growTree } from "../tree.js";
import { Node, ScheletonLine } from "../Treenode.js";
import simplify from 'simplify-js';


export class TreeScene {
    constructor(scene, noise) {

        this.noise = noise;
        this.leaves = [];

        const NODE_DISTANCE = 0.2;
        const DELTA_TIME = 0.01;
        this.ELASTIC_CONSTANT = 55.4;
        this.branch_stiffness = 2.6;
        const THRESHOLD_BRANCH_RESISTANCE = 3.5;
        const ERROR_TOLERANCE = 0.5;

        const icogeometry = new THREE.IcosahedronGeometry(3.0, 0); // raggio 1, dettaglio 0
        const icomaterial = new THREE.MeshStandardMaterial({
            color: 0x00693E,
            transparent: true, // Abilita la trasparenza
            opacity: 0.5, // Regola il livello di trasparenza
            roughness: 0.8, // Un po' opaco per un effetto più naturale
            metalness: 0 // Nessun riflesso metallico
        }); // wireframe per vedere le facce

        let remaining_attraction_points = [];

        //this.animate();
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshBasicMaterial({  color: "brown"});

        const { kb, box_list } = initialize();

        let axioms = [];
        for (let i = 0; i < kb.position.length; i++) {
            let position = kb.position[i];
            const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cubeMesh.position.set(position[0], position[1], position[2]);
            scene.add(cubeMesh);
            axioms.push(cubeMesh);
        }

        let trunk_points = [...axioms];

        const pointGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: "green" });

        for (let i = 0; i < box_list.length; i++) {
            let box = box_list[i];

            // Draw attraction box
            // const boxGeometry = new THREE.BoxGeometry(box.size, box.size, box.size);
            // const boxMaterial = new THREE.MeshBasicMaterial({ color: "green", wireframe: true });
            // const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            // boxMesh.position.set(box.position[0], box.position[1], box.position[2]);
            // scene.add(boxMesh);
            // Draw random points
            for (let j = 0; j < box.points.length; j++) {
                let point = box.points[j];
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.position.set(point[0], point[1], point[2]);
                scene.add(pointMesh);
                remaining_attraction_points.push(pointMesh);
            }
        }

        this.treemap = growTree_cycle(new Map());

        let children = findChildren(this.treemap);
        findMalformedBranch(children);
        findMalformedBranch(children);
        this.leaves = addLeaves(children);
        [this.scheletonmap, this.first_line] = buildTreeStructure(this.treemap);
        associateBlocksToLines(this.treemap, this.scheletonmap);
        this.scheletonmap = associateStiffnessToLines(this.scheletonmap, THRESHOLD_BRANCH_RESISTANCE, this.branch_stiffness);

        this.change_stiffness = (value) => {
            console.log("Changing stiffness");
            for (let key of this.scheletonmap.keys()){
                let branch = this.scheletonmap.get(key);
                branch.computeStiffness(THRESHOLD_BRANCH_RESISTANCE, value);
            }
        }

        function associateStiffnessToLines(scheletonmap, threshold, branch_stiffness){
            for (let key of scheletonmap.keys()){
                let line = scheletonmap.get(key);
                line.computeStiffness(threshold, branch_stiffness);
            }
            return scheletonmap;
        }


        function closestPointOnSegment(point, start, end) {
            const startToPoint = point.clone().sub(start);
            const segmentVector = end.clone().sub(start);
            const segmentLengthSquared = segmentVector.lengthSq();

            const t = Math.max(0, Math.min(1, startToPoint.dot(segmentVector) / segmentLengthSquared));
            return start.clone().add(segmentVector.multiplyScalar(t));
        }


        function associateBlocksToLines(treemap, scheletonmap){
            for (let blockMesh of treemap.keys()) {
                let minDistance = Infinity;
                let closestLine = null;

                for (let [line, segment] of scheletonmap.entries()) {

                    // Calcolo la distanza tra il blocco e il segmento
                    const start = segment.original_starting_position;
                    const end = segment.original_ending_position;

                    const projectedPoint = closestPointOnSegment(blockMesh.position, start, end);
                    const distance = blockMesh.position.distanceTo(projectedPoint);

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestLine = segment;
                    }
                }
                //Add block to line object
                closestLine.associated_nodes.push(treemap.get(blockMesh));
                //I save the distance between the block point and the original line point
                treemap.get(blockMesh).anchor_to_line = blockMesh.position.clone()
                                        .sub(closestLine.original_starting_position);
            }
        }



        function getSquareDistance(p1, p2) {
            return (
                (p1.x - p2.x) ** 2 +
                (p1.y - p2.y) ** 2 +
                (p1.z - p2.z) ** 2
            );
        }

        // Funzione di semplificazione 3D
        function simplify3D(points, tolerance, highQuality = true) {
            return simplify(points, tolerance, highQuality, getSquareDistance);
        }

        function pointKey(vector) {
            return `${vector.x.toFixed(4)},${vector.y.toFixed(4)},${vector.z.toFixed(4)}`;
        }

        function extractBranchSegments(node) {
            let segments = [];
            function traverse(currentNode, currentSegment) {
                currentSegment.push(currentNode);
                // Se il nodo ha più di un figlio, è una biforcazione: chiudo il segmento qui
                if (currentNode.children.length !== 1) {
                    if (currentSegment.length > 1) {
                        segments.push([...currentSegment]); // Salvo il segmento
                    }
    
                    // Riparto per ogni figlio come nuovo segmento
                    for (let child of currentNode.children) {
                        traverse(child, [currentNode]); // Nuovo segmento che parte dal nodo corrente
                    }
                } else {
                    // Caso normale: continua lungo il ramo
                    traverse(currentNode.children[0], currentSegment);
                }
            }
            traverse(node, []);
            return segments;
        }


        //We group the tree points to line with the RDP algorithm
        function buildTreeStructure(treemap) {
            let approximated_lines = new Map();
            let point_to_line = new Map();
            let first_line;

            const segments = extractBranchSegments(treemap.get(axioms[0]));

            for (let i = 0; i < segments.length; i++) {

                const branchPoints = segments[i].map(n => ({
                    x: n.mesh.position.x,
                    y: n.mesh.position.y,
                    z: n.mesh.position.z
                }));

                const simplifiedBranch = simplify3D(branchPoints, ERROR_TOLERANCE);
                const simplifiedVector3 = simplifiedBranch.map(p => new THREE.Vector3(p.x, p.y, p.z));

                for (let j = 0; j < simplifiedVector3.length - 1; j++) {
                    const startPoint = pointKey(simplifiedVector3[j]);
                    const endPoint = pointKey(simplifiedVector3[j+1]);

                    const line = drawLine(simplifiedVector3[j], simplifiedVector3[j+1]);

                    if (i === 0 && j === 0){
                        first_line = line;
                    }

                    const scheletonLine = new ScheletonLine(line, simplifiedVector3[j].clone(), simplifiedVector3[j+1].clone());

                    approximated_lines.set(line, scheletonLine);

                    if (point_to_line.has(startPoint)) {
                        point_to_line.get(startPoint).starts.push(scheletonLine);
                    } else {
                        point_to_line.set(startPoint, { starts: [scheletonLine], ends: null });
                    }

                    if (point_to_line.has(endPoint)) {
                        point_to_line.get(endPoint).ends = scheletonLine;
                    } else {
                        point_to_line.set(endPoint, { starts: [], ends: scheletonLine });
                    }
                }
            }

            for (let key of point_to_line.keys()){
                const obj = point_to_line.get(key);
                const parent = obj.ends;
                const children = obj.starts;
                //We skip the trunk which has no parent
                if (parent === null) {
                    continue;
                }
                for (let g=0; g<children.length; g++){
                    parent.child_lines.push(children[g]);
                    children[g].father_line = parent;
                }
            }

            return [approximated_lines, first_line];
        }

        function addLeaves(children) {
            let leaves = [];
            for (let i = 0; i<children.length; i++) {
                if (children[i].hasParent()) {

                    let child = children[i];
                    let icosahedron = new THREE.Mesh(icogeometry, icomaterial);
                    icosahedron.castShadow = true;

                    icosahedron.position.copy(child.mesh.position);
                    let original_leaf_position = child.mesh.position.clone();

                    scene.add(icosahedron);
                    //I will use later the father to calculate the applied forces
                    leaves.push([icosahedron, original_leaf_position, child.parent]);
                }

            }
            return leaves;
        }

        function findChildren(treemap) {
            let children_array = [];
            for (let key of treemap.keys()) {
                let node = treemap.get(key);
                if (node.children.length === 0) {
                    children_array.push(node);
                }
            }
            return children_array;
        }

        function findMalformedBranch(child_list) {
            for (let i = 0; i < child_list.length; i++) {
                let child = child_list[i];
                while (child.hasParent()) {
                    //If parent trunk is shorter than child, there's something wrong
                    if (getMeshSize(child.parent.mesh).x < getMeshSize(child.mesh).x) {
                        cureMalformedBranch(child, getMeshSize(child.mesh).x);
                        break;
                    }
                    child = child.parent;
                }
            }
        }

        function cureMalformedBranch(child, size) {
            let malformed_blocks = [];
            let goal_size = 0;

            while (child.hasParent()) {
                if (getMeshSize(child.parent.mesh).x > size) {
                    goal_size = getMeshSize(child.parent.mesh).x;
                    break;
                }
                child = child.parent;
                malformed_blocks.push(child);
            }
            //console.log({goal_size, malformed_blocks});
            //Now i have to cure <malformed_blocks> blocks, interpolating its size between size and goal size
            //Which are respectively the size of the starting node and the size of the ending node
            const step = (goal_size - size) / malformed_blocks.length;
            for (let i = 0; i < malformed_blocks.length; i++) {

                let node = malformed_blocks[i];
                let current_size = getMeshSize(node.mesh).x;
                let target_size = size + step * (i + 1);
                let scale_factor = target_size / current_size;
                node.mesh.scale.multiplyScalar(scale_factor);

            }
        }

        function getMeshSize(mesh) {
            let box = new THREE.Box3().setFromObject(mesh);

            let size = new THREE.Vector3();
            box.getSize(size);

            return size;
        }



        function growTree_cycle(father_children_map) {
            //Initialize  father children map with the trunk nodes
            for (let i = 0; i < trunk_points.length; i++) {
                //Create pair in map -> trunk, Node
                //Were inside the node i store the mesh of the trunk
                //The trunk has parent = null
                let node = new Node(trunk_points[i], null);
                node.original_position = trunk_points[i].position.clone();
                father_children_map.set(trunk_points[i], node);
            }

            while (remaining_attraction_points.length > 0) {
                let { trunk_points_, remaining_attraction_points_ret, cubeMeshesToAdd, points_to_remove } = growTree(trunk_points, remaining_attraction_points, NODE_DISTANCE, father_children_map);

                trunk_points = trunk_points_;
                remaining_attraction_points = remaining_attraction_points_ret;

                updateScene(cubeMeshesToAdd, points_to_remove);
            }
            return father_children_map;
        }

        function updateScene(cubeMeshesToAdd, points_to_remove) {
            scene.remove(...points_to_remove);
            if (cubeMeshesToAdd.length !== 0) {
                scene.add(...cubeMeshesToAdd);
            }
        }

        function drawLine(position1, position2) {
            let pointA = position1;
            let pointB = position2;
            let geometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
            let material = new THREE.LineBasicMaterial({color: 0xff0000, 
                                                        transparent: true,
                                                        opacity: 0.0 });
            let line = new THREE.Line(geometry, material);
            scene.add(line);
            return line;

        }

        function visualizeRelationParentChild(father_children_map) {
            for (let key of father_children_map.keys()) {
                let node = father_children_map.get(key);
                if (node.hasParent()) {
                    let parent = node.parent; //Getting the mesh
                    drawLine(node.mesh.position, parent.mesh.position);
                }
            }
        }


        this.updateScheletonPosition = (time) => {
            //BFS queue
            let queue = [{
                segment: this.scheletonmap.get(this.first_line),
                currentStart: this.scheletonmap.get(this.first_line).original_starting_position.clone(),
                currentEnd: this.scheletonmap.get(this.first_line).original_ending_position.clone()
            }];

            while (queue.length > 0) {
                const { segment, currentStart, currentEnd } = queue.shift();

                // Taking the original length of the segment
                const originalVector = segment.original_ending_position.clone().sub(segment.original_starting_position);

                // What is the current position of the segment?
                const positions = segment.mesh.geometry.attributes.position.array;

                // Aggiorna posizione iniziale solamente se non sto modificando il tronco
                if (this.scheletonmap.get(this.first_line) !== segment){

                    positions[0] = currentStart.x;
                    positions[1] = currentStart.y;
                    positions[2] = currentStart.z;
                    positions[3] = currentEnd.x;
                    positions[4] = currentEnd.y;
                    positions[5] = currentEnd.z;
                }

                // Aggiorna posizione finale (inizialmente fissa per ora)
                let actualEnd = new THREE.Vector3(positions[3], positions[4], positions[5]).clone();

                // Perlin noise (vento)
                let centerPosition = currentStart.clone().add(currentEnd).multiplyScalar(0.5);
                let noiseX = this.noise.getPerlin3(centerPosition.x, centerPosition.z, time);
                let noiseZ = this.noise.getPerlin3(centerPosition.z, centerPosition.x, time);
                let localWindVector = new THREE.Vector3(noiseX, 0, noiseZ).normalize();

                // Calcolo forza elastica (posizione attuale rispetto alla posizione a riposo)
                let displacement = actualEnd.clone().sub(currentEnd);
                let elasticForce = displacement.multiplyScalar(-this.ELASTIC_CONSTANT);

                // Calcolo forza del vento
                const windForceConstant = new THREE.Vector3().crossVectors(localWindVector, originalVector).length();
                let windEffectiveness = 1 / (1 + segment.branch_stiffness);
                const appliedWindForce = localWindVector.multiplyScalar(windForceConstant * this.noise.WIND_STRENGHT * windEffectiveness);

                // Somma delle forze 
                let totalForce = elasticForce.add(appliedWindForce);

                // Applica traslazione al punto finale -> Euler Integration
                positions[3] += DELTA_TIME * totalForce.x;
                positions[4] += DELTA_TIME * totalForce.y;
                positions[5] += DELTA_TIME * totalForce.z;

                segment.mesh.geometry.attributes.position.needsUpdate = true;

                // Calcola la nuova posizione finale aggiornata
                let updatedEnd = new THREE.Vector3(positions[3], positions[4], positions[5]).clone();
                
                //Ora calcolo la rotazione
                let quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(updatedEnd.clone().normalize(), actualEnd.clone().normalize());
                const start_vector = currentStart.clone();
                
                const restDir = segment.original_ending_position.clone()
                                .sub(segment.original_starting_position).normalize();
                const currDir = updatedEnd.clone().sub(currentStart).normalize();
                const q = new THREE.Quaternion().setFromUnitVectors(restDir, currDir);

                const oldLen = segment.original_ending_position.distanceTo(segment.original_starting_position);
                //La distanza dalla linea determina
                const newLen = updatedEnd.distanceTo(currentStart);
                const scale  = newLen / oldLen;

                for (let node of segment.associated_nodes) { 
                    // posizione originale relativa al ramo 
                    const localRel = node.anchor_to_line.clone();

                    // applica scale + rotazione
                    const transformedRel = localRel
                        .clone()
                        .multiplyScalar(scale)
                        .applyQuaternion(q);

                    // aggiorna in un colpo solo
                    node.mesh.position.copy(
                        currentStart.clone().add(transformedRel)
                    );
                }
                for (let child of segment.child_lines) {
                    queue.push({
                        segment: child,
                        //Updated children position
                        currentStart: updatedEnd.clone(),
                        currentEnd: updatedEnd.clone()
                                                .sub(start_vector) 
                                                .applyQuaternion(quaternion) // Rotazione attorno a start_vector
                                                .add(start_vector)
                                                .add(child.original_ending_position.clone() //Traslazione
                                                .sub(child.original_starting_position)),
                                                
                    });
                }
            }
        }


        this.updateLeavesPosition = function (time){
            if (this.leaves.length === 0){
                return;
            }
            for (let i=0; i<this.leaves.length; i++){
                let tuple = this.leaves[i];
                const leaf = tuple[0]; //Mesh
                const original_leaf_position = tuple[1]; //Node
                const father = tuple[2];
                leaf.position.copy(father.mesh.position);

            }
        }

        this.toggle_leaves = (enable) => {
            console.log("Leaves enabled");
            for (let i=0; i<this.leaves.length; i++){
                let leafMesh = this.leaves[i][0];
                enable? scene.add(leafMesh) : scene.remove(leafMesh);
            }
        }
        this.toggle_trunk = (enable) => {
            console.log("Trunk enabled");
            for (let key of this.treemap.keys()){
                let trunkMesh = key;
                enable? scene.add(trunkMesh) : scene.remove(trunkMesh);
            }
        }
        this.toggle_scheleton = (enable) => {
            console.log("Scheleton enabled");
            for (let key of this.scheletonmap.keys()){
                let boneMesh = key;
                if (enable){
                    boneMesh.material.opacity = 1.0;
                    scene.add(boneMesh);
                }
                else{
                    boneMesh.material.opacity = 0.0;
                    scene.remove(boneMesh);
                }
            }
        }

        this.updateBlockPosition = (time) => {
            this.updateScheletonPosition(time);
            this.updateLeavesPosition(time);
        }

        this.update = function (time) {
            this.updateBlockPosition(time);
        };
    }
}
