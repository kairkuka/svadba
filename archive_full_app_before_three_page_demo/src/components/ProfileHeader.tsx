import { Text, View } from 'react-native';

import { styles } from '../theme/styles';

export function ProfileHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{title.slice(0, 1)}</Text>
      </View>
      <View style={styles.profileCopy}>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function ListRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listLabel}>{label}</Text>
      <Text style={styles.listValue}>{value}</Text>
    </View>
  );
}

