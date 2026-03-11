import React from 'react';
import Card from './Card';

export default function SectionRow({ section }) {
  if (!section.items?.length) return null;
  if (section.type === 'banner') return null;

  return (
    <div className="mb-8">
      {section.title && (
        <h2 className="text-text font-semibold text-base mb-3 px-6">{section.title}</h2>
      )}
      <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
        {section.items.map((item, i) => (
          <Card
            key={item.id || i}
            item={item}
            type={section.type}
            queue={section.items}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
