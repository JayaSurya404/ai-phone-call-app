import type {
  CallSession,
  CallStatus,
  SentimentLabel,
  TranscriptSegment,
} from '../../api/types';

export function isTerminalStatus(
  status: CallStatus
): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  );
}

export function statusLabel(
  status: CallStatus
): string {
  return status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(
      /^\w/,
      (value) =>
        value.toUpperCase()
    );
}

export function statusColor(
  status: CallStatus
): string {
  switch (status) {
    case 'COMPLETED':
      return '#22C55E';

    case 'FAILED':
    case 'CANCELLED':
      return '#EF4444';

    case 'IN_PROGRESS':
    case 'RINGING':
      return '#22D3EE';

    case 'QUEUED':
    case 'STARTING':
      return '#F97316';

    case 'DRAFT':
      return '#64748B';
  }
}

export function sentimentColor(
  sentiment:
    SentimentLabel
): string {
  switch (sentiment) {
    case 'POSITIVE':
      return '#22C55E';

    case 'NEGATIVE':
      return '#EF4444';

    case 'MIXED':
      return '#F97316';

    case 'NEUTRAL':
      return '#38BDF8';

    case 'UNKNOWN':
      return '#64748B';
  }
}

export function formatClockTime(
  value: string
): string {
  return new Intl
    .DateTimeFormat(
      undefined,
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }
    )
    .format(
      new Date(value)
    );
}

export function formatDuration(
  milliseconds: number
): string {
  const safeMilliseconds =
    Math.max(
      0,
      milliseconds
    );

  const totalSeconds =
    Math.floor(
      safeMilliseconds /
      1000
    );

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  return (
    `${String(minutes)
      .padStart(2, '0')}:` +
    String(seconds)
      .padStart(2, '0')
  );
}

export function callDurationMs(
  call: CallSession,
  now: number
): number {
  const start =
    call.startedAt ??
    call.createdAt;

  const end =
    call.endedAt
      ? new Date(
          call.endedAt
        ).getTime()
      : now;

  return (
    end -
    new Date(start).getTime()
  );
}

export function averageConfidence(
  segments:
    readonly TranscriptSegment[]
): number | null {
  const values =
    segments
      .map(
        (segment) =>
          segment.confidence
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) => total + value,
      0
    ) /
    values.length
  );
}

export function averageLatencyMs(
  segments:
    readonly TranscriptSegment[]
): number | null {
  const values =
    segments
      .map(
        (segment) =>
          segment.latencyMs
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  if (
    values.length === 0
  ) {
    return null;
  }

  return Math.round(
    values.reduce(
      (
        total,
        value
      ) => total + value,
      0
    ) /
    values.length
  );
}

export function mergeTranscriptSegment(
  call: CallSession,
  segment: TranscriptSegment,
  callStatus?: CallStatus
): CallSession {
  const exists =
    call.transcriptSegments
      .some(
        (item) =>
          item.id ===
          segment.id
      );

  const transcriptSegments =
    exists
      ? call.transcriptSegments
      : [
          ...call
            .transcriptSegments,
          segment,
        ].sort(
          (
            first,
            second
          ) =>
            first.sequence -
            second.sequence
        );

  return {
    ...call,

    status:
      callStatus ??
      call.status,

    transcriptSegments,

    updatedAt:
      new Date()
        .toISOString(),
  };
}