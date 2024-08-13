import json
import os
import re
from urllib.parse import quote

import jira
import requests
from github import Github
from jira import JIRA

COMMIT_PATTERN = re.compile(r'^(\w*):\s*(.*?)?:\s*(.*?)\s*(\(#(\d+)\))?$')

RELEASE_VERSION = os.getenv("RELEASE_VERSION").strip('\"')
CURRENT_REF = os.getenv("CURRENT_REF").strip('\"')
PREVIOUS_REF = os.getenv("PREVIOUS_REF").strip('\"')

JIRA_SERVER = os.getenv("JIRA_SERVER", "https://heartex.atlassian.net").strip('\"')
JIRA_USERNAME = os.getenv("JIRA_USERNAME").strip('\"')
JIRA_TOKEN = os.getenv("JIRA_TOKEN").strip('\"')
JIRA_RN_FIELD = os.getenv("JIRA_RN_FIELD", "customfield_10064").strip('\"')
JIRA_PROJECTS = os.getenv("JIRA_PROJECTS", "PLT,LEAP,OPTIC,DIA").split(",")
JIRA_RELEASE_PREFIX = os.getenv("JIRA_RELEASE_PREFIX", None).strip('\"')

GH_REPO = os.getenv("GH_REPO", "").strip('\"')
GH_TOKEN = os.getenv("GH_TOKEN").strip('\"')  # https://github.com/settings/tokens/new

LAUNCHDARKLY_SDK_KEY = os.getenv("LAUNCHDARKLY_SDK_KEY", '').strip('\"')
LAUNCHDARKLY_ENVIRONMENT = os.getenv("LAUNCHDARKLY_ENVIRONMENT", '').strip('\"')

HELM_CHART_REPO = os.getenv("HELM_CHART_REPO", None)
HELM_CHART_PATH = os.getenv("HELM_CHART_PATH", None)

OUTPUT_FILE_MD = os.getenv("OUTPUT_FILE_MD", 'output.md')
OUTPUT_FILE_JSON = os.getenv("OUTPUT_FILE_JSON", 'output.json')

WORKFLOW_RUN_LINK = os.getenv("WORKFLOW_RUN_LINK", '')

COMMIT_LABEL_MAP = {
    'feat': 'New Features',
    'fix': 'Bug Fixes',
    'perf': 'Performance Improvements',
    'refactor': 'Code Refactoring',
    'docs': 'Documentation'
}

DEFAULT_LABEL = "Other"

LABEL_SORT = [
    "New Feature",
    "Improvement",
    "Customer Bug Fix",
    "Bug Fix",
    "Refactor",
    "Research",
    DEFAULT_LABEL,
]

github_client = Github(GH_TOKEN)
github_repo = github_client.get_repo(GH_REPO)
jira_client = JIRA(JIRA_SERVER, basic_auth=(JIRA_USERNAME, JIRA_TOKEN))

FEATURE_FLAGS = {}


def ff_is_on(ff: dict) -> bool:
    return ff.get('fallthrough').get('variation') == 0 if ff.get('on') else ff.get('offVariation') == 0


def ff_status(ff: dict) -> str:
    is_on = ff_is_on(ff)
    is_on_text = "On" if is_on else "Off"
    options = []
    if ff.get('rules'):
        options.append('rules')
    if ff.get('targets'):
        options.append('targets')
    if options:
        options_text = ' and '.join(options)
        return f'{is_on_text} with {options_text}'
    return is_on_text


def ff_link(ff: dict) -> str:
    key = ff.get('key')
    return f'https://app.launchdarkly.com/default/{LAUNCHDARKLY_ENVIRONMENT}/features/{key}/targeting'


class JiraIssue:
    pr = None

    def __init__(self, issue_number: str, pr: int = None):
        self.type = "Jira Issue"
        self.pr = pr
        issue = jira_client.issue(issue_number)
        self.key = str(issue)
        self.status = str(issue.fields.status)
        self.label = DEFAULT_LABEL
        self.summary = str(issue.raw['fields']['summary'])
        self.release_note = issue.get_field(JIRA_RN_FIELD)
        self.desc = self.release_note if self.release_note else self.summary
        self.link = f"{JIRA_SERVER}/browse/{self.key}"
        self.releases_tags = []
        self.ffs = self.get_ffs()

    def set_releases_tags(self, tags: list[str]):
        pass

    def __str__(self):
        return f"<{self.link}|[{self.key}]>: {self.desc} -- *{self.status}*"

    def __key(self):
        return self.key

    def __dict__(self):
        return {
            "desc": self.desc,
            "link": self.link,
            "key": self.key,
            "status": self.status,
            "pr": self.pr,
            "ffs": self.ffs,
        }

    def get_ffs(self):
        ff_key = self.key.lower().replace('-', '_')
        result = []
        for name, ff in FEATURE_FLAGS.items():
            if ff_key in name:
                key = ff.get('key')
                on = ff_is_on(ff)
                link = ff_link(ff)
                status = ff_status(ff)
                result.append(
                    {
                        'key': key,
                        'on': on,
                        'link': link,
                        'status': status,
                    }
                )
        return result


TASK_CACHE = {}


def get_task(task_number: str, pr: int = None) -> JiraIssue or None:
    if task_number in TASK_CACHE.keys():
        return TASK_CACHE.get(task_number)
    try:
        task = JiraIssue(task_number, pr)
        TASK_CACHE[task_number] = task
        return task
    except Exception as e:
        print(f'Could not find Issue {task_number} in Jira: {e}')
    return None


def get_jira_release(project: str, version: str) -> jira.client.Version or None:
    jira_project_versions = jira_client.project_versions(project=project)
    jira_sorted_project_versions = sorted(jira_project_versions, key=lambda x: x.name, reverse=True)
    return next((e for e in jira_sorted_project_versions if version in e.name), None)


def get_jira_release_issues(project_id: str, release_id: str) -> list[JiraIssue]:
    issues = jira_client.search_issues(
        f"project = {project_id} AND fixVersion = {release_id} ORDER BY priority DESC, key ASC")
    tasks = set()
    for issue in issues:
        if task := get_task(issue.key):
            tasks.add(task)
    return list(tasks)


def get_github_release(previous_ref: str, current_ref: str):
    return github_repo.compare(previous_ref, current_ref)


def get_github_release_tasks(commits) -> list[JiraIssue]:
    tasks = set()
    for commit in commits:
        message_first_line = commit.commit.message.split("\n")[0]
        if (match := re.match(COMMIT_PATTERN, message_first_line)) is not None:
            label = match.group(1)
            if label in COMMIT_LABEL_MAP.keys():
                task_key = match.group(2)
                pr = None
                try:
                    pr = int(match.group(5))
                except Exception as e:
                    print(f'Could not parse pr from "{message_first_line}": {str(e)}')
                if task := get_task(task_key, pr):
                    tasks.add(task)
    return list(tasks)


def get_feature_flags() -> dict:
    if LAUNCHDARKLY_SDK_KEY:
        response = requests.get(
            url="https://sdk.launchdarkly.com/sdk/latest-all",
            headers={
                "Authorization": LAUNCHDARKLY_SDK_KEY,
            },
            timeout=30,
        )
        return response.json().get('flags', {})
    return {}


def missing_tasks(left: list[JiraIssue], right: list[JiraIssue]) -> list[JiraIssue]:
    r_keys = [x.key for x in right]
    missing = [task for task in left if task.key not in r_keys]
    missing_sorted = sorted(missing, key=lambda x: int(x.key.split('-')[-1]))
    return missing_sorted


def sort_task_by_label(tasks: list[JiraIssue]) -> dict[str, list[JiraIssue]]:
    result = {}
    for task in tasks:
        result[task.label] = result.get(task.label, []) + [task]
    return result


def render_link_md(text: str, link: str) -> str:
    return f"[{text}]({link})"


def render_tasks_md(tasks: list[JiraIssue]) -> list[str]:
    result = []
    for task in tasks:
        summary = task.desc.replace('\n', ' ')
        result.append(f'- {summary} {render_link_md(task.key, task.link)}')
    return result


def render_ffs_md(ffs: list) -> list[str]:
    result = []
    for ff in ffs:
        key = ff.get('key')
        link = ff_link(ff)
        result.append(f'- {render_link_md(key, link)}')
    return result


def render_add_quote_md(lines: list[str]) -> list[str]:
    return [f'> {line}' for line in lines]


def render_add_spoiler_md(title: str, lines: list[str]) -> list[str]:
    result = ["<details>", f"<summary>{title}</summary>", ""]
    result.extend(lines)
    result.append("")
    result.append("</details>")
    return result


def render_add_header_md(title: str, lines: list[str]) -> list[str]:
    result = [f"### {title}"]
    result.extend(lines)
    result.append('')
    return result


def render_output_md(
        gh_release,
        jira_releases_issues_jql_url,
        sorted_release_tasks: dict[str, list[JiraIssue]],
        missing_in_gh: list[JiraIssue],
        missing_in_tracker: list[JiraIssue],
        missing_release_note_field: list[JiraIssue],
        turned_off_feature_flags: list,
        helm_chart_version: str = None,
) -> str:
    release_notes_lines = []

    if helm_chart_version:
        release_notes_lines.append(f'Helm Chart version: {helm_chart_version}')

    for label, tasks in sorted(sorted_release_tasks.items(),
                               key=lambda x: LABEL_SORT.index(x[0]) if x[0] in LABEL_SORT else 100):
        release_notes_lines.extend(
            render_add_header_md(
                label,
                render_tasks_md(tasks)
            )
        )

    comment = []

    comment.append(f'Full Changelog: [{PREVIOUS_REF}...{RELEASE_VERSION}]({gh_release.html_url})')
    comment.append(
        f'This changelog was updated in response to a push of {CURRENT_REF} [Workflow run]({WORKFLOW_RUN_LINK})')
    comment.append('')

    if jira_releases_issues_jql_url:
        comment.append(f'[Jira Release {RELEASE_VERSION} Issues Filter]({jira_releases_issues_jql_url})')
    else:
        comment.append('Jira Release not found')

    if len(missing_in_tracker) == 0:
        comment.append('Release Notes are generated based on git log: No tasks found in Task Tracker.')
    else:
        comment.append('Release Notes are generated based on Task Tracker.')

    if missing_in_gh:
        comment.extend(
            render_add_spoiler_md(
                f'Missing in GitHub release ({len(missing_in_gh)})',
                render_tasks_md(missing_in_gh)
            )
        )
    if missing_in_tracker:
        comment.extend(
            render_add_spoiler_md(
                f'Missing in Task Tracker release ({len(missing_in_tracker)})',
                render_tasks_md(missing_in_tracker)
            )
        )
    if missing_release_note_field:
        comment.extend(
            render_add_spoiler_md(
                f'Missing Release note field ({len(missing_release_note_field)})',
                render_tasks_md(missing_release_note_field)
            )
        )
    if turned_off_feature_flags:
        comment.extend(
            render_add_spoiler_md(
                f'Turned off Feature Flags ({len(turned_off_feature_flags)})',
                render_ffs_md(turned_off_feature_flags)
            )
        )

    comment.append('')
    comment.append('**ALL LINES STARTING FROM QUOTE WILL BE IGNORED**')

    release_notes_lines.extend(
        render_add_quote_md(comment)
    )

    return '\n'.join(release_notes_lines)


def render_output_json(
        sorted_release_tasks: dict[str, list[JiraIssue]],
) -> dict:
    sorted_release_tasks_json = {}
    for label, tasks in sorted_release_tasks.items():
        sorted_release_tasks_json[label] = [t.__dict__() for t in tasks]
    result = {
        'sorted_release_tasks': sorted_release_tasks_json
    }
    return result


def get_helm_chart_version(repo: str, path: str) -> str or None:
    chart_repo = github_client.get_repo(repo)
    content = chart_repo.get_contents(path)
    version_regexp = re.compile(r'version:\s*(.*)')
    match = re.search(version_regexp, content.decoded_content.decode('utf-8'))
    return match.group(1)


def main():
    gh_release = get_github_release(PREVIOUS_REF, CURRENT_REF)
    print(f"Compare url: {gh_release.html_url}")
    print(f"Ahead by {gh_release.ahead_by}")
    print(f"Behind by {gh_release.behind_by}")
    print(f"Merge base commit: {gh_release.merge_base_commit}")
    print(f"Commits: {gh_release.commits}")

    global FEATURE_FLAGS
    try:
        FEATURE_FLAGS = get_feature_flags()
    except Exception as e:
        print(f'Failed to fetch Feature Flags: {e}')

    gh_release_tasks = get_github_release_tasks(gh_release.commits)

    jira_release_issues = []
    jira_releases_urls = []
    jira_releases_issues_jql_url = None

    for jira_project in JIRA_PROJECTS:
        jira_fix_version = f"{JIRA_RELEASE_PREFIX}/{RELEASE_VERSION}"
        jira_release = get_jira_release(jira_project, jira_fix_version)
        if jira_release:
            jira_release_url = f"{JIRA_SERVER}/projects/{jira_project}/versions/{jira_release.id}"
            jira_releases_urls.append(jira_release_url)
            print(f"Found Jira Release {jira_release.name} in project {jira_project}: {jira_release_url}")
            jira_release_issues = get_jira_release_issues(jira_release.projectId, jira_release.id)
            jira_release_issues.extend(jira_release_issues)
            issues_jql = quote(f"fixversion=\"{jira_fix_version}\" ORDER BY created DESC")
            jira_releases_issues_jql_url = f"{JIRA_SERVER}/issues/?jql={issues_jql}"

    tracker_release_tasks = jira_release_issues

    if tracker_release_tasks:
        print(f"{len(tracker_release_tasks)} tasks found in Task Tracker")
        print("Using Task Tracker as a source")
        sorted_release_tasks = sort_task_by_label(tracker_release_tasks)
        missing_in_gh = missing_tasks(tracker_release_tasks, gh_release_tasks)
        missing_in_tracker = missing_tasks(gh_release_tasks, tracker_release_tasks)
        missing_release_note_field = [x for x in tracker_release_tasks if not x.release_note]
    else:
        print("No tasks found in Task Tracker")
        print("Using GitHub as a source")
        sorted_release_tasks = sort_task_by_label(gh_release_tasks)
        missing_in_gh = []
        missing_in_tracker = []
        missing_release_note_field = [x for x in tracker_release_tasks if not x.release_note]

    turned_off_feature_flags = [ff for name, ff in FEATURE_FLAGS.items() if not ff_is_on(ff)]

    helm_chart_version = None
    if HELM_CHART_REPO and HELM_CHART_PATH:
        try:
            helm_chart_version = get_helm_chart_version(HELM_CHART_REPO, HELM_CHART_PATH)
        except Exception as e:
            print(f'Failed to fetch Helm Chart Version: {e}')

    output_md = render_output_md(
        gh_release,
        jira_releases_issues_jql_url,
        sorted_release_tasks,
        missing_in_gh,
        missing_in_tracker,
        missing_release_note_field,
        turned_off_feature_flags,
        helm_chart_version=helm_chart_version,
    )
    if OUTPUT_FILE_MD:
        with open(OUTPUT_FILE_MD, 'w') as f:
            print(f"Creating a markdown output file: '{OUTPUT_FILE_MD}'")
            f.write(output_md)
    else:
        print("OUTPUT_FILE_MD is not specified")
    print(output_md)

    output_json = render_output_json(sorted_release_tasks)
    if OUTPUT_FILE_JSON:
        with open(OUTPUT_FILE_JSON, 'w') as f:
            print(f"Creating a json output file: '{OUTPUT_FILE_JSON}'")
            json.dump(output_json, f)
    else:
        print("OUTPUT_FILE_JSON is not specified")
    print(output_json)


if __name__ == "__main__":
    main()
