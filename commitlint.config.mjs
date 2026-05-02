/**
 * Commit-message linting for the superhuman marketplace.
 *
 * Scope-enum is the source of truth for which scopes release-please
 * recognizes; keep it in sync with the `packages` keys in
 * release-please-config.json (mapped to their `component` names).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['marketplace', 'superhuman']],
  },
};
