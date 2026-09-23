import React from 'react';
import { RoleTabs } from '@/components/TabHeader';

export default function AdminTabs() {
  return (
    <RoleTabs
      role="admin"
      tabs={[
        { name: 'index', title: 'Tutor queue', icon: 'shield-checkmark-outline' },
        { name: 'reports', title: 'Safety reports', icon: 'warning-outline' },
        { name: 'reviews', title: 'Reviews', icon: 'chatbox-ellipses-outline' },
      ]}
    />
  );
}
