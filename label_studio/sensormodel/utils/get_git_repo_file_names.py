# Read file names from a given github 'repo' of type(s) '*filetypes'

import github

def get_git_repo_file_names(repo,*filetypes):
    g = github.Github("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")
    repo = g.get_repo(repo)

    contents = repo.get_contents("")
    filenames = []
    for content_file in contents:
        for filetype in filetypes:
            if content_file.name.lower().endswith(filetype):
                filenames.append(content_file.name.removesuffix('.' + filetype))

    return filenames



