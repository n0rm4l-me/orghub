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
