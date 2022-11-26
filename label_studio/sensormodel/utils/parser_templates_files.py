# Read files from a local folder and create a choice object for a django model

import os

def get_parser_templates(dir):

    files = os.listdir(dir)
    PARSER_CHOICES = []
    for file in files:
         name, ext = os.path.splitext(file)
         if ext == '.yaml':
            PARSER_CHOICES.append((name))
    return PARSER_CHOICES

    