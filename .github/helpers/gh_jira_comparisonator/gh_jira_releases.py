from github import Github
from jira import JIRA
import re
import os
import urllib.parse

RELEASE_VERSION = os.getenv("RELEASE_VERSION", "2.2.8").strip('\"')
CHANGELOG_SOURCE = os.getenv("CHANGELOG_SOURCE", "github").strip('\"')  # /tmp/changelog_md

JIRA_USERNAME = os.getenv("JIRA_USERNAME").strip('\"')  # in email format, e.g username@domain.com
JIRA_TOKEN = os.getenv("JIRA_TOKEN").strip('\"')  # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_SERVER = os.getenv("JIRA_SERVER", "https://heartex.atlassian.net").strip('\"')
JIRA_PROJECT = os.getenv("JIRA_PROJECT", "DEV").strip('\"')

GH_TOKEN = os.getenv("GH_TOKEN").strip('\"')  # https://github.com/settings/tokens/new
GH_REPO = os.getenv("GH_REPO", "heartexlabs/label-studio").strip('\"')

jira = JIRA(JIRA_SERVER, basic_auth=(JIRA_USERNAME, JIRA_TOKEN))

jira_release_issues = []
versions = jira.project_versions(project=JIRA_PROJECT)
sorted_versions = sorted(versions, key=lambda x: x.name, reverse=True)
jira_release = [v for v in sorted_versions if RELEASE_VERSION in v.name]
if len(jira_release) > 0:
    issues_in_release = jira.search_issues(
        f"project = {jira_release[0].projectId} AND fixVersion = {jira_release[0].id} ORDER BY priority DESC, key ASC")
    jira_release_issues.extend([entry.key for entry in issues_in_release])
    print(
        f">[JIRA: Release {RELEASE_VERSION}]({JIRA_SERVER}/projects/{JIRA_PROJECT}/versions/{jira_release[0].id}/tab/release-report-all-issues)")
else:
    print(f">Release not found in JIRA")

# print("Found in JIRA")
# print(f"{sorted(jira_release_issues)}\n")
release_changelog = ''
if CHANGELOG_SOURCE == 'github':
    G = Github(GH_TOKEN)
    repo = G.get_repo(GH_REPO)
    releases = repo.get_releases()
    for release in releases:
        if RELEASE_VERSION in release.tag_name:
            release_changelog = release.body
else:
    with open(CHANGELOG_SOURCE, 'r') as f:
        release_changelog = f.read()

gh_release_issues = []
if release_changelog:
    for line in release_changelog.split("\n"):
        if line.startswith("* ") or line.startswith("- "):
            line_search = re.findall(r"[a-zA-Z]+-\d+", line)
            gh_release_issues.extend(line_search)
else:
    print(f">Release not found in GitHub")
    exit()
if len(gh_release_issues) > 0:
    print(
        f">[JIRA: JQL for tasks found in changelog]({JIRA_SERVER}/issues/?jql=key%20in%20({urllib.parse.quote(','.join(gh_release_issues))}))")

# flatten_gh_release_issues = sorted([val for sublist in set(gh_release_issues) for val in sublist])
# print("Found in GitHub")
# print(f"{gh_release_issues}\n")

if len(jira_release_issues) > 0:
    missing_in_gh = sorted([task for task in jira_release_issues if task not in gh_release_issues],
                           key=lambda x: int(x.split('-')[1]))
    missing_in_gh_formatted = list(
        map(lambda task: "[" + task + "](" + JIRA_SERVER + "/browse/" + task + "): " + jira.issue(task).raw['fields'][
            'summary'], missing_in_gh))
    missing_in_gh_length = len(missing_in_gh)

    if missing_in_gh_length > 0:
        print("><details>")
        print(f">  <summary>Missing in GitHub release({missing_in_gh_length})</summary>")
        print(">")
        ready_list = "\n> - ".join(missing_in_gh_formatted)
        print(f"> - {ready_list}")
        print(">")
        print("></details>")
    else:
        print(f">GitHub release is in sync with JIRA release.")
