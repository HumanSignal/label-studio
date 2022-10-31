import os

def get_parser_templates(dir):

    templates = os.listdir(dir)

    PARSER_CHOICES = []
    for i, template  in enumerate(templates):
        PARSER_CHOICES.append((i,str(template)))
    
    return PARSER_CHOICES