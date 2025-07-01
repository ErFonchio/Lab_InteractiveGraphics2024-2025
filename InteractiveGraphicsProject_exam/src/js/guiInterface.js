import * as GUI from 'lil-gui';

export class guiInterface{
    constructor(perlin_instance, tree_instance, sky_instance, terrain_instance, wind){
        this.gui = new GUI.GUI();
        this.perlin_instance = perlin_instance;
        this.tree_instance = tree_instance;
        this.sky_instance = sky_instance;
        this.terrain_instance = terrain_instance;
        this.wind = wind;

        this.parameters = {
            grass: true,
            leaves: true,
            trunk: true,
            sky: true,
            scheleton: false,
            wind_audio: true,
        };

        this.gui.add(this.perlin_instance, 'WIND_STRENGHT', 0, 200).name("Wind Strenght");
        this.gui.add(this.tree_instance, 'branch_stiffness', 1, 5).name("Branch stiffness").onChange((value) => {this.tree_instance.change_stiffness(value)});;
        this.gui.add(this.parameters, 'grass').name("Show grass").onChange((value) => {this.terrain_instance.toggle_grass(value)});
        this.gui.add(this.parameters, 'leaves').name("Show leaves").onChange((value) => {this.tree_instance.toggle_leaves(value)});
        this.gui.add(this.parameters, 'trunk').name("Show trunk").onChange((value) => {this.tree_instance.toggle_trunk(value)});
        this.gui.add(this.parameters, 'sky').name("Show sky").onChange((value) => {this.sky_instance.toggle_sky(value)});
        this.gui.add(this.parameters, 'scheleton').name("Show scheleton").onChange((value) => {this.tree_instance.toggle_scheleton(value)});
        this.gui.add(this.parameters, 'wind_audio').name("Wind toggle").onChange(() => {this.wind.toggle_wind()});


    }
}