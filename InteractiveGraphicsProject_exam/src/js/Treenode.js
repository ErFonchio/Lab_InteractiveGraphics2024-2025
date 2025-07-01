import * as THREE from "three";

export class Node {
    constructor(obj = null, parent = null) {
        this.mesh = obj; //Type mesh
        this.parent = parent;
        this.children = [];
        this.original_position = new THREE.Vector3(0, 0, 0); 
        this.anchor_to_line = null;
    }

    setChild(mesh){
        this.children.push(mesh);
    }
    hasParent(){
        return this.parent !== null;
    }
}

export class ScheletonLine{
    constructor(lineMesh, starting_position, ending_position){
        this.mesh = lineMesh;
        this.original_starting_position = starting_position;
        this.original_ending_position = ending_position;
        this.father_line = null;
        this.child_lines = [];
        this.associated_nodes = [];
        this.branch_stiffness = 0;

        this.computeStiffness = function(threshold, stiffnessExponent){
            let sum = 0;
            for (let i=0; i<this.associated_nodes.length; i++){
                let nodeMesh = this.associated_nodes[i].mesh;
                let box = new THREE.Box3().setFromObject(nodeMesh);
                let size = new THREE.Vector3();
                box.getSize(size);
                sum += Math.max(size.x, threshold);
            }

            // Calcola la media
            let averageSize = sum / this.associated_nodes.length;
            this.branch_stiffness = Math.pow(averageSize, stiffnessExponent);

        }
    }

    
}

