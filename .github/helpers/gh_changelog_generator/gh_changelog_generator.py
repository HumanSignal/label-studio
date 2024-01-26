import json
import os
import re

import requests
from github import Github
from jira import JIRA

COMMIT_PATTERN = re.compile(r'^(\w*):\s*(.*?)?:\s*(.*?)\s*(\(#(\d+)\))?$')

RELEASE_VERSION = os.getenv("RELEASE_VERSION").strip('\"')
CURRENT_REF = os.getenv("CURRENT_REF").strip('\"')
PREVIOUS_REF = os.getenv("PREVIOUS_REF").strip('\"')

JIRA_SERVER = os.getenv("JIRA_SERVER", "https://heartex.atlassian.net").strip('\"')
JIRA_USERNAME = os.getenv("JIRA_USERNAME").strip('\"')  # in email format, e.g username@domain.com
JIRA_TOKEN = os.getenv("JIRA_TOKEN").strip('\"')  # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_PROJECT = os.getenv("JIRA_PROJECT", "DEV").strip('\"')
JIRA_RN_FIELD = os.getenv("JIRA_RN_FIELD", "customfield_10064").strip('\"')

AHA_SERVER = os.getenv("AHA_SERVER", "https://labelstudio.aha.io").strip('\"')
AHA_TOKEN = os.getenv("AHA_TOKEN").strip('\"')
AHA_PRODUCT = os.getenv("AHA_PRODUCT", "LSDV").strip('\"')
AHA_RN_FIELD = os.getenv("AHA_RN_FIELD", "release_notes").strip('\"')
AHA_FETCH_STRATEGY = os.getenv("AHA_FETCH_STRATEGY", "PARKING_LOT").strip('\"')  # PARKING_LOT or TAG
AHA_TAG = os.getenv("AHA_TAG", "").strip('\"')
AHA_ADDITIONAL_RELEASES_TAG = os.getenv("AHA_ADDITIONAL_RELEASES_TAG", "").strip('\"')

GH_REPO = os.getenv("GH_REPO", "").strip('\"')
GH_TOKEN = os.getenv("GH_TOKEN").strip('\"')  # https://github.com/settings/tokens/new

LAUNCHDARKLY_SDK_KEY = os.getenv("LAUNCHDARKLY_SDK_KEY", '').strip('\"')
LAUNCHDARKLY_ENVIRONMENT = os.getenv("LAUNCHDARKLY_ENVIRONMENT", '').strip('\"')

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


class AHA:
    def __init__(self, server: str, token: str):
        self.server = server
        self.token = token

    def query(self, url: str, data: dict = None, params: dict = None, method: str = 'GET'):
        response = requests.request(
            method=method,
            url=f"{self.server}/{url}",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=data,
            params=params,
        )
        return response.json()

    def paginate(self, url: str, key: str, data: dict = None, method: str = 'GET', page: int = 0, per_page: int = 100):
        result = []
        current_page = page
        total_pages = None
        while total_pages is None or current_page <= total_pages:
            response_json = self.query(
                url=url,
                data=data,
                params={"page": current_page + 1, "per_page": per_page},
                method=method,
            )
            pagination = response_json.get('pagination', [])
            current_page = int(pagination.get('current_page'))
            total_pages = int(pagination.get('total_pages'))
            entries = response_json.get(key, [])
            result.extend(entries)
        return result


github_client = Github(GH_TOKEN)
github_repo = github_client.get_repo(GH_REPO)
jira_client = JIRA(JIRA_SERVER, basic_auth=(JIRA_USERNAME, JIRA_TOKEN))
aha_client = AHA(AHA_SERVER, AHA_TOKEN)


class AhaFeature:
    pr = None

    def __init__(self, feature_num: str, pr: int = None):
        self.type = "Aha! Feature"
        self.pr = pr
        feature = aha_client.query(f'api/v1/features/{feature_num}').get('feature')
        self.key = str(feature.get('reference_num'))
        self.status = str(feature.get('workflow_status').get('name'))
        self.label = feature.get('workflow_kind', {}).get('name', DEFAULT_LABEL)
        self.summary = str(feature.get('name'))
        self.release_note = next(
            (f.get('value') for f in feature.get('custom_fields', []) if f.get('key') == AHA_RN_FIELD), None)
        self.desc = self.release_note if self.release_note else self.summary
        self.link = str(feature.get('url'))
        self.releases_tags = next(
            (f.get('value') for f in feature.get('custom_fields', []) if f.get('key') == 'releases'), [])

    def set_releases_tags(self, tags: list[str]):
        aha_client.query(
            url=f'api/v1/features/{self.key}',
            data={"feature": {"custom_fields": {"releases": tags}}},
            method='PUT',
        )

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
            "pr": self.pr
        }


class AhaRequirement(AhaFeature):
    def __init__(self, feature_num: str, pr: int = None):
        self.type = "Aha! Requirement"
        self.pr = pr
        feature = aha_client.query(f'api/v1/requirements/{feature_num}').get('requirement')
        self.key = str(feature.get('reference_num'))
        self.status = str(feature.get('workflow_status').get('name'))
        self.label = feature.get('workflow_kind', {}).get('name', DEFAULT_LABEL)
        self.summary = str(feature.get('name'))
        self.release_note = next(
            (f.get('value') for f in feature.get('custom_fields', []) if f.get('key') == AHA_RN_FIELD), None)
        self.desc = self.release_note if self.release_note else self.summary
        self.link = str(feature.get('url'))
        self.releases_tags = next(
            (f.get('value') for f in feature.get('custom_fields', []) if f.get('key') == 'releases'), [])

    def set_releases_tags(self, tags: list[str]):
        aha_client.query(
            url=f'api/v1/requirements/{self.key}',
            data={"feature": {"custom_fields": {"releases": tags}}},
            method='PUT',
        )


class JiraIssue(AhaFeature):
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

    def set_releases_tags(self, tags: list[str]):
        pass


TASK_CACHE = {}


def get_task(task_number: str, pr: int = None) -> AhaFeature or None:
    if task_number in TASK_CACHE.keys():
        return TASK_CACHE.get(task_number)
    try:
        task = JiraIssue(task_number, pr)
        TASK_CACHE[task_number] = task
        return task
    except Exception as e:
        print(f'Could not find Issue   {task_number} in Jira: {e}')
    try:
        task = AhaFeature(task_number, pr)
        TASK_CACHE[task_number] = task
        return task
    except Exception as e:
        print(f'Could not find Feature {task_number} in Aha!: {e}')
    try:
        task = AhaRequirement(task_number, pr)
        TASK_CACHE[task_number] = task
        return task
    except Exception as e:
        print(f'Could not find Requirement {task_number} in Aha!: {e}')
    return None


def get_aha_release(product: str, version: str):
    aha_releases = aha_client.query(f'api/v1/products/{product}/releases').get('releases', [])
    aha_sorted_releases = sorted(aha_releases, key=lambda x: x.get('name'), reverse=True)
    return next((e for e in aha_sorted_releases if version in e.get('name')), None)


def get_aha_release_features(release_num: str) -> list[AhaFeature]:
    features = aha_client.query(f'api/v1/releases/{release_num}/features').get('features', [])
    tasks = set()
    for feature in features:
        if task := get_task(feature.get('reference_num')):
            tasks.add(task)
    return list(tasks)


def get_aha_release_features_by_tag(tag: str) -> list[AhaFeature]:
    features = aha_client.paginate('api/v1/features', 'features', data={"tag": tag})
    tasks = set()
    for feature in features:
        if task := get_task(feature.get('reference_num')):
            tasks.add(task)
    return list(tasks)


def get_jira_release(project: str, version: str):
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


def get_github_release_tasks(commits) -> list[AhaFeature]:
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
                    print(f'Could no parse pr from "{message_first_line}": {str(e)}')
                if task := get_task(task_key, pr):
                    tasks.add(task)
                    if AHA_ADDITIONAL_RELEASES_TAG:
                        task.set_releases_tags(list(set(task.releases_tags + [AHA_ADDITIONAL_RELEASES_TAG])))
    return list(tasks)


def get_feature_flags() -> list[str]:
    result = []
    if LAUNCHDARKLY_SDK_KEY:
        response = requests.get(
            url="https://sdk.launchdarkly.com/sdk/latest-all",
            headers={
                "Authorization": LAUNCHDARKLY_SDK_KEY,
            },
            timeout=30,
        )
        for key, flag in response.json().get('flags', {}).items():
            if not flag.get('on'):
                result.append(
                    f'- [{key}]'
                    f'(https://app.launchdarkly.com/default/{LAUNCHDARKLY_ENVIRONMENT}/features/{key}/targeting)')
    return result


def missing_tasks(left: list[AhaFeature], right: list[AhaFeature]) -> list[AhaFeature]:
    r_keys = [x.key for x in right]
    missing = [task for task in left if task.key not in r_keys]
    missing_sorted = sorted(missing, key=lambda x: int(x.key.split('-')[-1]))
    return missing_sorted


def sort_task_by_label(tasks: list[AhaFeature]) -> dict[str, list[AhaFeature]]:
    result = {}
    for task in tasks:
        result[task.label] = result.get(task.label, []) + [task]
    return result


def render_tasks_md(tasks: list[AhaFeature]) -> list[str]:
    result = []
    for task in tasks:
        line = f'- {task.desc} [{task.key}]({task.link})'
        if task.pr:
            line += f' (#{task.pr})'
        result.append(line)
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
        jira_release,
        aha_release,
        sorted_release_tasks: dict[str, list[AhaFeature]],
        missing_in_gh: list[AhaFeature],
        missing_in_tracker: list[AhaFeature],
        missing_release_note_field: list[AhaFeature],
        turned_off_feature_flags: list[str],
) -> str:
    release_notes_lines = []

    for label, tasks in sorted(sorted_release_tasks.items(),
                               key=lambda x: LABEL_SORT.index(x[0]) if x[0] in LABEL_SORT else 100):
        release_notes_lines.extend(
            render_add_header_md(
                label,
                render_tasks_md(tasks)
            )
        )

    comment = []

    comment.append(f'Full Changelog: [{PREVIOUS_REF}...{RELEASE_VERSION}]({gh_release.diff_url})')
    comment.append(
        f'This changelog was updated in response to a push of {CURRENT_REF} [Workflow run]({WORKFLOW_RUN_LINK})')
    comment.append('')
    if jira_release:
        comment.append(
            f'[Jira Release {RELEASE_VERSION}]({JIRA_SERVER}/projects/{JIRA_PROJECT}/versions/'
            f'{jira_release.id}/tab/release-report-all-issues)')
    else:
        comment.append('Jira Release not found')
    if aha_release:
        comment.append(f'[Aha! Release {RELEASE_VERSION}]({aha_release.get("url", "")})')
    else:
        comment.append('Aha! Release not found')

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
                turned_off_feature_flags
            )
        )

    comment.append('')
    comment.append('**ALL LINES STARTING FROM QUOTE WILL BE IGNORED**')

    release_notes_lines.extend(
        render_add_quote_md(comment)
    )

    return '\n'.join(release_notes_lines)


def render_output_json(
        sorted_release_tasks: dict[str, list[AhaFeature]],
) -> dict:
    sorted_release_tasks_json = {}
    for label, tasks in sorted_release_tasks.items():
        sorted_release_tasks_json[label] = [t.__dict__() for t in tasks]
    result = {
        'sorted_release_tasks': sorted_release_tasks_json
    }
    return result


def main():
    gh_release = get_github_release(PREVIOUS_REF, CURRENT_REF)
    print(f"{gh_release.html_url}")
    print(f"Ahead by {gh_release.ahead_by}")
    print(f"Behind by {gh_release.behind_by}")
    print(f"Merge base commit: {gh_release.merge_base_commit}")
    print(f"Commits: {gh_release.commits}")
    gh_release_tasks = get_github_release_tasks(gh_release.commits)

    aha_release = None
    aha_release_features = []
    if AHA_FETCH_STRATEGY == 'PARKING_LOT':
        aha_release = get_aha_release(AHA_PRODUCT, RELEASE_VERSION)
        if aha_release:
            aha_release_features = get_aha_release_features(aha_release.get("reference_num", None))
            print(f"Aha! Release {aha_release.get('url', '')}")
        else:
            print("Aha! Release not found")
    else:
        if AHA_TAG:
            aha_release = {'url': f'{AHA_SERVER}/api/v1/features?tag={AHA_TAG.replace(" ", "%20")}'}
            aha_release_features = get_aha_release_features_by_tag(AHA_TAG)
        else:
            print("AHA TAG is not specified")

    jira_release = get_jira_release(JIRA_PROJECT, RELEASE_VERSION)
    jira_release_issues = []
    if jira_release:
        jira_release_issues = get_jira_release_issues(jira_release.projectId, jira_release.id)
        print(
            f"Jira Release {JIRA_SERVER}/projects/{JIRA_PROJECT}/versions/"
            f"{jira_release.id}/tab/release-report-all-issues]")
    else:
        print("Jira Release not found")

    tracker_release_tasks = jira_release_issues + aha_release_features

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
    turned_off_feature_flags = []
    try:
        turned_off_feature_flags = get_feature_flags()
    except Exception as e:
        print(f'Failed to fetch Feature Flags: {e}')

    output_md = render_output_md(
        gh_release,
        jira_release,
        aha_release,
        sorted_release_tasks,
        missing_in_gh,
        missing_in_tracker,
        missing_release_note_field,
        turned_off_feature_flags,
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
