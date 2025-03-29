// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    var x = fgPos.x;
    var y = fgPos.y;
    console.log("width"+fgImg.width);
    for (var i = 0; i<fgImg.width; i++){
        //I don't want to print pixel if it is out by width
        if ((i+x < 0) || (i+x >= bgImg.width)) { //With i+x i get the width position of the bgImg
            continue;
        }
        for (var j = 0; j<fgImg.height; j++){
            if ((j+y < 0) || (j+y >= bgImg.height)) { //With j+y i get the height position of the bgImg
                continue;
            }
            //background_color = alpha*foregroung_color + (1-alpha)*background_color
            var red_foreground = fgImg.data[(j*fgImg.width + i)*4];
            var green_foreground = fgImg.data[(j*fgImg.width + i)*4 + 1];
            var blue_foreground = fgImg.data[(j*fgImg.width + i)*4 + 2];

            //Now modify the background image
            bgImg.data[((j+y)*bgImg.width + i+x)*4] = fgOpac*red_foreground + (1-fgOpac)*bgImg.data[((j+y)*bgImg.width + i+x)*4];
            bgImg.data[((j+y)*bgImg.width + i+x)*4 + 1] = fgOpac*green_foreground + (1-fgOpac)*bgImg.data[((j+y)*bgImg.width + i+x)*4 + 1];
            bgImg.data[((j+y)*bgImg.width + i+x)*4 + 2] = fgOpac*blue_foreground + (1-fgOpac)*bgImg.data[((j+y)*bgImg.width + i+x)*4 + 2];
        }
    }

}

function getPixel(x, y, img){
    var index = (y*img.width + x)*4;
    var pixel = {
        r: img.data[index],
        g: img.data[index+1],
        b: img.data[index+2],
        a: img.data[index+3]
    }
    return pixel;
}

function setPixel(x, y, img, pixel){
    var index = (y*img.width + x)*4;
    img.data[index] = pixel.r;
    img.data[index+1] = pixel.g;
    img.data[index+2] = pixel.b;
    img.data[index+3] = pixel.a;
}


