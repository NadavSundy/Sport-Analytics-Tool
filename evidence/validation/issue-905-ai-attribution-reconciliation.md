# Issue #905 — AI attribution reconciliation

## Scope and method

This record follows the historical audit in [issue #891](issue-891-ai-attribution-audit.md) and the
follow-up requirements in [issue #905](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/905).
The authoritative repository is Gitea; GitHub is only a read-only mirror.

The supplied 44-row [candidate CSV](issue-905-code-attribution-candidates.csv) was reconciled by checking
each original commit message and changed-file list. Its original fields are preserved and the final
classification, human-confirmation flag and link to this detailed evidence were appended. A candidate was
compared with the relevant author's task register when the date, issue, subject or retained path provided
a direct match. Only the specific Dean Feldman transcripts already named by candidate commits were
inspected; unrelated transcripts were not searched. Historical commits were not amended, rebased or
otherwise rewritten.

The classifications mean:

- **confirmed malformed syntax** — an attempted `Assisted-by:` declaration exists but is not a complete,
  standalone `Assisted-by: <tool>[<model>]` declaration;
- **explicit assistance without a valid trailer** — the message explicitly says AI assisted the work,
  but uses prose or AI co-author metadata instead of the required declaration;
- **valid declaration / audit false positive** — the message contains complete declarations for multiple
  tool/model pairs, which the issue #891 single-pair scan did not accept;
- **contextual reference only** — AI is mentioned as the subject or evidence being changed, not as a
  declaration that AI produced the commit; and
- **human confirmation required** — retained evidence cannot establish an exact historical tool, model or
  purpose. This is a limitation layered onto the syntax classification, not a policy-violation finding.

## Results

The 44 candidates resolve to 11 valid multi-model declarations, 7 confirmed malformed
`Assisted-by:` attempts, 25 explicit assistance statements without a valid trailer, and 1 contextual
reference. No ambiguous candidate is labelled a confirmed policy violation. Ten commits retain a human
confirmation limitation because an exact tool/model fact is absent or conflicts across retained evidence.

### Human confirmation still required

The following ten cases remain unresolved and must not be backfilled without truthful first-hand evidence
from the relevant author:

- `702f422ce2650cdb9618e0ea0d5aa507c13997db` and
  `ea422f777dd3ed97374f5f983eacf2335105d3fe`: the exact Claude product surface is not established;
- `72c6e9d0888535f585c3c690d77deff53b59dae0`,
  `bc3f7fcbeef72de29a1c718417ebc4d7913336c1`,
  `c719a03de9aec126c3358d0462745ca804f8dc2a` and
  `347b451cc3df0667d453b894f631f849728d1c10`: the commit and register name conflicting Codex models;
- `3a04f74d111ffbe949168b7e9acb3e220f92f290` and
  `3f97682e69b0274e265cba45481ae20319114210`: the commit contains a model placeholder and the retained
  register/session evidence does not establish one unambiguous replacement;
- `7bb76004d1d579a3e6e600a3aea991d253a38a6d`: the tool name is misspelled and no matching register entry
  resolves it; and
- `d8ac9f05bcf3f9ec1fa973e3282475734b1f8bd2`: the split declaration appears to name GPT-5.6 Sol while the
  register records GPT-5.

### Confirmed malformed syntax

| Original SHA                               | Commit-message and changed-file evidence                                                               | Reconciliation                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `7efd8c3c538d4d97971d73bca98be9be500779ae` | `.gitea/workflows/deploy-backend.yml`; `Assisted-by: Claude-Web[Claude Opus 5.5]` is indented          | Confirmed malformed placement. The 2026-10-01 Ben register entry for related #815/#831 work corroborates Claude-Web/Claude Opus 5.5 and its CI/security purpose.                                                                                       |
| `f23add1d9c55d034943195ab247990c6eb02ef43` | `.gitea/workflows/ci.yml`; the same declaration is indented                                            | Confirmed malformed placement. The related Ben register entry corroborates the declared tool/model and deployment-secret purpose.                                                                                                                      |
| `3a04f74d111ffbe949168b7e9acb3e220f92f290` | CI/package/test files; `Codex[YOUR-ACTUAL-CODEX-MODEL]`                                                | Confirmed placeholder, not a model name. ChatGPT-Web/GPT-5.6 Thinking is complete. Dean's register says Codex/GPT-5, while the linked 2026-09-18 session metadata identifies a different Codex runtime; exact Codex model requires human confirmation. |
| `3f97682e69b0274e265cba45481ae20319114210` | Container Apps implementation; `Codex[ACTUAL-CODEX-MODEL]`                                             | Confirmed placeholder. The same register/transcript conflict prevents retroactively selecting the Codex model; ChatGPT-Web/GPT-5.6 Thinking and the deployment purpose are explicit. Human confirmation required.                                      |
| `d8ac9f05bcf3f9ec1fa973e3282475734b1f8bd2` | Admin frontend/tests; `Codex[GPT-5.6 So` and `l]` are split across lines                               | Confirmed split declaration. Nadav's #342 register records Codex/GPT-5, while the broken declaration appears to name GPT-5.6 Sol; exact historical model requires human confirmation.                                                                  |
| `2fa3f727367016a2d93cd4c6739c1e57b4813787` | Weather implementation/tests/docs; `Assisted-by: Claude Sonnet 5`                                      | Confirmed missing tool/model brackets. Liora's #334 register establishes Claude.ai, Claude Sonnet 5 and the historical-weather fix purpose.                                                                                                            |
| `71df3c7adc6a84c559a5e8760a537df9d8a29bc8` | MkDocs theme/config; literal `$'Refs #253\nAssisted-by: Claude[Claude Sonnet 5]` is one malformed line | Confirmed non-standalone declaration. Liora's #253 register corroborates Claude/Claude Sonnet 5 and the branding purpose.                                                                                                                              |

### Explicit AI assistance without a valid trailer

| Original SHA                               | Original evidence and conclusion                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `702f422ce2650cdb9618e0ea0d5aa507c13997db` | COR-01 package and `validate.js`; Anthropic `Co-Authored-By` names Claude Opus 5 (1M context), but no `Assisted-by:` declaration. No matching #605 register entry establishes the exact Claude product surface; human confirmation required. |
| `ea422f777dd3ed97374f5f983eacf2335105d3fe` | Same COR-01 evidence and co-author form as `702f422c`; explicit assistance, invalid declaration, exact Claude tool surface unresolved. Human confirmation required.                                                                          |
| `d4fad446139a5df12c5f4e28956ab2281623610a` | Frontend API/OpenAPI change says `Assisted by Claude Sonnet 5`. Liora's 2026-09-28 pagination entry corroborates Claude.ai chat, model and implementation/test purpose.                                                                      |
| `04bac9ad166b5db9ee4565ca43de4a52d13acf0f` | Pagination contracts/repositories say `Assisted by Claude Sonnet 5`; the 2026-09-28 Liora entry directly corroborates tool, model and purpose.                                                                                               |
| `f9cc9f8694de2751260e9fd1efabcb9db5193924` | Hosting strategy/config says `Assisted by Claude Sonnet 5`; Liora's 2026-09-25 entry corroborates Claude.ai chat and the capacity/recovery documentation purpose.                                                                            |
| `ef6c74b54ee80e6ae8f8ea26ec19011d9767d6ca` | Cloudflare migration code/workflows/tests says `Assisted by Claude Sonnet 5`; Liora's #564 register entry identifies Claude.ai and the complete migration purpose.                                                                           |
| `c69d97359e2a09198614661c0143369f2bbf6c52` | Fixture-onboarding source says `Assisted by Claude Sonnet 5`; Liora's #584 CI-remediation entry corroborates Claude/Claude Sonnet 5 and the unused-export fix.                                                                               |
| `ba656ec99c9453f3610cff23af73bf10653c221c` | Fixture-onboarding implementation/tests says the same; Liora's #584 implementation entry corroborates the tool/model and purpose.                                                                                                            |
| `7797d69d0af3a2b44570a259f4bbcc6c0728fcd9` | Worker source names only `Claude Sonnet 5`; Liora's #588 register entry establishes Claude.ai and test/debugging purpose.                                                                                                                    |
| `5702402bf02360045a1cc7df5fdcf06b5af04931` | Worker ordering fix says `Assisted by Claude Sonnet 5`; the #588 entry corroborates the implementation purpose.                                                                                                                              |
| `7aa9f6318e94479c45f13625f2db2ac58fa18d0c` | Worker ordering test says the same; the #588 entry corroborates test generation and model/tool.                                                                                                                                              |
| `c6d0b99ab70ba090531f2446d42c5b1829244bf2` | Competition-request modal says `Assisted by Claude Sonnet 5`; Liora's #519 register entry establishes Claude.ai and feature implementation.                                                                                                  |
| `7bb76004d1d579a3e6e600a3aea991d253a38a6d` | Database-test formatting says `assisted by ChapGPT-5.6 Luna`. The apparent tool name is misspelled and no matching register evidence resolves the exact tool or purpose beyond the changed file/subject; human confirmation required.        |
| `23477428a1bbad3d621d69564477f0392c5c1d79` | #415 geocoding code/tests says `Assisted by Claude Sonnet 5`; Liora's linked #415 register/transcript identifies Claude.ai chat and the implementation purpose.                                                                              |
| `5082dc4937daf6117c4957e822caaae16d4278dd` | Submission upload source says `Assisted by ChatGPT Web, GPT -5.6 Luna`; explicit tool/model and basename-import purpose, but invalid syntax.                                                                                                 |
| `2f0fffc3cb79acdc1f587bf6a3cc0b9868f67f8c` | Upload-limit code/tests/docs says `assisted by ChatGPT Web, GPT -5.6 Luna`; Liora's #368 entry corroborates ChatGPT-Web/GPT-5.6 Luna and purpose.                                                                                            |
| `0e843a8dc24df40186a2675622f05d3cda61673d` | Source/test newline change says `Assisted by Claude sonnet 5`; explicit assistance and purpose, but no valid declaration.                                                                                                                    |
| `2cf91e47764117cf335fbb4b014155738d4b8d07` | CSV parser/tests says `Assisted by Claude Sonnet 5`; Liora's #366 entry establishes Claude/Claude Sonnet 5 and parser/test purpose.                                                                                                          |
| `202f463bf7835b6960e73673a1b361ed3d846563` | Deployment workflow/docs subject says `assisted by Claude Sonnet 5`; Liora's #29 entry corroborates Claude.ai and deployment automation purpose.                                                                                             |
| `ac3b6ba612f33cbae5e47efced83af82c8b6bbbc` | Same #29 workflow/docs says `Assisted by Claude Sonnet 5`; the #29 entry corroborates it.                                                                                                                                                    |
| `b544337f6de6c1203b218a30b80748a8f9270c0a` | Onboarding evidence says `Assisted by Claude Sonnet 5`; Liora's #12 entry identifies Claude.ai (Anthropic), model and verification/documentation purpose.                                                                                    |
| `740f3b96004bcc3ec83d18bffe1c2d4c3d8f755a` | MkDocs navigation says `Refs #56, assisted by Claude Sonnet 5`; Liora's #56 register/transcript identifies Claude.ai, model and IA/wireframe purpose.                                                                                        |
| `eacc837e9894b31270294ef22927f4feaa31c44a` | Open-Meteo implementation/tests says `Assisted by Claude Sonnet 5`; Liora's 2026-08-20 entry identifies Claude Web, model and integration/documentation purpose.                                                                             |
| `84c5a347bcfe9ac081a1c8aae67714e45d1e0614` | MkDocs/Cloudflare work says `Assisted by ChatGPT on the web, (GPT -5.5)`; Liora's 2026-08-06 entry corroborates ChatGPT Web/GPT-5.5 and deployment/PR purpose.                                                                               |
| `62b11f330c991d055f8fb36972847ff3ae16fa2a` | Initial MkDocs deployment says `Assisted by ChatGPT on the web, (GPT-5.5)`; Liora's 2026-08-05 entry corroborates tool/model and deployment/documentation purpose.                                                                           |

### Valid declarations that the strict audit misclassified

| Original SHA                               | Evidence-backed conclusion                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `72c6e9d0888535f585c3c690d77deff53b59dae0` | `Codex[GPT-5.6], ChatGPT-Web[GPT-5.6 Thinking]` is syntactically complete. Dean's #563 register corroborates the purpose but records Codex/GPT-5, so the historical Codex model still requires human confirmation. |
| `bc3f7fcbeef72de29a1c718417ebc4d7913336c1` | Same complete two-pair declaration and #563 purpose evidence as `72c6e9d`; the Codex model conflict still requires human confirmation.                                                                             |
| `847da08fee525045d6b5e004d6f266c6821fbc69` | `Assisted-by: Codex[GPT-5], ChatGPT-Web[GPT-5.6 Sol]` is a complete two-pair declaration. Dean's 2026-09-15 register and linked weather transcripts corroborate the purpose.                                       |
| `17a392a8b73527b1608944cbfbdb3fe8697b91fc` | `Claude-Code[Claude Opus 5], Claude-Web[Claude Opus 5]` is complete; Ben's #475 register entry corroborates code/test generation.                                                                                  |
| `7761ad022708c4e22107cfc9e61d8debd482d8d8` | Same complete Claude-Code/Claude-Web pair; Ben's #536 entries corroborate design, code, tests and documentation.                                                                                                   |
| `1fd0e14b185398d4cf8ff29177b1e20b894605ad` | Same complete pair; Ben's #475 entry corroborates the footer-link implementation and tests.                                                                                                                        |
| `d80a8fbcee7ad5a3a0a19944f7b670ef7e23f14d` | Same complete pair; Ben's #475 entry corroborates the non-boundary presentation change.                                                                                                                            |
| `5f461c8115a3f340e0fad52daf789327f3b2626b` | Same complete pair; Ben's #475 entry corroborates the footer/API and download-confirmation work.                                                                                                                   |
| `c719a03de9aec126c3358d0462745ca804f8dc2a` | `ChatGPT-Web[GPT-5.6 Thinking], Codex[GPT-5.6]` is syntactically complete. Dean's #483/#487/#488/#497 register corroborates purpose but records Codex/GPT-5; exact Codex model requires human confirmation.        |
| `347b451cc3df0667d453b894f631f849728d1c10` | Same complete declaration and batch-integrity evidence as `c719a03d`; the conflicting Codex model remains a human-confirmation limitation.                                                                         |
| `b98f6bf28344c9b15624f880d1e06323b6d89732` | `ChatGPT-Web[GPT-5.6 Thinking], Codex[GPT-5]` is complete; Dean's #483/#487/#488/#497 register and linked transcript corroborate purpose.                                                                          |

### Contextual reference that does not establish assistance

| Original SHA                               | Evidence-backed conclusion                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4a4f9a111602315ae27f22f9e2e748a3314844e4` | The subject/body says the commit organises ChatGPT and Codex transcripts, and the changed files are transcript evidence plus `apps/backend/package.json`. No language declares that AI assisted this commit. It remains an ordinary unattributed commit, not a confirmed exception. |

## Scope reduction and limitations

Issue #905 was reduced to historical reconciliation only after patch review. The proposed future-facing
validator, its automated tests, npm command, CI integration and usage documentation were removed. This
change therefore records historical evidence but introduces no new automated prevention or merge gate.
Any future attribution-validation work requires separately approved scope.

The CSV now retains the real original message returned by Git for every SHA instead of the erroneous
`System.Object[]` serialization. Its classifications document the evidence available now; they do not
repair trailers or prove facts that the repository does not retain. Historical commits were not amended,
rebased or otherwise rewritten. The ten human-confirmation cases above remain unresolved, and no
tool/model value should be inferred from naming conventions or current product knowledge.

## Verification

Verification on 8 October 2026 after the scope reduction:

- the CSV parses as 44 rows with 44 unique SHAs;
- classification totals are 11 valid multi-model declarations, 7 malformed attribution attempts,
  25 explicit assistance statements without a valid trailer and 1 contextual AI reference;
- exactly 10 rows are flagged for human confirmation;
- all 44 `CommitMessage` fields match `git show -s --format=%B <sha>` after normalizing only the final
  line ending, and no `System.Object[]` placeholder remains;
- `npx prettier --check evidence/validation/issue-905-ai-attribution-reconciliation.md` passed;
- `python -m mkdocs build --strict` passed;
- `git diff --check` passed; and
- the final issue #905 change-set audit found changes only in the two reconciliation evidence files and
  Nadav Sundy's AI register. There are no retained CI, package-script, application-code or test-code
  changes. The pre-existing untracked `issue-905-review.patch` review artifact was left untouched.

## AI declaration

This historical reconciliation, CSV correction and evidence documentation were produced with the
assistance of Codex[GPT-5]. The corresponding task-level register entry records the actual purpose and
verification.
