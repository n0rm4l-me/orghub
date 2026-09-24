{{- define "orghub.name" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "orghub.labels" -}}
app.kubernetes.io/name: orghub
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "orghub.postgresHost" -}}
{{ .Release.Name }}-postgres
{{- end }}

{{- define "orghub.databaseUrl" -}}
postgresql://{{ .Values.postgres.user }}:{{ .Values.postgres.password }}@{{ include "orghub.postgresHost" . }}:5432/{{ .Values.postgres.database }}
{{- end }}

{{- define "orghub.pgbouncerHost" -}}
{{ .Release.Name }}-pgbouncer
{{- end }}

{{/*
The URL the app pods use. Routed through PgBouncer when it is enabled, so that the
cluster-wide connection count stops being `replicas x dbPoolMax` against Postgres.

The migrate initContainer must NOT use this: `prisma migrate deploy` takes a
session-level advisory lock, and under transaction pooling it would not get the same
backend for the whole migration. It stays on `orghub.databaseUrl` (direct).
*/}}
{{- define "orghub.databaseUrlPooled" -}}
{{- if .Values.pgbouncer.enabled -}}
postgresql://{{ .Values.postgres.user }}:{{ .Values.postgres.password }}@{{ include "orghub.pgbouncerHost" . }}:6432/{{ .Values.postgres.database }}
{{- else -}}
{{ include "orghub.databaseUrl" . }}
{{- end -}}
{{- end }}

{{/*
Deliberately has no default: an immutable tag (the git SHA) is the only way to know
what is running and to roll back to a known build. `latest` silently changes what a
pod restart pulls.
*/}}
{{- define "orghub.image" -}}
{{ .Values.image.repository }}:{{ required "image.tag is required: use an immutable tag such as the git SHA, never `latest`" .Values.image.tag }}
{{- end }}

{{/*
Migrator image: built from the `migrator` Dockerfile stage. Defaults to the app image
with a `-migrator` tag suffix when image.migratorTag is not set explicitly.
*/}}
{{- define "orghub.migratorImage" -}}
{{ .Values.image.repository }}:{{ default (printf "%s-migrator" .Values.image.tag) .Values.image.migratorTag }}
{{- end }}
