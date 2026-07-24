# Runtime Observer Installation

This document defines the reviewed, manual installation procedure for the
runtime-only substage of Issue #19. It does not authorize execution of
`runtime-baseline`; Issue #11 retains that authority after a separate approval.

## Scope and evidence

- **VERIFIED:** the Issue #10 runtime payload was merged into `develop` at
  `a82ae11fb8a2428ade1f4bff0e84da40b9811067`.
- **VERIFIED:** the production dispatcher is the regular, non-symlink file
  `/usr/local/sbin/fellow-observer-gate`, owned by `root:root`, mode `0755`,
  with SHA-256
  `e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0`.
- **VERIFIED:** global sshd `ForceCommand` is `none`; the existing key fixes
  `command="/usr/local/sbin/fellow-observer-gate"` and disables agent, port and
  X11 forwarding, PTY and user rc.
- **VERIFIED:** the existing dispatcher allows `baseline` and `whoami`, and
  denies every other command with exit code `126`.
- **UNKNOWN:** production binary versions, the observer primary group and its
  read permissions remain untested by this repository task. Preconditions below
  fail closed and never widen permissions.

The runtime substage depends only on the completed Issue #10. Issue #7 remains
the dependency for a later MongoDB-only substage. This procedure never reads
`.env`, connects to MongoDB, invokes PM2, changes application ACLs, deploys a
business release or restarts a service.

## Repository-controlled artifacts

The source contract is
`scripts/ai/runtime-observer-package-manifest.json`. Generate artifacts only
from a clean reviewed checkout:

```bash
node scripts/ai/runtime-observer-package.mjs --verify-only
node scripts/ai/runtime-observer-package.mjs \
  --output=.ai-reports/runtime-observer-a82ae11fb8a2
node scripts/ai/report-safety-check.mjs \
  .ai-reports/runtime-observer-a82ae11fb8a2/artifact-manifest.json
```

The output directory contains exactly:

- `fellow-runtime-observer-a82ae11fb8a2.tar`
- `fellow-runtime-baseline-wrapper.mjs`
- `fellow-observer-gate`
- `artifact-manifest.json`
- `SHA256SUMS`

Use a separately approved administrative transfer to place the first three
files under `/root`. The restricted observer channel must not support upload.

## Root preconditions and artifact verification

Run these commands only in an explicitly approved root Bash session. Do not
prefix them with `sudo`.

```bash
set -euo pipefail
umask 077
export LC_ALL=C

SOURCE_COMMIT='a82ae11fb8a2428ade1f4bff0e84da40b9811067'
ARCHIVE='/root/fellow-runtime-observer-a82ae11fb8a2.tar'
WRAPPER_ARTIFACT='/root/fellow-runtime-baseline-wrapper.mjs'
GATE_ARTIFACT='/root/fellow-observer-gate'
INSTALL_BASE='/opt/fellow-runtime-observer'
STAGE="${INSTALL_BASE}/.install-${SOURCE_COMMIT}"
TARGET="${INSTALL_BASE}/${SOURCE_COMMIT}"
STATE_BASE='/var/lib/fellow-runtime-observer'
STATE_DIRECTORY="${STATE_BASE}/runtime-baseline"
WRAPPER_TARGET='/usr/local/libexec/fellow-runtime-baseline-wrapper.mjs'
GATE='/usr/local/sbin/fellow-observer-gate'
GATE_BACKUP='/root/fellow-observer-gate.pre-runtime-baseline.e37d7cc4'

test "$(/usr/bin/id -u)" -eq 0
/usr/bin/getent passwd fellow-observer >/dev/null
/usr/bin/getent group fellow-observer >/dev/null
test "$(/usr/bin/id -gn fellow-observer)" = 'fellow-observer'

for executable in \
  /bin/bash \
  /usr/bin/env \
  /usr/bin/find \
  /usr/bin/chmod \
  /usr/bin/chown \
  /usr/bin/install \
  /usr/bin/mktemp \
  /usr/bin/mv \
  /usr/bin/node \
  /usr/bin/prlimit \
  /usr/bin/readlink \
  /usr/bin/rm \
  /usr/bin/sha256sum \
  /usr/bin/stat \
  /usr/bin/tar \
  /usr/bin/timeout \
  /usr/bin/wc \
  /usr/sbin/runuser
do
  test -x "$executable"
done

/usr/bin/node -e \
  "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"

test -f "$ARCHIVE"
test ! -L "$ARCHIVE"
test -f "$WRAPPER_ARTIFACT"
test ! -L "$WRAPPER_ARTIFACT"
test -f "$GATE_ARTIFACT"
test ! -L "$GATE_ARTIFACT"

actual=$(/usr/bin/sha256sum "$ARCHIVE")
test "${actual%% *}" = \
  '7c2b87207504fc1843c011a8307594ddb02ee5dbfdffdfc675be6e5fc6267c30'
actual=$(/usr/bin/sha256sum "$WRAPPER_ARTIFACT")
test "${actual%% *}" = \
  '7d5f34408af6e59425d0876427b2fd9be79d16f752129ff424974377afe33c96'
actual=$(/usr/bin/sha256sum "$GATE_ARTIFACT")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a' "$GATE")" = 'root:root:755'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'

test ! -e "$STAGE"
test ! -e "$TARGET"
test ! -e "$GATE_BACKUP"
```

Any failed assertion stops the procedure. Do not compensate with `chmod` or
ACL changes on the application directory.

## Install immutable payload and wrapper

```bash
/usr/bin/install -d -o root -g root -m 0755 "$INSTALL_BASE"
/usr/bin/install -d -o root -g root -m 0711 "$STATE_BASE"
/usr/bin/install -d -o root -g fellow-observer -m 0730 "$STATE_DIRECTORY"
/usr/bin/install -d -o root -g root -m 0700 "$STAGE"

/usr/bin/tar \
  --extract \
  --file="$ARCHIVE" \
  --directory="$STAGE" \
  --strip-components=1 \
  --no-same-owner \
  --no-same-permissions

test "$(/usr/bin/find "$STAGE" -type f | /usr/bin/wc -l)" -eq 5
test -z "$(/usr/bin/find "$STAGE" -type l -print -quit)"

/usr/bin/chown -R root:root "$STAGE"
/usr/bin/find "$STAGE" -type d -exec /usr/bin/chmod 0555 '{}' +
/usr/bin/find "$STAGE" -type f -exec /usr/bin/chmod 0444 '{}' +

verify_payload() {
  actual=$(/usr/bin/sha256sum "$STAGE/$1")
  test "${actual%% *}" = "$2"
}

verify_payload 'scripts/ai/production-runtime-report.mjs' \
  'fc48fc7b8a8b1161fa6dd81121f9b68bdd7e4f2cabdaaceab613c40b8f57fcce'
verify_payload 'scripts/ai/lib/production-runtime-probe.mjs' \
  'feca02340cf3bd5f113d9256f1c24eaac37374e5fc462e2cef4011df96c3cb2b'
verify_payload 'scripts/ai/lib/production-runtime-contract.mjs' \
  'f7066b119a8d0120acfd58c9facdab5b0c5ecc322160d19250d2b53b1bda3a4e'
verify_payload 'scripts/ai/report-safety-check.mjs' \
  'd7afb7fed204b792d2f9a025d09d67a95589b2313fbddd8c8d6fccb51413275a'
verify_payload 'scripts/ai/lib/safe-report-utils.mjs' \
  '7d08d9d3f9e1b205d0bab704ded99f72cc68e37fb0385327ae4492cc4637be9e'
unset -f verify_payload

/usr/bin/mv "$STAGE" "$TARGET"
/usr/bin/install -d -o root -g root -m 0755 /usr/local/libexec
/usr/bin/install -o root -g root -m 0555 \
  "$WRAPPER_ARTIFACT" \
  "$WRAPPER_TARGET"

test "$(/usr/bin/stat -c '%U:%G:%a' "$TARGET")" = 'root:root:555'
test "$(/usr/bin/stat -c '%U:%G:%a' "$WRAPPER_TARGET")" = 'root:root:555'
actual=$(/usr/bin/sha256sum "$WRAPPER_TARGET")
test "${actual%% *}" = \
  '7d5f34408af6e59425d0876427b2fd9be79d16f752129ff424974377afe33c96'

set +e
/usr/sbin/runuser -u fellow-observer -- \
  /usr/bin/node "$WRAPPER_TARGET" forbidden-argument \
  >/dev/null 2>&1
reject_code=$?
set -e
test "$reject_code" -eq 64
```

The last command verifies argument rejection only. Never invoke the wrapper
without that forbidden argument during Issue #19.

## Backup and atomically replace the dispatcher

The temporary file is created in `/usr/local/sbin`, so the final `mv -T` stays
on the same filesystem. The original file is backed up and re-hashed before
replacement.

```bash
/usr/bin/install -o root -g root -m 0500 "$GATE" "$GATE_BACKUP"
actual=$(/usr/bin/sha256sum "$GATE_BACKUP")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'

GATE_TEMP=$(/usr/bin/mktemp \
  '/usr/local/sbin/.fellow-observer-gate.issue-19.XXXXXX')
trap '/usr/bin/rm -f -- "$GATE_TEMP"' EXIT

/usr/bin/install -o root -g root -m 0755 "$GATE_ARTIFACT" "$GATE_TEMP"
/bin/bash -n "$GATE_TEMP"
test -f "$GATE_TEMP"
test ! -L "$GATE_TEMP"
test "$(/usr/bin/stat -c '%U:%G:%a' "$GATE_TEMP")" = 'root:root:755'
actual=$(/usr/bin/sha256sum "$GATE_TEMP")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

/usr/bin/mv -fT "$GATE_TEMP" "$GATE"
trap - EXIT

/bin/bash -n "$GATE"
test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a' "$GATE")" = 'root:root:755'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'
```

Do not edit `authorized_keys`, `sshd_config`, reload/restart sshd or execute
`runtime-baseline`. Existing `baseline` and `whoami` may be verified later in a
separately approved observation window.

## Atomic dispatcher rollback

Use this block only when rollback is explicitly authorized. It refuses to
overwrite an unexpected current dispatcher.

```bash
set -euo pipefail
export LC_ALL=C

GATE='/usr/local/sbin/fellow-observer-gate'
GATE_BACKUP='/root/fellow-observer-gate.pre-runtime-baseline.e37d7cc4'

test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a' "$GATE")" = 'root:root:755'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

test -f "$GATE_BACKUP"
test ! -L "$GATE_BACKUP"
actual=$(/usr/bin/sha256sum "$GATE_BACKUP")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'

ROLLBACK_TEMP=$(/usr/bin/mktemp \
  '/usr/local/sbin/.fellow-observer-gate.rollback.XXXXXX')
trap '/usr/bin/rm -f -- "$ROLLBACK_TEMP"' EXIT
/usr/bin/install -o root -g root -m 0755 "$GATE_BACKUP" "$ROLLBACK_TEMP"
/bin/bash -n "$ROLLBACK_TEMP"
actual=$(/usr/bin/sha256sum "$ROLLBACK_TEMP")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'

/usr/bin/mv -fT "$ROLLBACK_TEMP" "$GATE"
trap - EXIT

/bin/bash -n "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a' "$GATE")" = 'root:root:755'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'
```

After dispatcher rollback, removal of the exact versioned payload and wrapper
is a separate destructive action. Use the following block only with explicit
removal authorization. Its fixed-path and hash assertions must all pass first.

```bash
set -euo pipefail
export LC_ALL=C

SOURCE_COMMIT='a82ae11fb8a2428ade1f4bff0e84da40b9811067'
TARGET="/opt/fellow-runtime-observer/${SOURCE_COMMIT}"
WRAPPER_TARGET='/usr/local/libexec/fellow-runtime-baseline-wrapper.mjs'
STATE_DIRECTORY='/var/lib/fellow-runtime-observer/runtime-baseline'
STATE_BASE='/var/lib/fellow-runtime-observer'
INSTALL_BASE='/opt/fellow-runtime-observer'
GATE='/usr/local/sbin/fellow-observer-gate'

actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'e37d7cc4d7bf48553289353ff511706eb163eaa1527a449561c7c514fba8e7c0'

test -d "$TARGET"
test ! -L "$TARGET"
test "$(/usr/bin/readlink -f "$TARGET")" = "$TARGET"
test "$(/usr/bin/find "$TARGET" -type f | /usr/bin/wc -l)" -eq 5
test -z "$(/usr/bin/find "$TARGET" -type l -print -quit)"
test -z "$(/usr/bin/find "$TARGET" ! -user root -print -quit)"

test -f "$WRAPPER_TARGET"
test ! -L "$WRAPPER_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a' "$WRAPPER_TARGET")" = 'root:root:555'
actual=$(/usr/bin/sha256sum "$WRAPPER_TARGET")
test "${actual%% *}" = \
  '7d5f34408af6e59425d0876427b2fd9be79d16f752129ff424974377afe33c96'

/usr/bin/rm -f -- "$WRAPPER_TARGET"
/usr/bin/rm -rf -- "$TARGET"
/usr/bin/rmdir "$STATE_DIRECTORY"
/usr/bin/rmdir "$STATE_BASE"
/usr/bin/rmdir "$INSTALL_BASE"
```

`rmdir` intentionally fails rather than deleting a non-empty state or parent
directory. Never target an application, backup or user-data path.

## Observer command boundary

The replacement dispatcher preserves `baseline` and `whoami`. The sole new
command is the exact string `runtime-baseline`; whitespace, arguments, shell
metacharacters and all other commands still reach the default exit-126 branch.

`runtime-baseline` clears the inherited environment and applies a 30-second
wall timeout plus fixed CPU, file, process and descriptor limits. The Node
wrapper then:

1. rejects arguments;
2. verifies every payload hash and root-owned, non-writable file boundary;
3. executes only the fixed `production-runtime-report.mjs` payload;
4. validates the strict report contract;
5. runs the fixed `report-safety-check.mjs` gate against a mode-0600 temporary
   report;
6. removes the temporary directory before emitting the report;
7. emits only a generic failure message and no report if any gate fails.

The wrapper uses no shell or pipeline. The runtime probe itself uses bounded
`execFile` calls for its reviewed checks and keeps PM2 `unsupported`.
