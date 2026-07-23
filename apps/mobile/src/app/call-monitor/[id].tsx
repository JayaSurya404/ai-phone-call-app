import {
  useLocalSearchParams,
} from 'expo-router';

import {
  CallMonitorScreen,
} from '../../features/call-monitor/CallMonitorScreen';

export default function CallMonitorRoute() {
  const {
    id,
  } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <CallMonitorScreen
      callSessionId={id}
    />
  );
}