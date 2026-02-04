import React from 'react';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type ContentWidth = 'sm' | 'md' | 'lg' | 'full';

interface ReadabilityControlsProps {
  fontSize: FontSize;
  lineHeight: LineHeight;
  contentWidth: ContentWidth;
  onFontSize: (value: FontSize) => void;
  onLineHeight: (value: LineHeight) => void;
  onContentWidth: (value: ContentWidth) => void;
}

const FONT_SIZES: FontSize[] = ['sm', 'base', 'lg', 'xl'];
const LINE_HEIGHTS: LineHeight[] = ['tight', 'normal', 'relaxed', 'loose'];
const CONTENT_WIDTHS: ContentWidth[] = ['sm', 'md', 'lg', 'full'];

export function ReadabilityControls({
  fontSize,
  lineHeight,
  contentWidth,
  onFontSize,
  onLineHeight,
  onContentWidth
}: ReadabilityControlsProps) {
  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Readability</h3>
      <div className="mt-3 space-y-3 text-xs text-slate-600">
        <ControlRow label="Font size" values={FONT_SIZES} current={fontSize} onChange={onFontSize} />
        <ControlRow label="Line height" values={LINE_HEIGHTS} current={lineHeight} onChange={onLineHeight} />
        <ControlRow label="Width" values={CONTENT_WIDTHS} current={contentWidth} onChange={onContentWidth} />
      </div>
    </div>
  );
}

interface ControlRowProps<T extends string> {
  label: string;
  values: T[];
  current: T;
  onChange: (value: T) => void;
}

function ControlRow<T extends string>({ label, values, current, onChange }: ControlRowProps<T>) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`px-2 py-1 rounded border text-[11px] ${
              current === value ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
