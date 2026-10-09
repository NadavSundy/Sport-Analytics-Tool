import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_QUERY_PROMPT_DESCRIPTION,
  unsupportedQueryReasonSchema,
} from '../analytics-query';

/**
 * Issue #940. Two live findings on the deployed site, both of them guidance
 * failures rather than data failures.
 *
 * The first: "Who scored the most runs in the Austria tour of Hungary in 2026?"
 * and "Who has taken the most wickets in the Austria tour of Hungary?" were both
 * refused as ambiguous, and the suggestions offered fell back to the Indian
 * Premier League. The competition exists — the deployed public read returns
 * `Austria tour of Hungary` as competition `674`, with one season labelled
 * `2026` — so the translation step refused a question the platform could answer,
 * and then suggested a competition the reader had not mentioned.
 *
 * Recognising a competition is the resolver's job. The published corpus holds
 * hundreds of them, including bilateral tours between associate nations, and the
 * prompt is not given the list, so a model that refuses what it does not
 * recognise refuses most of the data. These tests pin the guidance that makes a
 * named competition a pass-through.
 *
 * The second: "Who won the 01/09/2007 Kenya vs Pakistan game?" was refused with
 * `outside_cricket_statistics` — "that is not a question about the cricket
 * statistics published here" — which tells a reader who asked a perfectly ordinary
 * cricket question that they asked about something else. A match result is a
 * cricket question this platform does not answer, which is `other`.
 */

/** The prompt is wrapped text, so a sentence is matched with its breaks flattened. */
function flattened(): string {
  return ANALYTICS_QUERY_PROMPT_DESCRIPTION.replace(/\s+/g, ' ');
}

describe('a competition or season the model does not recognise', () => {
  it('tells the model that resolving a name is the server’s job, not its own', () => {
    expect(flattened()).toMatch(
      /Pass a named competition or season through exactly as the reader wrote it, whether or not you recognise it/i,
    );
    expect(flattened()).toMatch(/the server resolves every name against the published data/i);
  });

  it('forbids refusing a question only because a named competition is unfamiliar', () => {
    expect(flattened()).toMatch(
      /Never return "unsupported" with the reason "ambiguous" merely because a competition or season the reader named is unfamiliar/i,
    );
  });

  it('forbids substituting a competition the model does know, the default included', () => {
    expect(flattened()).toMatch(
      /never replace it with a competition you do know, the default competition included/i,
    );
  });

  it('says a scope is ambiguous only when no competition and no season is named', () => {
    expect(flattened()).toMatch(
      /ambiguous about its scope only when it names no competition and no season at all/i,
    );
  });

  // The worked example is the live finding itself, in both of its scopes, so the
  // guidance cannot be read as being about some other kind of question.
  it('works the live finding through as an example at both scopes', () => {
    const prompt = flattened();

    expect(prompt).toContain('Austria tour of Hungary');
    expect(prompt).toContain('"competitionName": "Austria tour of Hungary"');
    expect(prompt).toContain('"seasonLabel": "2026"');
    expect(prompt).toContain('"name": "Austria tour of Hungary"');
  });
});

describe('suggestions use the competition the reader named', () => {
  it('scopes every suggestion to the reader’s own competition or season', () => {
    expect(flattened()).toMatch(
      /When the reader named a competition or a season, every suggestion is scoped to the one they named, however unfamiliar it is to you/i,
    );
  });

  // The Indian Premier League fallback in the live finding is exactly this: the
  // default was used to word suggestions for a question that named its own
  // competition.
  it('permits the default competition in a suggestion only when the reader named none', () => {
    expect(flattened()).toMatch(
      /The default competition named below may be used in a suggestion only when the reader named no competition and no season at all/i,
    );
  });
});

describe('match results and scorecards', () => {
  it('names the match-outcome wordings a reader actually uses', () => {
    const prompt = flattened();

    for (const wording of ['Who won', 'the final score', 'the margin', 'the toss', 'scorecard']) {
      expect(prompt).toContain(wording);
    }
  });

  it('works the live finding through as an example', () => {
    expect(flattened()).toContain('Who won the 01/09/2007 Kenya vs Pakistan game?');
  });

  it('refuses a match result with "other"', () => {
    expect(flattened()).toMatch(
      /Return "unsupported" with the reason "other" for (a question about one match|these)/i,
    );
  });

  // The whole point of the second finding: the reason label was wrong, not the
  // refusal. A cricket question must never be labelled as not being one.
  it('forbids outside_cricket_statistics for a match question', () => {
    expect(flattened()).toMatch(
      /It is a real cricket question, so never use "outside_cricket_statistics"/i,
    );
  });

  it('forbids ambiguous for a match question, which names its match clearly', () => {
    expect(flattened()).toMatch(/never use "ambiguous" either/i);
  });

  it('keeps outside_cricket_statistics for what it is actually for', () => {
    expect(flattened()).toMatch(
      /which is for a question that is not about cricket statistics at all/i,
    );
  });

  // The reason list the model is shown has to agree with the rule above it, or
  // the rule argues with the enumeration beside it.
  it('mentions a match in the guidance for the "other" reason', () => {
    const line = ANALYTICS_QUERY_PROMPT_DESCRIPTION.split('\n').find((entry) =>
      entry.trim().startsWith('- other —'),
    );

    expect(line).toBeDefined();
    expect(line).toMatch(/match/i);
  });

  // `other` already exists in the contract. Issue #940 deliberately adds no
  // reason, because a new enum member would change the definition schema and
  // therefore QUERY_DEFINITION_VERSION.
  it('adds no reason to the contract', () => {
    expect(unsupportedQueryReasonSchema.options).toEqual([
      'bowler_type',
      'batting_hand',
      'match_phase',
      'venue',
      'super_over',
      'outside_cricket_statistics',
      'ambiguous',
      'other',
    ]);
  });
});
