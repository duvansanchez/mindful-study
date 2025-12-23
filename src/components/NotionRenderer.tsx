import React, { useState } from 'react';

interface RichText {
  type: 'text';
  text: {
    content: string;
    link?: {
      url: string;
    } | null;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href?: string | null;
}

interface NotionBlock {
  id: string;
  type: string;
  content: {
    rich_text: RichText[];
    icon?: unknown;
    language?: string;
    checked?: boolean;
  } | null;
  children?: NotionBlock[];
  hasChildren?: boolean;
}

interface NotionRendererProps {
  blocks: NotionBlock[];
}

// Componente para toggle con carga lazy
const LazyToggle: React.FC<{ block: NotionBlock }> = ({ block }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<NotionBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleToggle = async () => {
    if (!isOpen && !loaded && block.hasChildren) {
      setLoading(true);
      try {
        const response = await fetch(`/api/notion/blocks/${block.id}/children`);
        if (response.ok) {
          const data = await response.json();
          setChildren(data.children || []);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error loading toggle children:', error);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="my-2">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 font-medium hover:bg-muted p-2 rounded w-full text-left"
      >
        <span className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <RichTextRenderer richText={block.content?.rich_text || []} />
      </button>
      {isOpen && (
        <div className="ml-6 mt-2 space-y-1">
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : (
            children.length > 0 && <NotionRenderer blocks={children} />
          )}
        </div>
      )}
    </div>
  );
};

const RichTextRenderer: React.FC<{ richText: RichText[] }> = ({ richText }) => {
  return (
    <>
      {richText.map((text, index) => {
        let element = <span key={index}>{text.plain_text}</span>;
        
        // Aplicar estilos según las anotaciones
        if (text.annotations.bold) {
          element = <strong key={index}>{element}</strong>;
        }
        if (text.annotations.italic) {
          element = <em key={index}>{element}</em>;
        }
        if (text.annotations.underline) {
          element = <u key={index}>{element}</u>;
        }
        if (text.annotations.strikethrough) {
          element = <s key={index}>{element}</s>;
        }
        if (text.annotations.code) {
          element = (
            <code 
              key={index} 
              className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono"
            >
              {text.plain_text}
            </code>
          );
        }
        
        // Aplicar color si no es el default
        if (text.annotations.color !== 'default') {
          const colorClass = getColorClass(text.annotations.color);
          element = (
            <span key={index} className={colorClass}>
              {element}
            </span>
          );
        }
        
        // Aplicar link si existe
        if (text.text.link || text.href) {
          const url = text.text.link?.url || text.href;
          element = (
            <a 
              key={index}
              href={url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {element}
            </a>
          );
        }
        
        return element;
      })}
    </>
  );
};

const getColorClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    gray: 'text-gray-600',
    brown: 'text-amber-700',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    red: 'text-red-600',
    gray_background: 'bg-gray-100 px-1 rounded',
    brown_background: 'bg-amber-100 px-1 rounded',
    orange_background: 'bg-orange-100 px-1 rounded',
    yellow_background: 'bg-yellow-100 px-1 rounded',
    green_background: 'bg-green-100 px-1 rounded',
    blue_background: 'bg-blue-100 px-1 rounded',
    purple_background: 'bg-purple-100 px-1 rounded',
    pink_background: 'bg-pink-100 px-1 rounded',
    red_background: 'bg-red-100 px-1 rounded',
  };
  
  return colorMap[color] || '';
};

export const NotionRenderer: React.FC<NotionRendererProps> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) {
    return <p className="text-muted-foreground">Sin contenido disponible</p>;
  }

  return (
    <div className="notion-content space-y-2">
      {blocks.map((block) => {
        if (!block.content?.rich_text) {
          return null;
        }

        const richText = block.content.rich_text;
        const key = block.id;

        switch (block.type) {
          case 'paragraph':
            return (
              <p key={key} className="leading-relaxed">
                <RichTextRenderer richText={richText} />
              </p>
            );

          case 'heading_1':
            return (
              <h1 key={key} className="text-2xl font-bold mt-6 mb-3">
                <RichTextRenderer richText={richText} />
              </h1>
            );

          case 'heading_2':
            return (
              <h2 key={key} className="text-xl font-semibold mt-5 mb-2">
                <RichTextRenderer richText={richText} />
              </h2>
            );

          case 'heading_3':
            return (
              <h3 key={key} className="text-lg font-medium mt-4 mb-2">
                <RichTextRenderer richText={richText} />
              </h3>
            );

          case 'bulleted_list_item':
            return (
              <div key={key} className="flex items-start gap-2 ml-4">
                <span className="text-foreground mt-1.5 text-sm">•</span>
                <div className="flex-1 leading-relaxed">
                  <RichTextRenderer richText={richText} />
                </div>
              </div>
            );

          case 'numbered_list_item':
            return (
              <div key={key} className="flex items-start gap-2 ml-4">
                <span className="text-foreground mt-1.5 text-sm">1.</span>
                <div className="flex-1 leading-relaxed">
                  <RichTextRenderer richText={richText} />
                </div>
              </div>
            );

          case 'toggle':
            return <LazyToggle key={key} block={block} />;

          case 'to_do':
            return (
              <div key={key} className="flex items-start gap-2 my-1">
                <input 
                  type="checkbox" 
                  checked={block.content?.checked || false}
                  readOnly
                  className="mt-1.5 rounded border-gray-300"
                />
                <div className={`flex-1 leading-relaxed ${block.content?.checked ? 'line-through text-muted-foreground' : ''}`}>
                  <RichTextRenderer richText={richText} />
                </div>
              </div>
            );

          case 'callout':
            return (
              <div key={key} className="flex gap-3 p-4 bg-muted rounded-lg border-l-4 border-blue-500">
                {block.content.icon && (
                  <span className="text-lg">
                    {typeof block.content.icon === 'string' ? block.content.icon : '💡'}
                  </span>
                )}
                <div className="flex-1">
                  <RichTextRenderer richText={richText} />
                </div>
              </div>
            );

          case 'quote':
            return (
              <blockquote key={key} className="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground">
                <RichTextRenderer richText={richText} />
              </blockquote>
            );

          case 'code':
            return (
              <pre key={key} className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono">
                  <RichTextRenderer richText={richText} />
                </code>
              </pre>
            );

          case 'divider':
            return <hr key={key} className="my-6 border-border" />;

          default:
            return (
              <div key={key} className="leading-relaxed">
                <RichTextRenderer richText={richText} />
              </div>
            );
        }
      })}
    </div>
  );
};

export default NotionRenderer;