import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { deleteVendorService } from '../../api/services';
import { Badge } from '../../components/Badge';
import {
  ActionButton,
  DangerButton,
  GhostButton,
} from '../../components/Buttons';
import { NotificationSettings } from '../../components/NotificationSettings';
import { ListRow, ProfileHeader } from '../../components/ProfileHeader';
import { clearServiceDraft } from '../../storage/draftStorage';
import { styles } from '../../theme/styles';
import type { PortfolioItem, VendorService } from '../../types';

export function VendorProfileScreen({
  services,
  portfolioItems,
  onAddService,
  onEditService,
  onDeletedService,
  onOpenPortfolio,
  accessToken,
}: {
  services: VendorService[];
  portfolioItems: PortfolioItem[];
  onAddService: () => void;
  onEditService: (service: VendorService) => void;
  onDeletedService: (serviceId: string) => void;
  onOpenPortfolio: () => void;
  accessToken?: string;
}) {
  const mediaCount = portfolioItems.reduce((sum, item) => sum + item.mediaCount, 0);
  const rejectedCount =
    services.filter((service) => service.moderationStatus === 'Отклонено').length +
    portfolioItems.filter((item) => item.moderationStatus === 'Отклонено').length;
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const confirmDeleteService = (service: VendorService) => {
    Alert.alert(
      'Удалить услугу?',
      `«${service.title}» исчезнет из профиля и каталога.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void performDeleteService(service.id);
          },
        },
      ],
    );
  };

  const performDeleteService = async (serviceId: string) => {
    setDeletingServiceId(serviceId);
    setActionError('');

    try {
      await deleteVendorService(serviceId, accessToken);
      await clearServiceDraft(serviceId).catch(() => undefined);
      onDeletedService(serviceId);
    } catch {
      setActionError('Не удалось удалить услугу. Попробуйте ещё раз.');
    } finally {
      setDeletingServiceId(null);
    }
  };

  return (
    <View style={styles.screenStack}>
      <ProfileHeader
        title="Aigerim Decor Studio"
        subtitle="Подрядчик · Декор · Алматы"
      />
      <View style={styles.listCard}>
        <ListRow label="Услуги" value={String(services.length)} />
        <ListRow label="Портфолио" value={`${portfolioItems.length} кейса`} />
        <ListRow label="Медиа" value={`${mediaCount} файлов`} />
        <ListRow label="Требуют исправлений" value={String(rejectedCount)} />
      </View>

      <NotificationSettings accessToken={accessToken} role="vendor" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Портфолио</Text>
        <Text style={styles.cardText}>
          Кейсы, фото и видео, которые показываются в карточке подрядчика.
        </Text>
        <GhostButton
          label="Открыть портфолио"
          icon={FolderOpen}
          onPress={onOpenPortfolio}
        />
      </View>

      <View style={styles.screenStack}>
        <Text style={styles.sectionTitle}>Мои услуги</Text>
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        {services.map((service) => (
          <View key={service.id} style={styles.card}>
            <View style={styles.leadCardHeader}>
              <Text style={styles.cardTitle}>{service.title}</Text>
              <Badge
                label={service.moderationStatus}
                tone={
                  service.moderationStatus === 'Опубликовано'
                    ? 'green'
                    : service.moderationStatus === 'Отклонено'
                      ? 'coral'
                      : 'gold'
                }
              />
            </View>
            <Text style={styles.cardText}>
              {service.category} · {service.priceType} · {service.price}
            </Text>
            <Text style={styles.cardText}>{service.packageDetails}</Text>
            {service.moderationStatus === 'Отклонено' && service.moderationNote ? (
              <View style={styles.moderationNote}>
                <Text style={styles.fieldLabel}>Комментарий модератора</Text>
                <Text style={styles.cardText}>{service.moderationNote}</Text>
              </View>
            ) : null}
            <Text style={styles.mutedSmall}>Обновлено: {service.updatedAt}</Text>
            <View style={styles.buttonRow}>
              <GhostButton
                label={
                  service.moderationStatus === 'Отклонено'
                    ? 'Исправить замечания'
                    : 'Редактировать'
                }
                disabled={deletingServiceId === service.id}
                icon={Pencil}
                onPress={() => onEditService(service)}
              />
              <DangerButton
                label={
                  deletingServiceId === service.id ? 'Удаляем...' : 'Удалить'
                }
                disabled={deletingServiceId !== null}
                icon={Trash2}
                onPress={() => confirmDeleteService(service)}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Создание услуги</Text>
        <Text style={styles.cardText}>
          Название, цена, условия, медиа и отправка на модерацию.
        </Text>
        <ActionButton label="Добавить услугу" icon={Plus} onPress={onAddService} />
      </View>
    </View>
  );
}
