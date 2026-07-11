#!/usr/bin/env node
import fs from 'node:fs'

const agentOutputPath = getArg('--agent-output') || '/tmp/gh-aw/agent_output.json'
const contextPath = getArg('--context') || '/tmp/gh-aw/e2e-audit-context.json'
const patchDir = getArg('--patch-dir') || '/tmp/gh-aw'

// The prompt's testID-only rule for product files is not enforceable via the
// safe-outputs allowed_files globs (they accept any change under screens/
// components), so the patch itself is checked here.
const unconditionalPatchPaths = [/^ui\/native\/tests\/appium\//, /^scripts\/ui\/run-e2e\.sh$/]
const testIdOnlyPatchPaths = [/^ui\/native\/screens\//, /^ui\/native\/components\//]

const requiredEvidenceFields = [
    'audit_context_id',
    'review_scope',
    'comparison_boundary',
    'changed_files',
    'appium_tests_inspected',
    'native_surface_inventory',
    'coverage_map',
    'coverage_gaps',
    'coverage_gap_keys',
    'validation_performed',
]

const invalidNoopPatterns = [
    /task instructions received/i,
    /no audit execution performed/i,
    /no action needed.*instructions/i,
    /kicking off/i,
    /locating AGENTS instructions/i,
    /verified required files/i,
    /smoke test/i,
]

const optionalMarkdownFieldMarker = '[\\s*_`]*'

const context = readJson(contextPath, 'audit context')
const output = readJson(agentOutputPath, 'agent output')

if (!Array.isArray(output.items)) {
    fail('agent output is missing an items array')
}

if (output.items.length === 0) {
    fail('agent produced no safe output items')
}

if (Array.isArray(output.errors) && output.errors.length > 0) {
    fail(`agent output contains errors: ${JSON.stringify(output.errors)}`)
}

const errors = []

const itemTypes = output.items.map(item =>
    normalizeType(item.type || item.kind || item.name || ''),
)
if (output.items.length !== 1) {
    errors.push(
        `agent output must contain exactly one final safe output item, found ${output.items.length}: ${itemTypes.join(', ')}`,
    )
}

for (const [index, item] of output.items.entries()) {
    const type = itemTypes[index]
    const text = collectText(item)

    if (
        type === 'noop' ||
        type === 'create_issue' ||
        type === 'create_pull_request'
    ) {
        validateAuditedOutput(index, type, text, item)
        continue
    }

    if (
        type === 'missing_data' ||
        type === 'missing_tool' ||
        type === 'report_incomplete'
    ) {
        validateBlockedOutput(index, type, text)
        continue
    }

    errors.push(`item ${index} has unsupported safe output type: ${type || '<empty>'}`)
}

if (errors.length > 0) {
    fail(errors.join('\n'))
}

console.log(
    `validated ${output.items.length} E2E audit safe output item(s) for ${context.audit_context_id}`,
)

function validateAuditedOutput(index, type, text, item) {
    if (!text.includes(context.audit_context_id)) {
        errors.push(
            `item ${index} (${type}) is missing audit_context_id ${context.audit_context_id}`,
        )
    }

    if (!fieldHasValue(text, 'review_scope', /^full-codebase\b/i)) {
        errors.push(
            `item ${index} (${type}) must state review_scope=full-codebase`,
        )
    }

    if (
        (type === 'create_issue' || type === 'create_pull_request') &&
        hasIssueLabels(item)
    ) {
        errors.push(
            `item ${index} (${type}) must not set GitHub labels; include audit evidence fields in the body and let the workflow apply configured labels automatically`,
        )
    }

    if (type === 'create_issue' && hasConfiguredTitlePrefix(item)) {
        errors.push(
            `item ${index} (${type}) must not include the [e2e audit] issue title prefix; the workflow applies it automatically`,
        )
    }

    if (
        type === 'create_pull_request' &&
        /^\s*\[e2e coverage\]/i.test(String(item.title || ''))
    ) {
        errors.push(
            `item ${index} (${type}) must not include the [e2e coverage] title prefix; the workflow applies it automatically`,
        )
    }

    const missingFields = requiredEvidenceFields.filter(
        field => !text.toLowerCase().includes(field),
    )
    if (missingFields.length > 0) {
        errors.push(
            `item ${index} (${type}) is missing evidence fields: ${missingFields.join(', ')}`,
        )
    }

    for (const pattern of invalidNoopPatterns) {
        if (type === 'noop' && pattern.test(text)) {
            errors.push(
                `item ${index} (${type}) looks like a pre-audit placeholder: ${pattern}`,
            )
        }
    }

    if (type === 'noop' && !noopStatesNoConcreteGaps(text)) {
        errors.push(
            `item ${index} (${type}) must state that coverage_gaps has no concrete gaps or that concrete gaps are already tracked; use create_issue for new untracked concrete gaps`,
        )
    }

    if (!fieldHasValue(text, 'coverage_gap_keys', /\S/)) {
        errors.push(
            `item ${index} (${type}) must include non-empty coverage_gap_keys`,
        )
    }

    if (
        (type === 'create_issue' || type === 'create_pull_request') &&
        fieldHasValue(text, 'coverage_gap_keys', /^(none|n\/a|na)\b/i)
    ) {
        errors.push(
            `item ${index} (${type}) must list concrete coverage_gap_keys for new gaps`,
        )
    }

    if (type === 'create_pull_request') {
        validatePullRequestEvidence(index, type, text)
    }
}

// A coverage PR must state what was actually validated and that it passed.
// Device execution is impossible on this runner, so honest bodies name the
// static checks, say they passed, and say device validation is still pending.
function validatePullRequestEvidence(index, type, text) {
    const passWords = '(?:pass(?:ed|es)?|clean|succeeded|green|(?:no|0|zero) errors)'
    const statesPass = tool =>
        new RegExp(
            `${tool}[^,;\\n]{0,120}?\\b${passWords}\\b|\\b${passWords}\\b[^,;\\n]{0,120}?${tool}`,
            'i',
        ).test(text)

    if (!statesPass('\\b(tsc|typecheck|type-check|type check)\\b')) {
        errors.push(
            `item ${index} (${type}) must state that the scoped appium typecheck (tsc) ran and passed`,
        )
    }

    if (!statesPass('\\b(eslint|lint)\\b')) {
        errors.push(
            `item ${index} (${type}) must state that eslint ran on the changed files and passed`,
        )
    }

    if (
        /\b(tsc|typecheck|type-check|eslint|lint|prettier)\b[^;\n]{0,80}\b(fail(?:ed|ing|s)?|error(?:ed|s)? out)\b/i.test(
            text,
        )
    ) {
        errors.push(
            `item ${index} (${type}) reports a failed static check; a failed implementation must fall back to create_issue instead of a pull request`,
        )
    }

    if (
        !/device/i.test(text) ||
        !/\b(pending|not (yet )?(run|executed)|was not run|did not run|unable to run|impossible)\b/i.test(
            text,
        )
    ) {
        errors.push(
            `item ${index} (${type}) must state that device validation is pending and was not run in this environment`,
        )
    }

    validatePatchScope(index, type)
}

// Enforce the testID-only rule on the actual patch: test-tree files change
// freely, and for product files under screens/components the added lines
// with their testID attributes stripped must equal the removed lines exactly,
// so nothing but testID attributes can change. Containment checks are not
// enough here: an insertion that preserves the original as a subsequence
// would smuggle arbitrary code past them.
function validatePatchScope(index, type) {
    if (!fs.existsSync(patchDir)) {
        errors.push(
            `item ${index} (${type}) has no patch directory at ${patchDir}; a pull request output requires committed changes`,
        )
        return
    }

    const patchFiles = fs
        .readdirSync(patchDir)
        .filter(name => /^aw[-.].*\.patch$|^aw\.patch$/.test(name))
        .map(name => `${patchDir}/${name}`)

    if (patchFiles.length === 0) {
        errors.push(
            `item ${index} (${type}) has no patch file under ${patchDir}; a pull request output requires committed changes`,
        )
        return
    }

    for (const file of patchFiles) {
        const perFile = parsePatchByFile(fs.readFileSync(file, 'utf8'))
        for (const [path, { added, removed }] of perFile) {
            if (unconditionalPatchPaths.some(p => p.test(path))) continue

            if (!testIdOnlyPatchPaths.some(p => p.test(path))) {
                errors.push(
                    `item ${index} (${type}) patch touches ${path}, outside the appium test tree and the testID-eligible product paths`,
                )
                continue
            }

            const addedResidual = added
                .map(stripTestIdAttributes)
                .map(compactLine)
                .join('')
            const removedResidual = removed.map(compactLine).join('')
            if (addedResidual !== removedResidual) {
                errors.push(
                    `item ${index} (${type}) patch changes more than testID attributes in ${path}`,
                )
            }
        }
    }
}

function stripTestIdAttributes(line) {
    return line.replace(/\btestID\s*=\s*("[^"]*"|\{[^}]*\})/g, '')
}

function parsePatchByFile(patchText) {
    const perFile = new Map()
    let current
    for (const raw of patchText.split('\n')) {
        // File deletions have no "+++ b/" line, so "--- a/" opens the entry
        // that collects their removed lines.
        const target = raw.match(/^\+\+\+ b\/(.+)$/) || raw.match(/^--- a\/(.+)$/)
        if (target) {
            const path = target[1]
            if (!perFile.has(path)) perFile.set(path, { added: [], removed: [] })
            current = perFile.get(path)
            continue
        }
        if (!current) continue
        if (raw.startsWith('+') && !raw.startsWith('+++')) {
            current.added.push(raw.slice(1))
        } else if (raw.startsWith('-') && !raw.startsWith('---')) {
            current.removed.push(raw.slice(1))
        }
    }
    return perFile
}

function compactLine(line) {
    return line.replace(/\s+/g, '')
}

function validateBlockedOutput(index, type, text) {
    const usefulBlocker =
        /\b(blocked|cannot|can't|unable|missing|failed|failure|error|required)\b/i.test(
            text,
        )
    if (!usefulBlocker) {
        errors.push(
            `item ${index} (${type}) must explain the blocker or missing requirement`,
        )
    }
}

function collectText(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }
    if (Array.isArray(value)) return value.map(collectText).join('\n')
    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([key]) => !['labels', 'metadata', 'raw'].includes(key))
            .map(([key, item]) => `${key}: ${collectText(item)}`)
            .join('\n')
    }
    return ''
}

function noopStatesNoConcreteGaps(text) {
    // The multi-sentence extraction matters: a valid noop often opens with
    // "no untracked gap remains" and cites the tracking numbers a sentence
    // later, which a first-period cutoff would drop.
    const value = getFieldValueUntilNextField(text, 'coverage_gaps')
        ?.toLowerCase()
        .replace(/^[\s[\]`_*]+|[\s[\]`_*]+$/g, '')
    if (!value) return false

    if (
        /^(none|none concrete|no concrete gaps?|no meaningful gaps?|no gaps?|no concrete coverage gaps?)(\b|$)/i.test(
            value,
        ) ||
        /^no (new |untracked |remaining )*(concrete |implementable |meaningful )*(coverage )?gaps?(\b|$)/i.test(
            value,
        )
    ) {
        return true
    }

    if (
        /^(all )?(concrete )?(coverage )?gaps? (are )?already tracked\b/i.test(
            value,
        ) ||
        (/\balready tracked\b/i.test(value) &&
            /(\bopen\b.*\bissues?\b|\bissues?\b|#\d+)/i.test(value)) ||
        (/\bmap(?:s|ped)?\s+to\b/i.test(value) &&
            /\b(existing|open)\b.*\bissues?\b.*#\d+/i.test(value)) ||
        /\bno new untracked (concrete )?(coverage )?gaps?\b/i.test(value)
    ) {
        return true
    }

    return false
}

function fieldHasValue(text, field, valuePattern) {
    const value = getFieldValue(text, field)
    return valuePattern.test(value || '')
}

function getFieldValue(text, field) {
    const compact = text.replace(/\s+/g, ' ')
    const match = compact.match(
        new RegExp(
            `\\b${escapeRegExp(field)}\\b${optionalMarkdownFieldMarker}\\s*[:=\\-]\\s*${optionalMarkdownFieldMarker}([^.;]+)`,
            'i',
        ),
    )
    return match?.[1]?.trim()
}

function getFieldValueUntilNextField(text, field) {
    const otherFields = requiredEvidenceFields
        .concat('review_date')
        .filter(name => name !== field)
        .map(escapeRegExp)
        .join('|')
    const compact = text.replace(/\s+/g, ' ')
    const match = compact.match(
        new RegExp(
            `\\b${escapeRegExp(field)}\\b${optionalMarkdownFieldMarker}\\s*[:=\\-]\\s*${optionalMarkdownFieldMarker}(.+?)(?=\\s*\\b(?:${otherFields})\\b\\s*[:=]|$)`,
            'i',
        ),
    )
    return match?.[1]?.trim()
}

function hasIssueLabels(item) {
    if (!Object.hasOwn(item, 'labels')) return false

    const { labels } = item
    if (labels === null || labels === undefined) return false
    if (Array.isArray(labels)) return labels.length > 0
    if (typeof labels === 'string') return labels.trim().length > 0
    return true
}

function hasConfiguredTitlePrefix(item) {
    return /^\s*\[e2e audit\]/i.test(String(item.title || ''))
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeType(type) {
    return String(type).trim().toLowerCase().replaceAll('-', '_')
}

function readJson(file, label) {
    if (!fs.existsSync(file)) {
        fail(`${label} file does not exist: ${file}`)
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
        fail(
            `${label} file is not valid JSON: ${
                error instanceof Error ? error.message : String(error)
            }`,
        )
    }
}

function getArg(name) {
    const index = process.argv.indexOf(name)
    return index === -1 ? undefined : process.argv[index + 1]
}

function fail(message) {
    console.error(`E2E audit output validation failed:\n${message}`)
    process.exit(1)
}
