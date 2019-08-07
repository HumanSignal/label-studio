import argparse
import io

from .utils import iter_tokens_tags


def main(args):
  with io.open(args.output, 'w') as f:
    for tokens, tags in iter_tokens_tags(args.input):
      f.write('-DOCSTART- -X- O O\n')
      for token, BIO_tag in zip(tokens, tags):
        f.write(f'{token} -X- _ {BIO_tag}\n')
      f.write('\n')


if __name__ == "__main__":
  parser = argparse.ArgumentParser(
    description=f'Convert Label Studio labeling results to format accepted by SpaCy lib')
  parser.add_argument(
    '-i', '--input',
    dest='input',
    help='Input directory, where labeling results are saved (e.g. "/<project_path>/completions")'
  )
  parser.add_argument(
    '-o', '--output',
    dest='output',
    help='Output file',
    default='output.conll'
  )
  main(parser.parse_args())
