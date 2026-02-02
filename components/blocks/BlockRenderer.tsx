import React, { useState } from 'react';
import { Block, TextBlock, ListBlock, CalloutBlock, CodeBlock, HrBlock } from '../../types';

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
    case 'code':
      return <CodeBlockView block={block} />;
    case 'hr':
      return <HrBlockView block={block} />;
    default:
      return null;
  }
}

function TextBlockView({ block }: { block: TextBlock }) {
  if (block.variant === 'heading') {
    return (
      <h2 id={block.id} className="text-[1.6em] font-semibold scroll-mt-28">
        {renderInlineCode(block.content)}
      </h2>
    );
  }
  if (block.variant === 'subheading') {
    return (
      <h3 id={block.id} className="text-[1.3em] font-semibold scroll-mt-28">
        {renderInlineCode(block.content)}
      </h3>
    );
  }
  if (block.variant === 'quote') {
    return (
      <blockquote className="border-l-2 border-slate-300 pl-4 italic text-slate-600">
        {renderInlineCode(block.content)}
      </blockquote>
    );
  }
  return <p className="text-slate-700 leading-relaxed">{renderInlineCode(block.content)}</p>;
}

function ListBlockView({ block }: { block: ListBlock }) {
  if (block.variant === 'ordered') {
    return (
      <ol className="list-decimal pl-6 space-y-2 text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{renderInlineCode(item)}</li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="list-disc pl-6 space-y-2 text-slate-700">
      {block.items.map((item) => (
        <li key={item}>{renderInlineCode(item)}</li>
      ))}
    </ul>
  );
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      {block.title && <div className="text-sm font-semibold text-slate-700">{renderInlineCode(block.title)}</div>}
      <div className="mt-2 text-slate-600">{renderInlineCode(block.content)}</div>
    </aside>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded border border-slate-700 text-slate-200 bg-slate-900/70 hover:bg-slate-900"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="rounded-lg border border-slate-200 bg-slate-950 text-slate-100 p-4 overflow-x-auto text-[0.9em] leading-relaxed whitespace-pre-wrap break-words">
        <code>{block.content}</code>
      </pre>
    </div>
  );
}

function HrBlockView({}: { block: HrBlock }) {
  return <hr className="border-slate-200 my-6" />;
}

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1 py-0.5 rounded bg-slate-200 text-slate-900 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
