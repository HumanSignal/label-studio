const OBJECTS = {
  Image: {
    type: 'Image',
    settings: {
      strokeWidth: {
        title: 'Width of region borders',
        type: Number,
        param: ($obj, value) => $obj.$controls.forEach($control => $control.setAttribute('strokeWidth', value)),
        value: $obj => $obj.$controls[0]?.getAttribute('strokeWidth') ?? 3,
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
        value: $obj => $obj.getAttribute('granularity') === 'word',
        when: $obj => $obj.$controls.filter(c => c.tagName.endsWith('Labels')).length > 0,
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
  Table: {
    type: 'Table',
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
        let $labels = $control;
        if ($container.firstChild?.tagName?.toUpperCase() === "FILTER") {
          $labels = $container;
          $container = $labels.parentNode;
        }
        const $obj = $control.$object;
        const inline = ["top", "bottom"].includes(value);
        const reversed = ["top", "left"].includes(value);
        const direction = (inline ? "column" : "row") + (reversed ? "-reverse" : "");
        const alreadyApplied = $container.getAttribute("style")?.includes("flex");
        if (!alreadyApplied) {
          $container = $obj.ownerDocument.createElement('View');
          $labels.parentNode.insertBefore($container, $obj);
          $container.appendChild($obj);
          $container.appendChild($labels);
        }
        $control.setAttribute('showInline', JSON.stringify(inline));
        $container.setAttribute('style', 'display:flex;align-items:start;gap:8px;flex-direction:' + direction);
      },
      value: $control => {
        let $container = $control.parentNode;
        if ($container.firstChild?.tagName?.toUpperCase() === "FILTER") {
          $container = $container.parentNode;
        }
        const style = $container.getAttribute("style");
        const direction = style?.match(/direction:(row|column)(-reverse)?/);
        if (!direction) {
          const position = $control.compareDocumentPosition($control.$object);
          return position & Node.DOCUMENT_POSITION_FOLLOWING ? "top" : "bottom";
        }
        if (direction[1] === "column") return direction[2] ? "top" : "bottom";
        else return direction[2] ? "left" : "right";
      },
    },
    filter: {
      title: 'Add filter for long list of labels',
      type: Boolean,
      control: true,
      param: ($obj, value) => {
        if (value) {
          const $filter = $obj.ownerDocument.createElement('Filter');
          const $container = $obj.ownerDocument.createElement('View');
          $filter.setAttribute('toName', $obj.getAttribute('name'));
          $filter.setAttribute('minlength', 0);
          $filter.setAttribute('name', 'filter'); // @todo should be unique
          $obj.parentNode.insertBefore($container, $obj);
          $container.appendChild($filter);
          $container.appendChild($obj);
        } else {
          const $filter = $obj.previousElementSibling;
          if ($filter.tagName.toUpperCase() === "FILTER") {
            const $container = $obj.parentNode;
            $container.parentNode.insertBefore($obj, $container);
            $container.parentNode.removeChild($container);
          }
        }
      },
      value: $control => $control.previousElementSibling?.tagName.toUpperCase() === "FILTER",
    },
  },
};

const CONTROLS = {
  Labels,
  RectangleLabels: Labels,
};

const TAGS = { ...OBJECTS, ...CONTROLS };

export { OBJECTS, CONTROLS, TAGS };
