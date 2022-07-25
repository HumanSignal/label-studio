"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import pytest
from data_import.models import FileUpload
from django.conf import settings

@pytest.mark.django_db
def test_svg_upload_sanitize(setup_project_dialog):
    """ Upload malicious SVG file - remove harmful content"""
    settings.SVG_SECURITY_CLEANUP = True

    xml_dirty = """<?xml version="1.0" standalone="no"?>
                <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
                <svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
                <polygon id="triangle" points="0,0 0,50 50,0" fill="#009900" stroke="#004400"/>
                <script type="text/javascript">alert(document.cookie);</script>
                </svg>"""

    f = io.StringIO(xml_dirty)

    endpoint = f'/api/projects/{setup_project_dialog.project.id}/import?commit_to_project=true'
    r = setup_project_dialog.post(endpoint, {'xss_svg.svg': f})

    assert r.status_code == 201

    expected = '''<svg version="1.1" baseprofile="full" xmlns="http://www.w3.org/2000/svg">
    <polygon id="triangle" points="0,0 0,50 50,0" fill="#009900" stroke="#004400"></polygon>\n
    </svg>\n'''

    actual = FileUpload.objects.filter(
            id=r.data['file_upload_ids'][0]).last().file.read()

    assert len("".join(actual.decode('UTF-8').split())) > 100 # confirm not empty

    assert "".join(expected.split()) == "".join(actual.decode('UTF-8').split())


@pytest.mark.django_db
def test_svg_upload_invalid_format(setup_project_dialog):
    """ Upload invalid SVG file - still accepted"""
    settings.SVG_SECURITY_CLEANUP = True

    xml_dirty = """<?xml version="1.0" standalone="no"?>
                <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
                <svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">gibberish</svg>"""
    f = io.StringIO(xml_dirty)

    endpoint = f'/api/projects/{setup_project_dialog.project.id}/import?commit_to_project=true'
    r = setup_project_dialog.post(endpoint, {'xss_svg.svg': f})

    assert r.status_code == 201

    expected = '''
    <svgversion="1.1"baseprofile="full"xmlns="http://www.w3.org/2000/svg">gibberish</svg>
    '''

    actual = FileUpload.objects.filter(
            id=r.data['file_upload_ids'][0]).last().file.read()

    assert "".join(expected.split()) == "".join(actual.decode('UTF-8').split())


@pytest.mark.django_db
def test_svg_upload_do_not_sanitize(setup_project_dialog):
    """ Upload SVG file - do not sanitize file content"""
    settings.SVG_SECURITY_CLEANUP = False

    xml_dirty = """<?xml version="1.0" standalone="no"?>
                <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
                <svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
                <polygon id="triangle" points="0,0 0,50 50,0" fill="#009900" stroke="#004400"/>
                <script type="text/javascript">alert(document.cookie);</script>
                </svg>"""

    f = io.StringIO(xml_dirty)

    endpoint = f'/api/projects/{setup_project_dialog.project.id}/import?commit_to_project=true'
    r = setup_project_dialog.post(endpoint, {'xss_svg.svg': f})

    assert r.status_code == 201

    actual = FileUpload.objects.filter(
            id=r.data['file_upload_ids'][0]).last().file.read()

    assert "".join(xml_dirty.split()) == "".join(actual.decode('UTF-8').replace("\n", "").split())
