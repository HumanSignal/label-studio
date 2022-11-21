# import os

# def get_parser_templates(dir):

#     files = os.listdir(dir)

#     PARSER_CHOICES = []
#     choice_number = 0

#     for file in files:
#          name, ext = os.path.splitext(file)
#          if ext == '.yaml':
#             PARSER_CHOICES.append((choice_number,name))
#             choice_number += 1
#     return PARSER_CHOICES

import os

def get_parser_templates(dir):

    files = os.listdir(dir)
    PARSER_CHOICES = []
    for file in files:
         name, ext = os.path.splitext(file)
         if ext == '.yaml':
            PARSER_CHOICES.append((name))
    return PARSER_CHOICES

    