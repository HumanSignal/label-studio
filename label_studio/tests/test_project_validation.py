"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest

from django.urls import reverse


@pytest.mark.parametrize('label_config, status_code', [
    ('''<View>
      <Text name="meta_info" value="$meta_info "></Text>
      <Text name="text" value="$text"></Text>
      <Choices name="text_class" choice="single" toName="text">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
      </Choices>
    </View>''', 204),
    ('''<View>
      <Text name="text" value="$text"></Text>
      <Choices name="text_class" choice="single" toName="text">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
      </Choices>
    </View>''', 204),
    ('''<View>
      <TextEditor>
        <Text name="meta_info" value="$meta_info"></Text>
        <Text name="text" value="$text"></Text>
        <Choices name="text_class" choice="single" toName="text">
          <Choice value="class_A"></Choice>
          <Choice value="class_B"></Choice>
        </Choices>
      </TextEditor>
    </View>''', 204),
    ('''<<< <<< View>
      <TextEditor <<< << >
        <Text name="meta_info" value="$meta_info"></Text <<< >
        <Text name="text" value="$text"></Text>
        <Choices name="text_class" choice="single">
          <Choice value="class_A"></Choice>
          <<<<< <C <<<< h oice value="class_B" " " -></ Choices /BUG /ERROR> >>>>>>>>
        </Choices>
      </TextEditor>
    </View>''', 400),
    ('some shit', 400),
    ('''
    <View>
     <Text name="text-1" value="Hello world"></Text>
     <Labels name="labels-1">
       <Label value="Hello"></Label>
       <Label value="World"></Label>
     </Labels>
    </View>
    ''', 400),
    ('''
    <View>
     <Text name="text-1" value="Hello world"></Text>
     <Labels name="labels-1" toName="text-1">
       <Label value="Hello"></Label>
       <Label value="World"></Label>
     </Labels>
    </View>
    ''', 204),
    # non-existent toName
    ('''
    <View>
     <Text name="text-1" value="Hello world"></Text>
     <Labels name="labels-1" toName="__weird__">
       <Label value="Hello"></Label>
       <Label value="World"></Label>
     </Labels>
    </View>
    ''', 400),
    # toName points to tag (rect-1) without sources
    ('''<View>
      <Labels name="tag" toName="rect-1">
        <Label value="Cat"></Label>
        <Label value="Dog" background="blue"></Label>
      </Labels>
      <AddRectangleButton name="rect-1" toName="image"></AddRectangleButton>
      <Image name="image" value="$image_url"></Image>
    </View>''', 204),

    # <View> within control tags
    ('''
        <View>
  <Choices name="label" toName="audio" required="true" choice="multiple" >
    <View style="display: flex; flex-direction: row; background-color: #f1f1f1; padding-left: 2em; padding-right: 2em">
      <View style="margin-right: 4em">
        <Header size="4" value="Speaker Gender" />
        <Choice value="Business" />
        <Choice value="Politics" />
      </View>
      <View style="margin-right: 4em">
        <Header size="4" value="Speach Type" />
        <Choice value="Legible" />
        <Choice value="Slurred" />
      </View>
      <View>
        <Header size="4" value="Additional" />
        <Choice value="Echo" />
        <Choice value="Noises" />
        <Choice value="Music" />
      </View>
    </View>
  </Choices>
  <Audio name="audio" value="$url" />
  </View>
    ''', 204)
])
@pytest.mark.django_db
def test_validate_label_config(business_client, label_config, status_code):
    r = business_client.post(
        reverse('projects:api:label-config-validate'), data={'label_config': label_config}, content_type='application/json')
    assert r.status_code == status_code
