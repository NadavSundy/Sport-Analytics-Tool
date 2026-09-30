import { Fragment, type ReactNode } from 'react';
import { PageLayout } from '../../components/PageLayout';
import accessibilityStatement from '../../content/policies/accessibility-statement.md?raw';
import privacyNotice from '../../content/policies/privacy-notice.md?raw';
import termsOfUse from '../../content/policies/terms-of-use.md?raw';

function inlineContent(text: string): ReactNode[] {
  const tokenPattern =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;
  const parts = text.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${index}-${part.slice(0, 20)}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    const markdownLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (markdownLink) {
      return (
        <a key={key} href={markdownLink[2]}>
          {markdownLink[1]}
        </a>
      );
    }

    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a key={key} href={part}>
          {part}
        </a>
      );
    }

    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) {
      return (
        <a key={key} href={`mailto:${part}`}>
          {part}
        </a>
      );
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

function isBlockStart(line: string) {
  const trimmed = line.trim();
  return (
    trimmed === '' ||
    trimmed === '---' ||
    /^#{1,3}\s/.test(trimmed) ||
    /^-\s/.test(trimmed) ||
    /^\d+\.\s/.test(trimmed)
  );
}

function renderPolicyMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;
  let blockKey = 0;

  while (index < lines.length) {
    const currentLine = lines[index];

    if (currentLine === undefined) {
      break;
    }

    const line = currentLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    // PageLayout supplies the single page-level h1.
    if (line.startsWith('# ')) {
      index += 1;
      continue;
    }

    if (line === '---') {
      nodes.push(<hr key={`hr-${blockKey++}`} />);
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`heading-${blockKey++}`}>{inlineContent(line.slice(4))}</h3>);
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(<h2 key={`heading-${blockKey++}`}>{inlineContent(line.slice(3))}</h2>);
      index += 1;
      continue;
    }

    if (/^-\s/.test(line)) {
      const items: ReactNode[] = [];

      while (index < lines.length) {
        const listLine = lines[index];

        if (listLine === undefined) {
          break;
        }

        const trimmed = listLine.trim();

        if (!/^-\s/.test(trimmed)) {
          break;
        }

        const item = trimmed.replace(/^-\s+/, '');
        items.push(<li key={`item-${blockKey++}`}>{inlineContent(item)}</li>);
        index += 1;
      }

      nodes.push(<ul key={`list-${blockKey++}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];

      while (index < lines.length) {
        const listLine = lines[index];

        if (listLine === undefined) {
          break;
        }

        const trimmed = listLine.trim();

        if (!/^\d+\.\s/.test(trimmed)) {
          break;
        }

        const item = trimmed.replace(/^\d+\.\s+/, '');
        items.push(<li key={`item-${blockKey++}`}>{inlineContent(item)}</li>);
        index += 1;
      }

      nodes.push(<ol key={`list-${blockKey++}`}>{items}</ol>);
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (index < lines.length) {
      const paragraphLine = lines[index];

      if (paragraphLine === undefined || isBlockStart(paragraphLine)) {
        break;
      }

      paragraphLines.push(paragraphLine.trim());
      index += 1;
    }

    nodes.push(<p key={`paragraph-${blockKey++}`}>{inlineContent(paragraphLines.join(' '))}</p>);
  }

  return nodes;
}

function PolicyPage({ heading, source }: { heading: string; source: string }) {
  return (
    <PageLayout heading={heading}>
      <article className="policy-document">{renderPolicyMarkdown(source)}</article>
    </PageLayout>
  );
}

export function PrivacyNoticePage() {
  return <PolicyPage heading="Privacy Notice" source={privacyNotice} />;
}

export function TermsOfUsePage() {
  return <PolicyPage heading="Terms of Use" source={termsOfUse} />;
}

export function AccessibilityStatementPage() {
  return <PolicyPage heading="Accessibility Statement" source={accessibilityStatement} />;
}
