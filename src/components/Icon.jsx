import React, { useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

const iconCache = new Map();

/**
 * Fast lookup helper to convert kebab-case / snake_case names to Lucide PascalCase
 * e.g. "alert-circle" -> "AlertCircle", "trash-2" -> "Trash2", "refresh-cw" -> "RefreshCw"
 */
export const getLucideIcon = (name) => {
  if (!name) return null;
  if (iconCache.has(name)) return iconCache.get(name);

  const pascalName = name
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());

  const comp = LucideIcons[pascalName] || LucideIcons[name] || null;
  iconCache.set(name, comp);
  return comp;
};

/**
 * Blazing-fast native SVG Icon component powered by lucide-react.
 * Replaces costly synchronous DOM innerHTML injections and createIcons DOM queries with pure VDOM SVGs.
 */
export const Icon = React.memo(({ name, size = 20, className = '', style, ...props }) => {
  const LucideComp = getLucideIcon(name);

  if (LucideComp) {
    return <LucideComp size={size} className={className} style={style} {...props} />;
  }

  // Graceful fallback for any custom icon or unmapped name via window.lucide CDN
  const containerRef = useRef(null);
  useEffect(() => {
    if (window.lucide && containerRef.current) {
      containerRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px;"></i>`;
      window.lucide.createIcons({ root: containerRef.current });
    }
  }, [name, size, className]);

  return (
    <span
      ref={containerRef}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
      {...props}
    />
  );
});

export default Icon;
