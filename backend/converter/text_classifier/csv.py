import argparse
import io

from utils import iter_text_choices


def main(args):
  with io.open(args.output, 'w') as f:
    for text, choice in iter_text_choices(args.input, args.data_key):
      f.write(f'{text}{args.separator}{choice}\n')


if __name__ == "__main__":
  parser = argparse.ArgumentParser(
    description=f'Convert Label Studio labeling results to format accepted by SpaCy lib')
  parser.add_argument(
    '-i', '--input',
    dest='input',
    help='Input directory, where labeling results are saved (e.g. "/<project_path>/completions")'
  )
  parser.add_argument(
    '-k', '--data-key',
    dest='data_key',
    help='Input data source key used for labeling'
  )
  parser.add_argument(
    '-o', '--output',
    dest='output',
    help='Output file',
    default='output.conll'
  )
  parser.add_argument(
    '-s', '--separator',
    dest='separator',
    help='Separator used',
    default='\t'
  )
  main(parser.parse_args())
