def createSubjectAnnotationTemplate(sensorlist,subjectlist):
    colors = ['#000000', '#0000FF','#808080','#008000','#800080','#FF0000','#FFFFFF']
    head = '<View><Header value="Subject presence annotation"/><Video name="video" value="$video_url" sync="sensor"/>'
    
    labelsstart = f'<Labels name="subjects" toName="audio" choice="multiple">'
    labels =  ''
    for i, subject in enumerate(subjectlist.split(',')):
        label = f'<Label value="{subject}" background="{colors[i]}"/>'
        labels += label
    labelsend = '</Labels>'
    
    audio = f'<AudioPlus name="audio" value="$video_url" sync="video" speed="false"/>'
    tail = '</View>'


    return head + labelsstart + labels + labelsend +  audio + tail


# Example:

# <View>
#   <Header value="Video timeline segmentation via AudioPlus sync trick"/>
#   <Video name="video" value="$video_url" sync="audio"/>
#   <Labels name="tricks" toName="audio" choice="multiple">
#     <Label value="Kickflip" background="#1BB500"/>
#     <Label value="360 Flip" background="#FFA91D"/>
#     <Label value="Trick" background="#358EF3"/>
#   </Labels>
#   <AudioPlus name="audio" value="$video_url" sync="video" speed="false"/>
# </View>
