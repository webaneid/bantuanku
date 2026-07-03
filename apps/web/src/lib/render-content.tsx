import parse, { Element } from "html-react-parser";
import type { HTMLReactParserOptions } from "html-react-parser";
import Link from "next/link";

function CtaBlockDisplay({
  title,
  description,
  buttonText,
  buttonUrl,
}: {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}) {
  const isExternal = buttonUrl.startsWith("http://") || buttonUrl.startsWith("https://");
  const btnClass =
    "inline-block px-8 py-2.5 bg-white text-primary-700 font-bold rounded-full hover:bg-primary-50 transition-colors shadow-sm text-sm md:text-base";
  return (
    <div className="not-prose my-8 rounded-2xl overflow-hidden shadow-md">
      <div className="bg-gradient-to-br from-primary-500 to-primary-900 px-6 py-8 md:px-10 md:py-10 text-center">
        {title && (
          <div className="text-2xl font-bold text-white mb-3 leading-snug tracking-tight">{title}</div>
        )}
        {description && (
          <p className="text-sm md:text-base text-primary-100 mb-6 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
        {buttonText && buttonUrl && (
          isExternal ? (
            <a href={buttonUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
              {buttonText}
            </a>
          ) : (
            <Link href={buttonUrl} className={btnClass}>
              {buttonText}
            </Link>
          )
        )}
      </div>
    </div>
  );
}

interface RenderContentProps {
  html: string;
  className?: string;
}

export function RenderContent({ html, className }: RenderContentProps) {
  if (!html) return null;

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (
        domNode instanceof Element &&
        domNode.attribs["data-type"] === "cta-block"
      ) {
        return (
          <CtaBlockDisplay
            title={domNode.attribs["data-title"] || ""}
            description={domNode.attribs["data-description"] || ""}
            buttonText={domNode.attribs["data-button-text"] || ""}
            buttonUrl={domNode.attribs["data-button-url"] || ""}
          />
        );
      }
    },
  };

  return <div className={className}>{parse(html, options)}</div>;
}
