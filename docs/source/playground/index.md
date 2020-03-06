---
type: playground
order: 201
---
{% raw %}

<style>
  .content {
     max-width: none !important;
     margin-left: 0 !important;
     padding: 1em 0 0 0;
  }
  
  .validation {
     margin-top: 1em;
     margin-left: 1em;
     color: red;
     text-transform: capitalize;
  }
  
  .CodeMirror {
     min-height: 500px !important;
  }
  
  h1 {
    margin-bottom: 0.5em !important;
  }
  
  h3 {
    margin: 1em !important;
    width: unset;
    height: unset;
  }
  
  iframe {
     border: 0;
     margin: 0 !important;
  }
  
  #render-editor {
     width: 100%;
  }
  
  #editor-wrap {
     background-color: rgb(252,252,252);
     padding: 0;
     margin: 0;
     display: none;
  }
  
  .preview {
     padding: 5px;
     overflow: auto;
  }
 
  .editor-row {
      display: flex; 
      margin-bottom: 1em; 
      width: 100% !important;
  }
  
   .data-row {
      display: flex;
   }
   
  .preview-col {
      width: 60%; 
      flex: 1; 
      background: rgb(252,252,252);
   }
  
  .editor-area {
      border: 1px solid #f48a4259;
  }
   
  .config-col {
      color: rgba(0,0,0,.6); 
      background: rgb(252,252,252); 
      margin-right: 2em; 
      width: 40%; 
  }
  
  .input-col {
      width: 49%;
      margin-right: 2%;
  }
  
  .output-col {
      width: 49%;
  }
  .hidden {
      display: none !important;
  }
  
  .message {
    width: 90%;
    max-width: 1000px;
    margin: 1em auto 3em auto;    
  } 
  .grid { 
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: horizontal;
    -webkit-box-direction: normal;
        -ms-flex-direction: row;
            flex-direction: row;
    -ms-flex-wrap: wrap;
        flex-wrap: wrap;
    -webkit-box-align: stretch;
        -ms-flex-align: stretch;
            align-items: stretch;
    padding: 0;
  }
  
  .column {
    width: 20% !important;
  }
  .use-template {
    font-weight: normal!important;
  }
  .use-template:hover {
    border-bottom: 1px dashed darkorange;
  }
  
  
  
  @font-face {
    font-family: 'Icons';
    src: url("/fonts/icons.eot");
    src: url("/fonts/icons.eot?#iefix") format('embedded-opentype'), url("/fonts/icons.woff2") format('woff2'), url("/fonts/icons.woff") format('woff'), url("/fonts/icons.ttf") format('truetype'), url("/fonts/icons.svg#icons") format('svg');
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-decoration: inherit;
    text-transform: none;
  }
  i.icon {
    opacity: 0.75 !important;
    display: inline-block;
    opacity: 1;
    margin: 0 0.25rem 0 0;
    width: 1.18em;
    height: 1em;
    font-family: 'Icons';
    font-style: normal;
    font-weight: normal;
    text-decoration: inherit;
    text-align: center;
    speak: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
  }
  i.icon:before {
    background: none !important;
  }

  i.icon.sound:before {
    content: "\f025";
  }
  i.icon.image:before {
    content: "\f03e";
  }
  i.icon.code:before {
    content: "\f121";
  }
  i.icon.font:before {
    content: "\f031";
  }
  i.icon.video:before {
    content: "\f03d";
  }
  
  .intro { 
    max-width: 700px; 
    margin: 0 auto;  
    margin-top: 1.5em;
  }

@media screen and (max-width: 900px) {
@media only screen and (max-width: 767.98px) {
    .intro {
      padding-left: 0;
    }
    .grid {
      width: auto;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .column {
      width: 100% !important;
      margin: 0 0 !important;
      -webkit-box-shadow: none !important;
              box-shadow: none !important;
      padding: 1rem 1rem !important;
    }

    .editor-row {
        flex-direction: column;
    }
    .data-row {
        flex-direction: column;
    }
    .preview-col {
        width: 100%;
    }
    .config-col {
        width: 100%;
    }
    .input-col, .output-col { 
        width: 100%; 
    }
}
</style>



<!-- html -->

<div class="intro">
    <h1>Playground</h1>
    Start typing in the config, and you can quickly preview the labeling interface. At the bottom of the page, you have live serialization updates of what Label Studio expects as an input and what it gives you as a result of your labeling work.
</div>


<!-- Templates -->
<div class="message">
  <div class="content" style="margin-top: 0">
    <!-- Templates categories -->
    <div class="ui grid stackable">

      <div class="three wide column category">
        <i class="icon sound"></i>
        <!-- Template -->
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="11">Audio classifier</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="8">Audio segmentation</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="0">Audio transcription</a>
        </div>
      </div>

      <div class="three wide column category">
        <i class="icon image"></i>
        <!-- Template -->
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="6">Image bounding boxes</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="13">Image classifier</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="14">Image keypoints and landmarks</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="1">Image mixed labeling</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="5">Image polygon labeling</a>
        </div>
      </div>

      <div class="three wide column category">
        <i class="icon code"></i>
        <!-- Template -->
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="2">Conversational analysis</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="3">HTML NER tagging</a>
        </div>
      </div>

      <div class="three wide column category">
        <i class="icon font"></i>
        <!-- Template -->
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="9">Named entity recognition</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="4">Text classifier</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="12">Text pairwise labeling</a>
        </div>
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="10">Text references</a>
        </div>
      </div>

      <div class="three wide column category">
        <i class="icon video"></i>
        <!-- Template -->
        <div class="ui item">
          <a class="use-template no-go" href="#" data-value="7">Video classifier</a>
        </div>
      </div>

    </div>
  </div>
</div>








<div>
  <div class="editor-row">
    <div class="config-col">
      <h3>Label config</h3>
      <div class="editor-area">
      <!-- Textarea -->
      <textarea name="label_config" cols="40" rows="10" class="project-form htx-html-editor"
                id="id_label_config"></textarea>
      </div>
    </div>
    <div class="preview-col">
      <h3>Interface preview</h3>
      <div class="validation"></div>
      <div id="editor-wrap">   
      </div>
      <div class="preview" id="preload-editor">
        <div class="loading" style="margin: 20px; opacity: 0.8">
            <img width="40px" src="/images/loading.gif">
            <span style="position: relative; top: -14px">&nbsp;&nbsp;&nbsp;Loading Label Studio, please wait ...</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Preview in two cols -->
<div class="data-row">
  <div class="input-col">
    <h3>Input preview</h3>
    <div>
      <pre class="preview" id="upload-data-example">...</pre>
    </div>
  </div>
  <div class="output-col">
    <h3>Output preview</h3>
    <div class="ui positive message">
      <pre class="preview" id="data-results">...</pre>
    </div>
  </div>
</div>

</div>









<!-- Hidden template codes -->
<empty>
      
  <!-- Starting template -->
  <script id="start-template" type="text"><View>
           
  <!-- Image with Polygons -->
  <View style="padding: 25px; 
               box-shadow: 2px 2px 8px #AAA">
    <Header value="Label the image with polygons"/>
    <Image name="img" value="$image"/>
    <Text name="text1" 
          value="Select label, start to click on image"/>
          
    <PolygonLabels name="tag" toName="img">
      <Label value="Airbus" background="blue"/>
      <Label value="Boeing" background="red"/>  
    </PolygonLabels>
  </View>
  
  <!-- Text with multi-choices -->
  <View style="margin-top: 20px; padding: 25px; 
               box-shadow: 2px 2px 8px #AAA;">
    <Header value="Classify the text"/>
    <Text name="text2" value="$text"/>
    
    <Choices name="" toName="img" choice="multiple">
      <Choice alias="wisdom" value="Wisdom"/>
      <Choice alias="long" value="Long"/>
    </Choices>
  </View>
  
  </View>
  </script>
  
  
  <script data-template-pk="11" type="text"><View>
    <Header value="Listen to the audio"/>
    <Audio name="audio" value="$url"/>
    <Header value="Select its topic"/>
    <Choices name="label" toName="audio"
             choice="single-radio" showInline="true">
      <Choice value="Politics"/>
      <Choice value="Business"/>
      <Choice value="Education"/>
      <Choice value="Other"/>
    </Choices>
  </View>
  </script>
        
          
  <script data-template-pk="8" type="text"><View>
    <Header value="Select genre"/>
    <Choices name="choice" toName="audio" choice="multiple">
      <Choice value="Lo-Fi" />
      <Choice value="Rock" />
      <Choice value="Pop" />
    </Choices>
  
    <Header value="Select regions"/>
    <Labels name="label" toName="audio" choice="multiple">
      <Label value="Beat" background="gray"/>
      <Label value="Voice" background="red"/>
      <Label value="Guitar" background="blue"/>
      <Label value="Other"/>
    </Labels>
  
    <Header value="Listen the audio"/>
    <AudioPlus name="audio" value="$url"/>
  </View>
  </script>
        
          
  <script data-template-pk="0" type="text"><View>
    <Header value="Listen the audio"/>
    <Audio name="audio" value="$url"/>
    <View style="margin-top: 3em">
      <Header value="Write the transcription and press enter"/>
      <TextArea name="answer"/>
    </View>
  </View>
  </script>
          
          
  <script data-template-pk="6" type="text"><View>
    <Image name="img" value="$image"/>
    <RectangleLabels name="tag" toName="img">
      <Label value="Airplane" background="green"/>
      <Label value="Car" background="blue"/>
    </RectangleLabels>
  </View></script>
  
  
  <script data-template-pk="13" type="text"><View>
    <Image name="img" value="$image_url"/>
    <Choices name="choice" toName="img" showInLine="true">
      <Choice value="Boeing" background="blue"/>
      <Choice value="Airbus" background="green" />
    </Choices>
  </View>
  </script>
          
          
  <script data-template-pk="14" type="text"><View>
    <Image name="img" value="$image" zoom="true"/>
    <Header>Select label then click on image</Header>
    <KeyPointLabels name="tag" toName="img"
                    strokewidth="5" fillcolor="red">
      <Label value="Engine" background="red"/>
      <Label value="Tail" background="rgba(0, 255, 0, 0.9)"/>
    </KeyPointLabels>
  </View>
  </script>
          
         
  <script data-template-pk="1" type="text"><View>
  
    <!-- Image with bounding boxes -->
    <View style="padding: 25px;
               box-shadow: 2px 2px 8px #AAA">
      <Header value="Label the image with bounding boxes"/>
      <Image name="img" value="$image"/>
      <Text name="text1"
            value="Select label, click and drag on image"/>
  
      <RectangleLabels name="tag" toName="img"
                       canRotate="false">
        <Label value="Airplane" background="red"/>
        <Label value="Car" background="blue"/>
      </RectangleLabels>
    </View>
  
    <!-- Image with single choice -->
    <View style="margin-top: 20px; padding: 25px;
               box-shadow: 2px 2px 8px #AAA;">
      <Header value="Do you like this image?"/>
  
      <Choices name="choices1" toName="img"
               choice="single">
        <Choice alias="yes" value="Yes"/>
        <Choice alias="no" value="No"/>
        <Choice alias="unknown" value="Don't know"/>
      </Choices>
    </View>
  
    <!-- Text with multi-choices -->
    <View style="margin-top: 20px; padding: 25px;
               box-shadow: 2px 2px 8px #AAA;">
      <Header value="Classify the text"/>
      <Text name="text2" value="$text"/>
  
      <Choices name="choices2" toName="text2"
               choice="multiple">
        <Choice alias="wisdom" value="Wisdom"/>
        <Choice alias="long" value="Long"/>
      </Choices>
    </View>
  
  </View>
  </script>
          
        
  <script data-template-pk="5" type="text"><View>
    <Header value="Select label and start to click on image"/>
  
    <Image name="img" value="$image"/>
  
    <PolygonLabels name="tag" toName="img" strokewidth="5">
      <Label value="Airplane" background="red"/>
      <Label value="Car" background="blue"/>
    </PolygonLabels>
  </View>
  </script>
  
  
  <script data-template-pk="2" type="text"><View>
    <HyperText name="dialog" value="$dialogs"/>
  
    <Header value="Rate last answer"/>
    <Choices name="chc-1" choice="single-radio" toName="dialog" showInline="true">
      <Choice value="Bad answer"/>
      <Choice value="Neutral answer"/>
      <Choice value="Good answer"/>
    </Choices>
  
    <Header value="Write your answer and press Enter"/>
    <TextArea name="answer"/>
  </View>
  </script>
  
  
  <script data-template-pk="3" type="text"><View>
    <HyperTextLabels name="ner" toName="text">
      <Label value="Person" background="green"/>
      <Label value="Organization" background="blue"/>
    </HyperTextLabels>
  
    <View style="border: 1px solid #CCC;
                 border-radius: 10px;
                 padding: 5px">
      <HyperText name="text" value="$text"/>
    </View>
  </View>
  </script>
  
  
  <script data-template-pk="9" type="text"><View>
    <Labels name="ner" toName="text">
      <Label value="Person" background="red"/>
      <Label value="Organization" background="darkorange"/>
      <Label value="Fact" background="orange"/>
      <Label value="Money" background="green"/>
      <Label value="Date" background="darkblue"/>
      <Label value="Time" background="blue"/>
      <Label value="Ordinal" background="purple"/>
      <Label value="Percent" background="#842"/>
      <Label value="Product" background="#428"/>
      <Label value="Language" background="#482"/>
      <Label value="Location" background="rgba(0,0,0,0.8)"/>
    </Labels>
    <Text name="text" value="$text"/>
  </View>
  </script>
          
  
  <script data-template-pk="4" type="text"><View>
    <Text name="my_text" value="$reviewText"/>
    <View style="box-shadow: 2px 2px 5px #999;
                 padding: 20px; margin-top: 2em;
                 border-radius: 5px;">
      <Header value="Choose text sentiment"/>
      <Choices name="sentiment" toName="my_text"
               choice="single" showInLine="true">
        <Choice value="Positive"/>
        <Choice value="Negative"/>
        <Choice value="Neutral"/>
      </Choices>
    </View>
  </View>
  </script>
          
  
  <script data-template-pk="12" type="text"><View>
    <Header>Select one of two items</Header>
    <Pairwise name="pw" toName="txt-1,txt-2"/>
    <Text name="txt-1" value="$text1" />
    <Text name="txt-2" value="$text2" />
  </View>
  </script>
          
  
  <script data-template-pk="10" type="text"><View>
    <Header>Are there any missing words?</Header>
    <Text name="text" value="$text"/>
    <Choices name="validation-label" toName="text"
             choice="single-radio">
      <Choice value="Missing words" alias="missing-words"/>
      <Choice value="Valid" alias="valid"/>
    </Choices>
  </View>
  </script>
          
        
  <script data-template-pk="7" type="text"><View>
    <Choices name="type" toName="video" choice="single-radio">
      <Choice value="Awesome"/>
      <Choice value="Groove"/>
    </Choices>
    <HyperText name="video" value="$video"/>
  </View></script>

</empty>







<script>
  var confirm_already_shown = true; 
  
  $(function () {

    function addTemplateConfig($el) {
      var template_pk = $el.data('value');
      var value = $('[data-template-pk="' + template_pk + '"]').html();

      labelEditor.setValue(value);
    }

    $('.use-template').on('click', function () {
      var $el = $(this);

      if (labelEditor.getValue() !== '' && !confirm_already_shown) {
        var dialog = $('#confirm-config-template-dialog');
        dialog.modal({
          closable: true,
          keyboardShortcuts: true,
          onApprove: function () {
            addTemplateConfig($el);
          }
        }).modal('show');

        // close on enter, unfortunately keyboardShortcuts doesn't work
        dialog.on('keypress', function () {
          if (event.keyCode === 13) {
            dialog.modal('hide');
            addTemplateConfig($el);
          }
        });

        confirm_already_shown = true;

      } else {
        addTemplateConfig($el);
      }

      return false;
    });

    var iframeTimer = null;

    function debounce(func, wait, immediate) {
      let timeout;

      return function () {
        const context = this, args = arguments;
        const later = () => {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }

    var prev_completion = null;

    // serialize editor output by timer
    setInterval(function () {
      let iframe = document.getElementById('render-editor');
      if (iframe !== null) {
        let Htx = iframe.contentWindow.Htx;
        if (typeof Htx !== 'undefined') {
          var completion = JSON.stringify(Htx.completionStore.selected.serializeCompletion(), null, 4);
          if (prev_completion !== completion) {
            $('#data-results').text(completion);
            prev_completion = completion;
          }
        }
      }
    }, 500);


    var host = "https://go.heartex.net";
    var url_string = window.location.href;
    var url = new URL(url_string);

    // Label code mirror
    let labelEditor = CodeMirror.fromTextArea(document.getElementById('id_label_config'), {
      lineNumbers: true,
      mode: "text/html",
    });

    var _c = url.searchParams.get("config");
    if (_c && _c.length > 0) {
      var config = url.searchParams.get("config");
      config = config.replace(/[<][b][r][>]/gm, "\n");
      labelEditor.setValue(config);
    } else {
      labelEditor.setValue($('#start-template').html());
    }
    validate_config(labelEditor);

    // refresh for proper line numbers drawing
    labelEditor.refresh();
    // add validation
    labelEditor.on('change', debounce(function (editor) {
      validate_config(editor);
    }, 500));

    window.labelEditor = labelEditor;

    function validate_name() {
      let name = $('#id_title').val();
      validation_message('', 0);
      return 0;
    }

    function validation_message(msg, status) {
      let o = $('.validation');
      o.text(msg);

      if (status === -1) {
        o.removeClass('hidden');
        o.addClass('visible');
      }
      if (status === 0) {
        o.removeClass('visible');
        o.addClass('hidden');
      }
    }

    // storage of validation results
    // let is_collection_ok = false;
    let is_label_ok = false;

    function editor_iframe(res) {
      // generate new iframe
      let iframe = $('<iframe><iframe>');
      iframe.className = "editor-preview";
      // add iframe to wrapper div
      $('#editor-wrap').html(iframe);
      $('#editor-wrap').fadeIn();

      iframe.on('load', function () {
        // remove old iframe
        $('#render-editor').hide();
        $('#render-editor').remove();
        // assign id to new iframe
        iframe.attr('id', 'render-editor');
        // force to hide undo / redo / reset buttons
        $('#render-editor').contents().find('head').append('<style>.ls-panel{display:none;}</style>');
        iframe.show();
        let obj = document.getElementById('render-editor');

        // wait until all images and resources from iframe loading
        clearTimeout(iframeTimer);
        iframeTimer = setInterval(function () {
          obj.style.height = (obj.contentWindow.document.body.scrollHeight) + 'px';
        }, 500);
        // hide "..."
        $('#preload-editor').hide();
      });

      // load new data into iframe
      iframe.attr('srcdoc', res);
    }

    function show_render_editor(editor) {
      let config = labelEditor.getValue();
      $.ajax({
        url: host + '/demo/render-editor?full_editor=t&config=' + encodeURIComponent(config),
        method: 'GET',
        success: editor_iframe,
        error: function () {
          $('#preload-editor').show();
        }
      })
    }

    // send request to server with configs to validate
    function validate_config(editor) {

      // get current scheme type from current editor
      let url = host + '/api/projects/validate/';
      var val = labelEditor.getValue();

      if (!val.length)
        return;

      // label config validation
      $.ajax({
        url: url,
        method: 'POST',
        data: {label_config: val},
        success: function (res) {
          is_label_ok = true;
          validation_message('', 0);
          $('#render-editor').show();
          show_render_editor(editor);
          // check_submit_button();
        },
        error: function (res) {
          is_label_ok = false;
          validation_message(res.responseJSON['label_config'][0], -1);
          $('#render-editor').hide();
          // check_submit_button();
        }
      });

      // load sample task
      $.get({
        url: host + '/business/projects/upload-example/',
        data: {label_config: val}
      })
        .fail(o => {
          $('#upload-data-example').text('...')
        })
        .done(o => {
          $('#upload-data-example').text(JSON.stringify(JSON.parse(o), null, 4))
        })
    }

  });
</script>






<!-- end html -->

{% endraw %}
