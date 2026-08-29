import { ActivityIndicator, Text, View } from 'react-native';

import { GhostButton } from './Buttons';
import { colors, styles } from '../theme/styles';

export function DataState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.dataState}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.cardText}>Обновляем данные...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.dataState}>
        <Text style={styles.errorText}>{error}</Text>
        <GhostButton label="Повторить" icon={RefreshCw} onPress={onRetry} />
      </View>
    );
  }

  return null;
}
import { RefreshCw } from 'lucide-react-native';
