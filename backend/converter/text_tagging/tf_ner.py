import os
import argparse
import io

from .utils import iter_tokens_tags

repo_url = 'https://github.com/guillaumegenthial/tf_ner'


def save_data(all_tokens, all_tags, output_dir, file_prefix):
  tokens_file = os.path.join(output_dir, f'{file_prefix}.words.txt')
  tags_file = os.path.join(output_dir, f'{file_prefix}.tags.txt')
  print(f'Saving {len(all_tokens)} examples to {tokens_file} (tokens) and {tags_file} (tags)')
  with io.open(tokens_file, mode='w') as ftokens, io.open(tags_file, mode='w') as ftags:
    for tokens, tags in zip(all_tokens, all_tags):
      ftokens.write(' '.join(tokens) + '\n')
      ftags.write(' '.join(tags) + '\n')


def main(args):
  if not os.path.exists(args.output):
    os.makedirs(args.output)

  all_tokens, all_tags = [], []
  print('Collecting tokens & tags')
  for tokens, tags in iter_tokens_tags(args.input):
    all_tokens.append(tokens)
    all_tags.append(tags)

  if len(all_tokens) <= 1:
    raise ValueError('Number of examples should be > 1')

  num_train = min(int(args.num_train * len(all_tokens)), len(all_tokens) - 1)
  save_data(all_tokens[:num_train], all_tags[:num_train], args.output, 'train')
  save_data(all_tokens[num_train:], all_tags[num_train:], args.output, 'testa')
  save_data(all_tokens[num_train:], all_tags[num_train:], args.output, 'testb')


if __name__ == "__main__":
  parser = argparse.ArgumentParser(
    description=f'Convert Label Studio labeling results to format accepted by {repo_url}')
  parser.add_argument(
    '-i', '--input',
    dest='input',
    help='Input directory, where labeling results are saved (e.g. "/<project_path>/completions")'
  )
  parser.add_argument(
    '-o', '--output',
    dest='output',
    help='Output directory',
    default=os.path.join(os.path.dirname(__file__), 'output')
  )
  parser.add_argument(
    '-n', '--num-train',
    dest='num_train',
    help='Fraction of examples used for train',
    default=0.8,
    type=float
  )
  main(parser.parse_args())
  print(f'Done! Now go to {repo_url} and proceed with the instructions on how to train, evaluating and deploying '
        f'models')
