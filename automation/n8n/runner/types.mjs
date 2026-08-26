/**
 * @typedef {'demo'|'real'} RunMode
 * @typedef {'queued'|'running'|'succeeded'|'failed'|'blocked'} JobStatus
 * @typedef {'acceptance'|'adr'|'kickoff'|'plan'|'spec-check'|'build-task'|'build-remaining'|'verify'|'review'|'security-review'|'fix-defect'|'fix-findings'|'close'|'final-audit'|'branch'} ActionName
 *
 * @typedef {object} Artifact
 * @property {string} name
 * @property {string} path
 * @property {string|null} sha256
 * @property {boolean} exists
 *
 * @typedef {object} Finding
 * @property {string} id
 * @property {'HIGH'|'MEDIUM'|'LOW'} severity
 * @property {string} fileLine
 * @property {string} finding
 * @property {string} remediation
 * @property {'code'|'security'} reviewer
 *
 * @typedef {object} GateDecision
 * @property {number} gate
 * @property {string} decision
 * @property {string} decidedAt
 * @property {Record<string, unknown>} details
 *
 * @typedef {object} FinalAudit
 * @property {boolean} allGatesOccurred
 * @property {boolean} gateFiveCompleteOrWaived
 * @property {boolean} ownershipValid
 * @property {boolean} noForbiddenGitCommands
 * @property {boolean} requiredArtifactsPresent
 * @property {boolean} threeLayersChanged
 * @property {boolean} verificationMeaningRecorded
 * @property {string[]} failures
 *
 * @typedef {object} Job
 * @property {string} id
 * @property {string} runId
 * @property {ActionName} action
 * @property {JobStatus} status
 * @property {string} requestId
 * @property {string} createdAt
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 * @property {number|null} exitCode
 * @property {string|null} threadId Engine session ID: a Codex thread or a Claude session.
 * @property {string} finalMessage
 * @property {Record<string, unknown>} evidence
 * @property {string|null} error
 * @property {string|null} clonePath
 * @property {string|null} taskNote
 *
 * @typedef {object} Coverage
 * @property {'GO'|'NO-GO'|null} verdict
 * @property {string[]} uncoveredCriteria Criteria that appear on a gap line.
 * @property {string[]} gapLines
 *
 * @typedef {object} MissingSkill
 * @property {string} name
 * @property {string} path
 *
 * @typedef {object} Run
 * @property {string} id
 * @property {RunMode} mode
 * @property {string} taskNumber
 * @property {string} baseRef
 * @property {string|null} repoPath
 * @property {string|null} expectedBranch
 * @property {string|null} taskNote
 * @property {string} status
 * @property {string} currentPhase
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Record<string, GateDecision>} gates
 * @property {Record<string, string>} sessions
 * @property {Record<string, number>} failures
 * @property {Artifact[]} artifacts
 * @property {Finding[]} findings
 * @property {Coverage|null} coverage Recorded by spec-check; read by a coverage revision.
 * @property {MissingSkill[]} [missingSkills] Authoring skills absent from the clone.
 * @property {boolean} verificationMeaningRecorded True only when verify.sh ran and was read.
 * @property {number} [planTaskCount]
 * @property {string[]} forbiddenCommands
 * @property {FinalAudit|null} finalAudit
 */

export const TYPES_VERSION = 1;
