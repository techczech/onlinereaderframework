import { defaultSchema, type Schema } from 'hast-util-sanitize';

// KaTeX emits presentation MathML. Exclude executable/HTML integration elements
// such as annotation-xml, and keep TeX annotations as text only.
const mathTags = [
  'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'mtext',
  'mspace', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'msub', 'msup', 'msubsup',
  'munder', 'mover', 'munderover', 'mmultiscripts', 'mprescripts', 'none',
  'mtable', 'mtr', 'mtd', 'menclose', 'mpadded', 'mphantom',
];
const mathAttributes = [
  'mathvariant', 'mathsize', 'mathcolor', 'displaystyle', 'scriptlevel',
  'stretchy', 'symmetric', 'fence', 'separator', 'lspace', 'rspace',
  'minsize', 'maxsize', 'movablelimits', 'accent', 'accentunder',
  'linethickness', 'columnalign', 'columnspacing', 'rowalign', 'rowspacing',
  'columnlines', 'rowlines', 'columnspan', 'rowspan', 'notation',
  'width', 'height', 'depth', 'voffset',
];

// The original Language Muscle cone uses only these static SVG elements.
const svgTags = ['svg', 'defs', 'linearGradient', 'stop', 'path', 'line', 'text', 'marker'];
const localPaint = /^(?:#[0-9a-f]{3,8}|[a-z]+|url\(#[a-z0-9_.:-]+\))$/i;
const localReference = /^url\(#[a-z0-9_.:-]+\)$/i;
const svgPresentation = [
  ['fill', localPaint], ['stroke', localPaint], 'strokeWidth', 'strokeDashArray',
  'fontFamily', 'fontSize', 'fontWeight', 'textAnchor',
  ['markerStart', localReference], ['markerEnd', localReference],
] satisfies NonNullable<Schema['attributes']>[string];

export const publicationSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'caption', 'figure', 'figcaption', 'mark', ...mathTags, ...svgTags],
  ancestors: { ...defaultSchema.ancestors, ...Object.fromEntries(svgTags.filter(tag => tag !== 'svg').map(tag => [tag, ['svg']])) },
  attributes: {
    // Class names are necessary for the original Language Muscle typography,
    // callouts and tables. No style, event, arbitrary data or name properties.
    '*': ['className', 'id', 'title', 'lang', 'dir', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy'],
    a: ['href', 'dataFootnoteRef', 'dataFootnoteBackref'],
    img: ['src', 'alt', 'width', 'height', ['loading', 'lazy', 'eager']],
    ol: ['start', 'reversed'],
    li: ['value'],
    td: ['colSpan', 'rowSpan', ['align', 'left', 'right', 'center']],
    th: ['colSpan', 'rowSpan', 'scope', ['align', 'left', 'right', 'center']],
    details: ['open'],
    section: ['dataFootnotes'],
    input: [['disabled', true], ['type', 'checkbox'], 'checked'],
    ...Object.fromEntries(mathTags.map(tag => [tag, mathAttributes])),
    svg: ['viewBox', 'width', 'height', ['xmlns', 'http://www.w3.org/2000/svg']],
    linearGradient: ['x1', 'y1', 'x2', 'y2'],
    stop: ['offset', ['stopColor', /^(?:#[0-9a-f]{3,8}|[a-z]+)$/i], ['stopOpacity', /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/]],
    path: ['d', ...svgPresentation],
    line: ['x1', 'y1', 'x2', 'y2', ...svgPresentation],
    text: ['x', 'y', 'dx', 'dy', ...svgPresentation],
    marker: ['markerWidth', 'markerHeight', 'refX', 'refY', ['orient', 'auto']],
    math: [['xmlns', 'http://www.w3.org/1998/Math/MathML'], ['display', 'block', 'inline']],
    annotation: [['encoding', 'application/x-tex']],
  },
  protocols: {
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
  // IDs and their references are prefixed together after sanitisation. A second
  // render must keep those IDs rather than adding another clobber prefix.
  clobberPrefix: '',
  strip: ['script', 'style', 'foreignObject', 'iframe', 'object', 'embed', 'template', 'noscript', 'annotation-xml'],
};
