const OBJECTS = {
  Image: {
    type: 'Image',
    settings: {
      strokeWidth: {
        title: 'Width of region borders',
        type: Number,
        param: ($obj, value) => $obj.$controls.forEach($control => $control.setAttribute('strokeWidth', value)),
      },
      zoom: {
        title: 'Allow image zoom (ctrl+wheel)',
        type: Boolean,
        param: 'zoom',
      },
      zoomControl: {
        title: 'Show controls to zoom in and out',
        type: Boolean,
        param: 'zoomControl',
      },
      rotateControl: {
        title: 'Show controls to rotate image',
        type: Boolean,
        param: 'rotateControl',
      },
    },
  },
  Text: {
    type: 'Text',
    settings: {
      granularity: {
        title: 'Select text by words',
        type: Boolean,
        param: ($obj, value) => value ? $obj.setAttribute('granularity', 'word') : $obj.removeAttribute('granularity'),
      },
    },
  },
  HyperText: {
    type: 'HyperText',
  },
  Audio: {
    type: 'Audio',
  },
  AudioPlus: {
    type: 'AudioPlus',
  },
  TimeSeries: {
    type: 'TimeSeries',
  },
  Paragraphs: {
    type: 'Paragraphs',
  },
};

const Labels = {
  type: 'Labels',
  settings: {
    placeLabelsLeft: {
      title: 'Display labels:',
      type: ["bottom", "left", "right", "top"],
      control: true,
      param: ($control, value) => {
        let $container = $control.parentNode;
        const $obj = $control.$object;
        const inline = ["top", "bottom"].includes(value);
        const reversed = ["top", "left"].includes(value);
        const direction = (inline ? "column" : "row") + (reversed ? "-reverse" : "");
        const alreadyApplied = $container.getAttribute("style")?.includes("flex");
        if (!alreadyApplied) {
          $container = $obj.ownerDocument.createElement('View');
          $obj.parentNode.insertBefore($container, $obj);
          $container.appendChild($obj);
          $container.appendChild($control);
        }
        $control.setAttribute('showInline', JSON.stringify(inline));
        $container.setAttribute('style', 'display:flex;align-items:start;gap:8px;flex-direction:' + direction);
      },
    },
    filter: {
      title: 'Add filter for long list of labels',
      type: Boolean,
      control: true,
      param: ($obj, value) => {
        if (value) {
          const $filter = $obj.ownerDocument.createElement('Filter');
          $filter.setAttribute('toName', $obj.getAttribute('name'));
          $filter.setAttribute('minlength', 0);
          $filter.setAttribute('name', 'filter'); // @todo should be unique
          $obj.parentNode.insertBefore($filter, $obj);
        } else {
          const $filter = $obj.previousElementSibling;
          if ($filter.tagName.toUpperCase() === "FILTER") $obj.parentNode.removeChild($filter);
        }
      },
    },
  },
};

const CONTROLS = {
  Labels,
  RectangleLabels: Labels,
};

const TAGS = { ...OBJECTS, ...CONTROLS };

export { OBJECTS, CONTROLS, TAGS };
