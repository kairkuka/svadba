import { Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { VendorCard } from '../../components/VendorCard';
import { styles } from '../../theme/styles';
import type { Vendor } from '../../types';

export function SavedScreen({
  vendors,
  savedVendorIds,
  onOpenVendor,
  onToggleSaved,
}: {
  vendors: Vendor[];
  savedVendorIds: string[];
  onOpenVendor: (vendor: Vendor) => void;
  onToggleSaved: (vendorId: string) => void;
}) {
  return (
    <View style={styles.screenStack}>
      <View>
        <Text style={styles.screenTitle}>Избранное</Text>
        <Text style={styles.screenSubtitle}>
          Быстрый возврат к подрядчикам, которых клиент сравнивает.
        </Text>
      </View>

      {vendors.length === 0 ? (
        <EmptyState
          title="Пока пусто"
          text="Сохраняйте подрядчиков из каталога, чтобы вернуться к ним позже."
        />
      ) : (
        vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            isSaved={savedVendorIds.includes(vendor.id)}
            onOpen={() => onOpenVendor(vendor)}
            onToggleSaved={() => onToggleSaved(vendor.id)}
          />
        ))
      )}
    </View>
  );
}

