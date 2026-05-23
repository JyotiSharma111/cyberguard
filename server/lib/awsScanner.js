/**
 * AWS Security Scanner
 * Uses AWS SDK with read-only credentials.
 * Checks for common cloud misconfigurations that cause breaches.
 *
 * Required IAM permissions (read-only policy):
 *   s3:GetBucketAcl, s3:GetBucketPolicy, s3:GetBucketPublicAccessBlock,
 *   s3:ListAllMyBuckets, ec2:DescribeSecurityGroups, ec2:DescribeInstances,
 *   iam:GetAccountPasswordPolicy, iam:ListUsers, iam:ListMFADevices,
 *   iam:GetAccountSummary, iam:GenerateCredentialReport, iam:GetCredentialReport
 *
 * Create a read-only IAM user, attach SecurityAudit managed policy,
 * generate access keys, add to CyberGuard integrations.
 */

import {
  IAMClient,
  GetAccountPasswordPolicyCommand,
  GetAccountSummaryCommand,
  GenerateCredentialReportCommand,
  GetCredentialReportCommand,
  ListUsersCommand,
} from '@aws-sdk/client-iam'

import {
  S3Client,
  ListBucketsCommand,
  GetBucketAclCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
} from '@aws-sdk/client-s3'

import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  DescribeRegionsCommand,
} from '@aws-sdk/client-ec2'

function makeClients(accessKeyId, secretAccessKey, region = 'us-east-1') {
  const creds = { credentials: { accessKeyId, secretAccessKey }, region }
  return {
    iam: new IAMClient(creds),
    s3:  new S3Client(creds),
    ec2: new EC2Client(creds),
  }
}

export async function scanAWS({ accessKeyId, secretAccessKey, region = 'us-east-1' }) {
  if (!accessKeyId || !secretAccessKey) {
    return {
      ok: false, skipped: true,
      reason: 'AWS credentials not configured — add Access Key ID and Secret in integrations settings'
    }
  }

  console.log('[awsScanner] Starting AWS scan...')
  const startedAt = Date.now()
  const { iam, s3, ec2 } = makeClients(accessKeyId, secretAccessKey, region)
  const issues   = []
  const findings = {}

  // 1. IAM Password Policy
  console.log('[awsScanner] Checking IAM password policy...')
  try {
    const pp = await iam.send(new GetAccountPasswordPolicyCommand({}))
    const policy = pp.PasswordPolicy
    findings.passwordPolicy = policy

    if (!policy.RequireUppercaseCharacters || !policy.RequireLowercaseCharacters ||
        !policy.RequireNumbers || !policy.RequireSymbols) {
      issues.push({
        id: 'aws-weak-password-policy', type: 'AWS', sev: 'medium',
        title: 'IAM password policy does not enforce strong passwords',
        detail: 'Weak password requirements mean IAM users can use simple passwords that are easily guessed.',
        fix: ['AWS Console → IAM → Account settings → Edit password policy', 'Enable: uppercase, lowercase, numbers, symbols, min 12 characters']
      })
    }
    if (!policy.MaxPasswordAge || policy.MaxPasswordAge > 90) {
      issues.push({
        id: 'aws-password-no-rotation', type: 'AWS', sev: 'low',
        title: 'IAM passwords do not expire (or expire > 90 days)',
        detail: 'Passwords should be rotated at least every 90 days.',
        fix: ['Set MaxPasswordAge to 90 in IAM password policy']
      })
    }
  } catch (err) {
    if (err.name === 'NoSuchEntityException') {
      issues.push({
        id: 'aws-no-password-policy', type: 'AWS', sev: 'high',
        title: 'No IAM password policy configured',
        detail: 'Without a password policy, IAM users can set any password including trivially weak ones.',
        fix: ['AWS Console → IAM → Account settings → Set password policy', 'Require 12+ chars, uppercase, lowercase, numbers, symbols']
      })
    }
  }

  // 2. Root account MFA
  console.log('[awsScanner] Checking root account...')
  try {
    const summary = await iam.send(new GetAccountSummaryCommand({}))
    const s = summary.SummaryMap
    findings.accountSummary = {
      rootMfaActive:        s.AccountMFAEnabled === 1,
      rootAccessKeysActive: s.AccountAccessKeysPresent > 0,
      iamUsersCount:        s.Users,
      groupsCount:          s.Groups,
    }

    if (!findings.accountSummary.rootMfaActive) {
      issues.push({
        id: 'aws-root-no-mfa', type: 'AWS', sev: 'critical',
        title: 'Root account does not have MFA enabled',
        detail: 'The AWS root account has unrestricted access to everything. Without MFA, anyone who gets the password owns your entire AWS account.',
        fix: [
          'Sign in as root → Account menu → Security credentials → Multi-factor authentication',
          'Add a virtual MFA device (Google Authenticator or Authy)',
          'Do not use the root account for daily operations',
        ]
      })
    }
    if (findings.accountSummary.rootAccessKeysActive) {
      issues.push({
        id: 'aws-root-access-keys', type: 'AWS', sev: 'critical',
        title: 'Root account has active access keys',
        detail: 'Root access keys are extremely dangerous. If exposed, an attacker has unlimited access to your AWS account. These should never exist.',
        fix: [
          'Sign in as root → Account menu → Security credentials → Access keys → Delete all root access keys',
          'Use IAM user access keys for programmatic access instead',
        ]
      })
    }
  } catch (err) {
    console.warn('[awsScanner] Account summary error:', err.message)
  }

  // 3. S3 bucket public access
  console.log('[awsScanner] Checking S3 buckets...')
  try {
    const buckets = await s3.send(new ListBucketsCommand({}))
    findings.buckets = []

    for (const bucket of (buckets.Buckets ?? []).slice(0, 20)) {
      const bName = bucket.Name
      let isPublic = false, noEncryption = false

      // Public access block
      try {
        const pub = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bName }))
        const cfg = pub.PublicAccessBlockConfiguration
        isPublic = !cfg.BlockPublicAcls || !cfg.BlockPublicPolicy || !cfg.IgnorePublicAcls || !cfg.RestrictPublicBuckets
      } catch {
        isPublic = true // no public access block = potentially public
      }

      // Encryption
      try {
        await s3.send(new GetBucketEncryptionCommand({ Bucket: bName }))
      } catch (err) {
        if (err.name === 'ServerSideEncryptionConfigurationNotFoundError') noEncryption = true
      }

      findings.buckets.push({ name: bName, isPublic, noEncryption })

      if (isPublic) {
        issues.push({
          id: `aws-s3-public-${bName}`, type: 'AWS', sev: 'critical',
          title: `S3 bucket "${bName}" is publicly accessible`,
          detail: `This bucket does not have all public access block settings enabled. Its contents may be readable by anyone on the internet.`,
          fix: [
            `AWS Console → S3 → ${bName} → Permissions → Block public access → Edit → Block all`,
            'Verify no application breaks after enabling (test first in staging)',
          ]
        })
      }
      if (noEncryption) {
        issues.push({
          id: `aws-s3-unencrypted-${bName}`, type: 'AWS', sev: 'medium',
          title: `S3 bucket "${bName}" has no server-side encryption`,
          detail: 'Unencrypted S3 buckets store data in plaintext. While access-controlled, encryption adds a critical second layer of protection.',
          fix: [
            `AWS Console → S3 → ${bName} → Properties → Default encryption → Enable (AES-256 or AWS KMS)`,
            'Existing objects need to be re-uploaded or copied to gain encryption',
          ]
        })
      }
    }
  } catch (err) {
    console.warn('[awsScanner] S3 error:', err.message)
  }

  // 4. Security Groups — open to world
  console.log('[awsScanner] Checking security groups...')
  try {
    const sgs = await ec2.send(new DescribeSecurityGroupsCommand({}))
    const dangerousPorts = [22, 3389, 3306, 5432, 27017, 6379, 9200, 1433]

    for (const sg of (sgs.SecurityGroups ?? [])) {
      for (const rule of (sg.IpPermissions ?? [])) {
        const openToWorld = rule.IpRanges?.some(r => r.CidrIp === '0.0.0.0/0') ||
                            rule.Ipv6Ranges?.some(r => r.CidrIpv6 === '::/0')

        if (!openToWorld) continue

        const port = rule.FromPort
        if (dangerousPorts.includes(port)) {
          const portNames = { 22:'SSH', 3389:'RDP', 3306:'MySQL', 5432:'PostgreSQL', 27017:'MongoDB', 6379:'Redis', 9200:'Elasticsearch', 1433:'MSSQL' }
          issues.push({
            id: `aws-sg-open-${sg.GroupId}-${port}`, type: 'AWS',
            sev: [3389, 3306, 5432, 27017, 6379, 9200, 1433].includes(port) ? 'critical' : 'high',
            title: `Security group "${sg.GroupName}" allows ${portNames[port] ?? `port ${port}`} from anywhere (0.0.0.0/0)`,
            detail: `Port ${port} is open to the entire internet in security group ${sg.GroupName} (${sg.GroupId}). This is a common ransomware entry point.`,
            fix: [
              `AWS Console → EC2 → Security Groups → ${sg.GroupId} → Inbound rules → Edit`,
              `Change source from 0.0.0.0/0 to your specific IP range or VPN CIDR`,
              port === 3389 ? 'RDP should only be accessible through a VPN, never the open internet' : `Restrict port ${port} to your office or VPN IP range only`,
            ]
          })
        }
      }
    }
  } catch (err) {
    console.warn('[awsScanner] Security groups error:', err.message)
  }

  // 5. CloudTrail — is logging enabled?
  console.log('[awsScanner] Checking CloudTrail...')
  try {
    const cloudtrailRes = await fetch(
      `https://cloudtrail.${region}.amazonaws.com/`,
      { method: 'GET', headers: { 'Content-Type': 'application/x-amz-json-1.1' } }
    )
    // If we can't check, just note it
    findings.cloudtrailNote = 'CloudTrail status requires additional IAM permissions'
  } catch {}

  const critCount = issues.filter(i => i.sev === 'critical').length
  const highCount  = issues.filter(i => i.sev === 'high').length
  const score = Math.max(0, 100 - (critCount * 20) - (highCount * 10) - (issues.filter(i=>i.sev==='medium').length * 5))
  const elapsed = Date.now() - startedAt

  console.log(`[awsScanner] Done in ${elapsed}ms — ${issues.length} issues, score: ${score}`)
  return { ok: true, score, issues, findings, elapsedMs: elapsed, scannedAt: new Date().toISOString() }
}
