import React from 'react';
import { Block, TextBlock, ListBlock, CalloutBlock } from '../../types';

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockView block={block} />;
    case 'list':
      return <ListBlockView block={block} />;
    case 'callout':
      return <CalloutBlockView block={block} />;
    default:
      return null;
  }
}

function TextBlockView({ block }: { block: TextBlock }) {
  if (block.variant === 'heading') {
    return (
      <h2 id={block.id} className="text-2xl font-semibold scroll-mt-28">
        {block.content}
      </h2>
    );
  }
  if (block.variant === 'subheading') {
    return (
      <h3 id={block.id} className="text-xl font-semibold scroll-mt-28">
        {block.content}
      </h3>
    );
  }
  if (block.variant === 'quote') {
    return <blockquote className="border-l-2 border-slate-300 pl-4 italic text-slate-600">{block.content}</blockquote>;
  }
  return <p className="text-slate-700 leading-relaxed">{block.content}</p>;
}

function ListBlockView({ block }: { block: ListBlock }) {
  if (block.variant === 'ordered') {
    return (
      <ol className="list-decimal pl-6 space-y-2 text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc pl-6 space-y-2 text-slate-700">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      {block.title && <div className="text-sm font-semibold text-slate-700">{block.title}</div>}
      <div className="mt-2 text-slate-600">{block.content}</div>
    </aside>
  );
}
