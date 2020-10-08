function copiedToClipboardMsg() {
    $('body').toast({
        class: 'orange center',
        message: '<center>Copied to clipboard!</center>',
        position: 'bottom center'
    });
}

var imageWithFadeIn = Vue.component('imageWithFadeIn', {props: ['src'],
    data: function () {
        return {
            loaded: false,
            initial_path: ''
        }
    },
    methods: {
        onLoaded: function () {
            this.loaded = true;
        },
        renderTippyImage: function(path) {
          return "<div style='cursor:pointer' " +
              "z-inder='1000' class='full-preview-wrapper'><center>" +

            "<div onclick='copyToClipboard(\""+ path +"\"); copiedToClipboardMsg();'>" +
                "<img src='" + this.initial_path + "' class='full-preview-image'><br/>" +
                "<span style='word-break: break-word'>" + path + "</span><br/>" +
                "click to copy" +
            "</div>" +
            "</center></div>"
        },
        updateInitialPath: function () {
            // save initial path to show in tippy
            if (this.src && this.initial_path.split('?')[0] !== this.src.split('?')[0]) {
                this.initial_path = this.src;
            }
        }
    },
    mounted: function() {
        this.updateInitialPath();
    },
    watch: {
        src: function (value, old) {
            this.updateInitialPath();

            // prevent updates when s3 or gsc regenerate new link to images
            if (value && old && value.split('?')[0] === old.split('?')[0]) {
                return;
            }
            this.loaded = false;
        }
    },
    template:
        '<transition name="fade">' +
        '<img v-bind:src="src" ' +
            '@click.stop.prevent ' +
            'class="preview-image" ' +
            'v-show="loaded" ' +
            'v-on:load="onLoaded()" ' +
            ':content="renderTippyImage(src)" ' +
            'v-tippy="{trigger: \'click\', duration: 0, allowHTML: true, delay: 0, maxWidth: 700, interactive: true}" ' +
        '>'+
        '</transition>'
});