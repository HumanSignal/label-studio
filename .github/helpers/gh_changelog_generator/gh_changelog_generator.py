import re
import subprocess
import os
from jira import JIRA
from jira.exceptions import JIRAError
import json

commit_pattern = re.compile(r'^(\w*):\s*(.*?)?:\s*(.*?)\s*(\(#(\d+)\))?$')

PREVIOUS_REF = os.getenv("PREVIOUS_REF").strip('\"')
BASE_BRANCH = os.getenv("BASE_BRANCH", "origin/develop").strip('\"')

JIRA_USERNAME = os.getenv("JIRA_USERNAME").strip('\"')  # in email format, e.g username@domain.com
JIRA_TOKEN = os.getenv("JIRA_TOKEN").strip('\"')  # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_SERVER = os.getenv("JIRA_SERVER", "https://heartex.atlassian.net").strip('\"')
JIRA_RN_FIELD = os.getenv("JIRA_RN_FIELD", "customfield_10064").strip('\"')
OUTPUT_FILE_MD = os.getenv("OUTPUT_FILE_MD", None)
OUTPUT_FILE_JSON = os.getenv("OUTPUT_FILE_JSON", None)

jira = JIRA(JIRA_SERVER, basic_auth=(JIRA_USERNAME, JIRA_TOKEN))

title_map = {
    'feat': 'New Features',
    'fix': 'Bug Fixes',
    'perf': 'Performance Improvements',
    'refactor': 'Code Refactoring',
    'docs': 'Documentation'
}


def execute_git_cmd(cmd):
    git_command = " ".join(["git", cmd])
    return execute_cmd(git_command)


def execute_cmd(cmd):
    try:
        out = subprocess.check_output(cmd, shell=True, universal_newlines=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as err:
        print(f"Aborting: Got error while calling \"{cmd}\"")
        print(f"Details: {err}")
        print(f"Details: {err.output}")
        exit(1)
    return out.strip()


def execute_cmd_visible(cmd):
    with subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                          universal_newlines=True, stderr=subprocess.STDOUT) as proc:
        for line in proc.stdout:
            print(line, end='')
    if proc.returncode != 0:
        print(f"Aborting: Got error while calling \"{cmd}\"")
        exit(1)


def get_head_sha():
    return execute_git_cmd("rev-parse HEAD")


def generate_changelog(tag_new, previous_release_id):
    out = execute_git_cmd(f"log --reverse --pretty=format:%s {tag_new}..{previous_release_id}")
    return out


def get_branch_diverge_commit(branch, base_branch):
    out = execute_git_cmd(f"rev-list --boundary {branch}...{base_branch} | grep '^-' | cut -c2- | tail -n1")
    return out


def changelog_list(raw_changelog) -> list:
    changelog_list = []
    for line in raw_changelog.splitlines():
        if (match := re.match(commit_pattern, line)) is not None:
            if match.group(1) in title_map.keys():
                title = match.group(1)
                jira = match.group(2)
                changelog_list.append(title + jira)
    return list(set(changelog_list))


def jira_release_note(ticket):
    try:
        issue = jira.issue(ticket)
        return issue.get_field(JIRA_RN_FIELD)
    except JIRAError:
        return ''


def changelog_map(raw_changelog, tasks_list):
    changelog_dict = {}
    changelog_dup_dict = {}
    for line in raw_changelog.splitlines():
        if (match := re.match(commit_pattern, line)) is not None:
            if match.group(1) in title_map.keys():
                title = match.group(1)
                ticket = match.group(2)
                msg = match.group(3)
                pr_id = match.group(5) if match.group(5) else ''
                jira_rn = jira_release_note(ticket)
                desc = jira_rn.replace("\n", " ") if jira_rn else msg
                list_key = title + ticket
                entry = {'desc': desc, 'pr': pr_id}
                if list_key in tasks_list:
                    if title in changelog_dup_dict:
                        changelog_dup_dict[title].update({ticket: entry})
                    else:
                        changelog_dup_dict[title] = {ticket: entry}
                elif title in changelog_dict:
                    changelog_dict[title].update({ticket: entry})
                else:
                    changelog_dict[title] = {ticket: entry}
    return changelog_dict, changelog_dup_dict


def format_changelog(changelog) -> str:
    result_lines = []
    for key in title_map.keys():
        if key in changelog.keys():
            result_lines.append(f"### {title_map[key]}")
            for jira, line in changelog[key].items():
                result_lines.append(f"- {line['desc']} [{jira.upper()}]")
    return '\n'.join(result_lines)


def main():
    new_tag = os.getenv("NEW_TAG", get_head_sha())

    previous_tag_base_commit = get_branch_diverge_commit(PREVIOUS_REF, BASE_BRANCH)
    branch_diff_changelog = generate_changelog(previous_tag_base_commit, PREVIOUS_REF)
    previous_tag_tasks_list = changelog_list(branch_diff_changelog)

    new_changelog = generate_changelog(previous_tag_base_commit, new_tag)
    changelog_new, changelog_dup = changelog_map(new_changelog, previous_tag_tasks_list)

    if OUTPUT_FILE_MD:
        with open(OUTPUT_FILE_MD, 'w') as f:
            print(f"Creating a markdown output file: '{OUTPUT_FILE_MD}'")
            f.write(format_changelog(changelog_new))

    if OUTPUT_FILE_JSON:
        with open(OUTPUT_FILE_JSON, 'w') as f:
            print(f"Creating a json output file: '{OUTPUT_FILE_JSON}'")
            json.dump(changelog_new, f)


if __name__ == "__main__":
    main()
