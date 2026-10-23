import { Flag } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { colors, styles } from '../theme/styles';
import type { MediaComment } from '../types';

function pluralizeRussian(value: number, one: string, few: string, many: string) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatCommentTime(createdAt: string, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return createdAt;

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 60) return 'только что';

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) {
    return `${minutes} ${pluralizeRussian(minutes, 'минуту', 'минуты', 'минут')} назад`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${pluralizeRussian(hours, 'час', 'часа', 'часов')} назад`;
  }

  const days = Math.floor(hours / 24);
  return `${days} ${pluralizeRussian(days, 'день', 'дня', 'дней')} назад`;
}

export function MediaCommentRow({
  comment,
  compact = false,
  onReport,
}: {
  comment: MediaComment;
  compact?: boolean;
  onReport?: () => void;
}) {
  const author = comment.author.trim() || 'Пользователь';
  const initial = Array.from(author)[0]?.toLocaleUpperCase('ru-RU') || 'П';
  const avatarUri = comment.authorAvatarUri?.trim();

  return (
    <View style={[styles.mediaCommentItem, compact && styles.mediaCommentItemCompact]}>
      <View style={[styles.mediaCommentAvatar, compact && styles.mediaCommentAvatarCompact]}>
        {avatarUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: avatarUri }}
            style={styles.mediaCommentAvatarImage}
          />
        ) : (
          <Text style={styles.mediaCommentAvatarText}>{initial}</Text>
        )}
      </View>
      <View style={styles.mediaCommentBody}>
        <View style={styles.mediaCommentHeader}>
          <Text numberOfLines={1} style={styles.mediaCommentAuthor}>
            {author}
          </Text>
          <Text style={styles.mediaCommentTime}>{formatCommentTime(comment.createdAt)}</Text>
          {onReport ? (
            <Pressable
              accessibilityLabel={`Пожаловаться и скрыть комментарии пользователя ${author}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onReport}
              style={styles.mediaCommentReport}
            >
              <Flag color={colors.muted} size={14} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <Text numberOfLines={compact ? 1 : undefined} style={styles.mediaCommentText}>
          {comment.text}
        </Text>
      </View>
    </View>
  );
}
