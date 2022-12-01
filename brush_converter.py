import pandas as pd
import numpy as np
# !pip install scikit-image
from skimage import io
# !pip install matplotlib
from matplotlib import pyplot as plt
import imageio
import glob

# Creates a dictionaries of labels and filepaths for each label in the folder_path
def get_label_paths(path):
    
    _dict = {}
    files = glob.glob(path)
    print(files)
    for file in files:
        label = file.split("-")[-2]
        label_no =  file.split("-")[-1].split(".")[0]
        _dict[file] = [label,label_no]
    return _dict

#Converts hex to RGB values
def getColor(value, color_dict, label):
    if(value == 0):
        #for background
        return (0,0,0)
    elif(value > 0):
        hexcolor = color_dict[label]
        return ImageColor.getcolor(hexcolor, "RGB")

def convert_to_color(img,color_dict,label):
    canvas = np.zeros((img.shape[0], img.shape[1], 3)).astype(np.uint8)
    for row in range(img.shape[0]):
        for col in range(img.shape[1]):
            rgb = getColor(img[row, col],color_dict, label)
            for i in range(3):
                canvas[row, col, i] = rgb[i]
    return canvas

def save_to_path(path, color_img):
    return  imageio.imwrite(path, color_img)

def load_file(path):
    if path.split(".")[-1] == 'npy':
        return np.load(path)
    elif  path.split(".")[-1] == 'png':
        return Image.open(path)
    else:
        print(f'unknown file type : {path.split(".")[1]}')



#get labels and file paths from folder 

def covert_all_labels_to_color(folder_path,outputpath):

    label_path_dict = get_label_paths(folder_path)
    _list= []

    for path,label in label_path_dict.items():
        '''
        1.Load the file from the path 
        2.Convert hex color to RGB 
        3.save to file
        '''
        print(f"Loading.. {path}")
        img = load_file(path)
        print(f"Converting to color : {label[0]}-{label[1]}")
        color_img = convert_to_color(img,color_dict,label[0])
        print(f"saving to file :{outputpath}{label[0]}-{label[1]}.png ")
        _list.append([f'{outputpath}{label[0]}-{label[1]}.png', color_img])
        save_to_path(f'{outputpath}{label[0]}-{label[1]}.png', color_img)
    return _list


#Converts hex to RGB values
def overlay_color(value1, value2):
    if(value1[0] == 0 and value1[1]==0 and value1[2] == 0):
        return value2
    else:
        return value1

def overlay_images(img_array):
    canvas = np.zeros(img_array[0][1].shape).astype(np.uint8)
    for i  in img_array:
        img = i[1]
        for row in range(canvas.shape[0]):
            for col in range(canvas.shape[1]):
                rgb = overlay_color(canvas[row, col] , img[row, col])
                canvas[row, col] = rgb
    return canvas

folder_path ="./fillcolor/*"
outputpath = './output/'
#Dictionary of Hexcolor palette for all labels 
color_dict = { 
    "Car":"#030074",
    "Construction":"#cada00",
    "Tree":"#00ff39",
    "Truck":"#710085",
    "Roof":"#d40606",
    "Grass":"#236100",
    "Path":"#ff9b9b",
    "Driveway":"#7996a0",
    "Building":"#ff0085",
    "Excavation":"#744e00",
    "Parking":"#ff6d00",
    "Road":"#9a9a9a",
    "Background":"#000000",
    "Snow":"#eeeeee",
    "Water":"#00d3ff",
    "Land":"#ddc49e"
    }
#Given a folder with all labels( .png or .npy files) , dynamically apply the color mask to each image and save to outputpath
img_array = covert_all_labels_to_color(folder_path,outputpath)
combined_image= overlay_images(img_array)
save_to_path('./overlayed_image.png', combined_image)
