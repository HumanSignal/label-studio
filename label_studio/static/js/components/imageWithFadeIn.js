var imageWithFadeIn = Vue.component('imageWithFadeIn', {props: ['src'],
    data: function () {
        return {loaded: false}
    },
    methods: {
        onLoaded: function () {
            this.loaded = true;
        },
        renderPreviewImage: function(path) {
          return "<div style='cursor:pointer' " +
              "z-inder='1000' class='full-preview-wrapper'><center>" +

            "<div onclick='copyToClipboard(\""+ path +"\");'>" +
                "<img src='" + path + "' class='full-preview-image'><br/>" +
                "<span>" + path + "</span><br/>" +
                "click to copy" +
            "</div>" +
            "</center></div>"
        }
    },
    watch: {
        src: function () {
            this.loaded = false;
        }
    },
    template:
        '<transition name="fade">' +
        '<img v-bind:src="src" ' +
            'class="preview-image" ' +
            'v-show="loaded" ' +
            'v-on:load="onLoaded()" ' +
            ':content="renderPreviewImage(src)" ' +
            'v-tippy="{trigger: \'click\', duration: 0, allowHTML: true, delay: 0, maxWidth: 700, interactive: true}" ' +
        '>'+
        '</transition>'
});