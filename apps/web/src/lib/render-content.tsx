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
  return (
    <div className="not-prose my-8 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-6 md:p-8 text-center shadow-sm">
      {title && (
        <h3 className="text-lg md:text-xl font-bold text-primary-900 mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm md:text-base text-gray-600 mb-5 max-w-sm mx-auto">{description}</p>
      )}
      {buttonText && buttonUrl && (
        isExternal ? (
          <a
            href={buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-7 py-3 bg-primary-600 text-white font-semibold rounded-full hover:bg-primary-700 transition-colors text-sm md:text-base shadow-md hover:shadow-lg"
          >
            {buttonText}
          </a>
        ) : (
          <Link
            href={buttonUrl}
            className="inline-block px-7 py-3 bg-primary-600 text-white font-semibold rounded-full hover:bg-primary-700 transition-colors text-sm md:text-base shadow-md hover:shadow-lg"
          >
            {buttonText}
          </Link>
        )
      )}
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
