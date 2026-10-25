import type { PublicationBook, PublicationSection } from './types.js';

export function publicationLabels(book: PublicationBook) {
  return {
    search: book.labels?.search ?? 'Search',
    tableOfContents: book.labels?.tableOfContents ?? 'Table of contents',
    readingSettings: book.labels?.readingSettings ?? 'Reading settings',
    listen: book.labels?.listen ?? 'Listen',
    contents: book.labels?.contents ?? 'Contents',
    fullContents: book.labels?.fullContents ?? 'Full contents',
  };
}

export interface PublicationNavigationNode {
  section: PublicationSection;
  children: PublicationNavigationNode[];
}

/** Preserve source order and identity; categories do not invent extra tree levels. */
export function publicationNavigation(sections: PublicationSection[], maxDepth = Infinity): PublicationNavigationNode[] {
  const depth = Number.isNaN(maxDepth) ? Infinity : Math.max(0, Math.floor(maxDepth));
  if (depth === 0) return [];
  return sections.map(section => ({ section, children: publicationNavigation(section.children ?? [], depth - 1) }));
}

const namedColours = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor').split(' '));

/** Parse the supported colour forms identically in a browser and during server rendering. */
export function publicationColour(value?: string): string | undefined {
  const colour = value?.trim();
  if (!colour) return undefined;
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(colour) || namedColours.has(colour.toLowerCase())) return colour;
  const functional = /^(rgba?|hsla?)\(([^()]*)\)$/i.exec(colour);
  if (!functional) return undefined;
  const body = functional[2].trim();
  const comma = body.includes(',');
  if (comma && body.includes('/')) return undefined;
  const parts = comma ? body.split(',').map(part => part.trim()) : body.split(/\s*\/\s*/);
  if (!comma && parts.length > 2) return undefined;
  const channels = comma ? parts.slice(0, 3) : parts[0].split(/\s+/);
  const alpha = comma ? parts[3] : parts[1];
  if (channels.length !== 3 || (comma && ![3, 4].includes(parts.length))) return undefined;
  const numeric = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?$/i;
  if (alpha !== undefined && !numeric.test(alpha)) return undefined;
  if (functional[1].toLowerCase().startsWith('rgb')) {
    if (!channels.every(channel => numeric.test(channel))) return undefined;
    if (comma && channels.some(channel => channel.endsWith('%')) && !channels.every(channel => channel.endsWith('%'))) return undefined;
  } else {
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|grad|rad|turn)?$/i.test(channels[0]) || !channels.slice(1).every(channel => numeric.test(channel) && channel.endsWith('%'))) return undefined;
  }
  return colour;
}
