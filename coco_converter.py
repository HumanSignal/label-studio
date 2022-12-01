## Below is a script to convert COCO format images to a mask 
# (an image with bounding regions)


# IMPORTS
from typing import final
#import PIL
#from isort import file
import matplotlib
matplotlib.use('Agg')
import pycocotools
from pycocotools.coco import COCO
import numpy as np
import pandas as pd
#import skimage.io as io
import random
import os
from label_studio_converter import Converter
#import cv2
#from tensorflow.keras.preprocessing.image import ImageDataGenerator

import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.image as mpimg
import matplotlib.colors as mpcolors

from PIL import ImageColor

#%matplotlib inline

###


# overall method to convert from annotation file to segmentation mask
# assume that each individual image is in its own annotation file (output format of LabelStudio)

"""
 @parameter: dataDir
"""

## file_path: refers to the path to the annotation JSON file (in COCO format)
## save path: refers to the path in which to store the masks generated from the annotation file (does not include /masks at the end)
def convert_all_to_mask(filePath="", save_path="", schema={}):

    # makes coco object from annotation file
    coco_obj = COCO(filePath)
    
    print("CATS", coco_obj.cats)

    print("SCHEMA :", schema['label']['labels_attrs'])
    
    schema_colors = schema['label']['labels_attrs']
    cat_to_color = dict()
    id_to_cat = dict()
    
    color_defaults = {'red': '#FF0000', 'blue': '#0000FF', 'green': '#00FF00', 'yellow': '#FFFF00'}
    
    for k, v in schema_colors.items():
        color = v['background']
        if color in color_defaults:
            color = color_defaults[color]
        cat_to_color[k] = color
    
    for k, v in coco_obj.cats.items():
        id = v['id']
        cat = v['name']
        id_to_cat[id] = cat
    
    # creating proper masks directory to store the saved masks
    dir = "masks"
    path = os.path.join(save_path, dir)
  
    # Create the directory 'masks' in '/save_path'
    if not os.path.exists(path):
        os.mkdir(path)
        print("Directory '% s' created" % dir)

    # go through all the images in the annotation file and convert them individually to masks
    # retrieves all the img_ids that are mentioned in the file
    image_ids = coco_obj.getImgIds()

    # for each image generate the mask (providing image ID)
    for i in image_ids:
        convert_ann_to_mask(coco_obj, i, path, cat_to_color, id_to_cat)
    metrics_to_csv(metrics_dict)


# Given a COCO obj and image ID transform the annotations to a mask
def convert_ann_to_mask(coco, img_id, save_path, cat_to_color, id_to_cat):
   
    annIds = coco.getAnnIds(imgIds=[img_id], iscrowd=None)
    anns = coco.loadAnns(annIds)
    # TODO: look through anns and insert 'color' attribute for each cat_id
    # color in schema is called 'background'
    
    img = coco.imgs[img_id]

    imgPath = img['file_name']
    #####
    
    print("important change")
    ###
   
    # TODO: use string method to find the file name from the path and then append a corresponding suffix _annID_{i}
    # c0d999e4-index_17706  ==> bunch of annotations c0d999e4-index_17706_annID_1, c0d999e4-index_17706_annID_2 --> c0d999e4-index_17706
    img_file_name = os.path.basename(imgPath)

    print("NUMBER OF ANNOTATIONS:", len(anns))
    final_mask = np.zeros((img['height'],img['width']))
    final_mask_colored = np.zeros((img['height'],img['width'], 3))  
    # ^^ defaults color to black, essentially makes everything not labeled background
    #final_mask = coco.annToMask(anns[0])
    categories=set()

    for i in range(len(anns)):
        print("--------")
        print("annotation_id_{} json:".format(i), anns[i])
        new_mask = np.zeros((img['height'],img['width']))
        new_mask += coco.annToMask(anns[i]) * (anns[i]['category_id']+1)
        # TODO: use color here
        #  new_mask += coco.annToMask(anns[i]) * (anns[i]['color'])
        
        cat_id = anns[i]['category_id']
        categ = id_to_cat[cat_id]
        categories.add(categ)
        metrics_dict[categ] += 1
        hex = cat_to_color[categ]
        
        rgb = mpcolors.to_rgb(hex)
        cur_mask = coco.annToMask(anns[i])
        
        
        print("COMPARE SHAPES: ", cur_mask.shape, final_mask_colored.shape)
        #cur_mask.shape = cur_mask.shape + (1, )     #make mask 3D
        
        final_mask_colored[cur_mask == 1] = rgb
        
        #print(" ___ IMPORTANT COLOR MOD: __", cat_id, " --- ", categ, "  ---- ",  hex, " --- ", rgb)

        #with np.printoptions(threshold=np.inf):
        #    print(" CUR MASK: ", cur_mask)
        
        mask_key = "img_{}_annotation_id_{} mask".format(img_id, i)
       
        #mask_store[mask_key] = new_mask
        # new_mask += coco.annToMask(anns[i]) * (anns[i]['category_id']+1)

        print("AnnIds included so far in final_mask: ", np.unique(final_mask))
        final_mask += coco.annToMask(anns[i]) * (anns[i]['category_id']+1)
        
        #displayMask(mask_key, final_mask_colored)
    
    image_to_cat_map[img_file_name] = list(categories)
    
    print("Metrics: ", metrics_dict)
    print("final mask generated.")
    final_mask_title = "img_{}_final_mask".format(img_id)
    #displayMask(final_mask_title, final_mask)
    saveMask(save_path, img_file_name, final_mask_colored)


def displayMask(title, mask):
    print("showing mask {}...".format(title))

    plt.imshow(mask)
    plt.title(title)
    plt.show(block=False)

    plt.pause(3)
    plt.close()



def saveMask(file_path, file_name, img):

    if file_path[-1] == '/':
        file_path = file_path[:-1]
    save_path = file_path + "/" + file_name
    #plt.savefig('foo.png')
    ####

    # file saved in format as {image_name}_mask.png
    f_name, f_ext = os.path.splitext(os.path.basename(save_path).split("/")[-1])
    f_name = f_name + "___fuse"
    
    save_path = file_path + "/" + f_name + f_ext

    mpimg.imsave(save_path, img)

def metrics_to_csv(metrics):
    total_count = sum(metrics.values())
    output_list = list()
    for key,value in metrics.items():
        if value != 0:
            output_list.append((key,value,str(round((value/total_count)*100,2) )+'%'))
    print(output_list)
    df1 = pd.DataFrame(output_list,columns = ['Labels','Label_Count','Percentage'])
    metrics_file_path = save_path+'/Metrics.xlsx'
    # print(metrics_file_path)
    # df.to_csv(metrics_file_path, index=False)
    df2 = pd.DataFrame.from_dict(image_to_cat_map,orient='index')
    with pd.ExcelWriter(metrics_file_path) as writer:
        df1.to_excel(writer, sheet_name='Metrics',index=False)
        df2.to_excel(writer, sheet_name='ImageMetrics',header=False)


schem = {'label': {
                    'type': 'PolygonLabels',
                     'to_name': ['image'], 
                     'inputs': [{'type': 'Image', 'value': 'image'}], 
                     'labels': ['Car', 'Construction', 'Tree', 'Truck', 'Excavation', ''], 
                     'labels_attrs': {
                        'Car': {'value': 'Car', 'background': '#030074'}, 
                        'Construction': {'value': 'Construction', 'background': '#cada00'}, 
                        'Tree': {'value': 'Tree', 'background': '#00ff39'}, 
                        'Truck': {'value': 'Truck', 'background': '#710085'},
                        'Roof': {'value': 'Roof', 'background': '#d40606'},
                        'Grass': {'value': 'Grass', 'background': '#236100'},
                        'Path': {'value': 'Path', 'background': '#ff9b9b'},
                        'Driveway': {'value': 'Driveway', 'background': '#7996a0'},
                        'Building': {'value': 'Building', 'background': '#ff0085'},
                        'Excavation': {'value': 'Excavation', 'background': '#744e00'},
                        'Parking': {'value': 'Parking', 'background': '#ff6d00'},
                        'Road': {'value': 'Road', 'background': '#9a9a9a'},
                        'Background': {'value': 'Background', 'background': '#000000'},
                        'Snow': {'value': 'Snow', 'background': '#eeeeee'},
                        'Water': {'value': 'Water', 'background': '#00d3ff'},
                        'Land': {'value': 'Land', 'background': '#ddc49e'}
                        }}}
filePath = "./Input/coco/result.json"
save_path = './Output/coco'
metrics_dict = {"Construction": 0, "Car":0, "Roof": 0, "Tree": 0, "Truck": 0, "Grass": 0, "Path": 0, "Driveway": 0, "Building": 0, "Excavation": 0, "Parking": 0, "Road" :0, "Background": 0, "Snow": 0, "Water": 0, "Land": 0}
image_to_cat_map = dict()
convert_all_to_mask(filePath,save_path,schema= schem)


