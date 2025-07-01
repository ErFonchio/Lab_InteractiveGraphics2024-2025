import * as NOISE from 'noisejs';

export class perlinNoise {
    constructor(){
        this.noise = new NOISE.Noise(Math.random());
        //I can access wind strengh outside the class
        this.WIND_STRENGHT = 25.4;
        const SPATIAL_FREQUENCY = 1.5;
        const TEMPORAL_FREQUENCY = 0.8;

        this.getPerlin3 = function (first_coordinate, second_coordinate, time){
            return this.noise.perlin3(
                first_coordinate*SPATIAL_FREQUENCY,
                second_coordinate*SPATIAL_FREQUENCY,
                time*TEMPORAL_FREQUENCY
            )
        }

        this.getWindStrenght = function (){
            return this.WIND_STRENGHT;
        }

    }

}