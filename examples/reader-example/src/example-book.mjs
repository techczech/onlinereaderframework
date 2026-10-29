/** The example book: invented demonstration text, written for this repository and released under its MIT licence with the code.
 * Plain data, shared by the browser entry (src/main.jsx) and the Node build (build.mjs), so the reader, the EPUB and the agent files all show the same text. */

export const exampleBook = {
  id: 'reader-example',
  title: 'A Short Tour of the Reader',
  subtitle: 'Example book for the Online Reader Framework',
  author: 'Online Reader Framework contributors',
  description: 'A small invented book that shows chapters, formatting, reading settings, notes, read-aloud, an interactive example, EPUB download and agent files.',
  language: 'en-GB',
  navigation: { homeDepth: 2 },
  home: {
    badge: 'Example',
    overviewTitle: 'What this example shows',
    overviewDescription: 'Every page of this book is demonstration text. Open a chapter, change the reading settings, select a sentence to highlight it, or press Listen.',
    license: { label: 'Example text: MIT licence, like the framework code', href: 'https://github.com/techczech/onlinereaderframework/blob/main/LICENSE' },
  },
  sections: [
    {
      id: 'about',
      title: 'About this example',
      category: 'Start',
      content: `# About this example

This book is **demonstration text**. It was written for the Online Reader Framework repository and is released under the same MIT licence as the code, so you can copy it, change it and replace it with your own book.

It is deliberately short. Each chapter shows one part of the reader:

1. a contents tree with chapters inside chapters;
2. ordinary formatting: headings, lists, a table, a quotation and a footnote;
3. reading settings and reading assists;
4. highlights, notes and bookmarks, kept in your own browser;
5. read-aloud with your browser's voices;
6. one interactive example with a written text version;
7. an EPUB download and Markdown files for AI agents.

Nothing in this book comes from a published book.`,
    },
    {
      id: 'reading',
      title: 'Reading on screen',
      category: 'Reading',
      content: `# Reading on screen

This chapter has two shorter chapters inside it. Open the contents to see the tree, or use the links at the end of each page to move to the next one.`,
      children: [
        {
          id: 'reading-settings',
          title: 'Settings and assists',
          category: 'Reading',
          content: `# Settings and assists

The reading settings change how the text looks. They are saved for this book only.

| Setting | What it changes |
| --- | --- |
| Theme | Light, dark, or the same as your device |
| Font | A serif or a sans-serif typeface |
| Size and spacing | Letter size, line height, paragraph and letter spacing |
| Width | How many words fit on one line |

The reading assists help you keep your place:

- **Focus** dims the paragraphs around the one you are reading.
- **Window** shows a few lines at a time.
- **Ruler** draws a band under the current line.
- **Anchored reading** makes the first letters of each word bolder.

> Try one setting at a time and read a paragraph after each change. A setting that helps one reader may not help another.`,
        },
        {
          id: 'line-spacing',
          title: 'Line spacing: an interactive example',
          category: 'Reading',
          format: 'html',
          content: `<h1>Line spacing: an interactive example</h1>
<p>Line spacing is the distance from one line of text to the next. In the live reader, an interactive example appears above the next paragraph. It shows a sample paragraph and a slider that changes its line spacing.</p>
<div id="line-spacing-text">
<p><strong>Text version of the interactive example.</strong> The example shows one sample paragraph and a slider labelled “Line spacing”. The slider starts at 1.5, which means each line takes one and a half times the height of the letters. Moving it down to 1.0 packs the lines closely together, so the eye can slip to the wrong line when it returns to the left edge. Moving it up to 2.0 or more spreads the lines apart; this can help some readers, but very wide spacing breaks the paragraph into separate strips. A second control switches the paragraph between a narrow and a wide column, because the best spacing also depends on how long each line is. The values shown here are examples, not rules.</p>
</div>
<p>The same text version is used everywhere the interactive example cannot run: in search, in read-aloud, in the EPUB and in the agent files.</p>`,
        },
      ],
    },
    {
      id: 'notes',
      title: 'Keeping notes',
      category: 'Notes',
      content: `# Keeping notes

Select a sentence to highlight it. You can add a note to a highlight, write a reflection on a whole chapter, and bookmark the page you are on.[^stored]

Your notes can be exported as a Markdown file, and a highlighted sentence can be turned into a quote image.

[^stored]: Highlights, notes, bookmarks and progress are saved in your own browser's storage, separately for each book. They are not sent anywhere.`,
    },
    {
      id: 'listening',
      title: 'Listening',
      category: 'Notes',
      content: `# Listening

Press **Listen** to hear the page read aloud. The reader uses the voices your browser provides, so the voice and its quality depend on your device. The passage being read is highlighted as it is spoken.

A book can also supply recorded audio tracks. This example does not include any.`,
    },
    {
      id: 'taking-it-with-you',
      title: 'Taking the book with you',
      category: 'Export',
      content: `# Taking the book with you

The reader builds an **EPUB** file of the whole book in your browser. Use the download control in the reader to save it and open it in any e-book app.

The build of this example also writes a plain Markdown copy of the book for AI agents: an index, one file per chapter, the full text in one file and a manifest. The reader links to those files; it does not call any AI service.`,
    },
  ],
};

/** Host-registered interactive embeds (reader-core embed contract). The manuscript above holds only the text version, `line-spacing-text`. */
export const exampleEmbeds = {
  root: 'embeds/',
  items: [{
    id: 'line-spacing',
    sectionId: 'line-spacing',
    anchor: 'line-spacing-text',
    src: 'line-spacing.html',
    title: 'Line spacing explorer',
    caption: 'Move the slider to change the line spacing of the sample paragraph.',
    height: { initial: 240, min: 240, max: 900 },
  }],
};
