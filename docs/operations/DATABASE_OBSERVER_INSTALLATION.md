# Database Observer Installation

This document defines the reviewed, manual installation and rollback procedure
for Issue #19's MongoDB read-only observer substage. It is not authorization to
connect to MongoDB, create production identities, install files, or execute
`database-baseline`. Each of those operations requires a separate approval.

## Scope and evidence

- **VERIFIED:** PR #23 merged the Issue #7 database inspector into `develop` at
  `5124d83f93a4faf76de6e4b629d67cdb48414a42`.
- **VERIFIED:** the package contract contains the ten repository payload files
  from that exact Git object plus the 25-package Mongoose/MongoDB dependency
  closure derived from the same commit's npm lock.
- **VERIFIED:** the deterministic archive has 1,092 regular-file members,
  including its member-level integrity manifest. The generated artifact
  manifest records every member's relative and installed path, byte count,
  SHA-256, `root:root` owner and `0444` installed mode.
- **VERIFIED:** the existing runtime observer archive, wrapper and dispatcher
  template remain unchanged. The combined database-stage dispatcher preserves
  `baseline`, `whoami`, `runtime-baseline` and default exit-126 behavior. Its
  exact `database-baseline` branch clears the inherited environment before
  invoking the fixed no-argument sudo command.
- **VERIFIED:** Issue #11 records that the product owner installed and tested
  the runtime channel. The repository's expected current dispatcher SHA-256 is
  `d4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2`.
- **UNKNOWN:** the current production dispatcher SHA, sudo/visudo version,
  binary paths, free UID/GID, MongoDB deployment, application database name,
  collection existence and database authorization behavior. The preconditions
  below fail closed rather than treating repository expectations as runtime
  fact.

This substage does not read an application `.env`, application source tree or
application `node_modules`. It installs under separate `/opt`, `/etc`,
`/var/lib` and `/usr/local/libexec` paths and does not overwrite the runtime
observer package or wrapper.

## Repository-controlled artifacts

Generate artifacts only from a clean reviewed checkout whose HEAD contains
this manifest:

```bash
node scripts/ai/database-observer-package.mjs --verify-only
node scripts/ai/database-observer-package.mjs \
  --output=.ai-reports/database-observer-5124d83f93a4
node scripts/ai/report-safety-check.mjs \
  .ai-reports/database-observer-5124d83f93a4/artifact-manifest.json
```

The output directory contains exactly:

- `fellow-database-observer-5124d83f93a4.tar`
- `database-observer-integrity.json`
- `fellow-database-baseline-wrapper.mjs`
- `fellow-database-baseline-launcher.mjs`
- `fellow-database-observer-sudoers`
- `fellow-observer-gate`
- `artifact-manifest.json`
- `SHA256SUMS`

The fixed artifact hashes are:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| database archive | 13,885,440 | `30b67e416a32a4e317e4a7a1554a76c7d43b12abf7ab6448c2ffadf3d106c863` |
| member integrity manifest | 425,450 | `53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4` |
| database wrapper | 12,729 | `f8d48ae2bd87cca44cd43b8c9b27878cdbe42b5be86ce495f6072997599a85ca` |
| fixed launcher | 1,887 | `9f0b17df88dc3509dedd529b476ac94a508b1de267c9454296a22ac999ca232a` |
| sudoers template | 228 | `b5c4f7dcb4b60b7c7d1c5863d7cd56c4efb2807a0dff7b2686da50dd993c61ac` |
| combined dispatcher | 1,078 | `87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215` |

Use a separately approved administrative transfer to place the first six
files under `/root`. The restricted observer channel must not support upload.
Do not transfer a URI, report or credential with the package.

## Read-only production preconditions

Run this block only in an explicitly approved root Bash session. Do not prefix
it with `sudo`. It does not create an account or change a file.

```bash
set -euo pipefail
umask 077
export LC_ALL=C

SOURCE_COMMIT='5124d83f93a4faf76de6e4b629d67cdb48414a42'
ARCHIVE='/root/fellow-database-observer-5124d83f93a4.tar'
INTEGRITY_ARTIFACT='/root/database-observer-integrity.json'
WRAPPER_ARTIFACT='/root/fellow-database-baseline-wrapper.mjs'
LAUNCHER_ARTIFACT='/root/fellow-database-baseline-launcher.mjs'
SUDOERS_ARTIFACT='/root/fellow-database-observer-sudoers'
GATE_ARTIFACT='/root/fellow-observer-gate'
GATE='/usr/local/sbin/fellow-observer-gate'

test "$(/usr/bin/id -u)" -eq 0
/usr/bin/getent passwd fellow-observer >/dev/null
test ! -e /usr/local/libexec/fellow-database-baseline-wrapper.mjs
test ! -e /usr/local/libexec/fellow-database-baseline-launcher.mjs
test ! -e /etc/sudoers.d/fellow-database-observer
test ! -e /opt/fellow-database-observer/"$SOURCE_COMMIT"

for executable in \
  /bin/bash \
  /usr/bin/env \
  /usr/bin/find \
  /usr/bin/chmod \
  /usr/bin/chown \
  /usr/bin/cut \
  /usr/bin/getent \
  /usr/bin/id \
  /usr/bin/install \
  /usr/bin/mktemp \
  /usr/bin/mv \
  /usr/bin/node \
  /usr/bin/prlimit \
  /usr/bin/pgrep \
  /usr/bin/readlink \
  /usr/bin/rm \
  /usr/bin/rmdir \
  /usr/bin/sha256sum \
  /usr/bin/stat \
  /usr/bin/sudo \
  /usr/bin/tar \
  /usr/bin/test \
  /usr/bin/timeout \
  /usr/bin/wc \
  /usr/sbin/groupdel \
  /usr/sbin/nologin \
  /usr/sbin/runuser \
  /usr/sbin/useradd \
  /usr/sbin/userdel \
  /usr/sbin/visudo
do
  test -x "$executable"
done

/usr/bin/node -e \
  "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"

for artifact in \
  "$ARCHIVE" \
  "$INTEGRITY_ARTIFACT" \
  "$WRAPPER_ARTIFACT" \
  "$LAUNCHER_ARTIFACT" \
  "$SUDOERS_ARTIFACT" \
  "$GATE_ARTIFACT"
do
  test -f "$artifact"
  test ! -L "$artifact"
  test "$(/usr/bin/stat -c '%h' "$artifact")" -eq 1
done

actual=$(/usr/bin/sha256sum "$ARCHIVE")
test "${actual%% *}" = \
  '30b67e416a32a4e317e4a7a1554a76c7d43b12abf7ab6448c2ffadf3d106c863'
actual=$(/usr/bin/sha256sum "$INTEGRITY_ARTIFACT")
test "${actual%% *}" = \
  '53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4'
actual=$(/usr/bin/sha256sum "$WRAPPER_ARTIFACT")
test "${actual%% *}" = \
  'f8d48ae2bd87cca44cd43b8c9b27878cdbe42b5be86ce495f6072997599a85ca'
actual=$(/usr/bin/sha256sum "$LAUNCHER_ARTIFACT")
test "${actual%% *}" = \
  '9f0b17df88dc3509dedd529b476ac94a508b1de267c9454296a22ac999ca232a'
actual=$(/usr/bin/sha256sum "$SUDOERS_ARTIFACT")
test "${actual%% *}" = \
  'b5c4f7dcb4b60b7c7d1c5863d7cd56c4efb2807a0dff7b2686da50dd993c61ac'
actual=$(/usr/bin/sha256sum "$GATE_ARTIFACT")
test "${actual%% *}" = \
  '87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215'

test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE")" = 'root:root:755:1'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

/usr/sbin/visudo -cf "$SUDOERS_ARTIFACT"
```

The sudoers template uses the documented `""` command-argument form to mean
that the launcher is allowed with no arguments only. Parsing the file is
necessary but not sufficient: after the runner and launcher exist, the
non-executing `sudo -l` checks below must prove that the no-argument form is
allowed and an extra argument is denied. If either check is unavailable or
unexpected, stop. Do not grant `fellow-observer` direct secret access.

## Create the isolated OS account

Execute only after the read-only preconditions pass and account creation is
separately approved:

```bash
set -euo pipefail
export LC_ALL=C

test "$(/usr/bin/id -u)" -eq 0
if /usr/bin/getent passwd fellow-db-runner >/dev/null; then
  exit 1
fi
if /usr/bin/getent group fellow-db-runner >/dev/null; then
  exit 1
fi

/usr/sbin/useradd \
  --system \
  --user-group \
  --home-dir /nonexistent \
  --no-create-home \
  --shell /usr/sbin/nologin \
  fellow-db-runner

test "$(/usr/bin/getent passwd fellow-db-runner | /usr/bin/cut -d: -f6)" = '/nonexistent'
test "$(/usr/bin/getent passwd fellow-db-runner | /usr/bin/cut -d: -f7)" = '/usr/sbin/nologin'
test "$(/usr/bin/id -Gn fellow-db-runner)" = 'fellow-db-runner'
test ! -e /nonexistent/.ssh

for protected_path in \
  /www/wwwroot/couple-website \
  /www/wwwroot/couple-website/backend/uploads \
  /www/wwwroot/couple-website/backend/backups \
  /var/lib/mongo \
  /var/lib/mongodb
do
  if test -e "$protected_path"; then
    /usr/sbin/runuser -u fellow-db-runner -- \
      /usr/bin/test ! -w "$protected_path"
  fi
done
```

Do not add this account to `wheel`, `sudo`, an application deployment group,
an upload/backup group or a database service group. Its nologin identity has no
SSH key. The only elevation rule later runs one fixed launcher as this account;
the launcher does not accept arguments or inherited environment values.
If production uses other application, upload, backup or MongoDB data paths,
the administrator must add those exact paths to the same read-only non-writable
check before continuing; do not discover them by reading an application `.env`.

## Install the immutable package

The extraction stage is new and private. The fixed archive SHA makes any
member/type/path change fail before extraction; post-extraction checks reject
links, special files, extra members and unexpected hard links before the stage
is made visible.

```bash
set -euo pipefail
umask 077
export LC_ALL=C

SOURCE_COMMIT='5124d83f93a4faf76de6e4b629d67cdb48414a42'
ARCHIVE='/root/fellow-database-observer-5124d83f93a4.tar'
INSTALL_BASE='/opt/fellow-database-observer'
STAGE="${INSTALL_BASE}/.install-${SOURCE_COMMIT}"
TARGET="${INSTALL_BASE}/${SOURCE_COMMIT}"

test "$(/usr/bin/id -u)" -eq 0
test ! -e "$STAGE"
test ! -e "$TARGET"
actual=$(/usr/bin/sha256sum "$ARCHIVE")
test "${actual%% *}" = \
  '30b67e416a32a4e317e4a7a1554a76c7d43b12abf7ab6448c2ffadf3d106c863'

if test -e "$INSTALL_BASE"; then
  test -d "$INSTALL_BASE"
  test ! -L "$INSTALL_BASE"
  test "$(/usr/bin/readlink -f "$INSTALL_BASE")" = "$INSTALL_BASE"
  test "$(/usr/bin/stat -c '%U:%G:%a' "$INSTALL_BASE")" = 'root:root:755'
else
  /usr/bin/install -d -o root -g root -m 0755 "$INSTALL_BASE"
fi
/usr/bin/install -d -o root -g root -m 0700 "$STAGE"
/usr/bin/tar \
  --extract \
  --file="$ARCHIVE" \
  --directory="$STAGE" \
  --strip-components=1 \
  --no-same-owner \
  --no-same-permissions

test "$(/usr/bin/find "$STAGE" -type f | /usr/bin/wc -l)" -eq 1092
test -z "$(/usr/bin/find "$STAGE" -type l -print -quit)"
test -z "$(/usr/bin/find "$STAGE" ! -type d ! -type f -print -quit)"
test -z "$(/usr/bin/find "$STAGE" -type f ! -links 1 -print -quit)"
test -f "$STAGE/database-observer-integrity.json"
test ! -L "$STAGE/database-observer-integrity.json"
actual=$(/usr/bin/sha256sum "$STAGE/database-observer-integrity.json")
test "${actual%% *}" = \
  '53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4'

/usr/bin/chown -R root:root "$STAGE"
/usr/bin/find "$STAGE" -type d -exec /usr/bin/chmod 0555 '{}' +
/usr/bin/find "$STAGE" -type f -exec /usr/bin/chmod 0444 '{}' +
test -z "$(/usr/bin/find "$STAGE" ! -user root -print -quit)"
test -z "$(/usr/bin/find "$STAGE" -perm /0222 -print -quit)"

/usr/bin/mv "$STAGE" "$TARGET"
test "$(/usr/bin/readlink -f "$TARGET")" = "$TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a' "$TARGET")" = 'root:root:555'
```

The wrapper verifies the pinned integrity-manifest hash, every member hash and
byte count, every parent directory, root ownership, non-writable modes,
single-link regular-file type and the absence of extra files again before each
run. It does not trust the successful extraction alone.

## Create state and secret paths

Create the state directories without a URI:

```bash
set -euo pipefail
/usr/bin/install -d -o root -g root -m 0711 /var/lib/fellow-database-observer
/usr/bin/install -d -o root -g fellow-db-runner -m 0730 \
  /var/lib/fellow-database-observer/database-baseline
/usr/bin/install -d -o root -g root -m 0711 /etc/fellow-database-observer

test "$(/usr/bin/stat -c '%U:%G:%a' /var/lib/fellow-database-observer)" = 'root:root:711'
test "$(/usr/bin/stat -c '%U:%G:%a' /var/lib/fellow-database-observer/database-baseline)" = 'root:fellow-db-runner:730'
test "$(/usr/bin/stat -c '%U:%G:%a' /etc/fellow-database-observer)" = 'root:root:711'
```

The URI must be supplied either through an approved secret-management channel
or an approved interactive root session. Never place it on a command line,
paste it into an Issue/PR/chat, echo it, or read an application `.env`. The
following interactive block keeps the value out of the command history and
atomically installs a one-line file. It deliberately prints no value or hash:

```bash
set -euo pipefail
umask 077

SECRET_DIRECTORY='/etc/fellow-database-observer'
SECRET_TARGET='/etc/fellow-database-observer/mongodb-uri'
test ! -e "$SECRET_TARGET"
SECRET_TEMP=$(/usr/bin/mktemp "${SECRET_DIRECTORY}/.mongodb-uri.XXXXXX")
trap '/usr/bin/rm -f -- "$SECRET_TEMP"' EXIT

IFS= read -r -s -p 'MongoDB observer URI: ' DATABASE_OBSERVER_URI
printf '\n' >&2
printf '%s' "$DATABASE_OBSERVER_URI" >"$SECRET_TEMP"
unset DATABASE_OBSERVER_URI

/usr/bin/node --input-type=module - "$SECRET_TEMP" <<'NODE'
import { readFileSync } from 'node:fs'
const path = process.argv[2]
const raw = readFileSync(path, 'utf8')
if (
  !raw ||
  raw !== raw.trim() ||
  raw.includes('\n') ||
  raw.includes('\r') ||
  /[\u0000-\u001f\u007f]/u.test(raw) ||
  Buffer.byteLength(raw, 'utf8') > 4096 ||
  !(raw.startsWith('mongodb://') || raw.startsWith('mongodb+srv://'))
) process.exit(1)
NODE

/usr/bin/chown root:fellow-db-runner "$SECRET_TEMP"
/usr/bin/chmod 0440 "$SECRET_TEMP"
test -f "$SECRET_TEMP"
test ! -L "$SECRET_TEMP"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SECRET_TEMP")" = \
  'root:fellow-db-runner:440:1'
/usr/bin/mv -fT "$SECRET_TEMP" "$SECRET_TARGET"
trap - EXIT
```

Rotation repeats the same temporary-file validation and mode checks, but first
asserts that the current target is a regular, single-link
`root:fellow-db-runner` `0440` file. Deletion is separately authorized and
uses the same fixed path/type/owner/mode assertions before `rm`; do not record a
secret hash in Git or operational output.

Use this exact rotation block only with separate secret-rotation approval:

```bash
set -euo pipefail
umask 077

SECRET_DIRECTORY='/etc/fellow-database-observer'
SECRET_TARGET='/etc/fellow-database-observer/mongodb-uri'
test -f "$SECRET_TARGET"
test ! -L "$SECRET_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SECRET_TARGET")" = \
  'root:fellow-db-runner:440:1'

SECRET_TEMP=$(/usr/bin/mktemp "${SECRET_DIRECTORY}/.mongodb-uri.rotate.XXXXXX")
trap '/usr/bin/rm -f -- "$SECRET_TEMP"' EXIT
IFS= read -r -s -p 'New MongoDB observer URI: ' DATABASE_OBSERVER_URI
printf '\n' >&2
printf '%s' "$DATABASE_OBSERVER_URI" >"$SECRET_TEMP"
unset DATABASE_OBSERVER_URI

/usr/bin/node --input-type=module - "$SECRET_TEMP" <<'NODE'
import { readFileSync } from 'node:fs'
const raw = readFileSync(process.argv[2], 'utf8')
if (
  !raw ||
  raw !== raw.trim() ||
  raw.includes('\n') ||
  raw.includes('\r') ||
  /[\u0000-\u001f\u007f]/u.test(raw) ||
  Buffer.byteLength(raw, 'utf8') > 4096 ||
  !(raw.startsWith('mongodb://') || raw.startsWith('mongodb+srv://'))
) process.exit(1)
NODE

/usr/bin/chown root:fellow-db-runner "$SECRET_TEMP"
/usr/bin/chmod 0440 "$SECRET_TEMP"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SECRET_TEMP")" = \
  'root:fellow-db-runner:440:1'
/usr/bin/mv -fT "$SECRET_TEMP" "$SECRET_TARGET"
trap - EXIT
```

## Install wrapper, launcher and sudo broker

```bash
set -euo pipefail
umask 077
export LC_ALL=C

WRAPPER_ARTIFACT='/root/fellow-database-baseline-wrapper.mjs'
LAUNCHER_ARTIFACT='/root/fellow-database-baseline-launcher.mjs'
SUDOERS_ARTIFACT='/root/fellow-database-observer-sudoers'
WRAPPER_TARGET='/usr/local/libexec/fellow-database-baseline-wrapper.mjs'
LAUNCHER_TARGET='/usr/local/libexec/fellow-database-baseline-launcher.mjs'
SUDOERS_TARGET='/etc/sudoers.d/fellow-database-observer'

test ! -e "$WRAPPER_TARGET"
test ! -e "$LAUNCHER_TARGET"
test ! -e "$SUDOERS_TARGET"
/usr/bin/install -d -o root -g root -m 0755 /usr/local/libexec
/usr/bin/install -o root -g root -m 0555 "$WRAPPER_ARTIFACT" "$WRAPPER_TARGET"
/usr/bin/install -o root -g root -m 0555 "$LAUNCHER_ARTIFACT" "$LAUNCHER_TARGET"

actual=$(/usr/bin/sha256sum "$WRAPPER_TARGET")
test "${actual%% *}" = \
  'f8d48ae2bd87cca44cd43b8c9b27878cdbe42b5be86ce495f6072997599a85ca'
actual=$(/usr/bin/sha256sum "$LAUNCHER_TARGET")
test "${actual%% *}" = \
  '9f0b17df88dc3509dedd529b476ac94a508b1de267c9454296a22ac999ca232a'

SUDOERS_TEMP=$(/usr/bin/mktemp '/etc/sudoers.d/.fellow-database-observer.XXXXXX')
trap '/usr/bin/rm -f -- "$SUDOERS_TEMP"' EXIT
/usr/bin/install -o root -g root -m 0440 "$SUDOERS_ARTIFACT" "$SUDOERS_TEMP"
actual=$(/usr/bin/sha256sum "$SUDOERS_TEMP")
test "${actual%% *}" = \
  'b5c4f7dcb4b60b7c7d1c5863d7cd56c4efb2807a0dff7b2686da50dd993c61ac'
/usr/sbin/visudo -cf "$SUDOERS_TEMP"
/usr/bin/mv -fT "$SUDOERS_TEMP" "$SUDOERS_TARGET"
trap - EXIT

test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SUDOERS_TARGET")" = 'root:root:440:1'
/usr/sbin/visudo -cf "$SUDOERS_TARGET"
/usr/bin/sudo -U fellow-observer -u fellow-db-runner -l -- "$LAUNCHER_TARGET" >/dev/null
if /usr/bin/sudo -U fellow-observer -u fellow-db-runner -l -- \
  "$LAUNCHER_TARGET" forbidden-argument >/dev/null 2>&1
then
  exit 1
fi

set +e
/usr/sbin/runuser -u fellow-db-runner -- \
  /usr/bin/node "$WRAPPER_TARGET" forbidden-argument >/dev/null 2>&1
wrapper_reject_code=$?
/usr/sbin/runuser -u fellow-db-runner -- \
  "$LAUNCHER_TARGET" forbidden-argument >/dev/null 2>&1
launcher_reject_code=$?
set -e
test "$wrapper_reject_code" -eq 64
test "$launcher_reject_code" -eq 64
```

The last two commands verify argument rejection only. Do not invoke either
artifact without the forbidden argument during installation. Never run
`database-baseline` as an installation test.

## Atomically replace the dispatcher template

This is the only step that replaces an existing path. It refuses an unexpected
current dispatcher and preserves a hash-fixed backup before replacement.

```bash
set -euo pipefail
umask 077
export LC_ALL=C

GATE='/usr/local/sbin/fellow-observer-gate'
GATE_ARTIFACT='/root/fellow-observer-gate'
GATE_BACKUP='/root/fellow-observer-gate.pre-database-baseline.d4a28f7d'

test ! -e "$GATE_BACKUP"
test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE")" = 'root:root:755:1'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

/usr/bin/install -o root -g root -m 0500 "$GATE" "$GATE_BACKUP"
actual=$(/usr/bin/sha256sum "$GATE_BACKUP")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

GATE_TEMP=$(/usr/bin/mktemp '/usr/local/sbin/.fellow-observer-gate.database.XXXXXX')
trap '/usr/bin/rm -f -- "$GATE_TEMP"' EXIT
/usr/bin/install -o root -g root -m 0755 "$GATE_ARTIFACT" "$GATE_TEMP"
/bin/bash -n "$GATE_TEMP"
actual=$(/usr/bin/sha256sum "$GATE_TEMP")
test "${actual%% *}" = \
  '87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215'
/usr/bin/mv -fT "$GATE_TEMP" "$GATE"
trap - EXIT

/bin/bash -n "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE")" = 'root:root:755:1'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  '87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215'

set +e
SSH_ORIGINAL_COMMAND='database-baseline extra' /bin/bash "$GATE" >/dev/null 2>&1
deny_extra=$?
SSH_ORIGINAL_COMMAND=' database-baseline' /bin/bash "$GATE" >/dev/null 2>&1
deny_space=$?
SSH_ORIGINAL_COMMAND='database-baseline|id' /bin/bash "$GATE" >/dev/null 2>&1
deny_meta=$?
set -e
test "$deny_extra" -eq 126
test "$deny_space" -eq 126
test "$deny_meta" -eq 126
```

These checks intentionally do not execute the exact `database-baseline`
command. Do not edit `authorized_keys`, `sshd_config`, reload/restart sshd, or
modify the already installed runtime package or wrapper.

## MongoDB least-privilege identity plan

The production database name, authentication database, username, password and
current authorization model are **UNKNOWN** and must never be committed or
placed in a PR, log or chat. The exact values are supplied only through an
approved administrator channel.

The initial role is limited to the exact application database and the
PostgraduateProgress collection selected by the reviewed model. It grants only
the actions needed by the fixed inspector:

- `find`, which permits the approved read-only aggregate;
- `listIndexes` on the same exact collection;
- connection/authentication commands MongoDB permits without a broader role.

It does not inherit `read`, `readWrite`, `readAnyDatabase`, `dbAdmin`,
`dbAdminAnyDatabase`, `userAdmin`, `userAdminAnyDatabase`, `clusterAdmin` or
`root`. It has no insert, update, remove, create/drop collection, create/drop
index, `$out` or `$merge` capability. Do not add `clusterMonitor` for `hello`.
If topology classification returns `permission_denied` or `unsupported`, keep
that categorical result and do not widen the role.

### Atlas manual plan

1. In an approved Atlas administrative session, confirm the exact project,
   cluster, application database and collection without copying their values
   into the Issue or PR.
2. Create an Atlas custom role scoped to that exact database and collection
   with only `FIND` and `LIST_INDEXES` actions.
3. Create a dedicated database user, assign only that custom role, and use an
   independently generated password through the approved secret channel.
4. Restrict network access through the existing production network policy; do
   not add a broad temporary IP rule for the observer.
5. Construct the one-line URI only in the approved secret channel and install
   it with the preceding secret-file procedure.
6. Review the effective role before any connection. If Atlas cannot express
   the exact collection/action scope, stop and record a blocker.

### Self-hosted MongoDB manual template

An administrator may adapt the following template inside an already approved
`mongosh` administrative session. Angle-bracket values are placeholders and
must be replaced interactively; the populated script must not be saved in Git,
logs or chat. Do not execute it during this repository task.

```javascript
use admin

db.createRole({
  role: '<ADMIN_INPUT_DEDICATED_ROLE>',
  privileges: [{
    resource: {
      db: '<ADMIN_INPUT_EXACT_APPLICATION_DATABASE>',
      collection: '<ADMIN_VERIFIED_POSTGRADUATE_COLLECTION>'
    },
    actions: ['find', 'listIndexes']
  }],
  roles: []
})

db.createUser({
  user: '<ADMIN_INPUT_DEDICATED_USERNAME>',
  pwd: passwordPrompt(),
  roles: [{ role: '<ADMIN_INPUT_DEDICATED_ROLE>', db: 'admin' }]
})
```

Before approval, the administrator must show only categorical evidence that
the effective role has one resource and the two allowed actions and none of
the forbidden built-in roles. Rollback uses `dropUser` followed by `dropRole`
only after confirming the exact administrative database and names through the
same protected channel.

## Report lifecycle

On a future separately authorized exact command:

1. the SSH dispatcher accepts only `database-baseline`;
2. sudo switches from `fellow-observer` to `fellow-db-runner` for the exact
   no-argument launcher;
3. the launcher clears inherited environment and applies wall, CPU, address
   space, file-size, process and descriptor limits without a shell;
4. the wrapper validates all 1,092 installed members and the secret boundary;
5. the fixed URI is passed only to the fixed `database-inspect.mjs` child;
6. the strict database contract must return overall `passed`, or the single
   allowed `partial` shape where metrics and indexes passed but topology
   capability is `permission_denied`; this exception reports insufficient
   `hello` permission without broadening the database role;
7. the report is written to an unpredictable `0600` temporary file and the
   unchanged `report-safety-check` receives the same URI in its fixed child
   environment so a matching value is rejected;
8. successful cleanup occurs before stdout is emitted;
9. any other error, timeout, permission denial, unsafe stderr, invalid report
   or cleanup failure emits only a fixed generic error and no report.

The server does not retain reports. A future local receiver stores stdout,
stderr, exit code and SHA-256 separately below ignored `.ai-reports/`, then
re-runs UTF-8/JSON parsing, the strict database contract and
`report-safety-check`. It must not commit the raw report.

After separate execution approval, a local reviewer may use this capture
pattern from a clean repository checkout. Set `OBSERVER_DESTINATION` through
the approved host inventory; do not put a URI in this shell or command. A
nonzero exit, nonempty stderr, invalid contract or safety failure stops before
the report is accepted. The capture directory remains ignored and must not be
committed:

```bash
set -euo pipefail
umask 077

test -n "${OBSERVER_DESTINATION:?approved observer destination is required}"
CAPTURE_DIRECTORY=".ai-reports/database-baseline-$(date -u '+%Y%m%dT%H%M%SZ')"
test ! -e "$CAPTURE_DIRECTORY"
mkdir -m 0700 "$CAPTURE_DIRECTORY"

set +e
ssh -T -- "$OBSERVER_DESTINATION" database-baseline \
  >"$CAPTURE_DIRECTORY/stdout.json" \
  2>"$CAPTURE_DIRECTORY/stderr.txt"
capture_exit=$?
set -e
printf '%s\n' "$capture_exit" >"$CAPTURE_DIRECTORY/exit-code.txt"
chmod 0600 "$CAPTURE_DIRECTORY"/*
sha256sum \
  "$CAPTURE_DIRECTORY/stdout.json" \
  "$CAPTURE_DIRECTORY/stderr.txt" \
  "$CAPTURE_DIRECTORY/exit-code.txt" \
  >"$CAPTURE_DIRECTORY/SHA256SUMS"

test "$capture_exit" -eq 0
test ! -s "$CAPTURE_DIRECTORY/stderr.txt"
node --input-type=module - "$CAPTURE_DIRECTORY/stdout.json" <<'NODE'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const contractUrl = pathToFileURL(
  resolve('scripts/ai/lib/database-inspection-contract.mjs')
).href
const { validateDatabaseInspectionReport } = await import(contractUrl)
const allowedPartial = report.status === 'partial' &&
  report.metrics?.status === 'passed' &&
  report.indexes?.status === 'passed' &&
  report.databaseCapabilities?.status === 'permission_denied'
if (
  validateDatabaseInspectionReport(report).length !== 0 ||
  (report.status !== 'passed' && !allowedPartial)
) process.exit(1)
NODE
node scripts/ai/report-safety-check.mjs "$CAPTURE_DIRECTORY/stdout.json"
git check-ignore "$CAPTURE_DIRECTORY/stdout.json" >/dev/null
```

## Atomic dispatcher and sudoers rollback

Rollback is a separately authorized operation. Restore the dispatcher first;
the block refuses an unexpected current file.

```bash
set -euo pipefail
umask 077
export LC_ALL=C

GATE='/usr/local/sbin/fellow-observer-gate'
GATE_BACKUP='/root/fellow-observer-gate.pre-database-baseline.d4a28f7d'

test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE")" = 'root:root:755:1'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  '87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215'
test -f "$GATE_BACKUP"
test ! -L "$GATE_BACKUP"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE_BACKUP")" = 'root:root:500:1'
actual=$(/usr/bin/sha256sum "$GATE_BACKUP")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

ROLLBACK_TEMP=$(/usr/bin/mktemp '/usr/local/sbin/.fellow-observer-gate.rollback.XXXXXX')
trap '/usr/bin/rm -f -- "$ROLLBACK_TEMP"' EXIT
/usr/bin/install -o root -g root -m 0755 "$GATE_BACKUP" "$ROLLBACK_TEMP"
/bin/bash -n "$ROLLBACK_TEMP"
actual=$(/usr/bin/sha256sum "$ROLLBACK_TEMP")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'
/usr/bin/mv -fT "$ROLLBACK_TEMP" "$GATE"
trap - EXIT

actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'
```

After dispatcher restoration, atomically remove the exact sudoers rule only
after its hash and syntax still match:

```bash
set -euo pipefail
SUDOERS_TARGET='/etc/sudoers.d/fellow-database-observer'
test -f "$SUDOERS_TARGET"
test ! -L "$SUDOERS_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SUDOERS_TARGET")" = 'root:root:440:1'
actual=$(/usr/bin/sha256sum "$SUDOERS_TARGET")
test "${actual%% *}" = \
  'b5c4f7dcb4b60b7c7d1c5863d7cd56c4efb2807a0dff7b2686da50dd993c61ac'
/usr/sbin/visudo -cf "$SUDOERS_TARGET"
/usr/bin/rm -f -- "$SUDOERS_TARGET"
/usr/sbin/visudo -c
```

## Secret, runner, package and state removal

Use only after the dispatcher and sudoers rollback succeeds and exact removal
is separately approved:

```bash
set -euo pipefail
export LC_ALL=C

SOURCE_COMMIT='5124d83f93a4faf76de6e4b629d67cdb48414a42'
TARGET="/opt/fellow-database-observer/${SOURCE_COMMIT}"
WRAPPER_TARGET='/usr/local/libexec/fellow-database-baseline-wrapper.mjs'
LAUNCHER_TARGET='/usr/local/libexec/fellow-database-baseline-launcher.mjs'
SECRET_TARGET='/etc/fellow-database-observer/mongodb-uri'
SECRET_DIRECTORY='/etc/fellow-database-observer'
STATE_DIRECTORY='/var/lib/fellow-database-observer/database-baseline'
STATE_BASE='/var/lib/fellow-database-observer'
INSTALL_BASE='/opt/fellow-database-observer'
GATE='/usr/local/sbin/fellow-observer-gate'
GATE_BACKUP='/root/fellow-observer-gate.pre-database-baseline.d4a28f7d'

test -f "$GATE"
test ! -L "$GATE"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE")" = 'root:root:755:1'
actual=$(/usr/bin/sha256sum "$GATE")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

test -f "$WRAPPER_TARGET"
test ! -L "$WRAPPER_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$WRAPPER_TARGET")" = 'root:root:555:1'
actual=$(/usr/bin/sha256sum "$WRAPPER_TARGET")
test "${actual%% *}" = \
  'f8d48ae2bd87cca44cd43b8c9b27878cdbe42b5be86ce495f6072997599a85ca'
test -f "$LAUNCHER_TARGET"
test ! -L "$LAUNCHER_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$LAUNCHER_TARGET")" = 'root:root:555:1'
actual=$(/usr/bin/sha256sum "$LAUNCHER_TARGET")
test "${actual%% *}" = \
  '9f0b17df88dc3509dedd529b476ac94a508b1de267c9454296a22ac999ca232a'

test -d "$TARGET"
test ! -L "$TARGET"
test "$(/usr/bin/readlink -f "$TARGET")" = "$TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a' "$TARGET")" = 'root:root:555'
test "$(/usr/bin/find "$TARGET" -type f | /usr/bin/wc -l)" -eq 1092
actual=$(/usr/bin/sha256sum "$TARGET/database-observer-integrity.json")
test "${actual%% *}" = \
  '53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4'
test -z "$(/usr/bin/find "$TARGET" -type l -print -quit)"
test -z "$(/usr/bin/find "$TARGET" ! -type d ! -type f -print -quit)"
test -z "$(/usr/bin/find "$TARGET" ! -user root -print -quit)"
test -z "$(/usr/bin/find "$TARGET" ! -group root -print -quit)"
test -z "$(/usr/bin/find "$TARGET" -perm /0222 -print -quit)"
test -z "$(/usr/bin/find "$TARGET" -type f ! -links 1 -print -quit)"

test -f "$SECRET_TARGET"
test ! -L "$SECRET_TARGET"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$SECRET_TARGET")" = \
  'root:fellow-db-runner:440:1'

test -z "$(/usr/bin/find "$STATE_DIRECTORY" -mindepth 1 -print -quit)"
test -z "$(/usr/bin/pgrep -u fellow-db-runner || true)"
test "$(/usr/bin/stat -c '%U:%G:%a' "$STATE_DIRECTORY")" = \
  'root:fellow-db-runner:730'
test "$(/usr/bin/stat -c '%U:%G:%a' "$STATE_BASE")" = 'root:root:711'
test "$(/usr/bin/stat -c '%U:%G:%a' "$SECRET_DIRECTORY")" = 'root:root:711'
test "$(/usr/bin/stat -c '%U:%G:%a' "$INSTALL_BASE")" = 'root:root:755'
test "$(/usr/bin/getent passwd fellow-db-runner | /usr/bin/cut -d: -f6)" = '/nonexistent'
test "$(/usr/bin/getent passwd fellow-db-runner | /usr/bin/cut -d: -f7)" = '/usr/sbin/nologin'
test "$(/usr/bin/id -Gn fellow-db-runner)" = 'fellow-db-runner'

test -f "$GATE_BACKUP"
test ! -L "$GATE_BACKUP"
test "$(/usr/bin/stat -c '%U:%G:%a:%h' "$GATE_BACKUP")" = 'root:root:500:1'
actual=$(/usr/bin/sha256sum "$GATE_BACKUP")
test "${actual%% *}" = \
  'd4a28f7deaa8a2bf04f080b30870e1d62d58346c39a23aff13bfeae592859ff2'

/usr/bin/rm -f -- "$SECRET_TARGET"
/usr/bin/rmdir "$SECRET_DIRECTORY"
/usr/bin/rm -f -- "$WRAPPER_TARGET"
/usr/bin/rm -f -- "$LAUNCHER_TARGET"
/usr/bin/rm -rf -- "$TARGET"
/usr/bin/rmdir "$STATE_DIRECTORY"
/usr/bin/rmdir "$STATE_BASE"
/usr/bin/rmdir "$INSTALL_BASE"
/usr/sbin/userdel fellow-db-runner
/usr/sbin/groupdel fellow-db-runner
/usr/bin/rm -f -- "$GATE_BACKUP"
```

`rmdir` intentionally fails on non-empty directories. Never broaden any
removal target to an application, upload, backup, MongoDB data or workspace
path. Database-user removal remains a separate protected administrator action;
do not place its populated names in this repository.
