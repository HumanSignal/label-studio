def createSubjectAnnotationTemplate(subjectlist):
    """
        Function that takes a list of subjects and creates an XML markup with it for subject annotation

        :param subjectlist: list of subject strings
        :return: String containing XML markup that can be used by LS
    """
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


