import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccessibilityStatementPage, PrivacyNoticePage, TermsOfUsePage } from './PolicyPages';

describe('public policy pages', () => {
  it('renders the privacy notice with the current project contact and retention rule', () => {
    render(<PrivacyNoticePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Notice' })).toBeInTheDocument();

    expect(screen.getAllByRole('link', { name: 'statsthegame@gmail.com' })[0]).toHaveAttribute(
      'href',
      'mailto:statsthegame@gmail.com',
    );

    const article = screen.getByRole('article');

    expect(article).toHaveTextContent(/90 days from receipt/i);
    expect(article).toHaveTextContent(/does not currently display a cookie-consent banner/i);
  });

  it('renders API, data-use and responsible-disclosure terms on one page', () => {
    render(<TermsOfUsePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: /API use$/i })).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Public data and dataset licence$/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Security and responsible vulnerability disclosure$/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('article')).toHaveTextContent(/including for commercial purposes/i);
  });

  it('states the WCAG target without claiming completed conformance', () => {
    render(<AccessibilityStatementPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Accessibility Statement',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/aims to conform to WCAG 2\.2 Level AA/i)).toBeInTheDocument();

    expect(
      screen.getByText((_, element) =>
        Boolean(
          element?.tagName === 'P' &&
          element.textContent?.includes(
            'We therefore do not claim full WCAG 2.2 Level AA conformance at this time.',
          ),
        ),
      ),
    ).toBeInTheDocument();
  });
});
